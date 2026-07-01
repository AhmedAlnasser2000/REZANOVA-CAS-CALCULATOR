import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactScalarToNumber,
  parseExactPolynomial,
} from '../../algebra/polynomial-core';
import { normalizeExactRationalFunctionNode } from '../../algebra/rational-function';

const ce = new ComputeEngine();
export const NUMERIC_POLYNOMIAL_MAX_DEGREE = 64;

export type SolvableNumericPolynomial = {
  coefficients: number[];
  degree: number;
  kind: 'polynomial' | 'rational';
  denominatorCoefficients?: number[];
  denominatorLatex?: string;
};

export const NUMERIC_FALLBACK_ELIGIBLE_ERRORS = new Set([
  'This equation is outside the supported exact symbolic solve families.',
  'This recognized quotient-zero family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
]);

function numericCoefficientsFromPolynomial(polynomial: Parameters<typeof exactPolynomialCoefficientArray>[0]) {
  return exactPolynomialCoefficientArray(polynomial).map(exactScalarToNumber);
}

export function polynomialFromZeroForm(
  zeroFormLatex: string,
  target: string,
): SolvableNumericPolynomial | null {
  const parsed = ce.parse(zeroFormLatex).json;
  const rational = normalizeExactRationalFunctionNode(parsed, {
    variable: target,
    maxDegree: NUMERIC_POLYNOMIAL_MAX_DEGREE,
  });
  if (rational.kind === 'success') {
    if (exactPolynomialIsZero(rational.rational.numerator)) {
      return null;
    }
    const degree = exactPolynomialDegree(rational.rational.numerator);
    if (degree > NUMERIC_POLYNOMIAL_MAX_DEGREE) {
      return null;
    }
    return {
      coefficients: numericCoefficientsFromPolynomial(rational.rational.numerator),
      degree,
      kind: rational.denominatorLatex ? 'rational' : 'polynomial',
      ...(rational.denominatorLatex
        ? {
          denominatorCoefficients: numericCoefficientsFromPolynomial(rational.rational.denominator),
          denominatorLatex: rational.denominatorLatex,
        }
        : {}),
    };
  }

  const polynomial = parseExactPolynomial(parsed, target, NUMERIC_POLYNOMIAL_MAX_DEGREE);
  if (!polynomial || exactPolynomialIsZero(polynomial)) {
    return null;
  }
  const degree = exactPolynomialDegree(polynomial);
  if (degree > NUMERIC_POLYNOMIAL_MAX_DEGREE) {
    return null;
  }

  return {
    coefficients: numericCoefficientsFromPolynomial(polynomial),
    degree,
    kind: 'polynomial',
  };
}
