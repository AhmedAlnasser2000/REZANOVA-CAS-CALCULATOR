import { describe, expect, it } from 'vitest';
import { parseStatisticsDraft, statisticsRequestToScreen } from './parser';

describe('statistics parser', () => {
  it('parses dataset and descriptive structured requests', () => {
    const dataset = parseStatisticsDraft('dataset(values={12,15,15,18,20})');
    const descriptive = parseStatisticsDraft('descriptive(freq={1:2,2:3})');

    expect(dataset.ok).toBe(true);
    expect(descriptive.ok).toBe(true);
    if (!dataset.ok || !descriptive.ok) {
      throw new Error('Expected Statistics structured requests to parse');
    }
    expect(dataset.request.kind).toBe('dataset');
    expect(descriptive.request.kind).toBe('descriptive');
    if (descriptive.request.kind !== 'descriptive') {
      throw new Error('Expected descriptive request kind');
    }
    expect(descriptive.request.source).toBe('frequencyTable');
  });

  it('parses shorthand dataset, table, probability, and point-set drafts', () => {
    const dataset = parseStatisticsDraft('12, 15, 15, 18, 20', { screenHint: 'dataEntry' });
    const table = parseStatisticsDraft('1:2, 2:3', { screenHint: 'frequency' });
    const binomial = parseStatisticsDraft('n=10, p=0.5, x=3, mode=pmf', { screenHint: 'binomial' });
    const regression = parseStatisticsDraft('(1,2), (2,4), (3,6)', { screenHint: 'regression' });

    expect(dataset.ok).toBe(true);
    expect(table.ok).toBe(true);
    expect(binomial.ok).toBe(true);
    expect(regression.ok).toBe(true);
    if (!dataset.ok || !table.ok || !binomial.ok || !regression.ok) {
      throw new Error('Expected Statistics shorthand requests to parse');
    }
    expect(dataset.request.kind).toBe('dataset');
    expect(table.request.kind).toBe('frequency');
    if (table.request.kind !== 'frequency') {
      throw new Error('Expected frequency request kind');
    }
    expect(table.request.source).toBe('frequencyTable');
    expect(binomial.request.kind).toBe('binomial');
    expect(regression.request.kind).toBe('regression');
  });

  it('maps requests back to statistics screens', () => {
    const parsed = parseStatisticsDraft('correlation(points={(1,2),(2,5),(3,7)})');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected correlation request to parse');
    }

    expect(statisticsRequestToScreen(parsed.request)).toBe('correlation');
  });

  it('fails cleanly for unsupported free-form statistics input', () => {
    const parsed = parseStatisticsDraft('\\sin\\left(x\\right)');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      throw new Error('Expected unsupported Statistics input to fail');
    }
    expect(parsed.error).not.toContain('Calculate');
  });
});
