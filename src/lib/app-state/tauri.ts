import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_LAUNCHER_CATEGORIES,
  DEFAULT_MODE_TREE,
  DEFAULT_SETTINGS,
  type AppBootstrap,
  type CalculatorMemorySnapshot,
  type CanonicalResultDocumentV1,
  type HistoryEntry,
  type LauncherCategory,
  type MenuNode,
  type ModeId,
  type ModeState,
  type NumericOdeRequest,
  type NumericOdeResponse,
  type Settings,
  type SettingsPatch,
  type StoredVariableValue,
} from '../../types/calculator';
import { validateCanonicalResultDocumentVersioned } from '../result-contract';
import {
  appBootstrapSchema,
  calculatorMemorySnapshotSchema,
  hasValidHistoryResultDocument,
  historyEntrySchema,
  launcherCategorySchema,
  menuNodeSchema,
  modeIdSchema,
  modeStateSchema,
  settingsSchema,
  storedVariableValueSchema,
} from './schemas';

export const WEB_PREVIEW_APP_STATE_STORAGE_KEY = 'rezanova-classwiz-calculator:app-state:v1';
export const HISTORY_ENTRY_LIMIT = 80;
export const HISTORY_ENTRY_MAX_SERIALIZED_BYTES = 2_000_000;

export type HistoryPersistenceWriteResult =
  | { ok: true; storageMode?: 'canonical-only-fallback' }
  | { ok: false; reason: 'invalid' | 'over-size' | 'unavailable' };

type WebPreviewState = {
  currentMode: ModeId;
  settings: Settings;
  history: unknown[];
  variableMemory: StoredVariableValue[];
  calculatorMemory: CalculatorMemorySnapshot | null;
};

function hasTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function optionalInvoke<T>(command: string, args?: Record<string, unknown>) {
  if (!hasTauriRuntime()) {
    return null;
  }

  return invoke<T>(command, args);
}

function emptyWebPreviewState(): WebPreviewState {
  return {
    currentMode: 'calculate',
    settings: DEFAULT_SETTINGS,
    history: [],
    variableMemory: [],
    calculatorMemory: null,
  };
}

function getWebPreviewStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const LEGACY_HISTORY_RESULT_FIELDS = [
  'resolvedInputLatex',
  'resultLatex',
  'exactSupplementLatex',
  'approxText',
  'detailSections',
  'systemReadback',
  'answerDomain',
  'solutionKind',
  'variableSubstitutions',
  'resultDocumentOmissionReason',
] as const;

export const HISTORY_CANONICAL_CLEANUP_NOTICE =
  (count: number) => `${count} incompatible History ${count === 1 ? 'record was' : 'records were'} removed.`;

export type HistoryLoadResult = {
  entries: HistoryEntry[];
  removedCount: number;
};

type ParsedHistoryLedger = HistoryLoadResult & {
  storageRows: unknown[];
  changed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasHistoryEnvelope(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && value.id.trim().length > 0
    && modeIdSchema.safeParse(value.mode).success
    && typeof value.inputLatex === 'string'
    && typeof value.timestamp === 'string'
    && value.timestamp.trim().length > 0;
}

function isFutureHistoryRow(value: unknown) {
  if (!hasHistoryEnvelope(value) || !isRecord(value.resultDocument)) return false;
  const version = value.resultDocument.version;
  return typeof version === 'number' && Number.isInteger(version) && version > 4;
}

function sanitizeCurrentHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const sanitized: Record<string, unknown> = { ...value };
  for (const field of LEGACY_HISTORY_RESULT_FIELDS) {
    Reflect.deleteProperty(sanitized, field);
  }
  const parsed = historyEntrySchema.safeParse(sanitized);
  if (!parsed.success || !hasValidHistoryResultDocument(sanitized)) return null;
  const validation = validateCanonicalResultDocumentVersioned(sanitized.resultDocument);
  if (!validation.ok || validation.validated.value.outcomeKind !== 'success') return null;
  sanitized.resultDocument = validation.validated.value;
  return sanitized as HistoryEntry;
}

