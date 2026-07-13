import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendHistoryEntry } from '../../lib/app-state/persistence';
import type { HistoryEntry } from '../../types/calculator';
import {
  HISTORY_PERSISTENCE_FAILURE_NOTICE,
  persistHistoryEntryWithWarning,
} from './historyPersistence';
import { historyResultDocument } from '../../test-utils/history-result-document';

vi.mock('../../lib/app-state/persistence', () => ({
  appendHistoryEntry: vi.fn(),
}));

const ENTRY: HistoryEntry = {
  id: 'history.persistence.1',
  mode: 'calculate',
  inputLatex: '2+2',
  resultDocument: historyResultDocument('4'),
  timestamp: '2026-07-11T00:00:00.000Z',
};

describe('History persistence warning policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays quiet after a durable append', async () => {
    vi.mocked(appendHistoryEntry).mockResolvedValue({ ok: true });
    const showWarning = vi.fn();

    await expect(persistHistoryEntryWithWarning(ENTRY, showWarning)).resolves.toEqual({ ok: true });
    expect(showWarning).not.toHaveBeenCalled();
  });

  it.each(['invalid', 'over-size', 'unavailable'] as const)(
    'shows the session-only warning for a %s append result',
    async (reason) => {
      vi.mocked(appendHistoryEntry).mockResolvedValue({ ok: false, reason });
      const showWarning = vi.fn();

      await persistHistoryEntryWithWarning(ENTRY, showWarning);
      expect(showWarning).toHaveBeenCalledWith(HISTORY_PERSISTENCE_FAILURE_NOTICE);
    },
  );

  it('converts an unexpected append rejection into the same warning', async () => {
    vi.mocked(appendHistoryEntry).mockRejectedValue(new Error('native persistence failed'));
    const showWarning = vi.fn();

    await expect(persistHistoryEntryWithWarning(ENTRY, showWarning)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(showWarning).toHaveBeenCalledWith(HISTORY_PERSISTENCE_FAILURE_NOTICE);
  });
});
