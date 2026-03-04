import {
  areComplexClose,
  complex,
  complexAbs,
  complexAdd,
  complexDiv,
  complexMul,
  complexSqrt,
  complexSub,
  normalizeComplex,
  type ComplexValue,
} from './complex';

const LEADING_EPSILON = 1e-10;
const CONVERGENCE_EPSILON = 1e-10;
const DEDUPE_EPSILON = 1e-7;
const MAX_ITERATIONS = 100;
const SEED_ANGLE_OFFSET = 0.25;

export type PolynomialRootsRequest = {
  coefficients: number[];
};

export type PolynomialRootsResult =
  | { kind: 'success'; roots: ComplexValue[] }
  | { kind: 'error'; error: string };

function normalizeCoefficients(coefficients: number[]) {
  const leading = coefficients[0];
  return coefficients.map((coefficient) => coefficient / leading);
}

function evaluatePolynomial(coefficients: number[], x: ComplexValue) {
  return coefficients.reduce<ComplexValue>(
    (current, coefficient) => complexAdd(complexMul(current, x), complex(coefficient, 0)),
    complex(0, 0),
  );
}

function sortAndDedupeRoots(roots: ComplexValue[]) {
  const sorted = roots
    .map((root) => normalizeComplex(root))
    .sort((left, right) => {
      const leftReal = Number(left.re.toFixed(6));
      const rightReal = Number(right.re.toFixed(6));
      if (leftReal !== rightReal) {
        return leftReal - rightReal;
      }

      return Number(left.im.toFixed(6)) - Number(right.im.toFixed(6));
    });

  return sorted.filter((root, index) => {
    if (index === 0) {
      return true;
    }

    return !areComplexClose(root, sorted[index - 1], DEDUPE_EPSILON);
  });
}

function solveQuadratic(coefficients: number[]): ComplexValue[] {
  const [a, b, c] = coefficients;
  const discriminant = complex(b * b - 4 * a * c, 0);
  const sqrtDiscriminant = complexSqrt(discriminant);
  const denominator = complex(2 * a, 0);

  return sortAndDedupeRoots([
    complexDiv(complexAdd(complex(-b, 0), sqrtDiscriminant), denominator),
    complexDiv(complexSub(complex(-b, 0), sqrtDiscriminant), denominator),
  ]);
}

function initialSeeds(degree: number, radius: number) {
  return Array.from({ length: degree }, (_, index) => {
    const angle = SEED_ANGLE_OFFSET + (2 * Math.PI * index) / degree;
    return complex(radius * Math.cos(angle), radius * Math.sin(angle));
  });
}

function solveWithDurandKerner(coefficients: number[]): PolynomialRootsResult {
  const degree = coefficients.length - 1;
  const monic = normalizeCoefficients(coefficients);
  const radius = 1 + Math.max(...monic.slice(1).map((coefficient) => Math.abs(coefficient)));
  let roots = initialSeeds(degree, radius);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let maxCorrection = 0;
    const nextRoots = roots.map((root, index) => {
      const numerator = evaluatePolynomial(monic, root);
      const denominator = roots.reduce<ComplexValue>((current, otherRoot, otherIndex) => {
        if (index === otherIndex) {
          return current;
        }

        return complexMul(current, complexSub(root, otherRoot));
      }, complex(1, 0));

      if (complexAbs(denominator) < LEADING_EPSILON) {
        throw new Error('Numeric root search did not converge.');
      }

      const correction = complexDiv(numerator, denominator);
      maxCorrection = Math.max(maxCorrection, complexAbs(correction));
      return normalizeComplex(complexSub(root, correction));
    });

    roots = nextRoots;

    if (maxCorrection < CONVERGENCE_EPSILON) {
      return {
        kind: 'success',
        roots: sortAndDedupeRoots(roots),
      };
    }
  }

  return {
    kind: 'error',
    error: 'Numeric root search did not converge.',
  };
}

export function solvePolynomialRoots({
  coefficients,
}: PolynomialRootsRequest): PolynomialRootsResult {
  const normalized = coefficients.map((coefficient) =>
    Number.isFinite(coefficient) ? coefficient : 0,
  );

  if (normalized.length < 3 || normalized.length > 5) {
    return {
      kind: 'error',
      error: 'Numeric fallback supports degrees 2 through 4 only.',
    };
  }

  if (Math.abs(normalized[0]) < LEADING_EPSILON) {
    return {
      kind: 'error',
      error: 'Leading coefficient must be non-zero.',
    };
  }

  if (normalized.length === 3) {
    return {
      kind: 'success',
      roots: solveQuadratic(normalized),
    };
  }

  try {
    return solveWithDurandKerner(normalized);
  } catch (error) {
    return {
      kind: 'error',
      error:
        error instanceof Error ? error.message : 'Numeric root search did not converge.',
    };
  }
}
