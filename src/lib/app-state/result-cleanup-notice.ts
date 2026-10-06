const KEY = 'rezanova.result-cleanup-notice.v1';
type Counts = {history: number; memory: number};
let pending: Counts = {history: 0, memory: 0};
let pendingStorage: Storage | null = null;

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/** Notification state only. It conveys no result or mathematical authority. */
export function rememberResultCleanup(kind: keyof Counts, count: number): number {
  const store = storage();
  if (store !== pendingStorage) { pending = {history: 0, memory: 0}; pendingStorage = store; }
  try {
    const saved: unknown = JSON.parse(store?.getItem(KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      for (const key of ['history', 'memory'] as const) {
        const value = (saved as Record<string, unknown>)[key];
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) pending[key] = value;
      }
    }
  } catch { /* Unavailable notification storage must not affect result cleanup. */ }
  pending[kind] = Math.max(pending[kind], count);
  if (pending.history || pending.memory) {
    try { store?.setItem(KEY, JSON.stringify(pending)); } catch { /* Retain the session notification. */ }
  }
  return pending[kind];
}

export function acknowledgeResultCleanupNotice() {
  pending = {history: 0, memory: 0};
  try { storage()?.removeItem(KEY); } catch { /* Showing a duplicate notice is safe. */ }
}
