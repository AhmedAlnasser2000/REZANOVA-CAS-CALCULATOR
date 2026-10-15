/**
 * The one-time History wipe of EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B (user decision 2026-10-14): when the old
 * Equation workspace and engine were retired, every History entry (all workspaces) is cleared once so the app starts
 * fresh; nothing is replayed. A versioned marker records that the wipe ran. Notification state only: it carries no
 * result or mathematical authority.
 */
export const HISTORY_RETIREMENT_WIPE_KEY = 'rezanova.history-wipe.equation-retirement.v1';

export const HISTORY_RETIREMENT_WIPE_NOTICE = 'History was cleared when Equation was upgraded.';

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/** Whether the wipe is still owed. Unreadable storage counts as done: wiping on every start would be worse. */
export function historyRetirementWipeOwed(): boolean {
  const store = storage();
  if (!store) return false;
  try { return store.getItem(HISTORY_RETIREMENT_WIPE_KEY) !== 'done'; } catch { return false; }
}

export function markHistoryRetirementWipeDone() {
  try { storage()?.setItem(HISTORY_RETIREMENT_WIPE_KEY, 'done'); } catch { /* The wipe already ran; at worst it runs once more. */ }
}
