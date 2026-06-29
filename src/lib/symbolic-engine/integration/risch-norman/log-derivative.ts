import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { expandMathJsonNodeOrOriginal } from '../../primitives/expansion/expansion';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';
import {
  isRischNormanCoefficientOne,
  isRischNormanCoefficientZero,
  mergeRischNormanCoefficientFacts,
  multiplyRischNormanCoefficients,
  parseRischNormanCoefficient,
  type RischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import { parseRischNormanPolynomial } from './polynomial';

export type RischNormanLogDerivativeStopReason =
  | 'coefficient-stop'
  | 'constant-denominator'
  | 'non-rational-shape'
  | 'not-log-derivative'
  | 'over-cap-degree';

export type RischNormanLogDerivativeResult =
  | {
    kind: 'success';
    antiderivativeNode: unknown;
    exactLatex: string;
    verification: AntiderivativeBackcheck;
    exactSupplementLatex: string[];
  }
  | {
    kind: 'stop';
    reason: RischNormanLogDerivativeStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type RationalShape = {
  numerator: unknown;
  denominator: unknown;
};

const MAX_LOG_DERIVATIVE_DENOMINATOR_DEGREE = 6;

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by internal Risch-Norman log-derivative rule proof',
  };
}

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanLogDerivativeResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function cleanNonzeroFactExpression(latex: string) {
  return latex.replace(/^-?\d+(?=[A-Za-z]|\\left|\()/, '');
}

function factEntry(fact: RischNormanCoefficientFact): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex: cleanNonzeroFactExpression(fact.expressionLatex),
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function parseReciprocalFactor(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return undefined;
  }

  const power = exactInteger(node[2]);
  return power === -1 ? node[1] : undefined;
}

