import {
  addExactScalars,
  exactScalarIsZero,
  exactScalarToNumber,
  multiplyExactScalars,
  normalizeExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  numericValueForNode,
  reverseRelation,
  simplifyNode,
  isNodeArray,
} from './relation';
import {
  exactScalarToNode,
} from './finite';
import type { InequalityRelation } from './types';

function exactScalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === normalized.denominator;
}

function addExactScalarList(values: readonly ExactScalar[]) {
  return values.reduce<ExactScalar>(
    (current, value) => addExactScalars(current, value),
    { numerator: 0, denominator: 1 },
  );
}

function multiplyExactScalarList(values: readonly ExactScalar[]) {
  return values.reduce<ExactScalar>(
    (current, value) => multiplyExactScalars(current, value),
    { numerator: 1, denominator: 1 },
  );
}

function buildAddNode(terms: readonly unknown[]) {
  return terms.length === 1 ? terms[0] : simplifyNode(['Add', ...terms]);
}

function buildMultiplyNode(factors: readonly unknown[]) {
  return factors.length === 1 ? factors[0] : simplifyNode(['Multiply', ...factors]);
}

function peelAdditiveNumericShell(expression: unknown, bound: unknown, relation: InequalityRelation) {
  if (!isNodeArray(expression) || expression[0] !== 'Add' || expression.length < 3) {
    return null;
  }

  const scalarTerms: ExactScalar[] = [];
  const expressionTerms: unknown[] = [];
  for (const term of expression.slice(1)) {
    const scalar = readExactScalarNode(term);
    if (scalar) {
      scalarTerms.push(scalar);
    } else {
      expressionTerms.push(term);
    }
  }

  if (expressionTerms.length !== 1 || scalarTerms.length === 0) {
    return null;
  }

  const scalarSum = addExactScalarList(scalarTerms);
  if (exactScalarIsZero(scalarSum)) {
    return null;
  }

  return {
    left: buildAddNode(expressionTerms),
    right: simplifyNode(['Subtract', bound, exactScalarToNode(scalarSum)]),
    relation,
    line: 'Moved a target-free additive shell across the inequality.',
  };
}

function reciprocalExactScalar(value: ExactScalar) {
  return value.numerator === 0
    ? null
    : normalizeExactScalar({ numerator: value.denominator, denominator: value.numerator });
}

function peelMultiplicativeNumericShell(expression: unknown, bound: unknown, relation: InequalityRelation) {
  const factors = isNodeArray(expression) && expression[0] === 'Multiply'
    ? expression.slice(1)
    : isNodeArray(expression) && expression[0] === 'Divide' && expression.length === 3
      ? [expression[1], ['Power', expression[2], -1]]
      : null;
  if (!factors || factors.length < 2) {
    return null;
  }

  const scalarFactors: ExactScalar[] = [];
  const expressionFactors: unknown[] = [];
  for (const factor of factors) {
    const reciprocal =
      isNodeArray(factor) && factor[0] === 'Power' && factor.length === 3 && factor[2] === -1
        ? readExactScalarNode(factor[1])
        : null;
    if (reciprocal) {
      const inverted = reciprocalExactScalar(reciprocal);
      if (!inverted) {
        return null;
      }
      scalarFactors.push(inverted);
      continue;
    }

    const scalar = readExactScalarNode(factor);
    if (scalar) {
      scalarFactors.push(scalar);
    } else {
      expressionFactors.push(factor);
    }
  }

  if (expressionFactors.length === 0 || scalarFactors.length === 0) {
    return null;
  }

  const scalarProduct = multiplyExactScalarList(scalarFactors);
  if (exactScalarIsZero(scalarProduct) || exactScalarIsOne(scalarProduct)) {
    return null;
  }

  const scalarSign = exactScalarToNumber(scalarProduct);
  return {
    left: buildMultiplyNode(expressionFactors),
    right: simplifyNode(['Divide', bound, exactScalarToNode(scalarProduct)]),
    relation: scalarSign < 0 ? reverseRelation(relation) : relation,
    line: scalarSign < 0
      ? 'Scaled both sides by a negative target-free factor and flipped the inequality direction.'
      : 'Scaled both sides by a positive target-free factor.',
  };
}

function peelNumericShellComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
}): { left: unknown; right: unknown; relation: InequalityRelation; line: string } | null {
  if (numericValueForNode(input.right) !== null) {
    return peelAdditiveNumericShell(input.left, input.right, input.relation)
      ?? peelMultiplicativeNumericShell(input.left, input.right, input.relation);
  }

  if (numericValueForNode(input.left) !== null) {
    const reversedRelation = reverseRelation(input.relation);
    return peelAdditiveNumericShell(input.right, input.left, reversedRelation)
      ?? peelMultiplicativeNumericShell(input.right, input.left, reversedRelation);
  }

  return null;
}


export { peelNumericShellComparison };
