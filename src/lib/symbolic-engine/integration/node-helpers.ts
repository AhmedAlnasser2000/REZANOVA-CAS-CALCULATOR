import { areEquivalentNodes } from '../differentiation';
import { boxLatex, isFiniteNumber, isNodeArray, toPolynomialTerms } from '../patterns';
import { RATIONAL_APPROX_MAX_DENOMINATOR } from './types';

export function rationalApproximation(value: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  for (let denominator = 1; denominator <= RATIONAL_APPROX_MAX_DENOMINATOR; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < 1e-10) {
      return { numerator, denominator };
    }
  }

  return undefined;
}

export function numericNodeValue(node: unknown) {
  if (isFiniteNumber(node)) {
    return node;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Rational'
    && node.length === 3
    && isFiniteNumber(node[1])
    && isFiniteNumber(node[2])
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }

  return undefined;
}

export function numberLatex(value: number) {
  const rational = rationalApproximation(value);
  if (rational) {
    if (rational.denominator === 1) {
      return String(rational.numerator);
    }

    return `\\frac{${rational.numerator}}{${rational.denominator}}`;
  }

  return boxLatex(value);
}

export function sameNode(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function proportionalScale(candidate: unknown, reference: unknown, variable: string) {
  if (areEquivalentNodes(candidate, reference)) {
    return 1;
  }

  if (isFiniteNumber(candidate) && isFiniteNumber(reference) && Math.abs(reference) > 1e-10) {
    return candidate / reference;
  }

  const candidateTerms = toPolynomialTerms(candidate, variable);
  const referenceTerms = toPolynomialTerms(reference, variable);
  if (!candidateTerms || !referenceTerms || candidateTerms.length !== referenceTerms.length) {
    return undefined;
  }

  let ratio: number | undefined;
  for (let index = 0; index < candidateTerms.length; index += 1) {
    const candidateTerm = candidateTerms[index];
    const referenceTerm = referenceTerms[index];
    if (candidateTerm.degree !== referenceTerm.degree) {
      return undefined;
    }

    if (Math.abs(referenceTerm.coefficient) < 1e-10) {
      return undefined;
    }

    const nextRatio = candidateTerm.coefficient / referenceTerm.coefficient;
    if (ratio === undefined) {
      ratio = nextRatio;
      continue;
    }

    if (Math.abs(ratio - nextRatio) > 1e-10) {
      return undefined;
    }
  }

  return ratio;
}