function multiplyFactors(factors: unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function parseRationalShape(node: unknown): RationalShape | undefined {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return { numerator: node[1], denominator: node[2] };
  }

  const reciprocal = parseReciprocalFactor(node);
  if (reciprocal) {
    return { numerator: 1, denominator: reciprocal };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  const reciprocalFactors = factors
    .map((factor, index) => ({ factor: parseReciprocalFactor(factor), index }))
    .filter((entry): entry is { factor: unknown; index: number } => Boolean(entry.factor));
  if (reciprocalFactors.length !== 1) {
    return undefined;
  }

  const numeratorFactors = factors.filter((_, index) => index !== reciprocalFactors[0].index);
  return {
    numerator: multiplyFactors(numeratorFactors),
    denominator: reciprocalFactors[0].factor,
  };
}

function coefficientTimesInteger(
  coefficient: RischNormanCoefficient,
  factor: number,
  variable: string,
) {
  const integer = parseRischNormanCoefficient(factor, variable);
  if (integer.kind === 'stop') {
    return integer;
  }
  return multiplyRischNormanCoefficients(coefficient, integer.coefficient, variable);
}

function derivativeCoefficients(
  denominator: RischNormanCoefficient[],
  variable: string,
) {
  const derivatives: RischNormanCoefficient[] = [];
  for (let degree = 1; degree < denominator.length; degree += 1) {
    const scaled = coefficientTimesInteger(denominator[degree], degree, variable);
    if (scaled.kind === 'stop') {
      return scaled;
    }
    derivatives[degree - 1] = scaled.coefficient;
  }
  return { kind: 'success' as const, coefficients: derivatives };
}

function subtractCoefficientNodes(left: unknown, right: unknown, variable: string) {
  return parseRischNormanCoefficient(
    subtractMathJsonNodes(left, right),
    variable,
  );
}

function crossProductsMatch(input: {
  numerator: RischNormanCoefficient[];
  derivative: RischNormanCoefficient[];
  pivotNumerator: RischNormanCoefficient;
  pivotDerivative: RischNormanCoefficient;
  variable: string;
}) {
  const width = Math.max(input.numerator.length, input.derivative.length);
  const zero = parseRischNormanCoefficient(0, input.variable);
  if (zero.kind === 'stop') {
    return zero;
  }

  for (let index = 0; index < width; index += 1) {
    const numeratorCoefficient = input.numerator[index] ?? zero.coefficient;
    const derivativeCoefficient = input.derivative[index] ?? zero.coefficient;
    const left = multiplyMathJsonNodes(numeratorCoefficient.node, input.pivotDerivative.node);
    const right = multiplyMathJsonNodes(input.pivotNumerator.node, derivativeCoefficient.node);
    const leftCoefficient = parseRischNormanCoefficient(left, input.variable);
    if (leftCoefficient.kind === 'stop') {
      return leftCoefficient;
    }
    const rightCoefficient = parseRischNormanCoefficient(right, input.variable);
    if (rightCoefficient.kind === 'stop') {
      return rightCoefficient;
    }
    if (leftCoefficient.coefficient.key === rightCoefficient.coefficient.key) {
      continue;
    }

    const difference = subtractCoefficientNodes(left, right, input.variable);
    if (difference.kind === 'stop') {
      return difference;
    }
    if (!isRischNormanCoefficientZero(difference.coefficient)) {
      return { kind: 'mismatch' as const };
    }
  }

  return { kind: 'match' as const };
}

function findPivot(derivative: RischNormanCoefficient[]) {
  for (let index = derivative.length - 1; index >= 0; index -= 1) {
    if (!isRischNormanCoefficientZero(derivative[index])) {
      return index;
    }
  }
  return undefined;
}

function structuralFactorKey(node: unknown) {
  return boxLatex(simplifyMathJsonNodeOrOriginal(node)).replace(/\s+/g, '');
}

function splitProductFactors(node: unknown) {
  const simplified = simplifyMathJsonNodeOrOriginal(node);
  const factors = isNodeArray(simplified) && simplified[0] === 'Multiply'
    ? flattenMultiply(simplified)
    : [simplified];
  const symbolic: unknown[] = [];
  let scalarNode: unknown = 1;

  for (const factor of factors) {
    const scalar = readExactScalarNode(factor);
    if (scalar) {
      scalarNode = multiplyMathJsonNodes(scalarNode, factor);
    } else {
      symbolic.push(factor);
    }
  }

  return { scalarNode, symbolic };
}

function cancelCommonProductFactors(numeratorNode: unknown, denominatorNode: unknown) {
  const numerator = splitProductFactors(numeratorNode);
  const denominator = splitProductFactors(denominatorNode);
  const remainingNumerator = [...numerator.symbolic];
  const remainingDenominator = [...denominator.symbolic];

  for (let index = remainingNumerator.length - 1; index >= 0; index -= 1) {
    const numeratorKey = structuralFactorKey(remainingNumerator[index]);
    const denominatorIndex = remainingDenominator.findIndex((factor) => structuralFactorKey(factor) === numeratorKey);
    if (denominatorIndex < 0) {
      continue;
    }
    remainingNumerator.splice(index, 1);
    remainingDenominator.splice(denominatorIndex, 1);
  }

  const scalarQuotient: unknown = ['Divide', numerator.scalarNode, denominator.scalarNode];

  const numeratorFactors = [scalarQuotient, ...remainingNumerator];
  const numeratorProduct = multiplyMathJsonNodes(...numeratorFactors);
  const denominatorProduct = multiplyMathJsonNodes(...remainingDenominator);
  const remainingDenominatorScalar = readExactScalarNode(denominatorProduct);
  return remainingDenominatorScalar && remainingDenominatorScalar.numerator === remainingDenominatorScalar.denominator
    ? numeratorProduct
    : ['Divide', numeratorProduct, denominatorProduct];
}

function scalarQuotientCoefficient(input: {
  numerator: RischNormanCoefficient;
  denominator: RischNormanCoefficient;
  variable: string;
}) {
  const quotientNode = cancelCommonProductFactors(input.numerator.node, input.denominator.node);
  return parseRischNormanCoefficient(quotientNode, input.variable, [
    ...input.numerator.facts,
    ...input.denominator.facts,
    { kind: 'nonzero', expressionLatex: input.denominator.latex, relation: '\\ne0' },
  ]);
}

function logLatex(denominatorLatex: string) {
  return `\\ln\\left|${denominatorLatex}\\right|`;
}

function coefficientTimesLogLatex(coefficient: RischNormanCoefficient, denominatorLatex: string) {
  if (isRischNormanCoefficientZero(coefficient)) {
    return '0';
  }
  const log = logLatex(denominatorLatex);
  if (isRischNormanCoefficientOne(coefficient)) {
    return log;
  }

  const scalar = readExactScalarNode(coefficient.node);
  if (scalar && scalar.numerator === -scalar.denominator) {
    return `-${log}`;
  }

  return `${coefficient.latex}\\cdot ${log}`;
}

function antiderivativeNode(coefficient: RischNormanCoefficient, denominatorNode: unknown) {
  const logNode = ['Ln', ['Abs', denominatorNode]];
  if (isRischNormanCoefficientOne(coefficient)) {
    return logNode;
  }
  return multiplyMathJsonNodes(coefficient.node, logNode);
}

export function tryRischNormanLogDerivativeRule(
  node: unknown,
  variable: string,
): RischNormanLogDerivativeResult {
  const shape = parseRationalShape(node);
  if (!shape) {
    return { kind: 'stop', reason: 'non-rational-shape' };
  }

  const denominatorNode = expandMathJsonNodeOrOriginal(shape.denominator, {
    maxExpandedTerms: 16,
    maxNodeCount: 160,
  });
  const numeratorNode = expandMathJsonNodeOrOriginal(shape.numerator, {
    maxExpandedTerms: 16,
    maxNodeCount: 160,
  });

  const denominator = parseRischNormanPolynomial(
    denominatorNode,
    variable,
    MAX_LOG_DERIVATIVE_DENOMINATOR_DEGREE,
  );
  if (denominator.kind === 'stop') {
    return denominator.reason === 'over-cap-degree'
      ? { kind: 'stop', reason: 'over-cap-degree' }
      : coefficientStop(denominator.coefficientReason ?? 'selected-variable-dependent-coefficient');
  }
  if (denominator.degree < 1) {
    return { kind: 'stop', reason: 'constant-denominator' };
  }
  if (denominator.degree < 2) {
    return { kind: 'stop', reason: 'not-log-derivative' };
  }

  const numerator = parseRischNormanPolynomial(
    numeratorNode,
    variable,
    MAX_LOG_DERIVATIVE_DENOMINATOR_DEGREE,
  );
  if (numerator.kind === 'stop') {
    return numerator.reason === 'over-cap-degree'
      ? { kind: 'stop', reason: 'over-cap-degree' }
      : coefficientStop(numerator.coefficientReason ?? 'selected-variable-dependent-coefficient');
  }

  const derivative = derivativeCoefficients(denominator.coefficients, variable);
  if (derivative.kind === 'stop') {
    return coefficientStop(derivative.reason);
  }

  const pivotIndex = findPivot(derivative.coefficients);
  if (pivotIndex === undefined) {
    return { kind: 'stop', reason: 'constant-denominator' };
  }

  const zero = parseRischNormanCoefficient(0, variable);
  if (zero.kind === 'stop') {
    return coefficientStop(zero.reason);
  }
  const pivotNumerator = numerator.coefficients[pivotIndex] ?? zero.coefficient;
  const pivotDerivative = derivative.coefficients[pivotIndex];
  const quotient = scalarQuotientCoefficient({
    numerator: pivotNumerator,
    denominator: pivotDerivative,
    variable,
  });
  if (quotient.kind === 'stop') {
    return coefficientStop(quotient.reason);
  }

  const match = crossProductsMatch({
    numerator: numerator.coefficients,
    derivative: derivative.coefficients,
    pivotNumerator,
    pivotDerivative,
    variable,
  });
  if (match.kind === 'stop') {
    return coefficientStop(match.reason);
  }
  if (match.kind !== 'match') {
    return { kind: 'stop', reason: 'not-log-derivative' };
  }

  const facts = mergeRischNormanCoefficientFacts([
    ...denominator.facts,
    ...numerator.facts,
    ...quotient.coefficient.facts,
  ]);
  const exactLatex = normalizeGeneratedRischNormanLatex(
    coefficientTimesLogLatex(quotient.coefficient, boxLatex(denominatorNode)),
    variable,
  );
  return {
    kind: 'success',
    antiderivativeNode: antiderivativeNode(quotient.coefficient, denominatorNode),
    exactLatex,
    verification: proof(),
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: facts.map(factEntry),
      source: 'candidate-validation',
    }),
  };
}
