import {
  exactPolynomialDegree,
  getExactPolynomialCoefficient,
} from './arithmetic';
import {
  addExactScalars,
  multiplyExactScalars,
  negateExactScalar,
} from './scalars';
import type { ExactPolynomial, ExactScalar } from './types';

export function quadraticDiscriminant(polynomial: ExactPolynomial): ExactScalar | null {
  if (exactPolynomialDegree(polynomial) !== 2) {
    return null;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  if (a.numerator === 0) {
    return null;
  }

  const b = getExactPolynomialCoefficient(polynomial, 1);
  const c = getExactPolynomialCoefficient(polynomial, 0);
  const bSquared = multiplyExactScalars(b, b);
  const fourAC = multiplyExactScalars(
    { numerator: 4, denominator: 1 },
    multiplyExactScalars(a, c),
  );
  return addExactScalars(bSquared, negateExactScalar(fourAC));
}