export function parseHistoryLedger(payload: unknown): ParsedHistoryLedger {
  if (!Array.isArray(payload)) {
    return { entries: [], storageRows: [], removedCount: 0, changed: payload !== undefined };
  }

  const classified: Array<
    | { kind: 'current'; value: HistoryEntry; changed: boolean }
    | { kind: 'future'; value: unknown }
  > = [];
  let removedCount = 0;
  for (const row of payload) {
    if (isFutureHistoryRow(row)) {
      classified.push({ kind: 'future', value: row });
      continue;
    }
    const current = sanitizeCurrentHistoryEntry(row);
    if (!current) {
      removedCount += 1;
      continue;
    }
    const changed = LEGACY_HISTORY_RESULT_FIELDS.some((field) =>
      isRecord(row) && Object.prototype.hasOwnProperty.call(row, field));
    classified.push({ kind: 'current', value: current, changed });
  }

  let visibleCount = 0;
  const retained = classified.filter((row, index) => {
    if (row.kind === 'future') return true;
    const currentAfter = classified.slice(index + 1)
      .filter((candidate) => candidate.kind === 'current').length;
    const keep = currentAfter < HISTORY_ENTRY_LIMIT;
    if (keep) visibleCount += 1;
    return keep;
  });
  const entries = retained.flatMap((row) => row.kind === 'current' ? [row.value] : []);
  const storageRows = retained.map((row) => row.value);
  const changed = removedCount > 0
    || classified.some((row) => row.kind === 'current' && row.changed)
    || visibleCount !== classified.filter((row) => row.kind === 'current').length;
  return { entries, storageRows, removedCount, changed };
}

function parseVariableMemory(payload: unknown): StoredVariableValue[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => storedVariableValueSchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: StoredVariableValue } => entry.success)
    .map((entry) => entry.data);
}

function parseCalculatorMemory(payload: unknown): CalculatorMemorySnapshot | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const history = parseHistoryLedger(candidate.history).entries;
  const parsed = calculatorMemorySnapshotSchema.safeParse({
    ...candidate,
    currentMode: 'calculate',
    previousNonGuideMode: 'calculate',
    history,
    displayOutcome: null,
    session: {},
  });
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    history,
  };
}

function serializedByteLength(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === 'string'
      ? new TextEncoder().encode(serialized).byteLength
      : null;
  } catch {
    return null;
  }
}

function readWebPreviewState(): WebPreviewState {
  const storage = getWebPreviewStorage();
  if (!storage) {
    return emptyWebPreviewState();
  }

  const raw = storage.getItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY);
  if (!raw) {
    return emptyWebPreviewState();
  }

  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const currentMode = modeIdSchema.safeParse(payload.currentMode);
    const settings = settingsSchema.safeParse(payload.settings);

    return {
      currentMode: currentMode.success ? currentMode.data : 'calculate',
      settings: settings.success ? settings.data : DEFAULT_SETTINGS,
      history: Array.isArray(payload.history) ? payload.history : [],
      variableMemory: parseVariableMemory(payload.variableMemory),
      calculatorMemory: parseCalculatorMemory(payload.calculatorMemory),
    };
  } catch {
    storage.removeItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY);
    return emptyWebPreviewState();
  }
}

function writeWebPreviewState(updater: (state: WebPreviewState) => WebPreviewState): WebPreviewState {
  const storage = getWebPreviewStorage();
  const nextState = updater(readWebPreviewState());
  storage?.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
    version: 1,
    currentMode: nextState.currentMode,
    settings: nextState.settings,
    history: parseHistoryLedger(nextState.history).storageRows,
    variableMemory: nextState.variableMemory,
    calculatorMemory: nextState.calculatorMemory,
  }));
  return nextState;
}

