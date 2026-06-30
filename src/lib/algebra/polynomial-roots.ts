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
} from '../numeric/complex';

const LEADING_EPSILON = 1e-10;
const CONVERGENCE_EPSILON = 1e-10;
const RESIDUAL_EPSILON = 1e-9;
const DEDUPE_EPSILON = 1e-4;
const CLUSTER_WARNING_EPSILON = 1e-3;
const MAX_ITERATIONS = 500;
const SEED_ANGLE_OFFSETS = [0.25, 0.43, 0.67, 0.91] as const;
const MAX_DEGREE = 64;

export type PolynomialRootsRequest = {
  coefficients: number[];
};

export type PolynomialRootDiagnostics = {
  degree: number;
  method: 'linear' | 'quadratic' | 'durand-kerner';
  iterations: number;
  maxResidual: number;
  coefficientScaleRatio: number;
  rootCountBeforeDedupe: number;
  rootCountAfterDedupe: number;
  clusteredRootCount: number;
  warningLines: string[];
};

export type PolynomialRootsResult =
  | { kind: 'success'; roots: ComplexValue[]; diagnostics: PolynomialRootDiagnostics }
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

function derivativeCoefficients(coefficients: number[]) {
  const degree = coefficients.length - 1;
  return coefficients
    .slice(0, -1)
    .map((coefficient, index) => coefficient * (degree - index));
}

function coefficientScaleRatio(coefficients: number[]) {
  const magnitudes = coefficients.map((coefficient) => Math.abs(coefficient)).filter((value) => value > 0);
  if (magnitudes.length === 0) {
    return 1;
  }
  return Math.max(...magnitudes) / Math.min(...magnitudes);
}

function maxPolynomialResidual(coefficients: number[], roots: readonly ComplexValue[]) {
  return roots.reduce((maxResidual, root) =>
    Math.max(maxResidual, complexAbs(evaluatePolynomial(coefficients, root))), 0);
}

function polishRoot(coefficients: number[], root: ComplexValue) {
  const derivative = derivativeCoefficients(coefficients);
  let current = root;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const value = evaluatePolynomial(coefficients, current);
    const slope = evaluatePolynomial(derivative, current);
    if (complexAbs(slope) < LEADING_EPSILON) {
      break;
    }
    const correction = complexDiv(value, slope);
    current = normalizeComplex(complexSub(current, correction));
    if (complexAbs(correction) < CONVERGENCE_EPSILON) {
      break;
    }
  }
  return current;
}

function polishRoots(coefficients: number[], roots: readonly ComplexValue[]) {
  return roots.map((root) => polishRoot(coefficients, root));
}

function rootClusterCount(roots: readonly ComplexValue[], tolerance: number) {
  let clusters = 0;
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
  for (let index = 1; index < sorted.length; index += 1) {
    if (areComplexClose(sorted[index], sorted[index - 1], tolerance)) {
      clusters += 1;
    }
  }
  return clusters;
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
  }).map((root) => normalizeComplex(root, DEDUPE_EPSILON));
}

