import { ComputeEngine } from '@cortex-js/compute-engine';
import { solvePolynomialRoots } from '../algebra/polynomial-roots';
import { exactPolynomialCoefficientArray, exactScalarToNumber, parseExactPolynomial } from '../algebra/polynomial-core';
import { formatApproxNumber } from '../display/format';
import { evaluateLatexAtTarget } from './domain-guards';

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type EquationNumericDomainFactKind =
  | 'denominator-exclusion'
  | 'solved-denominator-exclusion'
  | 'log-domain'
  | 'root-domain'
  | 'fractional-power-domain'
  | 'periodic-carrier'
  | 'trig-pole'
  | 'inverse-trig-domain'
  | 'sampled-discontinuity';

export type EquationNumericDomainFact = {
  kind: EquationNumericDomainFactKind;
  expressionLatex?: string;
  relationLatex?: string;
  message: string;
  source: 'symbolic-scan' | 'sample-probe' | 'polynomial-boundary';
};

export type EquationNumericSampleProbe = {
  samplePoints: number[];
  finitePoints: number[];
  undefinedPoints: number[];
  finiteSampleCount: number;
  undefinedSampleCount: number;
};

const ce = new ComputeEngine();
const PERIODIC_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc']);
const SAMPLE_POINTS = [-10, -2, -1, 0, 1, 2, 3, 10];
const REAL_ROOT_IMAGINARY_TOLERANCE = 1e-7;
const MAX_BOUNDARY_DEGREE = 64;

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function nodeLatex(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return undefined;
  }
}

function containsTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (!node || typeof node !== 'object') {
    return false;
  }
  const entries = isArrayNode(node) ? node : Object.values(node);
  return entries.some((entry) => containsTarget(entry, target));
}

function addFact(
  facts: EquationNumericDomainFact[],
  fact: EquationNumericDomainFact,
) {
  const key = `${fact.kind}|${fact.expressionLatex ?? ''}|${fact.relationLatex ?? ''}|${fact.message}`;
  const exists = facts.some((entry) =>
    `${entry.kind}|${entry.expressionLatex ?? ''}|${entry.relationLatex ?? ''}|${entry.message}` === key);
  if (!exists) {
    facts.push(fact);
  }
}

function factMessage(expressionLatex: string | undefined, relationLatex: string, fallback: string) {
  return expressionLatex ? `${expressionLatex} ${relationLatex}` : fallback;
}

function exactRationalExponent(node: unknown) {
  if (typeof node === 'number' && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }
  if (isArrayNode(node) && node[0] === 'Rational' && node.length === 3) {
    const numerator = typeof node[1] === 'number' && Number.isInteger(node[1]) ? node[1] : null;
    const denominator = typeof node[2] === 'number' && Number.isInteger(node[2]) ? node[2] : null;
    if (numerator !== null && denominator !== null && denominator !== 0) {
      return { numerator, denominator: Math.abs(denominator) };
    }
  }
  return null;
}

function realRootsForPolynomialLatex(latex: string | undefined, target: string) {
  if (!latex) {
    return [];
  }
  try {
    const polynomial = parseExactPolynomial(ce.parse(latex).json, target, MAX_BOUNDARY_DEGREE);
    if (!polynomial) {
      return [];
    }
    const coefficients = exactPolynomialCoefficientArray(polynomial).map(exactScalarToNumber);
    if (coefficients.length < 2) {
      return [];
    }
    const roots = solvePolynomialRoots({ coefficients });
    if (roots.kind !== 'success') {
      return [];
    }
    return roots.roots
      .filter((root) => Math.abs(root.im) <= REAL_ROOT_IMAGINARY_TOLERANCE)
      .map((root) => root.re);
  } catch {
    return [];
  }
}

function addSolvedDenominatorExclusions(
  facts: EquationNumericDomainFact[],
  denominatorLatex: string | undefined,
  target: string,
) {
  for (const root of realRootsForPolynomialLatex(denominatorLatex, target)) {
    addFact(facts, {
      kind: 'solved-denominator-exclusion',
      expressionLatex: target,
      relationLatex: `\\ne ${formatApproxNumber(root)}`,
      message: `${target}\\ne ${formatApproxNumber(root)}`,
      source: 'polynomial-boundary',
    });
  }
}

function addTrigPoleFact(
  facts: EquationNumericDomainFact[],
  carrierLatex: string | undefined,
  relationLatex: string,
  fallback: string,
) {
  addFact(facts, {
    kind: 'trig-pole',
    expressionLatex: carrierLatex,
    relationLatex,
    message: factMessage(carrierLatex, relationLatex, fallback),
    source: 'symbolic-scan',
  });
}

