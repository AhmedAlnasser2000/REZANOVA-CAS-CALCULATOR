import {
  divideExactScalars,
  readExactScalarNode,
} from '../polynomial-core';
import {
  addBivariatePolynomials,
  constantBivariate,
  eliminatedBivariate,
  multiplyBivariatePolynomials,
  NEGATIVE_ONE,
  ONE,
  powerBivariatePolynomial,
  retainedBivariate,
  scaleBivariatePolynomial,
  validateBivariatePolynomial,
} from './bivariate-polynomial';
import {
  bivariateStop,
  type BivariateParseResult,
  type RequiredBivariateResultantOptions,
} from './types';

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function parseBivariateNode(
  node: unknown,
  retainedVariable: string,
  eliminatedVariable: string,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return validateBivariatePolynomial(constantBivariate(retainedVariable, eliminatedVariable, scalar), options);
  }

  if (typeof node === 'string') {
    if (node === retainedVariable) {
      return validateBivariatePolynomial(retainedBivariate(retainedVariable, eliminatedVariable), options);
    }
    if (node === eliminatedVariable) {
      return validateBivariatePolynomial(eliminatedBivariate(retainedVariable, eliminatedVariable), options);
    }
    return bivariateStop('unsupported-symbolic-parameter', { symbols: [node] });
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return bivariateStop('non-polynomial-input');
  }

  const operator = node[0];
  if (operator === 'Negate' && node.length === 2) {
    const child = parseBivariateNode(node[1], retainedVariable, eliminatedVariable, options);
    return child.kind === 'stop' ? child : scaleBivariatePolynomial(child.polynomial, NEGATIVE_ONE, options);
  }

  if (operator === 'Add' || operator === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    if (first === undefined) {
      return bivariateStop('non-polynomial-input');
    }
    const initial = parseBivariateNode(first, retainedVariable, eliminatedVariable, options);
    if (initial.kind === 'stop') {
      return initial;
    }
    return rest.reduce<BivariateParseResult>((current, child) => {
      if (current.kind === 'stop') {
        return current;
      }
      const parsedChild = parseBivariateNode(child, retainedVariable, eliminatedVariable, options);
      if (parsedChild.kind === 'stop') {
        return parsedChild;
      }
      return addBivariatePolynomials(
        current.polynomial,
        parsedChild.polynomial,
        operator === 'Add' ? 1 : -1,
        options,
      );
    }, initial);
  }

  if (operator === 'Multiply') {
    const factors = node.slice(1);
    if (factors.length === 0) {
      return bivariateStop('non-polynomial-input');
    }
    const initial = validateBivariatePolynomial(
      constantBivariate(retainedVariable, eliminatedVariable, ONE),
      options,
    );
    return factors.reduce<BivariateParseResult>((current, factor) => {
      if (current.kind === 'stop') {
        return current;
      }
      const parsedFactor = parseBivariateNode(factor, retainedVariable, eliminatedVariable, options);
      if (parsedFactor.kind === 'stop') {
        return parsedFactor;
      }
      return multiplyBivariatePolynomials(current.polynomial, parsedFactor.polynomial, options);
    }, initial);
  }

  if (operator === 'Divide' && node.length === 3) {
    const numerator = parseBivariateNode(node[1], retainedVariable, eliminatedVariable, options);
    if (numerator.kind === 'stop') {
      return numerator;
    }
    const denominator = readExactScalarNode(node[2]);
    if (!denominator) {
      return bivariateStop('non-polynomial-input');
    }
    const reciprocal = divideExactScalars(ONE, denominator);
    return reciprocal
      ? scaleBivariatePolynomial(numerator.polynomial, reciprocal, options)
      : bivariateStop('non-polynomial-input');
  }

  if (operator === 'Power' && node.length === 3) {
    const exponent = readExactScalarNode(node[2]);
    if (!exponent || exponent.denominator !== 1) {
      return bivariateStop('non-polynomial-input');
    }
    const base = parseBivariateNode(node[1], retainedVariable, eliminatedVariable, options);
    return base.kind === 'stop'
      ? base
      : powerBivariatePolynomial(base.polynomial, exponent.numerator, options);
  }

  return bivariateStop('non-polynomial-input');
}
