import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import {
  boxLatex,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../patterns';

const TARGET_FREE_POLYNOMIAL_DEGREE_CAP = 6;

type TargetFreePolynomialRuleResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
};

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type Monomial = {
  degree: number;
  coefficient: unknown;
};

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by target-free polynomial direct integration rule proof',
  };
}

function nonzero(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function targetFree(node: unknown, variable: string) {
  return !dependsOnVariable(node, variable);
}

function negateNode(node: unknown): unknown {
  if (typeof node === 'number') {
    return -node;
  }
  return isNodeArray(node) && node[0] === 'Negate' && node.length === 2
    ? node[1]
    : ['Negate', node];
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : negateNode(node);
}

function multiplyNodes(factors: unknown[]): unknown {
  const meaningful = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || scalar.numerator !== 1 || scalar.denominator !== 1;
  });
  if (meaningful.length === 0) {
    return 1;
  }
  return meaningful.length === 1 ? meaningful[0] : ['Multiply', ...meaningful];
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function integerPowerOfVariable(node: unknown, variable: string): number | undefined {
  if (node === variable) {
    return 1;
  }
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || node[1] !== variable) {
    return undefined;
  }
  const exponent = readExactScalarNode(node[2]);
  if (!exponent || exponent.denominator !== 1 || exponent.numerator < 0) {
    return undefined;
  }
  return exponent.numerator;
}

function parseMonomial(term: SignedNode, variable: string): Monomial | undefined {
  const rawFactors = isNodeArray(term.node) && term.node[0] === 'Multiply'
    ? flattenMultiply(term.node)
    : [term.node];
  let degree = 0;
  const coefficientFactors: unknown[] = [];

  for (const factor of rawFactors) {
    const power = integerPowerOfVariable(factor, variable);
    if (power !== undefined) {
      degree += power;
      continue;
    }
    if (!targetFree(factor, variable)) {
      return undefined;
    }
    coefficientFactors.push(factor);
  }

  if (degree > TARGET_FREE_POLYNOMIAL_DEGREE_CAP) {
    return undefined;
  }

  return {
    degree,
    coefficient: signedNode(multiplyNodes(coefficientFactors), term.sign),
  };
}

function parseTargetFreePolynomial(node: unknown, variable: string) {
  const terms = signedAddTerms(node);
  const monomials = terms.map((term) => parseMonomial(term, variable));
  if (monomials.some((term) => term === undefined)) {
    return undefined;
  }
  return monomials.filter((term): term is Monomial => term !== undefined);
}

function powerNode(variable: string, exponent: number): unknown {
  if (exponent === 0) {
    return 1;
  }
  if (exponent === 1) {
    return variable;
  }
  return ['Power', variable, exponent];
}

function integrateMonomialNode(
  monomial: Monomial,
  variable: string,
  denominator: unknown | undefined,
): unknown {
  const nextDegree = monomial.degree + 1;
  const numerator = multiplyNodes([
    monomial.coefficient,
    powerNode(variable, nextDegree),
  ]);
  const divisor = denominator
    ? multiplyNodes([nextDegree, denominator])
    : nextDegree;
  return divisor === 1 ? numerator : ['Divide', numerator, divisor];
}

function addNodes(nodes: unknown[]) {
  if (nodes.length === 0) {
    return 0;
  }
  return nodes.length === 1 ? nodes[0] : ['Add', ...nodes];
}

function exactScalarIsZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function exactScalarIsOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

export function tryTargetFreePolynomialDirectRule(
  node: unknown,
  variable: string,
): TargetFreePolynomialRuleResult | undefined {
  let numerator = node;
  let denominator: unknown | undefined;

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    if (!targetFree(node[2], variable) || exactScalarIsZero(node[2])) {
      return undefined;
    }
    numerator = node[1];
    denominator = exactScalarIsOne(node[2]) ? undefined : node[2];
  }

  const polynomial = parseTargetFreePolynomial(numerator, variable);
  if (!polynomial || polynomial.length === 0) {
    return undefined;
  }

  const antiderivative = addNodes(
    polynomial.map((monomial) => integrateMonomialNode(monomial, variable, denominator)),
  );
  const denominatorLatex = denominator ? boxLatex(denominator) : undefined;
  return {
    exactLatex: boxLatex(antiderivative),
    verification: proof(),
    exactSupplementLatex: denominatorLatex
      ? mergeExactSupplementLatex({ entries: [nonzero(denominatorLatex)], source: 'candidate-validation' })
      : [],
  };
}
