import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { LauncherCategory } from '../../types/calculator';
import { loadLauncherCategories } from '../../lib/app-state/persistence';
import { useLauncherRuntime } from './useLauncherRuntime';

vi.mock('../../lib/app-state/persistence', () => ({
  loadLauncherCategories: vi.fn(),
}));

function renderLauncherRuntime(options: {
  labsEnabled?: boolean;
  onCloseHistoryPanel?: () => void;
  onLaunchApp?: (entry: LauncherCategory['entries'][number]) => void;
} = {}) {
  return renderHook(() => useLauncherRuntime({
    calculateScreen: 'standard',
    currentMode: 'calculate',
    labsEnabled: options.labsEnabled ?? false,
    onCloseHistoryPanel: options.onCloseHistoryPanel ?? vi.fn(),
    onLaunchApp: options.onLaunchApp ?? vi.fn(),
    previousNonGuideMode: 'calculate',
  }));
}

describe('useLauncherRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads launcher categories through the app-state persistence seam', async () => {
    const loadedCategories: LauncherCategory[] = [
      {
        id: 'core',
        label: 'Core',
        description: 'Core tools',
        hotkey: '1',
        entries: [
          {
            id: 'equation',
            label: 'Equation',
            description: 'Equation solver',
            hotkey: '1',
            launch: { mode: 'equation' },
          },
        ],
      },
    ];
    vi.mocked(loadLauncherCategories).mockResolvedValue(loadedCategories);

    const closeHistoryPanel = vi.fn();
    const hook = renderLauncherRuntime({ onCloseHistoryPanel: closeHistoryPanel });

    await waitFor(() => {
      expect(hook.result.current.launcherCategories).toBe(loadedCategories);
    });

    act(() => {
      hook.result.current.openLauncher();
    });

    expect(closeHistoryPanel).toHaveBeenCalledTimes(1);
    expect(hook.result.current.selectedLauncherCategory?.id).toBe('core');
    expect(loadLauncherCategories).toHaveBeenCalledTimes(1);
  });
});
