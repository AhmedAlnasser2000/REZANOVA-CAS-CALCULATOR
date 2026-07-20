type PersistenceModule = typeof import('./tauri');

export const HISTORY_CANONICAL_CLEANUP_NOTICE =
  (count: number) => `${count} incompatible History ${count === 1 ? 'record was' : 'records were'} removed.`;

export function isDesktopRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function loadPersistence() {
  return import('./tauri');
}

export async function bootApp(...args: Parameters<PersistenceModule['bootApp']>) {
  return (await loadPersistence()).bootApp(...args);
}

export async function loadLauncherCategories(
  ...args: Parameters<PersistenceModule['loadLauncherCategories']>
) {
  return (await loadPersistence()).loadLauncherCategories(...args);
}

export async function persistMode(...args: Parameters<PersistenceModule['persistMode']>) {
  return (await loadPersistence()).persistMode(...args);
}

export async function persistSettings(...args: Parameters<PersistenceModule['persistSettings']>) {
  return (await loadPersistence()).persistSettings(...args);
}

export async function loadHistoryEntriesWithCleanup(
  ...args: Parameters<PersistenceModule['loadHistoryEntriesWithCleanup']>
) {
  return (await loadPersistence()).loadHistoryEntriesWithCleanup(...args);
}

export async function loadHistoryEntries(
  ...args: Parameters<PersistenceModule['loadHistoryEntries']>
) {
  return (await loadPersistence()).loadHistoryEntries(...args);
}

export async function appendHistoryEntry(
  ...args: Parameters<PersistenceModule['appendHistoryEntry']>
) {
  return (await loadPersistence()).appendHistoryEntry(...args);
}

export async function clearHistoryEntries(
  ...args: Parameters<PersistenceModule['clearHistoryEntries']>
) {
  return (await loadPersistence()).clearHistoryEntries(...args);
}

export async function deleteHistoryEntry(
  ...args: Parameters<PersistenceModule['deleteHistoryEntry']>
) {
  return (await loadPersistence()).deleteHistoryEntry(...args);
}

export async function persistVariableMemory(
  ...args: Parameters<PersistenceModule['persistVariableMemory']>
) {
  return (await loadPersistence()).persistVariableMemory(...args);
}

export async function loadCalculatorMemorySnapshot(
  ...args: Parameters<PersistenceModule['loadCalculatorMemorySnapshot']>
) {
  return (await loadPersistence()).loadCalculatorMemorySnapshot(...args);
}

export async function persistCalculatorMemorySnapshot(
  ...args: Parameters<PersistenceModule['persistCalculatorMemorySnapshot']>
) {
  return (await loadPersistence()).persistCalculatorMemorySnapshot(...args);
}

export async function clearCalculatorMemorySnapshot(
  ...args: Parameters<PersistenceModule['clearCalculatorMemorySnapshot']>
) {
  return (await loadPersistence()).clearCalculatorMemorySnapshot(...args);
}
