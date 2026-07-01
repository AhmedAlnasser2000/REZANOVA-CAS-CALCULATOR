import { ComputeEngine } from '@cortex-js/compute-engine';
import { solvePolynomialRoots } from '../algebra/polynomial-roots';
import { exactPolynomialCoefficientArray, exactScalarToNumber, parseExactPolynomial } from '../algebra/polynomial-core';
import { formatApproxNumber } from '../display/format';
import { evaluateLatexAtTarget, readNumericNode } from './domain-guards';

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

export type EquationNumericSegmentationBoundaryKind =
  | 'denominator-exclusion'
  | 'log-boundary'
  | 'root-boundary'
  | 'fractional-power-boundary'
  | 'trig-pole'
  | 'sampled-discontinuity';

export type EquationNumericSegmentationBoundary = {
  kind: EquationNumericSegmentationBoundaryKind;
  value: number;
  message: string;
  excludedCandidate: boolean;
};

export type EquationNumericSegmentationPlan = {
  facts: EquationNumericDomainFact[];
  sampleProbe: EquationNumericSampleProbe;
  boundaries: EquationNumericSegmentationBoundary[];
  gridBreakpoints: number[];
  excludedBoundaryCandidates: number[];
};

const ce = new ComputeEngine();
const PERIODIC_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc']);
const SAMPLE_POINTS = [-10, -2, -1, 0, 1, 2, 3, 10];
const REAL_ROOT_IMAGINARY_TOLERANCE = 1e-7;
const MAX_BOUNDARY_DEGREE = 64;
const BOUNDARY_DEDUPE_TOLERANCE = 1e-7;

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

function numericConstant(node: unknown): number | null {
  const direct = readNumericNode(node);
  if (direct !== null) {
    return direct;
  }
  if (typeof node === 'string') {
    if (node === 'Pi') {
      return Math.PI;
    }
    if (node === 'ExponentialE') {
      return Math.E;
    }
    return null;
  }
  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  const [operator, ...operands] = node;
  if (operator === 'Rational' && operands.length === 2) {
    const numerator = numericConstant(operands[0]);
    const denominator = numericConstant(operands[1]);
    return numerator !== null && denominator !== null && denominator !== 0
      ? numerator / denominator
      : null;
  }
  if (operator === 'Negate' && operands.length === 1) {
    const value = numericConstant(operands[0]);
    return value === null ? null : -value;
  }
  if (operator === 'Add') {
    let total = 0;
    for (const operand of operands) {
      const value = numericConstant(operand);
      if (value === null) {
        return null;
      }
      total += value;
    }
    return total;
  }
  if (operator === 'Multiply') {
    let product = 1;
    for (const operand of operands) {
      const value = numericConstant(operand);
      if (value === null) {
        return null;
      }
      product *= value;
    }
    return product;
  }
  if (operator === 'Divide' && operands.length === 2) {
    const numerator = numericConstant(operands[0]);
    const denominator = numericConstant(operands[1]);
    return numerator !== null && denominator !== null && denominator !== 0
      ? numerator / denominator
      : null;
  }
  if (operator === 'Power' && operands.length === 2) {
    const base = numericConstant(operands[0]);
    const exponent = numericConstant(operands[1]);
    return base !== null && exponent !== null ? Math.pow(base, exponent) : null;
  }

  return null;
}

type AffineNumericModel = {
  coefficient: number;
  offset: number;
};

function addAffineModels(models: readonly AffineNumericModel[]): AffineNumericModel | null {
  let coefficient = 0;
  let offset = 0;
  for (const model of models) {
    coefficient += model.coefficient;
    offset += model.offset;
  }
  return { coefficient, offset };
}

