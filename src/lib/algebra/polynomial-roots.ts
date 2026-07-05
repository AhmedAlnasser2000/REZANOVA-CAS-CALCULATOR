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
import {
  decimalRevalidatePolynomialRoots,
  type DecimalRevalidationResult,
} from '../numeric/decimal-precision';

const LEADING_EPSILON = 1e-10;
const CONVERGENCE_EPSILON = 1e-10;
const RESIDUAL_EPSILON = 1e-9;
const DEDUPE_EPSILON = 1e-4;
const CLUSTER_WARNING_EPSILON = 1e-3;
const CLOSE_SEPARATION_WARNING_EPSILON = 1e-3;
const MAX_ITERATIONS = 500;
const SEED_ANGLE_OFFSETS = [0.25, 0.43, 0.67, 0.91] as const;
export const MAX_POLYNOMIAL_ROOT_DEGREE = 64;

export type PolynomialRootsRequest = {
  coefficients: number[];
};

export type PolynomialRootDiagnostics = {
  degree: number;
  method: 'linear' | 'quadratic' | 'aberth-ehrlich';
  iterations: number;
  maxResidual: number;
  maxBackwardErrorEstimate: number;
  minimumDerivativeMagnitude: number | null;
  coefficientScaleRatio: number;
  minimumRootSeparation: number | null;
  rootCountBeforeDedupe: number;
  rootCountAfterDedupe: number;
  rootAccounting: {
    expectedRootSlots: number;
    estimatedRootSlots: number;
    distinctRootCount: number;
    status: 'all-slots-accounted' | 'slot-gap';
  };
  clusteredRootCount: number;
  closeRootSeparationCount: number;
  conditioningPasses: number;
  multiplicityEstimates: Array<{
    root: ComplexValue;
    estimatedMultiplicity: number;
  }>;
  warningLines: string[];
  decimalRevalidation: DecimalRevalidationResult;
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

function polynomialScaleAt(coefficients: readonly number[], root: ComplexValue) {
  const magnitude = complexAbs(root);
  const degree = coefficients.length - 1;
  return coefficients.reduce((scale, coefficient, index) =>
    scale + Math.abs(coefficient) * Math.pow(magnitude, degree - index), 0);
}

function maxBackwardErrorEstimate(coefficients: readonly number[], roots: readonly ComplexValue[]) {
  return roots.reduce((maximum, root) => {
    const scale = polynomialScaleAt(coefficients, root);
    if (scale <= LEADING_EPSILON) {
      return maximum;
    }
    const residual = complexAbs(evaluatePolynomial([...coefficients], root));
    return Math.max(maximum, residual / scale);
  }, 0);
}

function minimumDerivativeMagnitude(coefficients: readonly number[], roots: readonly ComplexValue[]) {
  if (roots.length === 0) {
    return null;
  }
  const derivative = derivativeCoefficients([...coefficients]);
  const minimum = roots.reduce((current, root) =>
    Math.min(current, complexAbs(evaluatePolynomial(derivative, root))), Number.POSITIVE_INFINITY);
  return Number.isFinite(minimum) ? minimum : null;
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

function rootSeparationStats(roots: readonly ComplexValue[], tolerance: number) {
  if (roots.length < 2) {
    return {
      minimum: null,
      closePairCount: 0,
    };
  }

  let minimum = Number.POSITIVE_INFINITY;
  let closePairCount = 0;
  for (let leftIndex = 0; leftIndex < roots.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < roots.length; rightIndex += 1) {
      const separation = complexAbs(complexSub(roots[leftIndex], roots[rightIndex]));
      minimum = Math.min(minimum, separation);
      if (separation <= tolerance) {
        closePairCount += 1;
      }
    }
  }

  return {
    minimum: Number.isFinite(minimum) ? minimum : null,
    closePairCount,
  };
}

function residualForDedupe(root: ComplexValue, coefficients?: readonly number[]) {
  return coefficients ? complexAbs(evaluatePolynomial([...coefficients], root)) : 0;
}

function chooseDedupeRepresentative(
  roots: readonly ComplexValue[],
  coefficients?: readonly number[],
) {
  return roots.reduce((best, root) =>
    residualForDedupe(root, coefficients) < residualForDedupe(best, coefficients)
      ? root
      : best);
}

function sortRoots(roots: readonly ComplexValue[]) {
  return roots
    .map((root) => normalizeComplex(root))
    .sort((left, right) => {
      return compareRoots(left, right);
    });
}

function compareRoots(left: ComplexValue, right: ComplexValue) {
  const leftReal = Number(left.re.toFixed(6));
  const rightReal = Number(right.re.toFixed(6));
  if (leftReal !== rightReal) {
    return leftReal - rightReal;
  }

  return Number(left.im.toFixed(6)) - Number(right.im.toFixed(6));
}

function sortAndDedupeRoots(
  roots: ComplexValue[],
  options: {
    residualCoefficients?: readonly number[];
  } = {},
) {
  return sortAndDedupeRootGroups(roots, options).roots;
}

function sortAndDedupeRootGroups(
  roots: ComplexValue[],
  options: {
    residualCoefficients?: readonly number[];
  } = {},
) {
  const sorted = roots.map((root) => normalizeComplex(root));
  const groups: Array<{
    representative: ComplexValue;
    count: number;
  }> = [];
  let currentGroup: ComplexValue[] = [];

  for (const root of sortRoots(sorted)) {
    if (currentGroup.length === 0) {
      currentGroup = [root];
      continue;
    }
    if (areComplexClose(root, currentGroup[currentGroup.length - 1], DEDUPE_EPSILON)) {
      currentGroup.push(root);
      continue;
    }
    groups.push({
      representative: chooseDedupeRepresentative(currentGroup, options.residualCoefficients),
      count: currentGroup.length,
    });
    currentGroup = [root];
  }

  if (currentGroup.length > 0) {
    groups.push({
      representative: chooseDedupeRepresentative(currentGroup, options.residualCoefficients),
      count: currentGroup.length,
    });
  }

  const normalizedGroups = groups
    .map((group) => ({
      representative: normalizeComplex(group.representative, DEDUPE_EPSILON),
      count: group.count,
    }))
    .sort((left, right) => compareRoots(left.representative, right.representative));

  return {
    roots: normalizedGroups.map((group) => group.representative),
    groups: normalizedGroups,
  };
}

function diagnosticsFor(input: {
  coefficients: number[];
  roots: ComplexValue[];
  rootsBeforeDedupe: number;
  method: PolynomialRootDiagnostics['method'];
  iterations: number;
  conditioningPasses: number;
  multiplicityEstimates?: PolynomialRootDiagnostics['multiplicityEstimates'];
}) {
  const degree = input.coefficients.length - 1;
  const maxResidual = maxPolynomialResidual(input.coefficients, input.roots);
  const maxBackwardError = maxBackwardErrorEstimate(input.coefficients, input.roots);
  const derivativeMinimum = minimumDerivativeMagnitude(input.coefficients, input.roots);
  const scaleRatio = coefficientScaleRatio(input.coefficients);
  const separationStats = rootSeparationStats(input.roots, CLUSTER_WARNING_EPSILON);
  const closeSeparationStats = rootSeparationStats(input.roots, CLOSE_SEPARATION_WARNING_EPSILON);
  const clusteredRootCount = separationStats.closePairCount;
  const multiplicityEstimates = input.multiplicityEstimates
    ?? input.roots.map((root) => ({
      root,
      estimatedMultiplicity: degree === 2 && input.roots.length === 1 ? 2 : 1,
    }));
  const estimatedRootSlots = multiplicityEstimates.reduce((sum, entry) =>
    sum + Math.max(1, Math.round(entry.estimatedMultiplicity)), 0);
  const rootAccounting: PolynomialRootDiagnostics['rootAccounting'] = {
    expectedRootSlots: degree,
    estimatedRootSlots,
    distinctRootCount: input.roots.length,
    status: estimatedRootSlots === degree ? 'all-slots-accounted' : 'slot-gap',
  };
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
  if (rootAccounting.status === 'slot-gap') {
    warningLines.push(
      `Numeric root-slot accounting estimated ${estimatedRootSlots} of ${degree} polynomial root slots.`,
    );
  }
  if (warningLines.length > 0) {
    warningLines.push(
      'Higher precision is recommended if these roots are used in a sensitive downstream calculation.',
    );
  }

  const baseDiagnostics = {
    degree,
    method: input.method,
    iterations: input.iterations,
    maxResidual,
    maxBackwardErrorEstimate: maxBackwardError,
    minimumDerivativeMagnitude: derivativeMinimum,
    coefficientScaleRatio: scaleRatio,
    minimumRootSeparation: separationStats.minimum,
    rootCountBeforeDedupe: input.rootsBeforeDedupe,
    rootCountAfterDedupe: input.roots.length,
    rootAccounting,
    clusteredRootCount,
    closeRootSeparationCount: closeSeparationStats.closePairCount,
    conditioningPasses: input.conditioningPasses,
    multiplicityEstimates,
    warningLines,
  };

  return {
    ...baseDiagnostics,
    decimalRevalidation: decimalRevalidatePolynomialRoots({
      coefficients: input.coefficients,
      roots: input.roots,
      diagnostics: baseDiagnostics,
    }),
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

function conditionRoots(coefficients: number[], roots: readonly ComplexValue[]) {
  return roots.map((root) => {
    const polished = polishRoot(coefficients, root);
    return complexAbs(evaluatePolynomial(coefficients, polished)) <= complexAbs(evaluatePolynomial(coefficients, root))
      ? polished
      : root;
  });
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

type AberthEhrlichSuccess = {
  roots: ComplexValue[];
  iterations: number;
  maxResidual: number;
};

function reciprocalSeparationSum(roots: readonly ComplexValue[], root: ComplexValue, index: number) {
  return roots.reduce<ComplexValue>((current, otherRoot, otherIndex) => {
    if (index === otherIndex) {
      return current;
    }
    const separation = complexSub(root, otherRoot);
    if (complexAbs(separation) < LEADING_EPSILON) {
      throw new Error('Numeric root search produced an unstable clustered-root denominator.');
    }
    return complexAdd(current, complexDiv(complex(1, 0), separation));
  }, complex(0, 0));
}

function runAberthEhrlichAttempt(coefficients: number[], angleOffset: number): AberthEhrlichSuccess | null {
  const degree = coefficients.length - 1;
  const monic = normalizeCoefficients(coefficients);
  const derivative = derivativeCoefficients(monic);
  const radius = 1 + Math.max(...monic.slice(1).map((coefficient) => Math.abs(coefficient)));
  let roots = initialSeeds(degree, radius, angleOffset);
  let bestRoots = roots;
  let bestResidual = Number.POSITIVE_INFINITY;
  let bestIteration = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let maxCorrection = 0;
    const nextRoots = roots.map((root, index) => {
      const value = evaluatePolynomial(monic, root);
      const slope = evaluatePolynomial(derivative, root);
      if (complexAbs(value) < RESIDUAL_EPSILON) {
        return root;
      }
      if (complexAbs(slope) < LEADING_EPSILON) {
        throw new Error('Numeric root search produced an unstable derivative near a candidate root.');
      }
      const newtonCorrection = complexDiv(value, slope);
      const denominator = complexSub(
        complex(1, 0),
        complexMul(newtonCorrection, reciprocalSeparationSum(roots, root, index)),
      );
      if (complexAbs(denominator) < LEADING_EPSILON) {
        throw new Error('Numeric root search produced an unstable Aberth correction denominator.');
      }
      const correction = complexDiv(newtonCorrection, denominator);
      maxCorrection = Math.max(maxCorrection, complexAbs(correction));
      return normalizeComplex(complexSub(root, correction));
    });

    roots = nextRoots;
    const polished = polishRoots(monic, roots);
    const maxResidual = maxPolynomialResidual(monic, polished);
    if (maxResidual < bestResidual) {
      bestResidual = maxResidual;
      bestRoots = polished;
      bestIteration = iteration + 1;
    }

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

  return bestResidual < RESIDUAL_EPSILON
    ? {
        roots: bestRoots,
        iterations: bestIteration,
        maxResidual: bestResidual,
      }
    : null;
}

function solveWithAberthEhrlich(coefficients: number[]): PolynomialRootsResult {
  const monic = normalizeCoefficients(coefficients);
  let best: AberthEhrlichSuccess | null = null;

  for (const offset of SEED_ANGLE_OFFSETS) {
    try {
      const attempt = runAberthEhrlichAttempt(coefficients, offset);
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

  const conditioned = conditionRoots(monic, best.roots);
  const deduped = sortAndDedupeRootGroups(conditioned, { residualCoefficients: monic });
  return {
    kind: 'success',
    roots: deduped.roots,
    diagnostics: diagnosticsFor({
      coefficients: monic,
      roots: deduped.roots,
      rootsBeforeDedupe: best.roots.length,
      method: 'aberth-ehrlich',
      iterations: best.iterations,
      conditioningPasses: 1,
      multiplicityEstimates: deduped.groups.map((group) => ({
        root: group.representative,
        estimatedMultiplicity: group.count,
      })),
    }),
  };
}

export function solvePolynomialRoots({
  coefficients,
}: PolynomialRootsRequest): PolynomialRootsResult {
  const normalized = coefficients.map((coefficient) =>
    Number.isFinite(coefficient) ? coefficient : 0,
  );

  if (normalized.length < 2 || normalized.length > MAX_POLYNOMIAL_ROOT_DEGREE + 1) {
    return {
      kind: 'error',
      error: `Numeric polynomial fallback supports degrees 1 through ${MAX_POLYNOMIAL_ROOT_DEGREE} only.`,
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
        conditioningPasses: 0,
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
        conditioningPasses: 0,
      }),
    };
  }

  try {
    return solveWithAberthEhrlich(normalized);
  } catch (error) {
    return {
      kind: 'error',
      error:
        error instanceof Error ? error.message : 'Numeric root search did not converge.',
    };
  }
}
