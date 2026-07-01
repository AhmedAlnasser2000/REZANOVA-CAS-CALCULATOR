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
      backend: 'decimal.js';
      precisionDigits: number;
      triggeredBy: DecimalRevalidationTrigger[];
      rootsChecked: 0;
      maxResidual: null;
      rootsPolished: 0;
      maxRootShift: null;
    }
  | {
      performed: true;
      backend: 'decimal.js';
      precisionDigits: number;
      triggeredBy: DecimalRevalidationTrigger[];
      rootsChecked: number;
      maxResidual: number;
      rootsPolished: number;
      maxRootShift: number;
    };

export type PrecisionEngine = {
  backend: 'decimal.js';
  precisionDigits: number;
  validatePolynomialRoots(input: DecimalRevalidationInput): DecimalRevalidationResult;
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

function decimalComplexSub(left: DecimalComplexValue, right: DecimalComplexValue) {
  return {
    re: left.re.minus(right.re),
    im: left.im.minus(right.im),
  };
}

function decimalComplexMul(left: DecimalComplexValue, right: DecimalComplexValue) {
  return {
    re: left.re.times(right.re).minus(left.im.times(right.im)),
    im: left.re.times(right.im).plus(left.im.times(right.re)),
  };
}

function decimalComplexDiv(left: DecimalComplexValue, right: DecimalComplexValue) {
  const denominator = right.re.times(right.re).plus(right.im.times(right.im));
  if (denominator.isZero()) {
    return null;
  }
  return {
    re: left.re.times(right.re).plus(left.im.times(right.im)).dividedBy(denominator),
    im: left.im.times(right.re).minus(left.re.times(right.im)).dividedBy(denominator),
  };
}

function decimalComplexAbs(value: DecimalComplexValue) {
  return value.re.times(value.re).plus(value.im.times(value.im)).sqrt();
}

function decimalComplexToNumber(value: DecimalComplexValue): ComplexValue | null {
  const re = value.re.toNumber();
  const im = value.im.toNumber();
  return Number.isFinite(re) && Number.isFinite(im) ? { re, im } : null;
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

function evaluatePolynomialDecimalValue(coefficients: readonly number[], decimalRoot: DecimalComplexValue) {
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

export function evaluatePolynomialDecimal(coefficients: readonly number[], root: ComplexValue) {
  const decimalRoot = decimalComplexFromNumber(root);
  return decimalRoot ? evaluatePolynomialDecimalValue(coefficients, decimalRoot) : null;
}

function derivativeCoefficients(coefficients: readonly number[]) {
  const degree = coefficients.length - 1;
  return coefficients
    .slice(0, -1)
    .map((coefficient, index) => coefficient * (degree - index));
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

function decimalPolishPolynomialRoot(coefficients: readonly number[], root: ComplexValue) {
  let current = decimalComplexFromNumber(root);
  if (!current) {
    return null;
  }
  const derivative = derivativeCoefficients(coefficients);
  const initialResidual = decimalPolynomialResidualMagnitude(coefficients, root);
  if (initialResidual === null) {
    return null;
  }

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const value = evaluatePolynomialDecimalValue(coefficients, current);
    const slope = evaluatePolynomialDecimalValue(derivative, current);
    if (!value || !slope) {
      return null;
    }
    const correction = decimalComplexDiv(value, slope);
    if (!correction) {
      return null;
    }
    current = decimalComplexSub(current, correction);
    if (decimalComplexAbs(correction).lt(new DecimalHighPrecision('1e-40'))) {
      break;
    }
  }

  const polished = decimalComplexToNumber(current);
  if (!polished) {
    return null;
  }
  const polishedResidual = decimalPolynomialResidualMagnitude(coefficients, polished);
  if (polishedResidual === null || polishedResidual > initialResidual) {
    return null;
  }
  const shift = Math.hypot(polished.re - root.re, polished.im - root.im);
  return {
    root: polished,
    shift: Number.isFinite(shift) ? shift : 0,
    residual: polishedResidual,
  };
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

export function createDecimalPrecisionEngine(): PrecisionEngine {
  return {
    backend: 'decimal.js',
    precisionDigits: DEFAULT_PRECISION_DIGITS,
    validatePolynomialRoots(input) {
      const triggeredBy = decimalRevalidationTriggers(input.diagnostics);
      if (triggeredBy.length === 0) {
        return {
          performed: false,
          backend: 'decimal.js',
          precisionDigits: DEFAULT_PRECISION_DIGITS,
          triggeredBy,
          rootsChecked: 0,
          maxResidual: null,
          rootsPolished: 0,
          maxRootShift: null,
        };
      }

      let rootsPolished = 0;
      let maxRootShift = 0;
      const residuals = input.roots
        .map((root) => {
          const polished = decimalPolishPolynomialRoot(input.coefficients, root);
          if (polished && polished.shift > 0) {
            rootsPolished += 1;
            maxRootShift = Math.max(maxRootShift, polished.shift);
            return polished.residual;
          }
          return decimalPolynomialResidualMagnitude(input.coefficients, root);
        })
        .filter((value): value is number => value !== null);

      return {
        performed: true,
        backend: 'decimal.js',
        precisionDigits: DEFAULT_PRECISION_DIGITS,
        triggeredBy,
        rootsChecked: residuals.length,
        maxResidual: residuals.reduce((maximum, value) => Math.max(maximum, value), 0),
        rootsPolished,
        maxRootShift,
      };
    },
  };
}

export const decimalPrecisionEngine = createDecimalPrecisionEngine();

export function decimalRevalidatePolynomialRoots(input: DecimalRevalidationInput): DecimalRevalidationResult {
  return decimalPrecisionEngine.validatePolynomialRoots(input);
}
