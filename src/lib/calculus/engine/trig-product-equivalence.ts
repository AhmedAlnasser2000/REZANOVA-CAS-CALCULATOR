import {
  buildExactScalarNode,
  exactPolynomialDegree,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  parseExactPolynomial,
  scaleExactPolynomial,
  negateExactScalar,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';

type TrigProductFactor = {
  head: 'Sin' | 'Cos';
  argument: unknown;
};

type ProductToSumTerm = {
  coefficient: ExactScalar;
  head: 'Sin' | 'Cos';
  argument: unknown;
};

function exactScalarNode(value: ExactScalar) {
  return buildExactScalarNode(value);
}

function trigProductFactor(node: unknown, variable: string): TrigProductFactor | undefined {
  if (!isNodeArray(node) || node.length !== 2 || (node[0] !== 'Sin' && node[0] !== 'Cos')) {
    return undefined;
  }

  const polynomial = parseExactPolynomial(node[1], variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  return { head: node[0] as 'Sin' | 'Cos', argument: node[1] };
}

function combineArguments(left: unknown, right: unknown, sign: 1 | -1, variable: string) {
  const combined = parseExactPolynomial(
    ['Add', left, sign === 1 ? right : ['Negate', right]],
    variable,
    1,
  );
  return combined ? exactPolynomialToNode(combined) : undefined;
}

function productToSumNode(left: TrigProductFactor, right: TrigProductFactor, variable: string) {
  const sum = combineArguments(left.argument, right.argument, 1, variable);
  const difference = combineArguments(left.argument, right.argument, -1, variable);
  if (!sum || !difference) {
    return undefined;
  }

  const half: ExactScalar = { numerator: 1, denominator: 2 };
  const negativeHalf: ExactScalar = { numerator: -1, denominator: 2 };
  let terms: ProductToSumTerm[];

  if (left.head === 'Sin' && right.head === 'Cos') {
    terms = [
      { coefficient: half, head: 'Sin', argument: sum },
      { coefficient: half, head: 'Sin', argument: difference },
    ];
  } else if (left.head === 'Cos' && right.head === 'Sin') {
    terms = [
      { coefficient: half, head: 'Sin', argument: sum },
      { coefficient: negativeHalf, head: 'Sin', argument: difference },
    ];
  } else {
    terms = [
      { coefficient: half, head: 'Cos', argument: difference },
      {
        coefficient: left.head === 'Sin' ? negativeHalf : half,
        head: 'Cos',
        argument: sum,
      },
    ];
  }

  return ['Add', ...terms.map((term) => {
    const normalized = normalizeProductToSumTerm(term, variable);
    return [
      'Multiply',
      exactScalarNode(normalized.coefficient),
      [normalized.head, normalized.argument],
    ];
  })];
}

function normalizeProductToSumTerm(term: ProductToSumTerm, variable: string): ProductToSumTerm {
  const polynomial = parseExactPolynomial(term.argument, variable, 1);
  if (!polynomial) {
    return term;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (slope.numerator >= 0) {
    return { ...term, argument: exactPolynomialToNode(polynomial) };
  }

  const negated = scaleExactPolynomial(polynomial, { numerator: -1, denominator: 1 });
  return {
    coefficient: term.head === 'Sin' ? negateExactScalar(term.coefficient) : term.coefficient,
    head: term.head,
    argument: exactPolynomialToNode(negated),
  };
}

function containsTrigProductCandidate(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Multiply' && node.length === 3) {
    const leftHead = isNodeArray(node[1]) ? node[1][0] : undefined;
    const rightHead = isNodeArray(node[2]) ? node[2][0] : undefined;
    if (
      (leftHead === 'Sin' || leftHead === 'Cos')
      && (rightHead === 'Sin' || rightHead === 'Cos')
    ) {
      return true;
    }
  }

  return node.some((child, index) => index > 0 && containsTrigProductCandidate(child));
}

function normalizeTrigProductIdentities(node: unknown, variable: string): unknown {
  if (!isNodeArray(node)) {
    return node;
  }

  const normalizedChildren = node
    .map((child, index) => index === 0 ? child : normalizeTrigProductIdentities(child, variable));

  if (normalizedChildren[0] === 'Multiply' && normalizedChildren.length === 3) {
    const left = trigProductFactor(normalizedChildren[1], variable);
    const right = trigProductFactor(normalizedChildren[2], variable);
    if (left && right) {
      return productToSumNode(left, right, variable) ?? normalizedChildren;
    }
  }

  return normalizedChildren;
}

export function normalizeTrigProductIdentityPair(left: unknown, right: unknown, variable: string) {
  if (!containsTrigProductCandidate(left) && !containsTrigProductCandidate(right)) {
    return undefined;
  }

  return {
    left: normalizeAst(normalizeTrigProductIdentities(left, variable)),
    right: normalizeAst(normalizeTrigProductIdentities(right, variable)),
  };
}
