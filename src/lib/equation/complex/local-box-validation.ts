import {
  complex,
  complexAbs,
  complexDiv,
  complexSub,
  type ComplexValue,
} from '../../numeric/complex';
import type { ComplexNumericEvaluator } from './numeric-evaluator';
import type { ComplexRectangularRegion } from './seed-grid-newton';

export type ComplexLocalBoxValidation =
  | {
      status: 'validated';
      center: ComplexValue;
      halfWidth: number;
      halfHeight: number;
      residual: number;
      derivativeMagnitude: number;
      contractionRadius: number;
      boxRadius: number;
      maxDerivativeDeviation: number;
      sampleCount: number;
    }
  | {
      status: 'inconclusive' | 'unsupported';
      center: ComplexValue;
      halfWidth: number;
      halfHeight: number;
      residual: number | null;
      derivativeMagnitude: number | null;
      contractionRadius: number | null;
      boxRadius: number;
      maxDerivativeDeviation: number | null;
      sampleCount: number;
      reason: string;
    };

const MIN_BOX_RADIUS = 1e-6;
const DERIVATIVE_FLOOR = 1e-5;

function regionScale(region: ComplexRectangularRegion) {
  return Math.max(region.reMax - region.reMin, region.imMax - region.imMin, 1);
}

function candidateHalfSize(region: ComplexRectangularRegion) {
  return Math.max(MIN_BOX_RADIUS, regionScale(region) * 1e-3);
}

function clampHalfSize(center: ComplexValue, region: ComplexRectangularRegion, requested: number) {
  return {
    halfWidth: Math.max(
      MIN_BOX_RADIUS,
      Math.min(requested, center.re - region.reMin, region.reMax - center.re),
    ),
    halfHeight: Math.max(
      MIN_BOX_RADIUS,
      Math.min(requested, center.im - region.imMin, region.imMax - center.im),
    ),
  };
}

function boxSamples(center: ComplexValue, halfWidth: number, halfHeight: number) {
  return [
    complex(center.re - halfWidth, center.im - halfHeight),
    complex(center.re, center.im - halfHeight),
    complex(center.re + halfWidth, center.im - halfHeight),
    complex(center.re + halfWidth, center.im),
    complex(center.re + halfWidth, center.im + halfHeight),
    complex(center.re, center.im + halfHeight),
    complex(center.re - halfWidth, center.im + halfHeight),
    complex(center.re - halfWidth, center.im),
  ];
}

function inconclusive(input: {
  status?: 'inconclusive' | 'unsupported';
  center: ComplexValue;
  halfWidth: number;
  halfHeight: number;
  residual: number | null;
  derivativeMagnitude: number | null;
  contractionRadius?: number | null;
  maxDerivativeDeviation?: number | null;
  sampleCount: number;
  reason: string;
}): ComplexLocalBoxValidation {
  return {
    status: input.status ?? 'inconclusive',
    center: input.center,
    halfWidth: input.halfWidth,
    halfHeight: input.halfHeight,
    residual: input.residual,
    derivativeMagnitude: input.derivativeMagnitude,
    contractionRadius: input.contractionRadius ?? null,
    boxRadius: Math.hypot(input.halfWidth, input.halfHeight),
    maxDerivativeDeviation: input.maxDerivativeDeviation ?? null,
    sampleCount: input.sampleCount,
    reason: input.reason,
  };
}

export function validateComplexRootBox(input: {
  evaluator: ComplexNumericEvaluator;
  root: ComplexValue;
  region: ComplexRectangularRegion;
}): ComplexLocalBoxValidation {
  const requestedHalfSize = candidateHalfSize(input.region);
  const { halfWidth, halfHeight } = clampHalfSize(input.root, input.region, requestedHalfSize);
  const boxRadius = Math.hypot(halfWidth, halfHeight);
  if (!input.evaluator.evaluateDerivativeAt) {
    return inconclusive({
      status: 'unsupported',
      center: input.root,
      halfWidth,
      halfHeight,
      residual: null,
      derivativeMagnitude: null,
      sampleCount: 0,
      reason: 'analytic derivative was unavailable for local box validation',
    });
  }

  const value = input.evaluator.evaluateAt(input.root);
  const derivative = input.evaluator.evaluateDerivativeAt(input.root);
  if (
    value.status !== 'finite'
    || derivative.status !== 'finite'
    || !value.value
    || !derivative.value
    || value.residualNorm === null
  ) {
    return inconclusive({
      status: 'unsupported',
      center: input.root,
      halfWidth,
      halfHeight,
      residual: value.residualNorm,
      derivativeMagnitude: derivative.value ? complexAbs(derivative.value) : null,
      sampleCount: 0,
      reason: 'root or derivative evaluation was not finite',
    });
  }

  const derivativeMagnitude = complexAbs(derivative.value);
  if (derivativeMagnitude <= DERIVATIVE_FLOOR) {
    return inconclusive({
      center: input.root,
      halfWidth,
      halfHeight,
      residual: value.residualNorm,
      derivativeMagnitude,
      sampleCount: 0,
      reason: 'derivative is too small; clustered or multiple root validation is inconclusive',
    });
  }

  const samples = boxSamples(input.root, halfWidth, halfHeight);
  let maxDerivativeDeviation = 0;
  for (const sample of samples) {
    const sampledDerivative = input.evaluator.evaluateDerivativeAt(sample);
    if (sampledDerivative.status !== 'finite' || !sampledDerivative.value) {
      return inconclusive({
        status: 'unsupported',
        center: input.root,
        halfWidth,
        halfHeight,
        residual: value.residualNorm,
        derivativeMagnitude,
        sampleCount: samples.length,
        reason: 'a box derivative sample was not finite',
      });
    }
    let derivativeRatio: ComplexValue;
    try {
      derivativeRatio = complexDiv(sampledDerivative.value, derivative.value);
    } catch {
      return inconclusive({
        center: input.root,
        halfWidth,
        halfHeight,
        residual: value.residualNorm,
        derivativeMagnitude,
        sampleCount: samples.length,
        reason: 'center derivative could not invert the local box',
      });
    }
    maxDerivativeDeviation = Math.max(maxDerivativeDeviation, complexAbs(complexSub(complex(1), derivativeRatio)));
  }

  const newtonCorrection = complexAbs(complexDiv(value.value, derivative.value));
  const contractionRadius = newtonCorrection + maxDerivativeDeviation * boxRadius;
  if (contractionRadius < boxRadius) {
    return {
      status: 'validated',
      center: input.root,
      halfWidth,
      halfHeight,
      residual: value.residualNorm,
      derivativeMagnitude,
      contractionRadius,
      boxRadius,
      maxDerivativeDeviation,
      sampleCount: samples.length,
    };
  }

  return inconclusive({
    center: input.root,
    halfWidth,
    halfHeight,
    residual: value.residualNorm,
    derivativeMagnitude,
    contractionRadius,
    maxDerivativeDeviation,
    sampleCount: samples.length,
    reason: 'Krawczyk contraction did not fit inside the local complex box',
  });
}

export function validateComplexRootBoxes(input: {
  evaluator: ComplexNumericEvaluator;
  roots: readonly ComplexValue[];
  region: ComplexRectangularRegion;
}) {
  return input.roots.map((root) => validateComplexRootBox({
    evaluator: input.evaluator,
    root,
    region: input.region,
  }));
}
