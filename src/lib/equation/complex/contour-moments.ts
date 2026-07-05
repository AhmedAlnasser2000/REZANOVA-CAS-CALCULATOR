import {
  complex,
  complexAbs,
  complexAdd,
  complexDiv,
  complexMul,
  complexSqrt,
  complexSub,
  normalizeComplex,
  type ComplexValue,
} from '../../numeric/complex';
import type { ComplexNumericEvaluator } from './numeric-evaluator';
import type { ComplexRectangularRegion } from './seed-grid-newton';

export type ComplexContourMomentSeedResult =
  | {
      kind: 'seeds';
      rootCount: number;
      seeds: ComplexValue[];
      sampleCount: number;
      minimumBoundaryResidual: number;
      momentCountError: number;
      details: string[];
    }
  | {
      kind: 'inconclusive';
      rootCount: number | null;
      seeds: [];
      sampleCount: number;
      minimumBoundaryResidual: number | null;
      momentCountError: number | null;
      reason: string;
      details: string[];
    };

const DEFAULT_SAMPLES_PER_EDGE = 96;
const DEFAULT_BOUNDARY_TOLERANCE = 1e-7;
const MAX_SUPPORTED_MOMENT_ROOT_COUNT = 2;

function regionWidth(region: ComplexRectangularRegion) {
  return region.reMax - region.reMin;
}

function regionHeight(region: ComplexRectangularRegion) {
  return region.imMax - region.imMin;
}

function isInsideRegion(value: ComplexValue, region: ComplexRectangularRegion) {
  return value.re > region.reMin
    && value.re < region.reMax
    && value.im > region.imMin
    && value.im < region.imMax;
}

function isFiniteRegion(region: ComplexRectangularRegion) {
  return Number.isFinite(region.reMin)
    && Number.isFinite(region.reMax)
    && Number.isFinite(region.imMin)
    && Number.isFinite(region.imMax)
    && region.reMin < region.reMax
    && region.imMin < region.imMax;
}

function contourVertices(region: ComplexRectangularRegion, samplesPerEdge: number) {
  const samples = Math.max(8, Math.floor(samplesPerEdge));
  const points: ComplexValue[] = [];
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push(complex(region.reMin + regionWidth(region) * t, region.imMin));
  }
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push(complex(region.reMax, region.imMin + regionHeight(region) * t));
  }
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push(complex(region.reMax - regionWidth(region) * t, region.imMax));
  }
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push(complex(region.reMin, region.imMax - regionHeight(region) * t));
  }
  return points;
}

function midpoint(left: ComplexValue, right: ComplexValue) {
  return complex((left.re + right.re) / 2, (left.im + right.im) / 2);
}

function momentFromIntegral(integral: ComplexValue) {
  return complexDiv(integral, complex(0, Math.PI * 2));
}

function power(value: ComplexValue, exponent: 0 | 1 | 2) {
  if (exponent === 0) return complex(1);
  if (exponent === 1) return value;
  return complexMul(value, value);
}

function rootsFromMoments(rootCount: number, first: ComplexValue, second: ComplexValue) {
  if (rootCount === 1) {
    return [first];
  }

  const firstSquared = complexMul(first, first);
  const elementarySecond = complexMul(complexSub(firstSquared, second), complex(0.5));
  const discriminant = complexSub(firstSquared, complexMul(complex(4), elementarySecond));
  const rootDiscriminant = complexSqrt(discriminant);
  return [
    complexMul(complexAdd(first, rootDiscriminant), complex(0.5)),
    complexMul(complexSub(first, rootDiscriminant), complex(0.5)),
  ];
}

function inconclusive(input: {
  rootCount: number | null;
  sampleCount: number;
  minimumBoundaryResidual: number | null;
  momentCountError?: number | null;
  reason: string;
}): ComplexContourMomentSeedResult {
  return {
    kind: 'inconclusive',
    rootCount: input.rootCount,
    seeds: [],
    sampleCount: input.sampleCount,
    minimumBoundaryResidual: input.minimumBoundaryResidual,
    momentCountError: input.momentCountError ?? null,
    reason: input.reason,
    details: [
      `Moment fallback: ${input.reason}`,
      `Moment root count target: ${input.rootCount ?? 'unavailable'}.`,
      `Moment boundary samples: ${input.sampleCount}.`,
    ],
  };
}

