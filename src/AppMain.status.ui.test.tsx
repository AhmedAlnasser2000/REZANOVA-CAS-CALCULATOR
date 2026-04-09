import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MODE_TREE, DEFAULT_SETTINGS } from './types/calculator';

describe('AppMain bootstrap status', () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.doUnmock('./lib/tauri');
  });

  it('marks the display ready after shell bootstrap even if background loaders lag', async () => {
    vi.doMock('./lib/tauri', async () => {
      const actual = await vi.importActual<typeof import('./lib/tauri')>('./lib/tauri');

      return {
        ...actual,
        bootApp: vi.fn().mockResolvedValue({
          currentMode: 'calculate',
          settings: DEFAULT_SETTINGS,
          modeTree: DEFAULT_MODE_TREE,
          historyCount: 0,
          version: 'web-preview',
        }),
        loadHistoryEntries: vi.fn(() => new Promise<never[]>(() => {})),
        loadLauncherCategories: vi.fn(() => new Promise<never[]>(() => {})),
        isDesktopRuntime: vi.fn(() => false),
      };
    });

    const { default: AppMain } = await import('./AppMain');
    render(<AppMain />);

    await screen.findByTestId('main-editor');
    await waitFor(() => expect(screen.getByTestId('display-status')).toHaveTextContent('Ready'));
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Loading...');
  });
});
