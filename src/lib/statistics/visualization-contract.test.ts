import { describe, expect, it } from 'vitest';
import type { StatisticsVisualizationPayloadV1 } from '../../types/calculator';
import {
  cloneStatisticsVisualizationPayloadV1,
  isStatisticsVisualizationPayloadV1,
  STATISTICS_VISUALIZATION_MAX_POINTS,
} from './visualization-contract';

function histogramPayload(): StatisticsVisualizationPayloadV1 {
  return {
    version: 1,
    defaultKind: 'histogram',
    views: [{
      kind: 'histogram',
      title: 'Distribution of values',
      xLabel: 'Value',
      yLabel: 'Frequency',
      ariaDescription: 'Histogram of five observations.',
      weightedValues: [
        { value: 12, weight: 1 },
        { value: 15, weight: 2 },
        { value: 18, weight: 1 },
      ],
      table: {
        columns: ['Value', 'Frequency'],
        rows: [[12, 1], [15, 2], [18, 1]],
        totalRows: 3,
      },
    }],
  };
}

describe('Statistics visualization contract', () => {
  it('accepts and clones a bounded worker-safe payload', () => {
    const payload = histogramPayload();
    expect(isStatisticsVisualizationPayloadV1(payload)).toBe(true);
    const clone = cloneStatisticsVisualizationPayloadV1(payload);
    expect(clone).toEqual(payload);
    expect(clone).not.toBe(payload);
    expect(() => structuredClone(payload)).not.toThrow();
  });

  it('rejects missing defaults and unbounded point collections', () => {
    expect(isStatisticsVisualizationPayloadV1({
      ...histogramPayload(),
      defaultKind: 'boxPlot',
    })).toBe(false);
    expect(isStatisticsVisualizationPayloadV1({
      ...histogramPayload(),
      views: [{
        ...histogramPayload().views[0],
        weightedValues: Array.from(
          { length: STATISTICS_VISUALIZATION_MAX_POINTS + 1 },
          (_, value) => ({ value, weight: 1 }),
        ),
      }],
    })).toBe(false);
  });
});

