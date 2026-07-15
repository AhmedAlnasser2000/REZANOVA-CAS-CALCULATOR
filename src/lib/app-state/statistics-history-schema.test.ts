import { describe, expect, it } from 'vitest';
import { historyResultDocument } from '../../test-utils/history-result-document';
import { historyEntrySchema } from './schemas';

function parseStatisticsSeed(request: Record<string, unknown>) {
  return historyEntrySchema.parse({
    id: 'statistics-replay',
    mode: 'statistics',
    inputLatex: 'statistics()',
    statisticsScreen: request.kind,
    statisticsSeed: {
      screen: request.kind,
      request,
      workingSource: 'dataset',
    },
    resultDocument: historyResultDocument('1'),
    timestamp: '2026-07-15T00:00:00.000Z',
  }).statisticsSeed?.request;
}

describe('Statistics history schema', () => {
  it('preserves event-driven probability requests and interval bounds', () => {
    expect(parseStatisticsSeed({
      kind: 'normal',
      mean: '0',
      standardDeviation: '1',
      event: 'between',
      lower: '-1',
      upper: '1',
      lowerBound: 'exclusive',
      upperBound: 'inclusive',
    })).toMatchObject({
      event: 'between',
      lower: '-1',
      upper: '1',
      lowerBound: 'exclusive',
      upperBound: 'inclusive',
    });
  });

  it('preserves one-sided mean tests while accepting legacy probability requests', () => {
    expect(parseStatisticsSeed({
      kind: 'meanInference',
      source: 'dataset',
      values: ['12', '15', '18'],
      mode: 'test',
      level: '95%',
      mu0: '14',
      alternative: 'greater',
    })).toMatchObject({ alternative: 'greater' });

    expect(parseStatisticsSeed({
      kind: 'binomial',
      n: '10',
      p: '0.5',
      x: '3',
      mode: 'pmf',
    })).toMatchObject({ x: '3', mode: 'pmf' });
  });
});
