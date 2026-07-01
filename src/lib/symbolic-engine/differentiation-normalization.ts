import {
  addExactScalars,
  buildExactScalarNode,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { normalizeAst } from './normalize';
import {
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  termKey,
} from './patterns';
import { simplifyMathJsonNodeOrOriginal } from './primitives/simplification/simplification';

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };
const MAX_DERIVATIVE_EXPANDED_TERMS = 32;
const MAX_NORMALIZATION_PASSES = 4;

function scalarIsOne(value: ExactScalar) {
  return value.numerator === value.denominator;
}

function scalarIsNegativeOne(value: ExactScalar) {
  return value.numerator === -value.denominator;
}

function sameNode(left: unknown, right: unknown) {
  return termKey(normalizeAst(left)) === termKey(normalizeAst(right));
}

function buildProduct(factors: readonly unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return simplifyMathJsonNodeOrOriginal(['Multiply', ...factors]);
}

function buildTerm(coefficient: ExactScalar, body: unknown | null) {
  if (exactScalarIsZero(coefficient)) {
    return null;
  }

  if (body === null) {
    return buildExactScalarNode(coefficient);
  }

  if (scalarIsOne(coefficient)) {
    return body;
  }

  if (scalarIsNegativeOne(coefficient)) {
    return simplifyMathJsonNodeOrOriginal(['Negate', body]);
  }

  return simplifyMathJsonNodeOrOriginal(['Multiply', buildExactScalarNode(coefficient), body]);
}

function splitCoefficient(term: unknown): { coefficient: ExactScalar; body: unknown | null } {
  const scalar = readExactScalarNode(term);
  if (scalar) {
    return { coefficient: scalar, body: null };
  }

  if (isNodeArray(term) && term[0] === 'Negate' && term.length === 2) {
    const split = splitCoefficient(term[1]);
    return {
      coefficient: negateExactScalar(split.coefficient),
      body: split.body,
    };
  }

  if (isNodeArray(term) && term[0] === 'Multiply') {
    let coefficient = EXACT_ONE;
    const bodyFactors: unknown[] = [];
    for (const factor of flattenMultiply(term)) {
      const factorScalar = readExactScalarNode(factor);
      if (factorScalar) {
        coefficient = multiplyExactScalars(coefficient, factorScalar);
      } else {
        bodyFactors.push(factor);
      }
    }

    return {
      coefficient,
      body: bodyFactors.length === 0 ? null : buildProduct(bodyFactors),
    };
  }

  return { coefficient: EXACT_ONE, body: term };
}

function collectLikeTerms(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const collectedChildren = children.map(collectLikeTerms);

  if (head !== 'Add') {
    return simplifyMathJsonNodeOrOriginal([head, ...collectedChildren]);
  }

  const groups = new Map<string, { coefficient: ExactScalar; body: unknown | null }>();
  const order: string[] = [];
  for (const term of collectedChildren.flatMap((child) => flattenAdd(child))) {
    const split = splitCoefficient(term);
    const key = split.body === null ? '__constant__' : termKey(normalizeAst(split.body));
    const current = groups.get(key);
    if (current) {
      current.coefficient = addExactScalars(current.coefficient, split.coefficient);
    } else {
      groups.set(key, {
        coefficient: split.coefficient,
        body: split.body,
      });
      order.push(key);
    }
  }

  const terms = order
    .map((key) => {
      const group = groups.get(key)!;
      return buildTerm(group.coefficient, group.body);
    })
    .filter((term): term is unknown => term !== null);

  if (terms.length === 0) {
    return 0;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return simplifyMathJsonNodeOrOriginal(['Add', ...terms]);
}

function distributeProducts(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const distributedChildren = children.map(distributeProducts);
  if (head !== 'Multiply') {
    return simplifyMathJsonNodeOrOriginal([head, ...distributedChildren]);
  }

  const factors = distributedChildren.flatMap((child) => flattenMultiply(child));
  const groups: unknown[][] = [];
  for (const factor of factors) {
    groups.push(isNodeArray(factor) && factor[0] === 'Add' ? flattenAdd(factor) : [factor]);
  }

  const expanded: unknown[][] = [[]];
  for (const group of groups) {
    if (expanded.length * group.length > MAX_DERIVATIVE_EXPANDED_TERMS) {
      return simplifyMathJsonNodeOrOriginal(['Multiply', ...factors]);
    }
    const next: unknown[][] = [];
    for (const prefix of expanded) {
      for (const factor of group) {
        next.push([...prefix, factor]);
      }
    }
    expanded.splice(0, expanded.length, ...next);
  }

  if (expanded.length <= 1) {
    return simplifyMathJsonNodeOrOriginal(['Multiply', ...factors]);
  }

  return simplifyMathJsonNodeOrOriginal([
    'Add',
    ...expanded.map((termFactors) => buildProduct(termFactors)),
  ]);
}

export function normalizeDerivativeOutputNode(node: unknown): unknown {
  let current = simplifyMathJsonNodeOrOriginal(node);
  for (let pass = 0; pass < MAX_NORMALIZATION_PASSES; pass += 1) {
    const next = simplifyMathJsonNodeOrOriginal(
      collectLikeTerms(distributeProducts(current)),
    );
    if (sameNode(current, next)) {
      return normalizeAst(next);
    }
    current = next;
  }

  return normalizeAst(current);
}
