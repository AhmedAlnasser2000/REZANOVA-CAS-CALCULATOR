import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_LAUNCHER_CATEGORIES,
  DEFAULT_MODE_TREE,
  DEFAULT_SETTINGS,
  type AppBootstrap,
  type CalculatorMemorySnapshot,
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
import {
  appBootstrapSchema,
  calculatorMemorySnapshotSchema,
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

type WebPreviewState = {
  currentMode: ModeId;
  settings: Settings;
  history: HistoryEntry[];
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

function parseHistoryEntries(payload: unknown): HistoryEntry[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const entries: HistoryEntry[] = [];
  for (const entry of payload) {
    const parsed = historyEntrySchema.safeParse(entry);
    if (parsed.success) {
      entries.push(parsed.data as HistoryEntry);
    }
  }

  return entries.slice(-HISTORY_ENTRY_LIMIT);
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
  const parsed = calculatorMemorySnapshotSchema.safeParse({
    ...candidate,
    currentMode: 'calculate',
    previousNonGuideMode: 'calculate',
    history: parseHistoryEntries(candidate.history),
    displayOutcome: null,
    session: {},
  });
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    history: parsed.data.history.slice(-HISTORY_ENTRY_LIMIT),
  };
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
      history: parseHistoryEntries(payload.history),
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
    history: nextState.history.slice(-HISTORY_ENTRY_LIMIT),
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
      historyCount: state.history.length,
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

export async function loadHistoryEntries(): Promise<HistoryEntry[]> {
  const payload = await optionalInvoke<HistoryEntry[]>('load_history');
  return payload ? parseHistoryEntries(payload) : readWebPreviewState().history;
}

export async function appendHistoryEntry(entry: HistoryEntry) {
  if (!historyEntrySchema.safeParse(entry).success) {
    return;
  }

  if (hasTauriRuntime()) {
    await optionalInvoke('append_history', { entry });
    return;
  }

  writeWebPreviewState((state) => ({
    ...state,
    history: [...state.history, entry].slice(-HISTORY_ENTRY_LIMIT),
  }));
}

export async function clearHistoryEntries() {
  if (hasTauriRuntime()) {
    await optionalInvoke('clear_history');
    return;
  }

  writeWebPreviewState((state) => ({
    ...state,
    history: [],
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