export function computeComplexContourMomentSeeds(input: {
  evaluator: ComplexNumericEvaluator;
  region: ComplexRectangularRegion;
  rootCount: number;
  samplesPerEdge?: number;
  boundaryTolerance?: number;
}): ComplexContourMomentSeedResult {
  if (!isFiniteRegion(input.region)) {
    return inconclusive({
      rootCount: input.rootCount,
      sampleCount: 0,
      minimumBoundaryResidual: null,
      reason: 'region bounds are invalid',
    });
  }
  if (!input.evaluator.evaluateDerivativeAt) {
    return inconclusive({
      rootCount: input.rootCount,
      sampleCount: 0,
      minimumBoundaryResidual: null,
      reason: 'analytic derivative was unavailable',
    });
  }
  if (input.rootCount <= 0) {
    return inconclusive({
      rootCount: input.rootCount,
      sampleCount: 0,
      minimumBoundaryResidual: null,
      reason: 'contour did not report positive root count',
    });
  }
  if (input.rootCount > MAX_SUPPORTED_MOMENT_ROOT_COUNT) {
    return inconclusive({
      rootCount: input.rootCount,
      sampleCount: 0,
      minimumBoundaryResidual: null,
      reason: 'moment seed generation currently supports one or two roots per cell',
    });
  }

  const points = contourVertices(input.region, input.samplesPerEdge ?? DEFAULT_SAMPLES_PER_EDGE);
  const boundaryTolerance = input.boundaryTolerance ?? DEFAULT_BOUNDARY_TOLERANCE;
  let minimumBoundaryResidual = Number.POSITIVE_INFINITY;
  const integrals = [complex(0), complex(0), complex(0)];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const sample = midpoint(current, next);
    const dz = complexSub(next, current);
    const evaluated = input.evaluator.evaluateAt(sample);
    const derivative = input.evaluator.evaluateDerivativeAt(sample);
    if (
      evaluated.status !== 'finite'
      || derivative.status !== 'finite'
      || !evaluated.value
      || !derivative.value
      || evaluated.residualNorm === null
    ) {
      return inconclusive({
        rootCount: input.rootCount,
        sampleCount: points.length,
        minimumBoundaryResidual: Number.isFinite(minimumBoundaryResidual) ? minimumBoundaryResidual : null,
        reason: 'boundary sample or derivative evaluation was not finite',
      });
    }

    const residual = complexAbs(evaluated.value);
    minimumBoundaryResidual = Math.min(minimumBoundaryResidual, residual);
    if (residual <= boundaryTolerance) {
      return inconclusive({
        rootCount: input.rootCount,
        sampleCount: points.length,
        minimumBoundaryResidual,
        reason: 'contour boundary passed too close to a root',
      });
    }

    let logarithmicDerivative: ComplexValue;
    try {
      logarithmicDerivative = complexDiv(derivative.value, evaluated.value);
    } catch {
      return inconclusive({
        rootCount: input.rootCount,
        sampleCount: points.length,
        minimumBoundaryResidual,
        reason: 'logarithmic derivative was singular on the contour',
      });
    }

    for (const order of [0, 1, 2] as const) {
      integrals[order] = complexAdd(
        integrals[order],
        complexMul(complexMul(power(sample, order), logarithmicDerivative), dz),
      );
    }
  }

  const countMoment = momentFromIntegral(integrals[0]);
  const momentCountError = complexAbs(complexSub(countMoment, complex(input.rootCount)));
  const first = momentFromIntegral(integrals[1]);
  const second = momentFromIntegral(integrals[2]);
  const seeds = rootsFromMoments(input.rootCount, first, second)
    .map((seed) => normalizeComplex(seed, 1e-9))
    .filter((seed, index, allSeeds) =>
      Number.isFinite(seed.re)
      && Number.isFinite(seed.im)
      && isInsideRegion(seed, input.region)
      && allSeeds.findIndex((other) => complexAbs(complexSub(seed, other)) <= 1e-7) === index);

  if (seeds.length === 0) {
    return inconclusive({
      rootCount: input.rootCount,
      sampleCount: points.length,
      minimumBoundaryResidual,
      momentCountError,
      reason: 'moments did not produce interior seeds',
    });
  }

  return {
    kind: 'seeds',
    rootCount: input.rootCount,
    seeds,
    sampleCount: points.length,
    minimumBoundaryResidual,
    momentCountError,
    details: [
      `Moment fallback: generated ${seeds.length} contour-moment seed${seeds.length === 1 ? '' : 's'}.`,
      `Moment root count target: ${input.rootCount}.`,
      `Moment boundary samples: ${points.length}.`,
      `Moment count error: ${momentCountError}.`,
      `Minimum moment boundary residual: ${minimumBoundaryResidual}.`,
    ],
  };
}
