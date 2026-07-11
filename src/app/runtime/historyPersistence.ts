import { appendHistoryEntry } from '../../lib/app-state/persistence';
import type { HistoryEntry } from '../../types/calculator';

export const HISTORY_PERSISTENCE_FAILURE_NOTICE =
  'History is available this session only; it could not be saved.';

export async function persistHistoryEntryWithWarning(
  entry: HistoryEntry,
  showWarning: (notice: string) => void,
) {
  try {
    const result = await appendHistoryEntry(entry);
    if (!result.ok) {
      showWarning(HISTORY_PERSISTENCE_FAILURE_NOTICE);
    }
    return result;
  } catch {
    showWarning(HISTORY_PERSISTENCE_FAILURE_NOTICE);
    return { ok: false, reason: 'unavailable' } as const;
  }
}
