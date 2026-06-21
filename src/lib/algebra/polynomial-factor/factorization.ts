import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToNode,
  exactScalarEquals,
  getExactPolynomialCoefficient,
  negateExactScalar,
  normalizeExactScalar,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import { nodeLatex, simplifyNode } from './math-json';
import { biquadraticFactorization, quarticFactorIntoQuadratics } from './quadratic';
import {
  buildLinearFactorNode,
  clearPolynomialDenominators,
  extractRationalRootFactorization,
} from './rational-root';
import type {
  BoundedPolynomialFactor,
  BoundedPolynomialFactorization,
  BoundedPolynomialFactorOptions,
} from './types';

function buildFactorizedNode(scalar: ExactScalar, factors: BoundedPolynomialFactor[]) {
  const repeatedFactors = factors.flatMap((factor) =>
    Array.from({ length: factor.multiplicity }, () => factor.node));

  const normalizedScalar = normalizeExactScalar(scalar);
  const isUnitScalar = exactScalarEquals(normalizedScalar, { numerator: 1, denominator: 1 });
  if (repeatedFactors.length === 0) {
    return buildExactScalarNode(normalizedScalar);
  }
  if (isUnitScalar) {
    return repeatedFactors.length === 1 ? repeatedFactors[0] : ['Multiply', ...repeatedFactors];
  }
  return ['Multiply', buildExactScalarNode(normalizedScalar), ...repeatedFactors];
}

export function factorBoundedPolynomial(
  polynomial: ExactPolynomial,
  options: BoundedPolynomialFactorOptions = {},
): BoundedPolynomialFactorization | null {
  const maxDegree = options.maxDegree ?? 4;
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 3 || degree > maxDegree) {
    return null;
  }

  const primitive = clearPolynomialDenominators(polynomial);
  if (!primitive) {
    return null;
  }

  if (degree === 4) {
    const biquadratic = biquadraticFactorization(polynomial);
    if (biquadratic) {
      const factorizedNode = buildFactorizedNode(biquadratic.scalar, biquadratic.factors);
      return {
        variable: polynomial.variable,
        scalar: biquadratic.scalar,
        factorizedNode,
        factorizedLatex: nodeLatex(factorizedNode),
        factors: biquadratic.factors,
        strategy: biquadratic.strategy,
      };
    }
  }

  const extracted = extractRationalRootFactorization(primitive.polynomial, degree > 4
    ? { integerRootSearchBound: maxDegree, divisorEnumerationLimit: 1_000_000 }
    : {});
  if (extracted.factors.length > 0) {
    const remainderDegree = exactPolynomialDegree(extracted.remainder);
    const factors = [...extracted.factors];
    if (remainderDegree === 2) {
      const remainderNode = simplifyNode(exactPolynomialToNode(extracted.remainder));
      factors.push({
        node: remainderNode,
        latex: nodeLatex(remainderNode),
        multiplicity: 1,
        degree: 2,
      });
    } else if (remainderDegree === 1) {
      const remainderRoot = divideExactScalars(
        negateExactScalar(getExactPolynomialCoefficient(extracted.remainder, 0)),
        getExactPolynomialCoefficient(extracted.remainder, 1),
      );
      if (!remainderRoot) {
        return null;
      }
      const factorNode = simplifyNode(buildLinearFactorNode(polynomial.variable, remainderRoot));
      factors.push({
        node: factorNode,
        latex: nodeLatex(factorNode),
        multiplicity: 1,
        degree: 1,
      });
    } else if (remainderDegree !== 0) {
      return null;
    }

    const factorizedNode = buildFactorizedNode(primitive.scalar, factors);
    return {
      variable: polynomial.variable,
      scalar: primitive.scalar,
      factorizedNode,
      factorizedLatex: nodeLatex(factorizedNode),
      factors,
      strategy: 'rational-root',
    };
  }

  if (degree === 4) {
    const quadraticPair = quarticFactorIntoQuadratics(polynomial);
    if (quadraticPair) {
      const factorizedNode = buildFactorizedNode(quadraticPair.scalar, quadraticPair.factors);
      return {
        variable: polynomial.variable,
        scalar: quadraticPair.scalar,
        factorizedNode,
        factorizedLatex: nodeLatex(factorizedNode),
        factors: quadraticPair.factors,
        strategy: quadraticPair.strategy,
      };
    }
  }

  return null;
}
