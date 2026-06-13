import { exactScalarToNumber, parseExactPolynomial } from '../../algebra/polynomial-core';
import { isFiniteNumber, isNodeArray } from './guards';
import { boxLatex } from './latex';
import { dependsOnVariable } from './structure';

export type AffineForm = {
  a: number;
  b: number;
  latex: string;
};

export type PolynomialTerm = {
  degree: number;
  coefficient: number;
};

export function numericConstant(node: unknown): number | undefined {
  if (isFiniteNumber(node)) {
    return node;
  }

  if (!isNodeArray(node)) {
    return undefined;
  }

  if (node[0] === 'Multiply') {
    let product = 1;
    for (const factor of node.slice(1)) {
      const numeric = numericConstant(factor);
      if (numeric === undefined) {
        return undefined;
      }
      product *= numeric;
    }
    return product;
  }

  return undefined;
}

export function parseLinearTerm(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length !== 3) {
    return undefined;
  }

  const [, left, right] = node;
  if (left === variable && isFiniteNumber(right)) {
    return right;
  }

  if (right === variable && isFiniteNumber(left)) {
    return left;
  }

  return undefined;
}

export function parseAffine(node: unknown, variable: string): AffineForm | undefined {
  if (node === variable) {
    return { a: 1, b: 0, latex: variable };
  }

  const linear = parseLinearTerm(node, variable);
  if (linear !== undefined) {
    return { a: linear, b: 0, latex: boxLatex(node) };
  }

  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  if (isFiniteNumber(left)) {
    const affine = parseAffine(right, variable);
    return affine
      ? { a: affine.a, b: affine.b + left, latex: boxLatex(node) }
      : undefined;
  }

  if (isFiniteNumber(right)) {
    const affine = parseAffine(left, variable);
    return affine
      ? { a: affine.a, b: affine.b + right, latex: boxLatex(node) }
      : undefined;
  }

  return undefined;
}

export function polynomialTerms(node: unknown, variable: string): Map<number, number> | undefined {
  const exactPolynomial = parseExactPolynomial(node, variable, 4);
  if (exactPolynomial) {
    const terms = new Map<number, number>();
    for (const [degree, coefficient] of exactPolynomial.terms.entries()) {
      terms.set(degree, exactScalarToNumber(coefficient));
    }
    return terms;
  }

  if (!dependsOnVariable(node, variable)) {
    const constant = numericConstant(node);
    return constant === undefined ? undefined : new Map([[0, constant]]);
  }

  if (node === variable) {
    return new Map([[1, 1]]);
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const result = new Map<number, number>();
    for (const term of node.slice(1)) {
      const partial = polynomialTerms(term, variable);
      if (!partial) {
        return undefined;
      }

      for (const [degree, coefficient] of partial.entries()) {
        result.set(degree, (result.get(degree) ?? 0) + coefficient);
      }
    }

    return result;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    let coefficient = 1;
    let degree = 0;

    for (const factor of node.slice(1)) {
      if (!dependsOnVariable(factor, variable)) {
        const numeric = numericConstant(factor);
        if (numeric === undefined) {
          return undefined;
        }
        coefficient *= numeric;
        continue;
      }

      if (factor === variable) {
        degree += 1;
        continue;
      }

      if (
        isNodeArray(factor)
        && factor[0] === 'Power'
        && factor.length === 3
        && factor[1] === variable
        && isFiniteNumber(factor[2])
        && Number.isInteger(factor[2])
      ) {
        degree += factor[2];
        continue;
      }

      return undefined;
    }

    return new Map([[degree, coefficient]]);
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && isFiniteNumber(node[2])
    && Number.isInteger(node[2])
  ) {
    return new Map([[node[2], 1]]);
  }

  return undefined;
}

export function toPolynomialTerms(node: unknown, variable: string): PolynomialTerm[] | undefined {
  const terms = polynomialTerms(node, variable);
  if (!terms) {
    return undefined;
  }

  return [...terms.entries()]
    .filter(([, coefficient]) => Math.abs(coefficient) > 1e-10)
    .map(([degree, coefficient]) => ({ degree, coefficient }))
    .sort((left, right) => right.degree - left.degree);
}
