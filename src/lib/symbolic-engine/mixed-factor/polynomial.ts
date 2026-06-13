import {
  addExactScalars,
  multiplyExactScalars,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../normalize';
import {
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../patterns';
import { expandOnce, extractCarrierDegree } from './carriers';
import type { MixedCarrierCandidate, MixedCarrierTerm } from './types';

function extractCarrierTerm(node: unknown, candidate: MixedCarrierCandidate): MixedCarrierTerm | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return { coefficient: scalar, degree: 0 };
  }

  if (!dependsOnVariable(normalized, candidate.variable)) {
    return null;
  }

  const directDegree = extractCarrierDegree(normalized, candidate);
  if (directDegree !== null) {
    return {
      coefficient: { numerator: 1, denominator: 1 },
      degree: directDegree,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const child = extractCarrierTerm(normalized[1], candidate);
    return child
      ? {
          coefficient: { numerator: -child.coefficient.numerator, denominator: child.coefficient.denominator },
          degree: child.degree,
        }
      : null;
  }

  if (isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3) {
    const numerator = extractCarrierTerm(normalized[1], candidate);
    const denominator = readExactScalarNode(normalized[2]);
    if (!numerator || !denominator) {
      return null;
    }

    return {
      coefficient: {
        numerator: numerator.coefficient.numerator * denominator.denominator,
        denominator: numerator.coefficient.denominator * denominator.numerator,
      },
      degree: numerator.degree,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    let coefficient: ExactScalar = { numerator: 1, denominator: 1 };
    let degree = 0;

    for (const factor of flattenMultiply(normalized)) {
      const factorScalar = readExactScalarNode(factor);
      if (factorScalar) {
        coefficient = multiplyExactScalars(coefficient, factorScalar);
        continue;
      }

      const factorTerm = extractCarrierTerm(factor, candidate);
      if (!factorTerm) {
        return null;
      }

      coefficient = multiplyExactScalars(coefficient, factorTerm.coefficient);
      degree += factorTerm.degree;
    }

    return { coefficient, degree };
  }

  return null;
}

export function buildCarrierPolynomial(node: unknown, candidate: MixedCarrierCandidate): ExactPolynomial | null {
  const expanded = expandOnce(node);
  const terms = flattenAdd(expanded);
  const polynomialTerms = new Map<number, ExactScalar>();
  let sawCarrierDegree = false;

  for (const term of terms) {
    const parsed = extractCarrierTerm(term, candidate);
    if (!parsed || parsed.degree < 0 || parsed.degree > 4) {
      return null;
    }

    if (parsed.degree > 0) {
      sawCarrierDegree = true;
    }

    const current = polynomialTerms.get(parsed.degree);
    const next = current ? addExactScalars(current, parsed.coefficient) : parsed.coefficient;
    if (next.numerator === 0) {
      polynomialTerms.delete(parsed.degree);
    } else {
      polynomialTerms.set(parsed.degree, next);
    }
  }

  if (!sawCarrierDegree) {
    return null;
  }

  return {
    variable: 'u',
    terms: polynomialTerms,
  };
}

export function isRecognizedMixedFamily(polynomial: ExactPolynomial, candidate: MixedCarrierCandidate) {
  if (polynomial.terms.size === 0) {
    return false;
  }

  return [...polynomial.terms.keys()].some((degree) =>
    degree > 0 && degree % candidate.denominator !== 0);
}
