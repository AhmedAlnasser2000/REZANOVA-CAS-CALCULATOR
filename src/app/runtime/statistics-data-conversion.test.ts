import { describe, expect, it, vi } from 'vitest';
import {
  prepareStatisticsDataset,
  prepareStatisticsFrequencyTable,
} from './statistics-data-conversion';

describe('statistics explicit data conversion', () => {
  it('confirms before replacing a newer destination draft', () => {
    const reject = vi.fn(() => false);
    expect(prepareStatisticsFrequencyTable({
      dataset: { values: ['1', '2'] },
      syncState: { datasetStale: true, frequencyTableStale: false },
      confirmReplace: reject,
    })).toBeNull();
    expect(reject).toHaveBeenCalledOnce();

    expect(prepareStatisticsDataset({
      table: { rows: [{ value: '1', frequency: '2' }] },
      syncState: { datasetStale: false, frequencyTableStale: true },
      confirmReplace: reject,
    })).toEqual({ ok: false });
    expect(reject).toHaveBeenCalledTimes(2);
  });

  it('refuses physical expansion above 10,000 observations', () => {
    const result = prepareStatisticsDataset({
      table: { rows: [{ value: '1', frequency: '10001' }] },
      syncState: { datasetStale: false, frequencyTableStale: false },
      confirmReplace: () => true,
    });
    expect(result).toEqual({
      ok: false,
      notice: 'Table stays compact above 10,000 observations; evaluate it directly.',
    });
  });
});
