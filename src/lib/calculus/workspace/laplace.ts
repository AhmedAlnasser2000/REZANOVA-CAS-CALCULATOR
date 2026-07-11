import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildExactScalarNode,
  exactPolynomialDegree,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { isNodeArray } from '../../symbolic-engine/patterns';
import type { CalculusCoreEvaluation } from '../engine/shared';
import type { LaplaceTransformState } from '../../../types/calculator';
import {
  calculusDetailSection,
  calculusTextRows,
} from '../detail-readback';
import { profileCalculusResult } from '../../display/printer';

const ce = new ComputeEngine();

const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const T_POWER_CAP = 12;

type LaplaceMatch = {
  exactLatex: string;
  method: string;
};

function exactScalarLatex(value: ExactScalar) {
  return ce.box(buildExactScalarNode(normalizeExactScalar(value)) as Parameters<typeof ce.box>[0]).latex;
}

function scalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 1 && normalized.denominator === 1;
}

function scalarIsNegativeOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === -1 && normalized.denominator === 1;
}

function scalarSquare(value: ExactScalar) {
  return multiplyExactScalars(value, value);
}

function factorial(value: number) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }
  return result;
}

function wrapLatex(latex: string) {
  return /^[a-zA-Z0-9]+$/.test(latex) ? latex : `\\left(${latex}\\right)`;
}

function scaleLatex(latex: string, coefficient: ExactScalar) {
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === 0) {
    return '0';
  }

  if (scalarIsOne(normalized)) {
    return latex;
  }

  if (scalarIsNegativeOne(normalized)) {
    return `-${wrapLatex(latex)}`;
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  const absoluteNumerator = Math.abs(normalized.numerator);
  const numerator = absoluteNumerator === 1
    ? wrapLatex(latex)
    : `${absoluteNumerator}${wrapLatex(latex)}`;
  return normalized.denominator === 1
    ? `${sign}${numerator}`
    : `${sign}\\frac{${numerator}}{${normalized.denominator}}`;
}

function fractionLatex(numerator: string, denominator: string) {
  return `\\frac{${numerator}}{${denominator}}`;
}

function sPowerLatex(power: number) {
  return power === 1 ? 's' : `s^{${power}}`;
}

function shiftedSLatex(shift: ExactScalar) {
  const normalized = normalizeExactScalar(shift);
  if (normalized.numerator === 0) {
    return 's';
  }

  const absoluteLatex = exactScalarLatex({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
  return normalized.numerator > 0
    ? `s-${absoluteLatex}`
    : `s+${absoluteLatex}`;
}

function squaredLatex(latex: string) {
  return latex === 's' ? 's^{2}' : `${wrapLatex(latex)}^{2}`;
}

function plusScalarTerm(base: string, value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return base;
  }

  return `${base}+${exactScalarLatex(normalized)}`;
}

function minusScalarTerm(base: string, value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return base;
  }

  return `${base}-${exactScalarLatex(normalized)}`;
}

function exactLinearCoefficient(node: unknown, variable: string) {
  const polynomial = parseExactPolynomial(node, variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const constant = getExactPolynomialCoefficient(polynomial, 0);
  if (!exactScalarIsZero(constant)) {
    return undefined;
  }

  return getExactPolynomialCoefficient(polynomial, 1);
}

function splitExactScalarFactor(node: unknown): { coefficient: ExactScalar; core: unknown } | null {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return { coefficient: scalar, core: 1 };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return { coefficient: ONE, core: node };
  }

  let coefficient = ONE;
  const remaining: unknown[] = [];
  for (const factor of node.slice(1)) {
    const factorScalar = readExactScalarNode(factor);
    if (factorScalar) {
      coefficient = multiplyExactScalars(coefficient, factorScalar);
    } else {
      remaining.push(factor);
    }
  }

  if (remaining.length === 0) {
    return { coefficient, core: 1 };
  }

  return {
    coefficient,
    core: remaining.length === 1 ? remaining[0] : ['Multiply', ...remaining],
  };
}

function matchPowerOfT(core: unknown): LaplaceMatch | undefined {
  if (core === 1) {
    return profileCalculusResult({
      exactLatex: fractionLatex('1', 's'),
      method: 'Applied the table entry L{1}=1/s.',
    });
  }

  if (core === 't') {
    return profileCalculusResult({
      exactLatex: fractionLatex('1', 's^{2}'),
      method: 'Applied the table entry L{t}=1/s^2.',
    });
  }

  if (!isNodeArray(core) || core[0] !== 'Power' || core.length !== 3 || core[1] !== 't') {
    return undefined;
  }

  const exponent = readExactScalarNode(core[2]);
  if (!exponent || exponent.denominator !== 1 || exponent.numerator < 0 || exponent.numerator > T_POWER_CAP) {
    return undefined;
  }

  const coefficient = factorial(exponent.numerator);
  return profileCalculusResult({
    exactLatex: fractionLatex(`${coefficient}`, sPowerLatex(exponent.numerator + 1)),
    method: `Applied the table entry L{t^n}=n!/s^(n+1) with n=${exponent.numerator}.`,
  });
}

function matchExponential(core: unknown): { shift: ExactScalar } | undefined {
  if (
    !isNodeArray(core)
    || core[0] !== 'Power'
    || core.length !== 3
    || core[1] !== 'ExponentialE'
  ) {
    return undefined;
  }

  const shift = exactLinearCoefficient(core[2], 't');
  return shift ? { shift } : undefined;
}

