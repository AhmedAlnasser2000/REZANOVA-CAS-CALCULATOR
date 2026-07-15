import { describe, expect, it } from 'vitest';
import {
  computeMeanConfidenceInterval,
  computeMeanHypothesisTest,
  inverseStudentTCdf,
  parseInferenceLevel,
  studentTCdf,
} from './inference';

describe('statistics inference helpers', () => {
  it('parses bounded confidence levels', () => {
    expect(parseInferenceLevel('0.95')).toBe(0.95);
    expect(parseInferenceLevel('95%')).toBe(0.95);
    expect(parseInferenceLevel('1')).toBeNull();
    expect(parseInferenceLevel('0')).toBeNull();
  });

  it('computes stable student t helper values', () => {
    const cdf = studentTCdf(0, 4);
    const critical = inverseStudentTCdf(0.975, 4);

    expect(cdf).toBeCloseTo(0.5, 12);
    expect(critical).toBeCloseTo(2.776, 2);
  });

  it('computes one-sample mean confidence intervals and tests', () => {
    const summary = {
      count: 5,
      mean: 16,
      sampleVariance: 9.5,
      sampleStandardDeviation: Math.sqrt(9.5),
    };

    const ci = computeMeanConfidenceInterval(summary, 0.95);
    const test = computeMeanHypothesisTest(summary, 0.95, 15);
    const less = computeMeanHypothesisTest(summary, 0.95, 17, 'less');
    const greater = computeMeanHypothesisTest(summary, 0.95, 15, 'greater');

    expect(ci).not.toBeNull();
    expect(test).not.toBeNull();
    if (!ci || !test || !less || !greater) {
      throw new Error('Expected bounded mean inference results');
    }

    expect(ci.lowerBound).toBeLessThan(summary.mean);
    expect(ci.upperBound).toBeGreaterThan(summary.mean);
    expect(test.pValue).toBeGreaterThanOrEqual(0);
    expect(test.pValue).toBeLessThanOrEqual(1);
    expect(less.criticalValue).toBeLessThan(0);
    expect(less.pValue).toBeLessThan(0.5);
    expect(greater.criticalValue).toBeGreaterThan(0);
    expect(greater.pValue).toBeLessThan(0.5);
  });

  it('handles zero-variance directional tests without losing the t sign', () => {
    const summary = {
      count: 4,
      mean: 5,
      sampleVariance: 0,
      sampleStandardDeviation: 0,
    };
    const less = computeMeanHypothesisTest(summary, 0.95, 6, 'less');
    const greater = computeMeanHypothesisTest(summary, 0.95, 6, 'greater');

    expect(less?.tStatistic).toBe(Number.NEGATIVE_INFINITY);
    expect(less?.pValue).toBe(0);
    expect(less?.rejectNull).toBe(true);
    expect(greater?.pValue).toBe(1);
    expect(greater?.rejectNull).toBe(false);
  });
});
