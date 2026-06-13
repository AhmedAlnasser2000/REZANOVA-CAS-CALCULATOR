import {
  addExactPolynomials,
  multiplyExactPolynomials,
  polynomialFromDegree,
  polynomialFromScalar,
  scaleExactPolynomial,
} from './arithmetic';
import {
  isNodeArray,
  readExactScalarNode,
} from './math-json';
import { divideExactScalars } from './scalars';
import type { ExactPolynomial } from './types';

export function parseExactPolynomial(
  node: unknown,
  variable: string,
  maxDegree: number,
): ExactPolynomial | null {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return polynomialFromScalar(variable, scalar);
  }

  if (node === variable) {
    return polynomialFromDegree(variable, 1, { numerator: 1, denominator: 1 });
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return null;
  }

  const operator = node[0];

  if (operator === 'Negate' && node.length === 2) {
    const child = parseExactPolynomial(node[1], variable, maxDegree);
    return child ? scaleExactPolynomial(child, { numerator: -1, denominator: 1 }) : null;
  }

  if (operator === 'Add' || operator === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    if (first === undefined) {
      return null;
    }

    const initial = parseExactPolynomial(first, variable, maxDegree);
    if (!initial) {
      return null;
    }

    return rest.reduce<ExactPolynomial | null>((current, child) => {
      if (!current) {
        return null;
      }
      const parsedChild = parseExactPolynomial(child, variable, maxDegree);
      if (!parsedChild) {
        return null;
      }
      return addExactPolynomials(current, parsedChild, operator === 'Add' ? 1 : -1);
    }, initial);
  }

  if (operator === 'Multiply') {
    const factors = node.slice(1);
    if (factors.length === 0) {
      return null;
    }

    return factors.reduce<ExactPolynomial | null>((current, factor) => {
      const parsedFactor = parseExactPolynomial(factor, variable, maxDegree);
      if (!current || !parsedFactor) {
        return null;
      }
      return multiplyExactPolynomials(current, parsedFactor, maxDegree);
    }, polynomialFromScalar(variable, { numerator: 1, denominator: 1 }));
  }

  if (operator === 'Divide' && node.length === 3) {
    const numerator = parseExactPolynomial(node[1], variable, maxDegree);
    const denominator = readExactScalarNode(node[2]);
    if (!numerator || !denominator) {
      return null;
    }
    const reciprocal = divideExactScalars({ numerator: 1, denominator: 1 }, denominator);
    return reciprocal ? scaleExactPolynomial(numerator, reciprocal) : null;
  }

  if (operator === 'Power' && node.length === 3 && node[1] === variable) {
    const exponent = readExactScalarNode(node[2]);
    if (!exponent || exponent.denominator !== 1 || exponent.numerator < 0 || exponent.numerator > maxDegree) {
      return null;
    }
    return polynomialFromDegree(variable, exponent.numerator, { numerator: 1, denominator: 1 });
  }

  return null;
}

