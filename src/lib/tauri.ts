import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_LAUNCHER_CATEGORIES,
  DEFAULT_MODE_TREE,
  DEFAULT_SETTINGS,
  type AppBootstrap,
  type HistoryEntry,
  type LauncherCategory,
  type MenuNode,
  type ModeId,
  type ModeState,
  type NumericOdeRequest,
  type NumericOdeResponse,
  type Settings,
  type SettingsPatch,
} from '../types/calculator';
import {
  appBootstrapSchema,
  historyEntrySchema,
  launcherCategorySchema,
  menuNodeSchema,
  modeStateSchema,
  settingsSchema,
} from './schemas';

function hasTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function optionalInvoke<T>(command: string, args?: Record<string, unknown>) {
  if (!hasTauriRuntime()) {
    return null;
  }

  return invoke<T>(command, args);
}

export async function bootApp(): Promise<AppBootstrap> {
  const payload = await optionalInvoke<AppBootstrap>('boot_app');
  if (!payload) {
    return {
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      modeTree: DEFAULT_MODE_TREE,
      historyCount: 0,
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
  return payload ? settingsSchema.parse(payload) : { ...DEFAULT_SETTINGS, ...settingsPatch };
}

export async function loadHistoryEntries(): Promise<HistoryEntry[]> {
  const payload = await optionalInvoke<HistoryEntry[]>('load_history');
  return payload ? payload.map((entry) => historyEntrySchema.parse(entry)) : [];
}

export async function appendHistoryEntry(entry: HistoryEntry) {
  await optionalInvoke('append_history', { entry });
}

export async function clearHistoryEntries() {
  await optionalInvoke('clear_history');
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