function matchUnaryFunction(core: unknown, head: string): ExactScalar | undefined {
  if (!isNodeArray(core) || core[0] !== head || core.length !== 2) {
    return undefined;
  }

  return exactLinearCoefficient(core[1], 't');
}

function transformTrigLike(head: string, parameter: ExactScalar): LaplaceMatch | undefined {
  const parameterSquared = scalarSquare(parameter);
  if (head === 'Sin') {
    return profileCalculusResult({
      exactLatex: fractionLatex(exactScalarLatex(parameter), plusScalarTerm('s^{2}', parameterSquared)),
      method: 'Applied the table entry L{sin(a t)}=a/(s^2+a^2).',
    });
  }

  if (head === 'Cos') {
    return profileCalculusResult({
      exactLatex: fractionLatex('s', plusScalarTerm('s^{2}', parameterSquared)),
      method: 'Applied the table entry L{cos(a t)}=s/(s^2+a^2).',
    });
  }

  if (head === 'Sinh') {
    return profileCalculusResult({
      exactLatex: fractionLatex(exactScalarLatex(parameter), minusScalarTerm('s^{2}', parameterSquared)),
      method: 'Applied the table entry L{sinh(a t)}=a/(s^2-a^2).',
    });
  }

  if (head === 'Cosh') {
    return profileCalculusResult({
      exactLatex: fractionLatex('s', minusScalarTerm('s^{2}', parameterSquared)),
      method: 'Applied the table entry L{cosh(a t)}=s/(s^2-a^2).',
    });
  }

  return undefined;
}

function matchExponentialTrigProduct(core: unknown): LaplaceMatch | undefined {
  if (!isNodeArray(core) || core[0] !== 'Multiply') {
    return undefined;
  }

  const factors = core.slice(1);
  if (factors.length !== 2) {
    return undefined;
  }

  const expMatch = matchExponential(factors[0]) ?? matchExponential(factors[1]);
  const trig = factors.find((factor) =>
    isNodeArray(factor) && (factor[0] === 'Sin' || factor[0] === 'Cos'));
  if (!expMatch || !trig || !isNodeArray(trig)) {
    return undefined;
  }

  const parameter = matchUnaryFunction(trig, trig[0] as string);
  if (!parameter) {
    return undefined;
  }

  const shifted = shiftedSLatex(expMatch.shift);
  const denominator = plusScalarTerm(squaredLatex(shifted), scalarSquare(parameter));
  if (trig[0] === 'Sin') {
    return profileCalculusResult({
      exactLatex: fractionLatex(exactScalarLatex(parameter), denominator),
      method: 'Applied the table entry L{e^(a t) sin(b t)}=b/((s-a)^2+b^2).',
    });
  }

  return profileCalculusResult({
    exactLatex: fractionLatex(shifted, denominator),
    method: 'Applied the table entry L{e^(a t) cos(b t)}=(s-a)/((s-a)^2+b^2).',
  });
}

function matchLaplaceTable(core: unknown): LaplaceMatch | undefined {
  const power = matchPowerOfT(core);
  if (power) {
    return power;
  }

  const exp = matchExponential(core);
  if (exp) {
    return profileCalculusResult({
      exactLatex: fractionLatex('1', shiftedSLatex(exp.shift)),
      method: 'Applied the table entry L{e^(a t)}=1/(s-a).',
    });
  }

  for (const head of ['Sin', 'Cos', 'Sinh', 'Cosh']) {
    const parameter = matchUnaryFunction(core, head);
    if (parameter) {
      return transformTrigLike(head, parameter);
    }
  }

  return matchExponentialTrigProduct(core);
}

export function resolveLaplaceTransformFromAst(node: unknown): LaplaceMatch | undefined {
  const factored = splitExactScalarFactor(node);
  if (!factored) {
    return undefined;
  }

  const matched = matchLaplaceTable(factored.core);
  if (!matched) {
    return undefined;
  }

  return profileCalculusResult({
    ...matched,
    exactLatex: scaleLatex(matched.exactLatex, factored.coefficient),
  });
}

export function evaluateCalculusLaplaceTransform(
  state: LaplaceTransformState,
): CalculusCoreEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter f(t) before evaluating the Laplace transform.',
    };
  }

  try {
    const parsed = ce.parse(bodyLatex);
    const matched = resolveLaplaceTransformFromAst(parsed.json);
    if (!matched) {
      return {
        warnings: [],
        error: 'This Laplace transform is outside the supported Calculus table.',
        detailSections: [calculusDetailSection(
          'Laplace Table',
          calculusTextRows([
            'CALCULUS-LAPLACE-TABLE1 covers constants, t^n, e^(a t), sin/cos/sinh/cosh, and e^(a t)sin/cos(b t) with exact-rational numeric parameters.',
          ]),
        )],
      };
    }

    return {
      exactLatex: matched.exactLatex,
      warnings: [],
      resultOrigin: 'rule-based-symbolic',
      detailSections: [calculusDetailSection(
        'Laplace Table',
        calculusTextRows([
          matched.method,
          'Source variable t and transform variable s are fixed in this table slice.',
        ]),
      )],
    };
  } catch {
    return {
      warnings: [],
      error: 'This Laplace transform is outside the supported Calculus table.',
    };
  }
}