export async function bootApp(): Promise<AppBootstrap> {
  const payload = await optionalInvoke<AppBootstrap>('boot_app');
  if (!payload) {
    const state = readWebPreviewState();
    return {
      currentMode: state.currentMode,
      settings: state.settings,
      modeTree: DEFAULT_MODE_TREE,
      historyCount: parseHistoryLedger(state.history).entries.length,
      variableMemory: state.variableMemory,
      version: 'web-preview',
    };
  }

  return appBootstrapSchema.parse(payload);
}

export async function loadModeTree(): Promise<MenuNode[]> {
  const payload = await optionalInvoke<MenuNode[]>('get_mode_tree');
  return payload ? payload.map((entry) => menuNodeSchema.parse(entry)) : DEFAULT_MODE_TREE;
}

export async function loadLauncherCategories(): Promise<LauncherCategory[]> {
  const payload = await optionalInvoke<LauncherCategory[]>('get_launcher_categories');
  return payload
    ? payload.map((entry) => launcherCategorySchema.parse(entry))
    : DEFAULT_LAUNCHER_CATEGORIES;
}

export async function persistMode(modeId: ModeId): Promise<ModeState> {
  const payload = await optionalInvoke<ModeState>('set_mode', { modeId });
  if (!payload) {
    writeWebPreviewState((state) => ({
      ...state,
      currentMode: modeId,
    }));
  }

  return payload
    ? modeStateSchema.parse(payload)
    : {
        activeMode: modeId,
        menu:
          DEFAULT_MODE_TREE.find((node) => node.id === modeId)?.children ?? [],
      };
}

export async function persistSettings(settingsPatch: SettingsPatch): Promise<Settings> {
  const payload = await optionalInvoke<Settings>('save_settings', {
    patch: settingsPatch,
  });
  if (payload) {
    return settingsSchema.parse(payload);
  }

  return writeWebPreviewState((state) => ({
    ...state,
    settings: settingsSchema.parse({
      ...state.settings,
      ...settingsPatch,
    }),
  })).settings;
}

export async function loadHistoryEntriesWithCleanup(): Promise<HistoryLoadResult> {
  const nativePayload = await optionalInvoke<unknown[]>('load_history');
  const browserState = nativePayload ? null : readWebPreviewState();
  const parsed = parseHistoryLedger(nativePayload ?? browserState?.history);
  if (parsed.changed) {
    if (nativePayload) {
      await optionalInvoke('replace_history', { entries: parsed.storageRows });
    } else {
      writeWebPreviewState((state) => ({ ...state, history: parsed.storageRows }));
    }
  }
  return { entries: parsed.entries, removedCount: parsed.removedCount };
}

export async function loadHistoryEntries(): Promise<HistoryEntry[]> {
  return (await loadHistoryEntriesWithCleanup()).entries;
}

function stripOptionalMathJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripOptionalMathJson);
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'mathJson' && typeof value.canonicalLatex === 'string') continue;
    result[key] = stripOptionalMathJson(entry);
  }
  return result;
}

export function prepareHistoryEntryForPersistence(
  entry: HistoryEntry,
): { ok: true; entry: HistoryEntry } | { ok: false; reason: 'invalid' | 'over-size' } {
  if (!historyEntrySchema.safeParse(entry).success || !hasValidHistoryResultDocument(entry)) {
    return { ok: false, reason: 'invalid' };
  }
  const entryBytes = serializedByteLength(entry);
  if (entryBytes === null) return { ok: false, reason: 'invalid' };
  if (entryBytes <= HISTORY_ENTRY_MAX_SERIALIZED_BYTES) return { ok: true, entry };
  if (entry.resultDocument.version !== 1) return { ok: false, reason: 'over-size' };

  const canonicalOnlyEntry = {
    ...entry,
    resultDocument: stripOptionalMathJson(entry.resultDocument) as CanonicalResultDocumentV1,
    resultStorageMode: 'canonical-only-fallback' as const,
  };
  if (!hasValidHistoryResultDocument(canonicalOnlyEntry)) {
    return { ok: false, reason: 'invalid' };
  }
  const canonicalOnlyBytes = serializedByteLength(canonicalOnlyEntry);
  return canonicalOnlyBytes !== null && canonicalOnlyBytes <= HISTORY_ENTRY_MAX_SERIALIZED_BYTES
    ? { ok: true, entry: canonicalOnlyEntry }
    : { ok: false, reason: 'over-size' };
}