function affineNumericModel(node: unknown, target: string): AffineNumericModel | null {
  if (typeof node === 'string') {
    return node === target
      ? { coefficient: 1, offset: 0 }
      : null;
  }
  const constant = numericConstant(node);
  if (constant !== null) {
    return { coefficient: 0, offset: constant };
  }
  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  const [operator, ...operands] = node;
  if (operator === 'Add') {
    const models = operands.map((operand) => affineNumericModel(operand, target));
    return models.every((model): model is AffineNumericModel => model !== null)
      ? addAffineModels(models)
      : null;
  }
  if (operator === 'Subtract' && operands.length === 2) {
    const left = affineNumericModel(operands[0], target);
    const right = affineNumericModel(operands[1], target);
    return left && right
      ? { coefficient: left.coefficient - right.coefficient, offset: left.offset - right.offset }
      : null;
  }
  if (operator === 'Negate' && operands.length === 1) {
    const model = affineNumericModel(operands[0], target);
    return model
      ? { coefficient: -model.coefficient, offset: -model.offset }
      : null;
  }
  if (operator === 'Multiply') {
    const affineOperands = operands.map((operand) => affineNumericModel(operand, target));
    const nonConstant = affineOperands.filter((model) => model && Math.abs(model.coefficient) > 0);
    if (nonConstant.length > 1) {
      return null;
    }
    if (nonConstant.length === 0) {
      const value = numericConstant(node);
      return value === null ? null : { coefficient: 0, offset: value };
    }
    let constantProduct = 1;
    for (const operand of operands) {
      const model = affineNumericModel(operand, target);
      if (model && Math.abs(model.coefficient) > 0) {
        continue;
      }
      const value = numericConstant(operand);
      if (value === null) {
        return null;
      }
      constantProduct *= value;
    }
    const affine = nonConstant[0];
    return affine
      ? {
          coefficient: affine.coefficient * constantProduct,
          offset: affine.offset * constantProduct,
        }
      : null;
  }
  if (operator === 'Divide' && operands.length === 2) {
    const numerator = affineNumericModel(operands[0], target);
    const denominator = numericConstant(operands[1]);
    return numerator && denominator !== null && denominator !== 0
      ? { coefficient: numerator.coefficient / denominator, offset: numerator.offset / denominator }
      : null;
  }

  return null;
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

function isInsideInterval(value: number, start: number, end: number) {
  const left = Math.min(start, end);
  const right = Math.max(start, end);
  return Number.isFinite(value) && value > left && value < right;
}

function addBoundary(
  boundaries: EquationNumericSegmentationBoundary[],
  boundary: EquationNumericSegmentationBoundary,
  start: number,
  end: number,
) {
  if (!isInsideInterval(boundary.value, start, end)) {
    return;
  }
  const existing = boundaries.find((entry) =>
    entry.kind === boundary.kind && Math.abs(entry.value - boundary.value) <= BOUNDARY_DEDUPE_TOLERANCE);
  if (!existing) {
    boundaries.push(boundary);
  }
}

function readSolvedTargetBoundary(fact: EquationNumericDomainFact, target: string) {
  if (fact.expressionLatex !== target || !fact.relationLatex) {
    return null;
  }
  const compact = fact.relationLatex.replace(/\s+/gu, '');
  const match = compact.match(/^\\ne(-?\d+(?:\.\d+)?)$/u);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function addPolynomialExpressionBoundaries(input: {
  boundaries: EquationNumericSegmentationBoundary[];
  fact: EquationNumericDomainFact;
  target: string;
  start: number;
  end: number;
  kind: EquationNumericSegmentationBoundaryKind;
  excludedCandidate: boolean;
}) {
  for (const root of realRootsForPolynomialLatex(input.fact.expressionLatex, input.target)) {
    addBoundary(input.boundaries, {
      kind: input.kind,
      value: root,
      excludedCandidate: input.excludedCandidate,
      message: `${input.fact.message}; boundary ${input.target}≈${formatApproxNumber(root)}.`,
    }, input.start, input.end);
  }
}

function trigPoleBaseAndPeriod(operator: string, angleUnit: 'rad' | 'deg' | 'grad') {
  if (operator !== 'Tan' && operator !== 'Sec' && operator !== 'Cot' && operator !== 'Csc') {
    return null;
  }
  if (operator === 'Tan' || operator === 'Sec') {
    if (angleUnit === 'deg') {
      return { base: 90, period: 180 };
    }
    if (angleUnit === 'grad') {
      return { base: 100, period: 200 };
    }
    return { base: Math.PI / 2, period: Math.PI };
  }
  if (angleUnit === 'deg') {
    return { base: 0, period: 180 };
  }
  if (angleUnit === 'grad') {
    return { base: 0, period: 200 };
  }
  return { base: 0, period: Math.PI };
}

function addAffineTrigPoleBoundaries(input: {
  boundaries: EquationNumericSegmentationBoundary[];
  operator: string;
  carrier: unknown;
  target: string;
  start: number;
  end: number;
  angleUnit: 'rad' | 'deg' | 'grad';
}) {
  const model = affineNumericModel(input.carrier, input.target);
  const pole = trigPoleBaseAndPeriod(input.operator, input.angleUnit);
  if (!model || !pole || Math.abs(model.coefficient) <= 1e-12) {
    return;
  }

  const intervalCarrierValues = [
    model.coefficient * input.start + model.offset,
    model.coefficient * input.end + model.offset,
  ];
  const minCarrier = Math.min(...intervalCarrierValues);
  const maxCarrier = Math.max(...intervalCarrierValues);
  const firstK = Math.ceil((minCarrier - pole.base) / pole.period) - 1;
  const lastK = Math.floor((maxCarrier - pole.base) / pole.period) + 1;
  const carrierLatex = nodeLatex(input.carrier) ?? input.target;

  for (let k = firstK; k <= lastK; k += 1) {
    const carrierPole = pole.base + pole.period * k;
    const targetValue = (carrierPole - model.offset) / model.coefficient;
    addBoundary(input.boundaries, {
      kind: 'trig-pole',
      value: targetValue,
      excludedCandidate: true,
      message: `${input.operator} pole from ${carrierLatex}; ${input.target}≈${formatApproxNumber(targetValue)}.`,
    }, input.start, input.end);
  }
}

function collectTrigPoleBoundaries(input: {
  node: unknown;
  boundaries: EquationNumericSegmentationBoundary[];
  target: string;
  start: number;
  end: number;
  angleUnit: 'rad' | 'deg' | 'grad';
}) {
  if (!isArrayNode(input.node) || input.node.length === 0) {
    return;
  }
  const [operator, ...operands] = input.node;
  if (
    typeof operator === 'string'
    && (operator === 'Tan' || operator === 'Sec' || operator === 'Cot' || operator === 'Csc')
    && operands.length >= 1
    && containsTarget(operands[0], input.target)
  ) {
    addAffineTrigPoleBoundaries({
      boundaries: input.boundaries,
      operator,
      carrier: operands[0],
      target: input.target,
      start: input.start,
      end: input.end,
      angleUnit: input.angleUnit,
    });
  }

  for (const operand of operands) {
    collectTrigPoleBoundaries({ ...input, node: operand });
  }
}

function uniqueSortedNumbers(values: readonly number[]) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  const unique: number[] = [];
  for (const value of sorted) {
    if (!unique.some((existing) => Math.abs(existing - value) <= BOUNDARY_DEDUPE_TOLERANCE)) {
      unique.push(value);
    }
  }
  return unique;
}

export function buildEquationNumericSegmentationPlan(input: {
  equationLatex: string;
  zeroFormLatex: string;
  target: string;
  start: number;
  end: number;
  angleUnit: 'rad' | 'deg' | 'grad';
}): EquationNumericSegmentationPlan {
  const facts = collectEquationNumericDomainFacts(input.equationLatex, input.target);
  const sampleProbe = probeEquationZeroForm(input.zeroFormLatex, input.target, input.angleUnit);
  addSampledDiscontinuityFact(facts, sampleProbe);
  const boundaries: EquationNumericSegmentationBoundary[] = [];

  for (const fact of facts) {
    if (fact.kind === 'solved-denominator-exclusion') {
      const boundary = readSolvedTargetBoundary(fact, input.target);
      if (boundary !== null) {
        addBoundary(boundaries, {
          kind: 'denominator-exclusion',
          value: boundary,
          excludedCandidate: true,
          message: fact.message,
        }, input.start, input.end);
      }
    }
    if (fact.kind === 'log-domain') {
      addPolynomialExpressionBoundaries({
        boundaries,
        fact,
        target: input.target,
        start: input.start,
        end: input.end,
        kind: 'log-boundary',
        excludedCandidate: false,
      });
    }
    if (fact.kind === 'root-domain') {
      addPolynomialExpressionBoundaries({
        boundaries,
        fact,
        target: input.target,
        start: input.start,
        end: input.end,
        kind: 'root-boundary',
        excludedCandidate: false,
      });
    }
    if (fact.kind === 'fractional-power-domain') {
      addPolynomialExpressionBoundaries({
        boundaries,
        fact,
        target: input.target,
        start: input.start,
        end: input.end,
        kind: 'fractional-power-boundary',
        excludedCandidate: false,
      });
    }
  }

  try {
    collectTrigPoleBoundaries({
      node: ce.parse(input.equationLatex).json,
      boundaries,
      target: input.target,
      start: input.start,
      end: input.end,
      angleUnit: input.angleUnit,
    });
  } catch {
    // Keep symbolic facts and sample probes when the optional pole pass cannot parse.
  }

  for (const point of sampleProbe.undefinedPoints) {
    addBoundary(boundaries, {
      kind: 'sampled-discontinuity',
      value: point,
      excludedCandidate: false,
      message: `Probe found ${input.target}≈${formatApproxNumber(point)} undefined or non-real.`,
    }, input.start, input.end);
  }

  const ordered = boundaries.sort((left, right) => left.value - right.value);
  return {
    facts,
    sampleProbe,
    boundaries: ordered,
    gridBreakpoints: uniqueSortedNumbers(ordered.map((boundary) => boundary.value)),
    excludedBoundaryCandidates: uniqueSortedNumbers(
      ordered
        .filter((boundary) => boundary.excludedCandidate)
        .map((boundary) => boundary.value),
    ),
  };
}
