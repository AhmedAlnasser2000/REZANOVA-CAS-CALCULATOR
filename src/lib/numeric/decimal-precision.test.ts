import { describe, expect, it } from 'vitest';
import { complex } from './complex';
import {
  decimalCoefficientScaleRatio,
  decimalPrecisionEngine,
  decimalPolynomialResidualMagnitude,
  decimalRevalidatePolynomialRoots,
  evaluatePolynomialDecimal,
  parseDecimalScalar,
} from './decimal-precision';

describe('decimal precision substrate', () => {
  it('parses finite decimal scalars and rejects invalid values', () => {
    expect(parseDecimalScalar('1.25')?.toString()).toBe('1.25');
    expect(parseDecimalScalar(Number.NaN)).toBeNull();
    expect(parseDecimalScalar('not-a-number')).toBeNull();
  });

  it('evaluates real polynomial residuals with decimal Horner arithmetic', () => {
    const residual = decimalPolynomialResidualMagnitude([1, -2, 1], complex(1, 0));

    expect(residual).toBe(0);
  });

  it('evaluates complex polynomial residuals for internal complex roots', () => {
    const value = evaluatePolynomialDecimal([1, 0, 1], complex(0, 1));
    const residual = decimalPolynomialResidualMagnitude([1, 0, 1], complex(0, 1));

    expect(value?.re.toNumber()).toBe(0);
    expect(value?.im.toNumber()).toBe(0);
    expect(residual).toBe(0);
  });

  it('computes coefficient scale ratios without treating zeros as the minimum', () => {
    const scale = decimalCoefficientScaleRatio([1e15, 0, -1]);

    expect(scale.finiteMagnitudeCount).toBe(2);
    expect(scale.scaleRatio).toBe(1e15);
  });

  it('runs decimal revalidation only when existing diagnostics carry risk', () => {
    const clean = decimalRevalidatePolynomialRoots({
      coefficients: [1, 0, -4],
      roots: [complex(-2, 0), complex(2, 0)],
      diagnostics: {
        coefficientScaleRatio: 4,
        maxResidual: 0,
        clusteredRootCount: 0,
        closeRootSeparationCount: 0,
        rootCountBeforeDedupe: 2,
        rootCountAfterDedupe: 2,
      },
    });
    const risky = decimalRevalidatePolynomialRoots({
      coefficients: [1, -2, 1],
      roots: [complex(1, 0)],
      diagnostics: {
        coefficientScaleRatio: 2,
        maxResidual: 0,
        clusteredRootCount: 1,
        closeRootSeparationCount: 1,
        rootCountBeforeDedupe: 2,
        rootCountAfterDedupe: 1,
      },
    });

    expect(clean.performed).toBe(false);
    expect(clean.backend).toBe('decimal.js');
    expect(clean.rootsPolished).toBe(0);
    expect(risky.performed).toBe(true);
    if (risky.performed) {
      expect(risky.backend).toBe('decimal.js');
      expect(risky.rootsChecked).toBe(1);
      expect(risky.rootsPolished).toBeGreaterThanOrEqual(0);
      expect(risky.maxRootShift).toBeGreaterThanOrEqual(0);
      expect(risky.triggeredBy).toEqual(['clustered-roots', 'close-root-separation']);
    }
  });

  it('exposes decimal.js through the precision engine seam', () => {
    const result = decimalPrecisionEngine.validatePolynomialRoots({
      coefficients: [1e15, 0, -1],
      roots: [complex(-3.162277660168379e-8, 0), complex(3.162277660168379e-8, 0)],
      diagnostics: {
        coefficientScaleRatio: 1e15,
        maxResidual: 0,
        clusteredRootCount: 0,
        closeRootSeparationCount: 0,
        rootCountBeforeDedupe: 2,
        rootCountAfterDedupe: 2,
      },
    });

    expect(decimalPrecisionEngine.backend).toBe('decimal.js');
    expect(result.performed).toBe(true);
    if (result.performed) {
      expect(result.precisionDigits).toBe(80);
      expect(result.triggeredBy).toContain('coefficient-scale');
      expect(result.rootsChecked).toBe(2);
    }
  });
});
