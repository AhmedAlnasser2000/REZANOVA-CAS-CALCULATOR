import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  type LauncherCategory,
  DEFAULT_SETTINGS,
  type CalculatorMemorySnapshot,
} from '../../types/calculator';
import {
  appendHistoryEntry as appendHistoryEntryPersistence,
  bootApp as bootAppPersistence,
  clearCalculatorMemorySnapshot as clearCalculatorMemorySnapshotPersistence,
  clearHistoryEntries as clearHistoryEntriesPersistence,
  deleteHistoryEntry as deleteHistoryEntryPersistence,
  isDesktopRuntime as isDesktopRuntimePersistence,
  loadCalculatorMemorySnapshot as loadCalculatorMemorySnapshotPersistence,
  loadHistoryEntries as loadHistoryEntriesPersistence,
  loadLauncherCategories as loadLauncherCategoriesPersistence,
  persistCalculatorMemorySnapshot as persistCalculatorMemorySnapshotPersistence,
  persistMode as persistModePersistence,
  persistSettings as persistSettingsPersistence,
  persistVariableMemory as persistVariableMemoryPersistence,
} from './persistence';
import {
  appendHistoryEntry,
  bootApp,
  clearCalculatorMemorySnapshot,
  clearHistoryEntries,
  deleteHistoryEntry,
  loadCalculatorMemorySnapshot,
  loadHistoryEntries,
  loadLauncherCategories,
  persistCalculatorMemorySnapshot,
  persistMode,
  persistSettings,
  persistVariableMemory,
} from './tauri';

vi.mock('./tauri', () => ({
  appendHistoryEntry: vi.fn(),
  bootApp: vi.fn(),
  clearCalculatorMemorySnapshot: vi.fn(),
  clearHistoryEntries: vi.fn(),
  deleteHistoryEntry: vi.fn(),
  loadCalculatorMemorySnapshot: vi.fn(),
  loadHistoryEntries: vi.fn(),
  loadLauncherCategories: vi.fn(),
  persistCalculatorMemorySnapshot: vi.fn(),
  persistMode: vi.fn(),
  persistSettings: vi.fn(),
  persistVariableMemory: vi.fn(),
}));

describe('app-state persistence facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates async persistence helpers while detecting the desktop host without eager loading', async () => {
    const snapshot: CalculatorMemorySnapshot = {
      ansLatex: '4',
      currentMode: 'calculate',
      displayOutcome: null,
      history: [],
      savedAt: '2026-06-15T00:00:00.000Z',
      session: {},
      settings: DEFAULT_SETTINGS,
      variableMemory: [],
      version: 1 as const,
    };
    const launcherCategories: LauncherCategory[] = [
      {
        id: 'core',
        label: 'Core',
        description: 'Core tools',
        hotkey: '1',
        entries: [],
      },
    ];
    vi.mocked(bootApp).mockResolvedValue({
      currentMode: 'calculate',
      historyCount: 0,
      modeTree: [],
      settings: DEFAULT_SETTINGS,
      variableMemory: [],
      version: 'test',
    });
    vi.mocked(loadLauncherCategories).mockResolvedValue(launcherCategories);
    vi.mocked(loadHistoryEntries).mockResolvedValue([]);
    vi.mocked(loadCalculatorMemorySnapshot).mockResolvedValue(snapshot);
    vi.mocked(persistSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(persistMode).mockResolvedValue({
      activeMode: 'equation',
      menu: [],
    });
    vi.mocked(persistVariableMemory).mockResolvedValue([]);
    vi.mocked(persistCalculatorMemorySnapshot).mockResolvedValue(snapshot);
    vi.mocked(appendHistoryEntry).mockResolvedValue({ ok: true });
    vi.mocked(clearHistoryEntries).mockResolvedValue(undefined);
    vi.mocked(deleteHistoryEntry).mockResolvedValue(undefined);
    vi.mocked(clearCalculatorMemorySnapshot).mockResolvedValue(undefined);

    await expect(bootAppPersistence()).resolves.toMatchObject({
      currentMode: 'calculate',
    });
    await expect(loadLauncherCategoriesPersistence()).resolves.toBe(launcherCategories);
    await expect(loadHistoryEntriesPersistence()).resolves.toEqual([]);
    await expect(loadCalculatorMemorySnapshotPersistence()).resolves.toBe(snapshot);
    await expect(persistSettingsPersistence({ angleUnit: 'deg' })).resolves.toBe(DEFAULT_SETTINGS);
    await expect(persistModePersistence('equation')).resolves.toEqual({
      activeMode: 'equation',
      menu: [],
    });
    await expect(persistVariableMemoryPersistence([])).resolves.toEqual([]);
    await expect(persistCalculatorMemorySnapshotPersistence(snapshot)).resolves.toBe(snapshot);
    await expect(appendHistoryEntryPersistence(snapshot.history[0] ?? {
      id: 'history.1',
      inputLatex: '2+2',
      mode: 'calculate',
      resultLatex: '4',
      timestamp: '2026-06-15T00:00:00.000Z',
    })).resolves.toEqual({ ok: true });
    await expect(clearHistoryEntriesPersistence()).resolves.toBeUndefined();
    await expect(deleteHistoryEntryPersistence('history.1')).resolves.toBeUndefined();
    await expect(clearCalculatorMemorySnapshotPersistence()).resolves.toBeUndefined();
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    expect(isDesktopRuntimePersistence()).toBe(true);
    vi.stubGlobal('window', {});
    expect(isDesktopRuntimePersistence()).toBe(false);

    expect(bootApp).toHaveBeenCalledTimes(1);
    expect(loadLauncherCategories).toHaveBeenCalledTimes(1);
    expect(loadHistoryEntries).toHaveBeenCalledTimes(1);
    expect(loadCalculatorMemorySnapshot).toHaveBeenCalledTimes(1);
    expect(persistSettings).toHaveBeenCalledWith({ angleUnit: 'deg' });
    expect(persistMode).toHaveBeenCalledWith('equation');
    expect(persistVariableMemory).toHaveBeenCalledWith([]);
    expect(persistCalculatorMemorySnapshot).toHaveBeenCalledWith(snapshot);
    expect(appendHistoryEntry).toHaveBeenCalledTimes(1);
    expect(clearHistoryEntries).toHaveBeenCalledTimes(1);
    expect(deleteHistoryEntry).toHaveBeenCalledWith('history.1');
    expect(clearCalculatorMemorySnapshot).toHaveBeenCalledTimes(1);
  });
});