function collectSymbolicFacts(node: unknown, facts: EquationNumericDomainFact[], target: string) {
  if (!isArrayNode(node) || node.length === 0) {
    return;
  }

  const [operator, ...operands] = node;
  if (operator === 'Divide' && operands.length >= 2) {
    const denominatorLatex = nodeLatex(operands[1]);
    addFact(facts, {
      kind: 'denominator-exclusion',
      expressionLatex: denominatorLatex,
      relationLatex: '\\ne0',
      message: factMessage(denominatorLatex, '\\ne0', 'Denominator must be nonzero.'),
      source: 'symbolic-scan',
    });
    addSolvedDenominatorExclusions(facts, denominatorLatex, target);
  }

  if ((operator === 'Ln' || operator === 'Log') && operands.length >= 1) {
    const argumentLatex = nodeLatex(operands[0]);
    addFact(facts, {
      kind: 'log-domain',
      expressionLatex: argumentLatex,
      relationLatex: '>0',
      message: factMessage(argumentLatex, '>0', 'Log argument must be positive.'),
      source: 'symbolic-scan',
    });

    if (operator === 'Log' && operands.length >= 2) {
      const baseLatex = nodeLatex(operands[1]);
      addFact(facts, {
        kind: 'log-domain',
        expressionLatex: baseLatex,
        relationLatex: '>0',
        message: factMessage(baseLatex, '>0', 'Log base must be positive.'),
        source: 'symbolic-scan',
      });
      addFact(facts, {
        kind: 'log-domain',
        expressionLatex: baseLatex,
        relationLatex: '\\ne1',
        message: factMessage(baseLatex, '\\ne1', 'Log base must not equal 1.'),
        source: 'symbolic-scan',
      });
    }
  }

  if (operator === 'Sqrt' && operands.length >= 1) {
    const radicandLatex = nodeLatex(operands[0]);
    addFact(facts, {
      kind: 'root-domain',
      expressionLatex: radicandLatex,
      relationLatex: '\\ge0',
      message: factMessage(radicandLatex, '\\ge0', 'Even root radicand must be nonnegative.'),
      source: 'symbolic-scan',
    });
  }

  if (operator === 'Root' && operands.length >= 2) {
    const index = typeof operands[1] === 'number' ? operands[1] : null;
    if (index !== null && Number.isInteger(index) && index % 2 === 0) {
      const radicandLatex = nodeLatex(operands[0]);
      addFact(facts, {
        kind: 'root-domain',
        expressionLatex: radicandLatex,
        relationLatex: '\\ge0',
        message: factMessage(radicandLatex, '\\ge0', 'Even root radicand must be nonnegative.'),
        source: 'symbolic-scan',
      });
    }
  }

  if (operator === 'Power' && operands.length >= 2) {
    const exponent = exactRationalExponent(operands[1]);
    if (exponent && exponent.denominator !== 1 && exponent.denominator % 2 === 0) {
      const baseLatex = nodeLatex(operands[0]);
      addFact(facts, {
        kind: 'fractional-power-domain',
        expressionLatex: baseLatex,
        relationLatex: '\\ge0',
        message: factMessage(baseLatex, '\\ge0', 'Even-denominator fractional powers require nonnegative bases in the real domain.'),
        source: 'symbolic-scan',
      });
    }
  }

  if (typeof operator === 'string' && PERIODIC_OPERATORS.has(operator) && operands.some((operand) => containsTarget(operand, target))) {
    const carrierLatex = operands[0] ? nodeLatex(operands[0]) : undefined;
    addFact(facts, {
      kind: 'periodic-carrier',
      expressionLatex: carrierLatex,
      message: carrierLatex
        ? `Periodic carrier detected: ${operator}(${carrierLatex}).`
        : `Periodic ${operator} carrier detected.`,
      source: 'symbolic-scan',
    });
    if ((operator === 'Tan' || operator === 'Sec') && carrierLatex) {
      addTrigPoleFact(facts, `\\cos\\left(${carrierLatex}\\right)`, '\\ne0', 'Cosine denominator must be nonzero.');
    }
    if ((operator === 'Cot' || operator === 'Csc') && carrierLatex) {
      addTrigPoleFact(facts, `\\sin\\left(${carrierLatex}\\right)`, '\\ne0', 'Sine denominator must be nonzero.');
    }
  }

  if ((operator === 'Arcsin' || operator === 'Arccos') && operands.length >= 1) {
    const argumentLatex = nodeLatex(operands[0]);
    addFact(facts, {
      kind: 'inverse-trig-domain',
      expressionLatex: argumentLatex,
      relationLatex: '\\in[-1,1]',
      message: argumentLatex ? `-1\\le ${argumentLatex}\\le1` : 'Inverse sine/cosine arguments must stay between -1 and 1.',
      source: 'symbolic-scan',
    });
  }

  for (const operand of operands) {
    collectSymbolicFacts(operand, facts, target);
  }
}

export function collectEquationNumericDomainFacts(equationLatex: string, target: string) {
  const facts: EquationNumericDomainFact[] = [];
  try {
    const parsed = ce.parse(equationLatex);
    collectSymbolicFacts(parsed.json as MathJson, facts, target);
  } catch {
    return facts;
  }
  return facts;
}

export function probeEquationZeroForm(
  zeroFormLatex: string,
  target: string,
  angleUnit: 'rad' | 'deg' | 'grad',
): EquationNumericSampleProbe {
  const finitePoints: number[] = [];
  const undefinedPoints: number[] = [];
  let finiteSampleCount = 0;
  let undefinedSampleCount = 0;
  for (const samplePoint of SAMPLE_POINTS) {
    const evaluated = evaluateLatexAtTarget(zeroFormLatex, target, samplePoint, angleUnit);
    if (evaluated.value === null || !Number.isFinite(evaluated.value)) {
      undefinedSampleCount += 1;
      undefinedPoints.push(samplePoint);
    } else {
      finiteSampleCount += 1;
      finitePoints.push(samplePoint);
    }
  }

  return {
    samplePoints: [...SAMPLE_POINTS],
    finitePoints,
    undefinedPoints,
    finiteSampleCount,
    undefinedSampleCount,
  };
}

export function addSampledDiscontinuityFact(
  facts: EquationNumericDomainFact[],
  sampleProbe: EquationNumericSampleProbe | undefined,
) {
  if (!sampleProbe || sampleProbe.undefinedSampleCount === 0) {
    return;
  }
  addFact(facts, {
    kind: 'sampled-discontinuity',
    message: `Sample probe found ${sampleProbe.undefinedSampleCount} undefined point(s) across ${sampleProbe.samplePoints.length} numeric target samples.`,
    source: 'sample-probe',
  });
}
