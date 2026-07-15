import { describe, expect, it } from 'vitest';
import {
  buildStatisticsHistogramBins,
  statisticsAutomaticHistogramBinCount,
} from './statistics-histogram';

describe('Statistics weighted histogram bins', () => {
  it('uses deterministic Sturges bins without expanding weighted observations', () => {
    expect(statisticsAutomaticHistogramBinCount(8)).toBe(4);
    const bins = buildStatisticsHistogramBins([
      { value: 0, weight: 10_000 },
      { value: 4, weight: 2 },
      { value: 8, weight: 1 },
    ], 'auto');

    expect(bins).toHaveLength(statisticsAutomaticHistogramBinCount(10_003));
    expect(bins.reduce((sum, bin) => sum + bin.frequency, 0)).toBe(10_003);
  });

  it('honors bounded local bin changes and keeps the maximum in the last bin', () => {
    const bins = buildStatisticsHistogramBins([
      { value: 0, weight: 1 },
      { value: 5, weight: 2 },
      { value: 10, weight: 3 },
    ], 2);

    expect(bins).toHaveLength(2);
    expect(bins.map((bin) => bin.frequency)).toEqual([1, 5]);
    expect(buildStatisticsHistogramBins([{ value: 3, weight: 7 }], 50)).toEqual([
      { lower: 3, upper: 3, frequency: 7, label: '3' },
    ]);
  });

  it('formats generated bin boundaries with the active approximate digits', () => {
    const bins = buildStatisticsHistogramBins([
      { value: 0, weight: 1 },
      { value: 1, weight: 1 },
    ], 3, 2);

    expect(bins.map((bin) => bin.label)).toEqual([
      '0-0.33',
      '0.33-0.67',
      '0.67-1',
    ]);
  });
});
