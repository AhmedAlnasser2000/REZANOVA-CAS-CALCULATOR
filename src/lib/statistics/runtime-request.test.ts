import { describe, expect, it } from 'vitest';
import {
  buildStatisticsOoeInputRevisionId,
  collapseDatasetToFrequencyTable,
  clearStatisticsSourceSyncState,
  datasetTextFromValues,
  expandFrequencyTableToDataset,
  parseStatisticsDraft,
  pointsTextFromState,
  statisticsDraftStyle,
  statisticsRequestToScreen,
  statisticsRequestToWorkingSource,
  statisticsSourceSyncFromDatasetEdit,
  statisticsSourceSyncFromFrequencyEdit,
  type RunStatisticsRuntimeRequest,
} from './runtime-request';

describe('statistics runtime request facade', () => {
  it('supports the runtime hook parse, source-sync, source mapping, and revision path', () => {
    const parsed = parseStatisticsDraft('1:2, 2:3', { screenHint: 'frequency' });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected frequency request to parse');
    }

    expect(parsed.style).toBe('shorthand');
    expect(statisticsDraftStyle('1:2, 2:3')).toBe('shorthand');
    expect(statisticsRequestToScreen(parsed.request)).toBe('frequency');
    expect(statisticsRequestToWorkingSource(parsed.request)).toBe('frequencyTable');

    const collapsed = collapseDatasetToFrequencyTable({ values: ['2', '1', '2'] });
    expect(collapsed).toEqual({
      rows: [
        { value: '1', frequency: '1' },
        { value: '2', frequency: '2' },
      ],
    });
    expect(expandFrequencyTableToDataset(collapsed)).toEqual({ values: ['1', '2', '2'] });
    expect(datasetTextFromValues(['1', '2', '2'])).toBe('1, 2, 2');
    expect(pointsTextFromState({ points: [{ x: '1', y: '2' }] })).toBe('(1,2)');
    expect(statisticsSourceSyncFromDatasetEdit()).toEqual({
      datasetStale: false,
      frequencyTableStale: true,
    });
    expect(statisticsSourceSyncFromFrequencyEdit()).toEqual({
      datasetStale: true,
      frequencyTableStale: false,
    });
    expect(clearStatisticsSourceSyncState()).toEqual({
      datasetStale: false,
      frequencyTableStale: false,
    });

    const request: RunStatisticsRuntimeRequest = {
      inputLatex: '1:2, 2:3',
      screenHint: 'frequency',
      workingSourceHint: 'frequencyTable',
    };

    expect(buildStatisticsOoeInputRevisionId(request)).toMatch(
      /^input\.statistics\.evaluate\.[a-z0-9]+$/u,
    );
  });
});
