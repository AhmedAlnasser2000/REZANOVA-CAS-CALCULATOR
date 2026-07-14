import {
  collapseDatasetToFrequencyTable,
  expandFrequencyTableToDataset,
} from '../../lib/statistics/runtime-request';
import type {
  FrequencyTable,
  StatisticsSourceSyncState,
  StatsDataset,
} from '../../types/calculator';

const MAX_EXPANDED_STATISTICS_OBSERVATIONS = 10_000;

function frequencyObservationCount(rows: readonly { frequency: string }[]) {
  return rows.reduce((total, row) => {
    const value = Number(row.frequency.trim());
    return Number.isInteger(value) && value > 0 ? total + value : total;
  }, 0);
}

export function prepareStatisticsFrequencyTable(input: {
  dataset: StatsDataset;
  syncState: StatisticsSourceSyncState;
  confirmReplace: (message: string) => boolean;
}) {
  if (
    input.syncState.datasetStale
    && !input.confirmReplace('Replace the newer frequency-table draft with counts from the list?')
  ) {
    return null;
  }
  return collapseDatasetToFrequencyTable(input.dataset);
}

export function prepareStatisticsDataset(input: {
  table: FrequencyTable;
  syncState: StatisticsSourceSyncState;
  confirmReplace: (message: string) => boolean;
}) {
  if (frequencyObservationCount(input.table.rows) > MAX_EXPANDED_STATISTICS_OBSERVATIONS) {
    return {
      ok: false as const,
      notice: 'Table stays compact above 10,000 observations; evaluate it directly.',
    };
  }
  if (
    input.syncState.frequencyTableStale
    && !input.confirmReplace('Replace the newer list draft with observations from the frequency table?')
  ) {
    return { ok: false as const };
  }
  return { ok: true as const, dataset: expandFrequencyTableToDataset(input.table) };
}