function diagnosticsFor(input: {
  coefficients: number[];
  roots: ComplexValue[];
  rootsBeforeDedupe: number;
  method: PolynomialRootDiagnostics['method'];
  iterations: number;
}) {
  const degree = input.coefficients.length - 1;
  const maxResidual = maxPolynomialResidual(input.coefficients, input.roots);
  const scaleRatio = coefficientScaleRatio(input.coefficients);
  const clusteredRootCount = rootClusterCount(input.roots, CLUSTER_WARNING_EPSILON);
  const warningLines: string[] = [];
  if (clusteredRootCount > 0 || input.rootsBeforeDedupe > input.roots.length) {
    warningLines.push(
      'Repeated or tightly clustered numeric roots were detected; root positions may be less stable than isolated roots.',
    );
  }
  if (scaleRatio > 1e12) {
    warningLines.push(
      `Large coefficient scale ratio ${scaleRatio.toExponential(2)} can reduce numeric root conditioning.`,
    );
  }
  if (maxResidual > RESIDUAL_EPSILON) {
    warningLines.push(
      `Largest polynomial residual after polishing is ${maxResidual.toExponential(2)}.`,
    );
  }

  return {
    degree,
    method: input.method,
    iterations: input.iterations,
    maxResidual,
    coefficientScaleRatio: scaleRatio,
    rootCountBeforeDedupe: input.rootsBeforeDedupe,
    rootCountAfterDedupe: input.roots.length,
    clusteredRootCount,
    warningLines,
  } satisfies PolynomialRootDiagnostics;
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

function solveLinear(coefficients: number[]): ComplexValue[] {
  const [a, b] = coefficients;
  return [complex(-b / a, 0)];
}

function initialSeeds(degree: number, radius: number, angleOffset: number) {
  return Array.from({ length: degree }, (_, index) => {
    const angle = angleOffset + (2 * Math.PI * index) / degree;
    return complex(radius * Math.cos(angle), radius * Math.sin(angle));
  });
}

type DurandKernerSuccess = {
  roots: ComplexValue[];
  iterations: number;
  maxResidual: number;
};

function runDurandKernerAttempt(coefficients: number[], angleOffset: number): DurandKernerSuccess | null {
  const degree = coefficients.length - 1;
  const monic = normalizeCoefficients(coefficients);
  const radius = 1 + Math.max(...monic.slice(1).map((coefficient) => Math.abs(coefficient)));
  let roots = initialSeeds(degree, radius, angleOffset);

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
        throw new Error('Numeric root search produced an unstable repeated-root denominator.');
      }

      const correction = complexDiv(numerator, denominator);
      maxCorrection = Math.max(maxCorrection, complexAbs(correction));
      return normalizeComplex(complexSub(root, correction));
    });

    roots = nextRoots;
    const polished = polishRoots(monic, roots);
    const maxResidual = maxPolynomialResidual(monic, polished);

    const hasExpectedDistinctRoots = sortAndDedupeRoots(polished).length === degree;
    if (
      maxCorrection < CONVERGENCE_EPSILON
      || (hasExpectedDistinctRoots && maxResidual < RESIDUAL_EPSILON)
    ) {
      return {
        roots: polished,
        iterations: iteration + 1,
        maxResidual,
      };
    }
  }

  return null;
}

function solveWithDurandKerner(coefficients: number[]): PolynomialRootsResult {
  const monic = normalizeCoefficients(coefficients);
  let best: DurandKernerSuccess | null = null;

  for (const offset of SEED_ANGLE_OFFSETS) {
    try {
      const attempt = runDurandKernerAttempt(coefficients, offset);
      if (attempt && (!best || attempt.maxResidual < best.maxResidual)) {
        best = attempt;
      }
      if (best && best.maxResidual < RESIDUAL_EPSILON) {
        break;
      }
    } catch {
      // Try the next deterministic seed rotation before failing closed.
    }
  }

  if (!best) {
    return {
      kind: 'error',
      error: 'Numeric root search did not converge.',
    };
  }

  const deduped = sortAndDedupeRoots(best.roots);
  return {
    kind: 'success',
    roots: deduped,
    diagnostics: diagnosticsFor({
      coefficients: monic,
      roots: deduped,
      rootsBeforeDedupe: best.roots.length,
      method: 'durand-kerner',
      iterations: best.iterations,
    }),
  };
}

export function solvePolynomialRoots({
  coefficients,
}: PolynomialRootsRequest): PolynomialRootsResult {
  const normalized = coefficients.map((coefficient) =>
    Number.isFinite(coefficient) ? coefficient : 0,
  );

  if (normalized.length < 2 || normalized.length > MAX_DEGREE + 1) {
    return {
      kind: 'error',
      error: `Numeric polynomial fallback supports degrees 1 through ${MAX_DEGREE} only.`,
    };
  }

  if (Math.abs(normalized[0]) < LEADING_EPSILON) {
    return {
      kind: 'error',
      error: 'Leading coefficient must be non-zero.',
    };
  }

  if (normalized.length === 2) {
    const roots = solveLinear(normalized);
    return {
      kind: 'success',
      roots,
      diagnostics: diagnosticsFor({
        coefficients: normalized,
        roots,
        rootsBeforeDedupe: roots.length,
        method: 'linear',
        iterations: 1,
      }),
    };
  }

  if (normalized.length === 3) {
    const roots = solveQuadratic(normalized);
    return {
      kind: 'success',
      roots,
      diagnostics: diagnosticsFor({
        coefficients: normalized,
        roots,
        rootsBeforeDedupe: roots.length,
        method: 'quadratic',
        iterations: 1,
      }),
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
