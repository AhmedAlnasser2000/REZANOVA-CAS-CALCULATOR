import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  DEFAULT_SETTINGS,
  type CalculatorMemorySnapshot,
} from '../../types/calculator';
import {
  bootApp as bootAppPersistence,
  clearCalculatorMemorySnapshot as clearCalculatorMemorySnapshotPersistence,
  isDesktopRuntime as isDesktopRuntimePersistence,
  loadCalculatorMemorySnapshot as loadCalculatorMemorySnapshotPersistence,
  loadHistoryEntries as loadHistoryEntriesPersistence,
  persistCalculatorMemorySnapshot as persistCalculatorMemorySnapshotPersistence,
  persistSettings as persistSettingsPersistence,
  persistVariableMemory as persistVariableMemoryPersistence,
} from './persistence';
import {
  bootApp,
  clearCalculatorMemorySnapshot,
  isDesktopRuntime,
  loadCalculatorMemorySnapshot,
  loadHistoryEntries,
  persistCalculatorMemorySnapshot,
  persistSettings,
  persistVariableMemory,
} from './tauri';

vi.mock('./tauri', () => ({
  bootApp: vi.fn(),
  clearCalculatorMemorySnapshot: vi.fn(),
  isDesktopRuntime: vi.fn(),
  loadCalculatorMemorySnapshot: vi.fn(),
  loadHistoryEntries: vi.fn(),
  persistCalculatorMemorySnapshot: vi.fn(),
  persistSettings: vi.fn(),
  persistVariableMemory: vi.fn(),
}));

describe('app-state persistence facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates app bootstrap and persistence helpers to the Tauri/web-preview implementation', async () => {
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
    vi.mocked(bootApp).mockResolvedValue({
      currentMode: 'calculate',
      historyCount: 0,
      modeTree: [],
      settings: DEFAULT_SETTINGS,
      variableMemory: [],
      version: 'test',
    });
    vi.mocked(loadHistoryEntries).mockResolvedValue([]);
    vi.mocked(loadCalculatorMemorySnapshot).mockResolvedValue(snapshot);
    vi.mocked(persistSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(persistVariableMemory).mockResolvedValue([]);
    vi.mocked(persistCalculatorMemorySnapshot).mockResolvedValue(snapshot);
    vi.mocked(clearCalculatorMemorySnapshot).mockResolvedValue(undefined);
    vi.mocked(isDesktopRuntime).mockReturnValue(true);

    await expect(bootAppPersistence()).resolves.toMatchObject({
      currentMode: 'calculate',
    });
    await expect(loadHistoryEntriesPersistence()).resolves.toEqual([]);
    await expect(loadCalculatorMemorySnapshotPersistence()).resolves.toBe(snapshot);
    await expect(persistSettingsPersistence({ angleUnit: 'deg' })).resolves.toBe(DEFAULT_SETTINGS);
    await expect(persistVariableMemoryPersistence([])).resolves.toEqual([]);
    await expect(persistCalculatorMemorySnapshotPersistence(snapshot)).resolves.toBe(snapshot);
    await expect(clearCalculatorMemorySnapshotPersistence()).resolves.toBeUndefined();
    expect(isDesktopRuntimePersistence()).toBe(true);

    expect(bootApp).toHaveBeenCalledTimes(1);
    expect(loadHistoryEntries).toHaveBeenCalledTimes(1);
    expect(loadCalculatorMemorySnapshot).toHaveBeenCalledTimes(1);
    expect(persistSettings).toHaveBeenCalledWith({ angleUnit: 'deg' });
    expect(persistVariableMemory).toHaveBeenCalledWith([]);
    expect(persistCalculatorMemorySnapshot).toHaveBeenCalledWith(snapshot);
    expect(clearCalculatorMemorySnapshot).toHaveBeenCalledTimes(1);
    expect(isDesktopRuntime).toHaveBeenCalledTimes(1);
  });
});
