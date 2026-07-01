import Decimal from 'decimal.js';
import type { ComplexValue } from './complex';

const DEFAULT_PRECISION_DIGITS = 80;
const COEFFICIENT_SCALE_RISK = 1e12;
const RESIDUAL_RISK = 1e-9;

const DecimalHighPrecision = Decimal.clone({
  precision: DEFAULT_PRECISION_DIGITS,
});

export type DecimalRevalidationTrigger =
  | 'coefficient-scale'
  | 'residual-instability'
  | 'clustered-roots'
  | 'close-root-separation';

export type DecimalRevalidationInput = {
  coefficients: readonly number[];
  roots: readonly ComplexValue[];
  diagnostics: {
    coefficientScaleRatio: number;
    maxResidual: number;
    clusteredRootCount: number;
    closeRootSeparationCount: number;
    rootCountBeforeDedupe: number;
    rootCountAfterDedupe: number;
  };
};

export type DecimalRevalidationResult =
  | {
      performed: false;
      precisionDigits: number;
      triggeredBy: DecimalRevalidationTrigger[];
      rootsChecked: 0;
      maxResidual: null;
    }
  | {
      performed: true;
      precisionDigits: number;
      triggeredBy: DecimalRevalidationTrigger[];
      rootsChecked: number;
      maxResidual: number;
    };

type DecimalComplexValue = {
  re: Decimal;
  im: Decimal;
};

function decimalFromNumber(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return new DecimalHighPrecision(value.toString());
}

function decimalComplexFromNumber(value: ComplexValue) {
  const re = decimalFromNumber(value.re);
  const im = decimalFromNumber(value.im);
  if (!re || !im) {
    return null;
  }
  return { re, im };
}

function decimalComplex(re: Decimal.Value, im: Decimal.Value = 0): DecimalComplexValue {
  return {
    re: new DecimalHighPrecision(re),
    im: new DecimalHighPrecision(im),
  };
}

function decimalComplexAdd(left: DecimalComplexValue, right: DecimalComplexValue) {
  return {
    re: left.re.plus(right.re),
    im: left.im.plus(right.im),
  };
}

function decimalComplexMul(left: DecimalComplexValue, right: DecimalComplexValue) {
  return {
    re: left.re.times(right.re).minus(left.im.times(right.im)),
    im: left.re.times(right.im).plus(left.im.times(right.re)),
  };
}

function decimalComplexAbs(value: DecimalComplexValue) {
  return value.re.times(value.re).plus(value.im.times(value.im)).sqrt();
}

export function parseDecimalScalar(value: number | string) {
  try {
    const decimal = new DecimalHighPrecision(value);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

export function decimalCoefficientScaleRatio(coefficients: readonly number[]) {
  const magnitudes = coefficients
    .map((coefficient) => decimalFromNumber(coefficient)?.abs() ?? null)
    .filter((value): value is Decimal => value !== null && !value.isZero());

  if (magnitudes.length === 0) {
    return {
      scaleRatio: 1,
      finiteMagnitudeCount: 0,
    };
  }

  const minimum = magnitudes.reduce((current, value) => DecimalHighPrecision.min(current, value));
  const maximum = magnitudes.reduce((current, value) => DecimalHighPrecision.max(current, value));
  return {
    scaleRatio: maximum.dividedBy(minimum).toNumber(),
    finiteMagnitudeCount: magnitudes.length,
  };
}

export function evaluatePolynomialDecimal(coefficients: readonly number[], root: ComplexValue) {
  const decimalRoot = decimalComplexFromNumber(root);
  if (!decimalRoot) {
    return null;
  }

  let current = decimalComplex(0);
  for (const coefficient of coefficients) {
    const decimalCoefficient = decimalFromNumber(coefficient);
    if (!decimalCoefficient) {
      return null;
    }
    current = decimalComplexAdd(
      decimalComplexMul(current, decimalRoot),
      decimalComplex(decimalCoefficient),
    );
  }
  return current;
}

export function decimalPolynomialResidualMagnitude(
  coefficients: readonly number[],
  root: ComplexValue,
) {
  const value = evaluatePolynomialDecimal(coefficients, root);
  if (!value) {
    return null;
  }
  const magnitude = decimalComplexAbs(value).toNumber();
  return Number.isFinite(magnitude) ? magnitude : null;
}

export function decimalRevalidationTriggers(input: DecimalRevalidationInput['diagnostics']) {
  const triggers: DecimalRevalidationTrigger[] = [];
  if (input.coefficientScaleRatio > COEFFICIENT_SCALE_RISK) {
    triggers.push('coefficient-scale');
  }
  if (input.maxResidual > RESIDUAL_RISK) {
    triggers.push('residual-instability');
  }
  if (input.clusteredRootCount > 0 || input.rootCountBeforeDedupe > input.rootCountAfterDedupe) {
    triggers.push('clustered-roots');
  }
  if (input.closeRootSeparationCount > 0) {
    triggers.push('close-root-separation');
  }
  return triggers;
}

export function decimalRevalidatePolynomialRoots(input: DecimalRevalidationInput): DecimalRevalidationResult {
  const triggeredBy = decimalRevalidationTriggers(input.diagnostics);
  if (triggeredBy.length === 0) {
    return {
      performed: false,
      precisionDigits: DEFAULT_PRECISION_DIGITS,
      triggeredBy,
      rootsChecked: 0,
      maxResidual: null,
    };
  }

  const residuals = input.roots
    .map((root) => decimalPolynomialResidualMagnitude(input.coefficients, root))
    .filter((value): value is number => value !== null);

  return {
    performed: true,
    precisionDigits: DEFAULT_PRECISION_DIGITS,
    triggeredBy,
    rootsChecked: residuals.length,
    maxResidual: residuals.reduce((maximum, value) => Math.max(maximum, value), 0),
  };
}