export async function appendHistoryEntry(
  entry: HistoryEntry,
): Promise<HistoryPersistenceWriteResult> {
  const prepared = prepareHistoryEntryForPersistence(entry);
  if (!prepared.ok) return prepared;
  const persistedEntry = prepared.entry;

  try {
    if (hasTauriRuntime()) {
      await optionalInvoke('append_history', { entry: persistedEntry });
      return {
        ok: true,
        ...(persistedEntry.resultStorageMode ? { storageMode: persistedEntry.resultStorageMode } : {}),
      };
    }

    if (!getWebPreviewStorage()) {
      return { ok: false, reason: 'unavailable' };
    }

    writeWebPreviewState((state) => ({
      ...state,
      history: [...state.history, persistedEntry],
    }));
    return {
      ok: true,
      ...(persistedEntry.resultStorageMode ? { storageMode: persistedEntry.resultStorageMode } : {}),
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function clearHistoryEntries() {
  if (hasTauriRuntime()) {
    await optionalInvoke('clear_history');
    return;
  }

  writeWebPreviewState((state) => ({
    ...state,
    history: state.history.filter(isFutureHistoryRow),
  }));
}

export async function deleteHistoryEntry(id: string) {
  if (hasTauriRuntime()) {
    await optionalInvoke('delete_history_entry', { id });
    return;
  }

  writeWebPreviewState((state) => ({
    ...state,
    history: state.history.filter((entry) => !isRecord(entry) || entry.id !== id),
  }));
}

export async function persistVariableMemory(entries: StoredVariableValue[]): Promise<StoredVariableValue[]> {
  const payload = await optionalInvoke<StoredVariableValue[]>('save_variable_memory', { entries });
  if (payload) {
    return parseVariableMemory(payload);
  }

  return writeWebPreviewState((state) => ({
    ...state,
    variableMemory: parseVariableMemory(entries),
  })).variableMemory;
}

export async function loadCalculatorMemorySnapshot(): Promise<CalculatorMemorySnapshot | null> {
  const payload = await optionalInvoke<CalculatorMemorySnapshot | null>('load_calculator_memory');
  return hasTauriRuntime() ? parseCalculatorMemory(payload) : readWebPreviewState().calculatorMemory;
}

export async function persistCalculatorMemorySnapshot(
  snapshot: CalculatorMemorySnapshot,
): Promise<CalculatorMemorySnapshot | null> {
  const parsed = parseCalculatorMemory(snapshot);
  if (!parsed) {
    return null;
  }

  if (hasTauriRuntime()) {
    const payload = await optionalInvoke<CalculatorMemorySnapshot | null>('save_calculator_memory', {
      snapshot: parsed,
    });
    return parseCalculatorMemory(payload);
  }

  return writeWebPreviewState((state) => ({
    ...state,
    calculatorMemory: parsed,
  })).calculatorMemory;
}

export async function clearCalculatorMemorySnapshot() {
  if (hasTauriRuntime()) {
    await optionalInvoke('clear_calculator_memory');
    return;
  }

  writeWebPreviewState((state) => ({
    ...state,
    calculatorMemory: null,
  }));
}

export async function solveOdeNumeric(
  request: NumericOdeRequest,
  fallback: (request: NumericOdeRequest) => NumericOdeResponse,
): Promise<NumericOdeResponse> {
  const payload = await optionalInvoke<NumericOdeResponse>('solve_ode_numeric', { request });
  return payload ?? fallback(request);
}

export function isDesktopRuntime() {
  return hasTauriRuntime();
}
