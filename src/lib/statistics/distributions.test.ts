import { describe, expect, it } from 'vitest';
import { evaluateStatisticsDistribution } from './distributions';

describe('statistics distribution adapter', () => {
  const binomial = { kind: 'binomial' as const, n: 4, p: 0.5 };

  it.each([
    ['exactly', 0.375],
    ['lessThan', 0.3125],
    ['atMost', 0.6875],
    ['moreThan', 0.3125],
    ['atLeast', 0.6875],
  ] as const)('evaluates the discrete %s event with endpoint-aware CDF arithmetic', (event, expected) => {
    expect(evaluateStatisticsDistribution(binomial, { event, x: 2 }).value)
      .toBeCloseTo(expected, 12);
  });

  it.each([
    ['inclusive', 'inclusive', 0.875],
    ['exclusive', 'inclusive', 0.625],
    ['inclusive', 'exclusive', 0.625],
    ['exclusive', 'exclusive', 0.375],
  ] as const)('honors %s/%s bounds for a discrete interval', (lowerBound, upperBound, expected) => {
    expect(evaluateStatisticsDistribution(binomial, {
      event: 'between',
      lower: 1,
      upper: 3,
      lowerBound,
      upperBound,
    }).value).toBeCloseTo(expected, 12);
  });

  it('handles values outside a discrete support without rejecting the event', () => {
    expect(evaluateStatisticsDistribution(binomial, { event: 'atMost', x: -1 }).value).toBe(0);
    expect(evaluateStatisticsDistribution(binomial, { event: 'atLeast', x: 5 }).value).toBe(0);
  });

  it('distinguishes Normal exact probability from density', () => {
    const distribution = { kind: 'normal' as const, mean: 0, standardDeviation: 1 };
    const exact = evaluateStatisticsDistribution(distribution, { event: 'exactly', x: 0 });
    const density = evaluateStatisticsDistribution(distribution, { event: 'density', x: 0 });

    expect(exact).toMatchObject({ value: 0, valueKind: 'probability' });
    expect(density.valueKind).toBe('density');
    expect(density.value).toBeCloseTo(0.3989422804, 10);
  });

  it('keeps strict and inclusive Normal endpoints numerically equivalent', () => {
    const distribution = { kind: 'normal' as const, mean: 0, standardDeviation: 1 };
    const less = evaluateStatisticsDistribution(distribution, { event: 'lessThan', x: 1 });
    const atMost = evaluateStatisticsDistribution(distribution, { event: 'atMost', x: 1 });
    const more = evaluateStatisticsDistribution(distribution, { event: 'moreThan', x: 1 });
    const atLeast = evaluateStatisticsDistribution(distribution, { event: 'atLeast', x: 1 });

    expect(less.value).toBe(atMost.value);
    expect(more.value).toBe(atLeast.value);
  });
});
