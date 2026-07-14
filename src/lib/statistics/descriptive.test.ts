import { describe, expect, it } from 'vitest';
import {
  descriptiveStatisticsFromFrequencyRows,
  descriptiveStatisticsFromValues,
} from './descriptive';
import { buildStatisticsModeRunPayload } from './runtime-run';

describe('statistics descriptive summaries', () => {
  it('distinguishes median-of-halves and Type-7 quartiles for odd data', () => {
    const values = [1, 2, 3, 4, 100];
    const halves = descriptiveStatisticsFromValues(values, 'halves');
    const linear = descriptiveStatisticsFromValues(values, 'linear');

    expect(halves).toMatchObject({ q1: 1.5, q3: 52, iqr: 50.5 });
    expect(linear).toMatchObject({ q1: 2, q3: 4, iqr: 2 });
    expect(linear.potentialOutliers).toEqual([100]);
  });

  it('reports no, single, and multiple modes without treating all-unique data as multimodal', () => {
    expect(descriptiveStatisticsFromValues([1, 2, 3], 'halves').modes).toEqual([]);
    expect(descriptiveStatisticsFromValues([1, 2, 2, 3], 'halves').modes).toEqual([2]);
    expect(descriptiveStatisticsFromValues([1, 1, 2, 2, 3], 'halves').modes).toEqual([1, 2]);
  });

  it('keeps list and compact frequency summaries mathematically equivalent', () => {
    const list = descriptiveStatisticsFromValues([1, 1, 2, 2, 2, 4], 'linear');
    const compact = descriptiveStatisticsFromFrequencyRows([
      { value: 1, frequency: 2 },
      { value: 2, frequency: 3 },
      { value: 4, frequency: 1 },
    ], 'linear');

    expect(compact).toEqual(list);
  });

  it('evaluates compact tables above the physical expansion limit', () => {
    const result = buildStatisticsModeRunPayload({
      inputLatex: 'descriptive(freq={1:10001,2:1}, quartiles=halves, context=compare)',
      screenHint: 'descriptive',
      workingSourceHint: 'frequencyTable',
    }).outcome;

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected compact descriptive success.');
    expect(result.canonicalResult?.version).toBe(2);
    expect(result.exactLatex).toContain('n=10002');
    expect(result.exactLatex).toContain('\\sigma^2');
    expect(result.exactLatex).toContain('s^2');
  });
});
