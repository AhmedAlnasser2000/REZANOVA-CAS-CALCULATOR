import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MODE_TREE, DEFAULT_SETTINGS } from './types/calculator';

describe('AppMain bootstrap status', () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.doUnmock('./lib/tauri');
  });

  it('shows the Equation start page after bootstrap even if background loaders lag', async () => {
    vi.doMock('./lib/tauri', async () => {
      const actual = await vi.importActual<typeof import('./lib/app-state/tauri')>('./lib/tauri');

      return {
        ...actual,
        bootApp: vi.fn().mockResolvedValue({
          currentMode: 'calculate',
          settings: DEFAULT_SETTINGS,
          modeTree: DEFAULT_MODE_TREE,
          historyCount: 0,
          variableMemory: [],
          version: 'web-preview',
        }),
        loadHistoryEntries: vi.fn(() => new Promise<never[]>(() => {})),
        loadLauncherCategories: vi.fn(() => new Promise<never[]>(() => {})),
        isDesktopRuntime: vi.fn(() => false),
      };
    });

    const { default: AppMain } = await import('./AppMain');
    render(<AppMain />);

    // Equation is the starting workspace (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B).
    await screen.findByTestId('new-equation-page', {}, { timeout: 10_000 });
    await waitFor(() => expect(document.querySelector('.app-shell')).toHaveAttribute('lang', 'en'));
    expect(screen.queryByTestId('main-editor')).not.toBeInTheDocument();
  });
});
