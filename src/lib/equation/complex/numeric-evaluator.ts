import { ComputeEngine } from '@cortex-js/compute-engine';
import { exactScalarToNumber } from '../../algebra/polynomial-core';
import {
  complex,
  complexAbs,
  complexAdd,
  complexDiv,
  complexMul,
  complexNeg,
  complexPowInteger,
  complexPrincipalNthRoot,
  complexSqrt,
  complexSub,
  normalizeComplex,
  type ComplexValue,
} from '../../numeric/complex';
import { parseExactComplexConstantNode, normalizeExactComplexScalar } from './exact';
import { isArrayNode, simplifyNode } from './math-json';
import type { MathJson } from './types';

export type ComplexNumericEvaluationStatus = 'finite' | 'undefined' | 'overflow' | 'unsupported';

export type ComplexNumericEvaluationDiagnostic = {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
};

export type ComplexNumericEvaluationResult = {
  status: ComplexNumericEvaluationStatus;
  value: ComplexValue | null;
  residualNorm: number | null;
  diagnostics: ComplexNumericEvaluationDiagnostic[];
  evaluationCount: number;
};

export type ComplexNumericEvaluator = {
  evaluateAt(value: ComplexValue): ComplexNumericEvaluationResult;
};

const ce = new ComputeEngine();
const EPSILON = 1e-10;

function diagnostic(
  severity: ComplexNumericEvaluationDiagnostic['severity'],
  code: string,
  message: string,
): ComplexNumericEvaluationDiagnostic {
  return { severity, code, message };
}

function exactComplexToNumber(node: MathJson): ComplexValue | null {
  const exact = parseExactComplexConstantNode(simplifyNode(node));
  if (!exact) {
    return null;
  }
  const normalized = normalizeExactComplexScalar(exact);
  return complex(exactScalarToNumber(normalized.re), exactScalarToNumber(normalized.im));
}

function finite(value: ComplexValue) {
  return Number.isFinite(value.re) && Number.isFinite(value.im);
}

function complexExp(value: ComplexValue) {
  const magnitude = Math.exp(value.re);
  return complex(magnitude * Math.cos(value.im), magnitude * Math.sin(value.im));
}

function branchContact(value: ComplexValue, family: 'principal-log' | 'principal-root' | 'principal-power') {
  const normalized = normalizeComplex(value);
  if (normalized.re === 0 && normalized.im === 0) {
    return family === 'principal-log'
      ? diagnostic('error', 'complex-branch-point', 'Principal log is undefined at the branch point 0.')
      : diagnostic('warning', 'complex-branch-point', `${family} touches the principal branch point 0.`);
  }
  if (normalized.im === 0 && normalized.re < 0) {
    return diagnostic('warning', 'complex-branch-cut', `${family} argument lies on the negative-real-axis branch cut.`);
  }
  return null;
}

function complexLog(value: ComplexValue) {
  const normalized = normalizeComplex(value);
  if (normalized.re === 0 && normalized.im === 0) {
    return null;
  }
  return complex(Math.log(complexAbs(normalized)), Math.atan2(normalized.im, normalized.re));
}

function complexSin(value: ComplexValue) {
  return complex(
    Math.sin(value.re) * Math.cosh(value.im),
    Math.cos(value.re) * Math.sinh(value.im),
  );
}

function complexCos(value: ComplexValue) {
  return complex(
    Math.cos(value.re) * Math.cosh(value.im),
    -Math.sin(value.re) * Math.sinh(value.im),
  );
}

function complexTan(value: ComplexValue) {
  const denominator = complexCos(value);
  if (complexAbs(denominator) < EPSILON) {
    return null;
  }
  return complexDiv(complexSin(value), denominator);
}

function complexAsin(value: ComplexValue, diagnostics: ComplexNumericEvaluationDiagnostic[]) {
  const cut = inverseTrigContact(value, 'arcsin');
  if (cut) {
    diagnostics.push(cut);
  }
  const iz = complexMul(complex(0, 1), value);
  const inside = complexSub(complex(1, 0), complexMul(value, value));
  const root = complexSqrt(inside);
  const logged = complexLog(complexAdd(iz, root));
  return logged ? complexMul(complex(0, -1), logged) : null;
}

