import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { sameNode } from '../node-helpers';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from '../types';
import {
  parseRischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import type { RischNormanAnsatzFact } from './exponential-ansatz';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';
import {
  parseRischNormanPolynomial,
  type RischNormanPolynomialStopReason,
} from './polynomial';
import { profileSymbolicIntegrationResult } from '../../../display/printer';

export type RischNormanLogRationalCorrectionStopReason =
  | 'coefficient-stop'
  | 'denominator-log-mismatch'
  | 'extra-log-factor'
  | 'extra-rational-factor'
  | 'missing-denominator'
  | 'no-log-factor'
  | 'non-affine-argument'
  | 'over-cap-denominator-power'
  | 'unsupported-shape'
  | RischNormanPolynomialStopReason;

export type RischNormanLogRationalCorrectionResult =
  | {
    kind: 'success';
    family: 'affine-log-rational-correction';
    variable: string;
    source: 'Ln' | 'Log';
    polynomialDegree: number;
    denominatorPower: number;
    antiderivativeNode: unknown;
    exactLatex: string;
    facts: RischNormanAnsatzFact[];
    proof: 'risch-norman-log-rational-correction-rule-proof';
  }
  | {
    kind: 'stop';
    reason: RischNormanLogRationalCorrectionStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type LogCarrier = {
  head: 'Ln' | 'Log';
  argument: unknown;
};

type ParsedDenominator = {
  base: unknown;
  power: number;
};

type ParsedIntegrand = {
  carrier: LogCarrier;
  denominator: ParsedDenominator;
  numerator: unknown;
};

const MAX_LOG_RATIONAL_DENOMINATOR_POWER = 3;

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanLogRationalCorrectionResult {
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

function nonzeroFact(expressionLatex: string): RischNormanAnsatzFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
}

function positiveFact(expressionLatex: string): RischNormanAnsatzFact {
  return {
    kind: 'positive',
    expressionLatex,
    relation: '>0',
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

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function exactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
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

function parsePositiveDenominator(node: unknown): ParsedDenominator {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    const power = exactInteger(node[2]);
    if (power && power > 0) {
      return {
        base: node[1],
        power,
      };
    }
  }

  return {
    base: node,
    power: 1,
  };
}

function parseNegativePowerDenominator(node: unknown): ParsedDenominator | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    const power = exactInteger(node[2]);
    return power && power < 0
      ? {
        base: node[1],
        power: -power,
      }
      : undefined;
  }

  return undefined;
}

function productNode(factors: unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function splitNumeratorFactors(factors: unknown[]): RischNormanLogRationalCorrectionResult | {
  carrier: LogCarrier;
  numerator: unknown;
} {
  const logIndexes = factors
    .map((factor, index) => ({ index, carrier: logCarrier(factor) }))
    .filter((entry): entry is { index: number; carrier: LogCarrier } => Boolean(entry.carrier));

  if (logIndexes.length === 0) {
    return { kind: 'stop', reason: 'no-log-factor' };
  }
  if (logIndexes.length > 1) {
    return { kind: 'stop', reason: 'extra-log-factor' };
  }

  return {
    carrier: logIndexes[0].carrier,
    numerator: productNode(factors.filter((_, index) => index !== logIndexes[0].index)),
  };
}

function parseIntegrand(node: unknown): RischNormanLogRationalCorrectionResult | ParsedIntegrand | undefined {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    const denominator = parsePositiveDenominator(node[2]);
    const numeratorFactors = isNodeArray(node[1]) && node[1][0] === 'Multiply'
      ? flattenMultiply(node[1])
      : [node[1]];
    const numerator = splitNumeratorFactors(numeratorFactors);
    return 'kind' in numerator
      ? numerator
      : {
        carrier: numerator.carrier,
        denominator,
        numerator: numerator.numerator,
      };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  const denominatorIndexes = factors
    .map((factor, index) => ({ index, denominator: parseNegativePowerDenominator(factor) }))
    .filter((entry): entry is { index: number; denominator: ParsedDenominator } => Boolean(entry.denominator));

  if (denominatorIndexes.length === 0) {
    return { kind: 'stop', reason: 'missing-denominator' };
  }
  if (denominatorIndexes.length > 1) {
    return { kind: 'stop', reason: 'extra-rational-factor' };
  }

  const numerator = splitNumeratorFactors(
    factors.filter((_, index) => index !== denominatorIndexes[0].index),
  );
  return 'kind' in numerator
    ? numerator
    : {
      carrier: numerator.carrier,
      denominator: denominatorIndexes[0].denominator,
      numerator: numerator.numerator,
    };
}

function offsetPowerNode(offsetNode: unknown, exponent: number) {
  if (exponent === 0) {
    return 1;
  }
  if (exactZero(offsetNode)) {
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

function binomial(n: number, k: number) {
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - i + 1)) / i;
  }
  return result;
}

function transformPolynomialToAffineBasis(input: {
  coefficients: unknown[];
  offsetNode: unknown;
  slopeNode: unknown;
}) {
  const transformed = Array.from({ length: input.coefficients.length }, () => 0 as unknown);

  input.coefficients.forEach((coefficientNode, degree) => {
    if (exactZero(coefficientNode)) {
      return;
    }

    for (let expandedDegree = 0; expandedDegree <= degree; expandedDegree += 1) {
      const numerator = multiplyMathJsonNodes(
        coefficientNode,
        binomial(degree, expandedDegree),
        offsetPowerNode(input.offsetNode, degree - expandedDegree),
      );
      if (exactZero(numerator)) {
        continue;
      }
      const denominator = slopePowerNode(input.slopeNode, degree);
      transformed[expandedDegree] = addMathJsonNodes(
        transformed[expandedDegree],
        divideMathJsonNodes(numerator, denominator),
      );
    }
  });

  return transformed.map((coefficientNode) => simplifyMathJsonNodeOrOriginal(coefficientNode));
}

function powerNode(base: unknown, exponent: number) {
  if (exponent === 0) {
    return 1;
  }
  if (exponent === 1) {
    return base;
  }
  return ['Power', base, exponent];
}

function laurentLogPrimitiveTerm(coefficientNode: unknown, affineNode: unknown, exponent: number) {
  if (exactZero(coefficientNode)) {
    return 0;
  }

  const logNode = ['Ln', affineNode];
  if (exponent === -1) {
    return divideMathJsonNodes(
      multiplyMathJsonNodes(coefficientNode, ['Power', logNode, 2]),
      2,
    );
  }

  const integratedPower = exponent + 1;
  const affinePower = powerNode(affineNode, integratedPower);
  return subtractMathJsonNodes(
    divideMathJsonNodes(
      multiplyMathJsonNodes(coefficientNode, affinePower, logNode),
      integratedPower,
    ),
    divideMathJsonNodes(
      multiplyMathJsonNodes(coefficientNode, affinePower),
      integratedPower * integratedPower,
    ),
  );
}

function buildAntiderivativeNode(input: {
  affineNode: unknown;
  denominatorPower: number;
  logBase: 'Ln' | 'Log';
  transformedCoefficients: unknown[];
}) {
  const naturalNode = simplifyMathJsonNodeOrOriginal(addMathJsonNodes(
    ...input.transformedCoefficients.map((coefficientNode, degree) =>
      laurentLogPrimitiveTerm(
        coefficientNode,
        input.affineNode,
        degree - input.denominatorPower,
      )),
  ));

  return input.logBase === 'Log'
    ? simplifyMathJsonNodeOrOriginal(divideMathJsonNodes(naturalNode, ['Ln', 10]))
    : naturalNode;
}

export function solveRischNormanLogRationalCorrection(
  node: unknown,
  variable: string,
): RischNormanLogRationalCorrectionResult | undefined {
  const parsed = parseIntegrand(node);
  if (!parsed) {
    return undefined;
  }
  if ('kind' in parsed) {
    return parsed;
  }

  if (parsed.denominator.power > MAX_LOG_RATIONAL_DENOMINATOR_POWER) {
    return { kind: 'stop', reason: 'over-cap-denominator-power' };
  }
  if (!sameNode(parsed.denominator.base, parsed.carrier.argument)) {
    return { kind: 'stop', reason: 'denominator-log-mismatch' };
  }

  const affine = parseSymbolicAffine(parsed.carrier.argument, variable);
  if (!affine) {
    return { kind: 'stop', reason: 'non-affine-argument' };
  }

  const slope = parseRischNormanCoefficient(affine.slope, variable);
  if (slope.kind === 'stop') {
    return coefficientStop(slope.reason);
  }

  let offsetNode: unknown = 0;
  const offsetFacts: RischNormanCoefficientFact[] = [];
  if (affine.offset !== undefined) {
    const offset = parseRischNormanCoefficient(affine.offset, variable);
    if (offset.kind === 'stop') {
      return coefficientStop(offset.reason);
    }
    offsetNode = offset.coefficient.node;
    offsetFacts.push(...offset.coefficient.facts);
  }

  const polynomial = parseRischNormanPolynomial(
    parsed.numerator,
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

  const transformedCoefficients = transformPolynomialToAffineBasis({
    coefficients: polynomial.coefficients.map((coefficient) => coefficient.node),
    offsetNode,
    slopeNode: slope.coefficient.node,
  });
  const antiderivativeNode = buildAntiderivativeNode({
    affineNode: parsed.carrier.argument,
    denominatorPower: parsed.denominator.power,
    logBase: parsed.carrier.head,
    transformedCoefficients,
  });

  const facts = dedupeFacts([
    ...coefficientFactsToAnsatzFacts(polynomial.facts),
    ...coefficientFactsToAnsatzFacts(slope.coefficient.facts),
    ...coefficientFactsToAnsatzFacts(offsetFacts),
    nonzeroFact(slope.coefficient.latex),
    positiveFact(affine.latex),
  ]);

  return profileSymbolicIntegrationResult({
    kind: 'success',
    family: 'affine-log-rational-correction',
    variable,
    source: parsed.carrier.head,
    polynomialDegree: polynomial.degree,
    denominatorPower: parsed.denominator.power,
    antiderivativeNode,
    exactLatex: normalizeGeneratedRischNormanLatex(boxLatex(antiderivativeNode), variable),
    facts,
    proof: 'risch-norman-log-rational-correction-rule-proof',
  });
}
