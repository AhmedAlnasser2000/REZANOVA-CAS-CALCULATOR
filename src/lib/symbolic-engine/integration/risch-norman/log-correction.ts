import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
} from '../../primitives/simplification/simplification';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from '../types';
import {
  isRischNormanCoefficientZero,
  parseRischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import {
  parseRischNormanPolynomial,
  type RischNormanPolynomialStopReason,
} from './polynomial';
import type { RischNormanAnsatzFact } from './exponential-ansatz';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';

export type RischNormanLogCorrectionStopReason =
  | 'coefficient-stop'
  | 'extra-log-factor'
  | 'no-log-factor'
  | 'non-affine-argument'
  | RischNormanPolynomialStopReason;

export type RischNormanLogCorrectionResult =
  | {
    kind: 'success';
    family: 'affine-log-correction';
    variable: string;
    source: 'Ln' | 'Log';
    polynomialDegree: number;
    antiderivativeNode: unknown;
    exactLatex: string;
    facts: RischNormanAnsatzFact[];
    proof: 'risch-norman-log-correction-rule-proof';
  }
  | {
    kind: 'stop';
    reason: RischNormanLogCorrectionStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type LogCarrier = {
  head: 'Ln' | 'Log';
  argument: unknown;
};

type ProductSplit = {
  carrier: LogCarrier;
  polynomialNode: unknown;
};

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanLogCorrectionResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function coefficientFactsToAnsatzFacts(facts: RischNormanCoefficientFact[]) {
  return facts.map((fact): RischNormanAnsatzFact => ({
    kind: 'nonzero',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
  }));
}

function positiveFact(expressionLatex: string): RischNormanAnsatzFact {
  return {
    kind: 'positive',
    expressionLatex,
    relation: '>0',
  };
}

function nonzeroFact(expressionLatex: string): RischNormanAnsatzFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
}

function dedupeFacts(facts: RischNormanAnsatzFact[]) {
  const seen = new Set<string>();
  const deduped: RischNormanAnsatzFact[] = [];
  for (const fact of facts) {
    const key = `${fact.kind}:${fact.expressionLatex}:${fact.relation}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(fact);
  }
  return deduped;
}

function logCarrier(node: unknown): LogCarrier | undefined {
  if (
    isNodeArray(node)
    && node.length === 2
    && (node[0] === 'Ln' || node[0] === 'Log')
  ) {
    return {
      head: node[0],
      argument: node[1],
    };
  }

  return undefined;
}

function splitLogProduct(node: unknown, variable: string): RischNormanLogCorrectionResult | ProductSplit {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const carrierIndexes = factors
    .map((factor, index) => ({ index, carrier: logCarrier(factor) }))
    .filter((entry): entry is { index: number; carrier: LogCarrier } => {
      if (!entry.carrier) {
        return false;
      }
      return dependsOnVariable(entry.carrier.argument, variable);
    });

  if (carrierIndexes.length === 0) {
    return { kind: 'stop', reason: 'no-log-factor' };
  }
  if (carrierIndexes.length > 1) {
    return { kind: 'stop', reason: 'extra-log-factor' };
  }

  const selected = carrierIndexes[0];
  const remaining = factors.filter((_, index) => index !== selected.index);
  return {
    carrier: selected.carrier,
    polynomialNode: remaining.length === 0 ? 1 : ['Multiply', ...remaining],
  };
}

function exactScalar(node: unknown) {
  return readExactScalarNode(node);
}

function isExactZero(node: unknown) {
  const scalar = exactScalar(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function isExactOne(node: unknown) {
  const scalar = exactScalar(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

function binomial(n: number, k: number) {
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - i + 1)) / i;
  }
  return result;
}

function powerLatex(baseLatex: string, exponent: number) {
  if (exponent === 0) {
    return '1';
  }
  if (exponent === 1) {
    return wrapGroupedLatex(baseLatex);
  }
  return `${wrapGroupedLatex(baseLatex)}^{${exponent}}`;
}

function coefficientFactorLatex(node: unknown) {
  return isExactOne(node) ? undefined : wrapGroupedLatex(boxLatex(node));
}

function shiftedOffsetFactorLatex(offsetLatex: string, exponent: number) {
  if (exponent === 0) {
    return undefined;
  }
  const negated = `-${wrapGroupedLatex(offsetLatex)}`;
  return exponent === 1 ? `\\left(${negated}\\right)` : `\\left(${negated}\\right)^{${exponent}}`;
}

function offsetPowerNode(offsetNode: unknown, exponent: number) {
  if (exponent === 0) {
    return 1;
  }
  if (isExactZero(offsetNode)) {
    return 0;
  }
  const negated = negateMathJsonNode(offsetNode);
  return exponent === 1 ? negated : ['Power', negated, exponent];
}

function slopePowerNode(slopeNode: unknown, exponent: number) {
  if (exponent === 0) {
    return 1;
  }
  return exponent === 1 ? slopeNode : ['Power', slopeNode, exponent];
}

function productLatex(factors: Array<string | undefined>) {
  const meaningful = factors.filter((factor): factor is string => Boolean(factor && factor !== '1'));
  return meaningful.length > 0 ? meaningful.join('') : '1';
}

function denominatorLatex(slopeLatex: string, exponent: number) {
  return exponent === 1 ? wrapGroupedLatex(slopeLatex) : powerLatex(slopeLatex, exponent);
}

function scaledCoefficientLatex(input: {
  coefficientNode: unknown;
  binomialCoefficient: number;
  offsetLatex: string;
  offsetPower: number;
  slopeLatex: string;
  slopePower: number;
}) {
  const numerator = productLatex([
    input.binomialCoefficient === 1 ? undefined : String(input.binomialCoefficient),
    coefficientFactorLatex(input.coefficientNode),
    shiftedOffsetFactorLatex(input.offsetLatex, input.offsetPower),
  ]);
  const denominator = denominatorLatex(input.slopeLatex, input.slopePower);
  return `\\frac{${numerator}}{${denominator}}`;
}

function logKernelLatex(affineLatex: string, power: number) {
  const u = wrapGroupedLatex(affineLatex);
  const uPower = power === 1 ? u : `${u}^{${power}}`;
  const correction = power === 1
    ? `\\ln(${affineLatex})-1`
    : `\\frac{\\ln(${affineLatex})}{${power}}-\\frac{1}{${power * power}}`;
  return `${uPower}\\left(${correction}\\right)`;
}

function substitutionLogAntiderivativeLatex(input: {
  coefficients: unknown[];
  affineLatex: string;
  offsetLatex: string;
  offsetNode: unknown;
  slopeLatex: string;
}) {
  const terms: string[] = [];
  input.coefficients.forEach((coefficientNode, degree) => {
    if (isExactZero(coefficientNode)) {
      return;
    }

    for (let innerDegree = 0; innerDegree <= degree; innerDegree += 1) {
      const offsetPower = degree - innerDegree;
      if (offsetPower > 0 && isExactZero(input.offsetNode)) {
        continue;
      }
      const coefficientLatex = scaledCoefficientLatex({
        coefficientNode,
        binomialCoefficient: binomial(degree, innerDegree),
        offsetLatex: input.offsetLatex,
        offsetPower,
        slopeLatex: input.slopeLatex,
        slopePower: degree + 1,
      });
      terms.push(`${coefficientLatex}${logKernelLatex(input.affineLatex, innerDegree + 1)}`);
    }
  });

  return terms.length > 0 ? terms.join('+') : '0';
}

function logKernelNode(affineNode: unknown, power: number) {
  const logarithm = ['Ln', affineNode];
  if (power === 1) {
    return multiplyMathJsonNodes(affineNode, addMathJsonNodes(logarithm, -1));
  }
  return multiplyMathJsonNodes(
    ['Power', affineNode, power],
    addMathJsonNodes(
      divideMathJsonNodes(logarithm, power),
      divideMathJsonNodes(-1, power * power),
    ),
  );
}

function substitutionLogAntiderivativeNode(input: {
  coefficients: unknown[];
  affineNode: unknown;
  offsetNode: unknown;
  slopeNode: unknown;
}) {
  const terms: unknown[] = [];
  input.coefficients.forEach((coefficientNode, degree) => {
    if (isExactZero(coefficientNode)) {
      return;
    }

    for (let innerDegree = 0; innerDegree <= degree; innerDegree += 1) {
      const offsetPower = degree - innerDegree;
      if (offsetPower > 0 && isExactZero(input.offsetNode)) {
        continue;
      }
      const numerator = multiplyMathJsonNodes(
        coefficientNode,
        binomial(degree, innerDegree),
        offsetPowerNode(input.offsetNode, offsetPower),
      );
      const coefficient = divideMathJsonNodes(
        numerator,
        slopePowerNode(input.slopeNode, degree + 1),
      );
      terms.push(multiplyMathJsonNodes(coefficient, logKernelNode(input.affineNode, innerDegree + 1)));
    }
  });

  return addMathJsonNodes(...terms);
}

export function solveRischNormanLogCorrection(
  node: unknown,
  variable: string,
): RischNormanLogCorrectionResult {
  const split = splitLogProduct(node, variable);
  if ('kind' in split) {
    return split;
  }

  const affine = parseSymbolicAffine(split.carrier.argument, variable);
  if (!affine) {
    return { kind: 'stop', reason: 'non-affine-argument' };
  }

  const slope = parseRischNormanCoefficient(affine.slope, variable);
  if (slope.kind === 'stop') {
    return coefficientStop(slope.reason);
  }
  if (isRischNormanCoefficientZero(slope.coefficient)) {
    return { kind: 'stop', reason: 'non-affine-argument' };
  }

  const offset = parseRischNormanCoefficient(affine.offset ?? 0, variable);
  if (offset.kind === 'stop') {
    return coefficientStop(offset.reason);
  }

  const polynomial = parseRischNormanPolynomial(
    split.polynomialNode,
    variable,
    BY_PARTS_POLYNOMIAL_DEGREE_CAP,
  );
  if (polynomial.kind === 'stop') {
    return polynomial.reason === 'coefficient-stop'
      ? {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: polynomial.coefficientReason,
      }
      : { kind: 'stop', reason: polynomial.reason };
  }

  const naturalLatex = substitutionLogAntiderivativeLatex({
    coefficients: polynomial.coefficients.map((coefficient) => coefficient.node),
    affineLatex: affine.latex,
    offsetLatex: offset.coefficient.latex,
    offsetNode: offset.coefficient.node,
    slopeLatex: slope.coefficient.latex,
  });
  const exactLatex = split.carrier.head === 'Log'
    ? `\\frac{${naturalLatex}}{\\ln(10)}`
    : naturalLatex;
  const naturalNode = substitutionLogAntiderivativeNode({
    coefficients: polynomial.coefficients.map((coefficient) => coefficient.node),
    affineNode: split.carrier.argument,
    offsetNode: offset.coefficient.node,
    slopeNode: slope.coefficient.node,
  });
  const antiderivativeNode = split.carrier.head === 'Log'
    ? divideMathJsonNodes(naturalNode, ['Ln', 10])
    : naturalNode;
  const facts = dedupeFacts([
    ...coefficientFactsToAnsatzFacts(polynomial.facts),
    ...coefficientFactsToAnsatzFacts(slope.coefficient.facts),
    ...coefficientFactsToAnsatzFacts(offset.coefficient.facts),
    nonzeroFact(slope.coefficient.latex),
    positiveFact(affine.latex),
  ]);

  return {
    kind: 'success',
    family: 'affine-log-correction',
    variable,
    source: split.carrier.head,
    polynomialDegree: polynomial.degree,
    antiderivativeNode,
    exactLatex: normalizeGeneratedRischNormanLatex(exactLatex),
    facts,
    proof: 'risch-norman-log-correction-rule-proof',
  };
}
