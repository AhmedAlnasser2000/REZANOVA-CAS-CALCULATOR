import {
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { WEB_PREVIEW_APP_STATE_STORAGE_KEY } from './lib/app-state/tauri';
import {
  DEFAULT_SETTINGS,
  type HistoryEntry,
} from './types/calculator';
import {
  openLauncherApp,
  type AppUser,
  renderAppMain,
  setMathFieldLatex,
} from './test/renderAppMain';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

async function openLauncherAppInNewTab(user: AppUser, categoryLabel: string, appLabel: string) {
  await user.click(screen.getByTestId('keypad-menu'));
  const menuInspector = await screen.findByTestId('left-menu-inspector');
  await user.click(await within(menuInspector).findByRole('button', { name: new RegExp(categoryLabel, 'i') }));
  const appButton = await within(menuInspector).findByRole('button', { name: new RegExp(appLabel, 'i') });
  const appRow = appButton.closest('.launcher-entry-row');
  if (!appRow) {
    throw new Error(`Missing launcher row for ${appLabel}`);
  }
  await user.click(within(appRow as HTMLElement).getByLabelText('Open in new tab'));
}

describe('AppMain workspace tabs', () => {
  beforeEach(() => {
    setViewportWidth(1366);
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('retargets the active workspace tab for normal mode selection', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('workspace-tab-add'));
    await waitFor(() => expect(screen.getAllByTestId('workspace-tab')).toHaveLength(2));

    await openLauncherApp(user, 'Calculus', 'Calculus');

    await waitFor(() => {
      const tabs = screen.getAllByTestId('workspace-tab');
      expect(tabs).toHaveLength(2);
      const activeTab = tabs.find((tab) => tab.classList.contains('is-active'));
      expect(activeTab).toHaveAttribute('data-workspace-kind', 'calculus');
      expect(within(activeTab as HTMLElement).getByRole('tab')).toHaveTextContent('Calculus');
    });
  });

  it('opens launcher entries in explicit new tabs while plus remains blank Calculate', async () => {
    const { user } = await renderAppMain();

    await openLauncherAppInNewTab(user, 'Core', 'Equation');

    await waitFor(() => {
      const tabs = screen.getAllByTestId('workspace-tab');
      expect(tabs).toHaveLength(2);
      const activeTab = tabs.find((tab) => tab.classList.contains('is-active'));
      expect(activeTab).toHaveAttribute('data-workspace-kind', 'equation');
      expect(within(activeTab as HTMLElement).getByRole('tab')).toHaveTextContent('Equation');
    });
    expect(await screen.findByRole('button', { name: /symbolic/i })).toBeInTheDocument();

    await user.click(screen.getByTestId('workspace-tab-add'));

    await waitFor(() => {
      const tabs = screen.getAllByTestId('workspace-tab');
      expect(tabs).toHaveLength(3);
      const activeTab = tabs.find((tab) => tab.classList.contains('is-active'));
      expect(activeTab).toHaveAttribute('data-workspace-kind', 'calculate');
      expect(within(activeTab as HTMLElement).getByRole('tab')).toHaveTextContent('Calculate');
    });
  });

  it('replays an Equation history card into its destination on the first click', async () => {
    const historyEntry: HistoryEntry = {
      id: 'history.equation.destination',
      mode: 'equation',
      inputLatex: 'x+1=2',
      resultLatex: 'x=1',
      equationSolveTarget: 'x',
      timestamp: '2026-07-01T00:00:00.000Z',
    };
    window.localStorage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      history: [historyEntry],
      variableMemory: [],
    }));
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);

    await waitFor(() => {
      const activeTab = screen.getAllByTestId('workspace-tab')
        .find((tab) => tab.classList.contains('is-active'));
      expect(activeTab).toHaveAttribute('data-workspace-kind', 'equation');
      const editor = screen.getByTestId('main-editor') as HTMLElement & {
        getValue: (format?: string) => string;
      };
      expect(editor.getValue('latex')).toBe('x+1=2');
    });
  });

  it('auto-switches Calculate equation prompts directly into symbolic Equation', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('quick-setting-auto-equation'));
    setMathFieldLatex('main-editor', 'x+1=2');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitFor(() => {
      const activeTab = screen.getAllByTestId('workspace-tab')
        .find((tab) => tab.classList.contains('is-active'));
      expect(activeTab).toHaveAttribute('data-workspace-kind', 'equation');
      const editor = screen.getByTestId('main-editor') as HTMLElement & {
        getValue: (format?: string) => string;
      };
      expect(editor.getValue('latex')).toBe('x+1=2');
    });
  });
});