function complexAcos(value: ComplexValue, diagnostics: ComplexNumericEvaluationDiagnostic[]) {
  const asin = complexAsin(value, diagnostics);
  return asin ? complexSub(complex(Math.PI / 2, 0), asin) : null;
}

function complexAtan(value: ComplexValue, diagnostics: ComplexNumericEvaluationDiagnostic[]) {
  const cut = inverseTrigContact(value, 'arctan');
  if (cut) {
    diagnostics.push(cut);
  }
  const iz = complexMul(complex(0, 1), value);
  const left = complexLog(complexSub(complex(1, 0), iz));
  const right = complexLog(complexAdd(complex(1, 0), iz));
  return left && right ? complexMul(complex(0, 0.5), complexSub(left, right)) : null;
}

function inverseTrigContact(value: ComplexValue, kind: 'arcsin' | 'arctan') {
  const normalized = normalizeComplex(value);
  if (kind === 'arctan') {
    return normalized.re === 0 && Math.abs(normalized.im) >= 1
      ? diagnostic('warning', 'complex-inverse-trig-cut', 'Principal arctan argument touches its imaginary-axis branch cut.')
      : null;
  }
  return normalized.im === 0 && Math.abs(normalized.re) >= 1
    ? diagnostic('warning', 'complex-inverse-trig-cut', 'Principal inverse sine/cosine argument touches its real-axis branch cut.')
    : null;
}

function statusForChild(child: ComplexNumericEvaluationResult) {
  return child.value;
}

function zeroFormNode(node: MathJson): MathJson {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? ['Subtract', node[1] as MathJson, node[2] as MathJson]
    : node;
}

export function createComplexNumericEvaluator(input: {
  expressionLatex: string;
  target: string;
  parameters?: Record<string, ComplexValue | number>;
}): ComplexNumericEvaluator {
  const parsed = zeroFormNode(ce.parse(input.expressionLatex).json as MathJson);
  return {
    evaluateAt(value: ComplexValue) {
      let evaluationCount = 0;
      const diagnostics: ComplexNumericEvaluationDiagnostic[] = [];

      const evaluateNode = (node: MathJson): ComplexNumericEvaluationResult => {
        evaluationCount += 1;
        const exact = exactComplexToNumber(node);
        if (exact) {
          return { status: 'finite', value: exact, residualNorm: complexAbs(exact), diagnostics: [], evaluationCount };
        }
        if (node === input.target) {
          return { status: 'finite', value, residualNorm: complexAbs(value), diagnostics: [], evaluationCount };
        }
        if (typeof node === 'string') {
          if (node === 'Pi') {
            return { status: 'finite', value: complex(Math.PI, 0), residualNorm: Math.PI, diagnostics: [], evaluationCount };
          }
          if (node === 'ExponentialE') {
            return { status: 'finite', value: complex(Math.E, 0), residualNorm: Math.E, diagnostics: [], evaluationCount };
          }
          const parameter = input.parameters?.[node];
          if (parameter !== undefined) {
            const parameterValue = typeof parameter === 'number' ? complex(parameter, 0) : parameter;
            return {
              status: 'finite',
              value: parameterValue,
              residualNorm: complexAbs(parameterValue),
              diagnostics: [],
              evaluationCount,
            };
          }
          diagnostics.push(diagnostic('error', 'complex-unresolved-symbol', `Unresolved complex numeric symbol: ${node}.`));
          return {
            status: 'unsupported',
            value: null,
            residualNorm: null,
            diagnostics,
            evaluationCount,
          };
        }
        if (!isArrayNode(node) || typeof node[0] !== 'string') {
          diagnostics.push(diagnostic('error', 'complex-unsupported-node', 'Unsupported complex numeric expression node.'));
          return {
            status: 'unsupported',
            value: null,
            residualNorm: null,
            diagnostics,
            evaluationCount,
          };
        }

        const operator = node[0];
        const children = node.slice(1).map((child) => evaluateNode(child as MathJson));
        const values = children.map((child) => statusForChild(child));
        if (values.some((entry) => entry === null)) {
          const status = children.find((child) => child.status !== 'finite')?.status ?? 'unsupported';
          return { status, value: null, residualNorm: null, diagnostics, evaluationCount };
        }

        const args = values as ComplexValue[];
        let result: ComplexValue | null = null;
        if (operator === 'Add') {
          result = args.reduce((sum, part) => complexAdd(sum, part), complex(0, 0));
        } else if (operator === 'Subtract' && args.length === 2) {
          result = complexSub(args[0], args[1]);
        } else if (operator === 'Negate' && args.length === 1) {
          result = complexNeg(args[0]);
        } else if (operator === 'Multiply') {
          result = args.reduce((product, part) => complexMul(product, part), complex(1, 0));
        } else if (operator === 'Divide' && args.length === 2) {
          if (complexAbs(args[1]) < EPSILON) {
            diagnostics.push(diagnostic('error', 'complex-division-by-zero', 'Complex division by zero.'));
          } else {
            result = complexDiv(args[0], args[1]);
          }
        } else if (operator === 'Power' && args.length === 2) {
          result = evaluatePower(node, args, diagnostics);
        } else if (operator === 'Square' && args.length === 1) {
          result = complexMul(args[0], args[0]);
        } else if (operator === 'Sqrt' && args.length === 1) {
          const cut = branchContact(args[0], 'principal-root');
          if (cut) diagnostics.push(cut);
          result = complexSqrt(args[0]);
        } else if (operator === 'Root' && args.length >= 2) {
          const degree = Math.round(args[1].re);
          const cut = branchContact(args[0], 'principal-root');
          if (cut) diagnostics.push(cut);
          result = Number.isInteger(degree) && degree >= 2 ? complexPrincipalNthRoot(args[0], degree) : null;
        } else if ((operator === 'Ln' || operator === 'Log') && args.length >= 1) {
          const cut = branchContact(args[0], 'principal-log');
          if (cut) diagnostics.push(cut);
          const numerator = complexLog(args[0]);
          const denominator = operator === 'Log' && args.length >= 2 ? complexLog(args[1]) : complex(1, 0);
          result = numerator && denominator && complexAbs(denominator) >= EPSILON
            ? complexDiv(numerator, denominator)
            : null;
        } else if (operator === 'Sin' && args.length === 1) {
          result = complexSin(args[0]);
        } else if (operator === 'Cos' && args.length === 1) {
          result = complexCos(args[0]);
        } else if (operator === 'Tan' && args.length === 1) {
          result = complexTan(args[0]);
        } else if ((operator === 'Arcsin' || operator === 'asin') && args.length === 1) {
          result = complexAsin(args[0], diagnostics);
        } else if ((operator === 'Arccos' || operator === 'acos') && args.length === 1) {
          result = complexAcos(args[0], diagnostics);
        } else if ((operator === 'Arctan' || operator === 'atan') && args.length === 1) {
          result = complexAtan(args[0], diagnostics);
        } else {
          diagnostics.push(diagnostic('error', 'complex-unsupported-operator', `Unsupported complex numeric operator: ${operator}.`));
          return {
            status: 'unsupported',
            value: null,
            residualNorm: null,
            diagnostics,
            evaluationCount,
          };
        }

        if (!result) {
          return { status: 'undefined', value: null, residualNorm: null, diagnostics, evaluationCount };
        }
        if (!finite(result)) {
          diagnostics.push(diagnostic('error', 'complex-overflow', 'Complex numeric evaluation overflowed.'));
          return { status: 'overflow', value: null, residualNorm: null, diagnostics, evaluationCount };
        }
        const normalized = normalizeComplex(result);
        return {
          status: 'finite',
          value: normalized,
          residualNorm: complexAbs(normalized),
          diagnostics,
          evaluationCount,
        };
      };

      const evaluated = evaluateNode(parsed);
      return { ...evaluated, diagnostics };
    },
  };
}

function evaluatePower(
  node: MathJson[],
  args: ComplexValue[],
  diagnostics: ComplexNumericEvaluationDiagnostic[],
) {
  const exponent = node[2];
  if (typeof exponent === 'number' && Number.isInteger(exponent)) {
    return complexPowInteger(args[0], exponent);
  }
  if (args[1].im !== 0) {
    diagnostics.push(diagnostic('warning', 'complex-principal-power', 'Complex powers use principal log semantics.'));
  } else if (!Number.isInteger(args[1].re)) {
    const cut = branchContact(args[0], 'principal-power');
    if (cut) diagnostics.push(cut);
  }
  const logged = complexLog(args[0]);
  return logged ? complexExp(complexMul(args[1], logged)) : null;
}
