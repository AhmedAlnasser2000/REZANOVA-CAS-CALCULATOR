import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import AppMain from './AppMain';
import { WEB_PREVIEW_APP_STATE_STORAGE_KEY } from './lib/app-state/tauri';
import { DEFAULT_SETTINGS } from './types/calculator';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

/** Equation is the starting workspace (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B). */
async function renderAppAtEquation() {
  const user = userEvent.setup();
  render(<AppMain />);
  await screen.findByTestId('new-equation-page', {}, { timeout: 10_000 });
  return { user };
}

async function openCreateMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('workspace-tab-add-menu'));
  return screen.getByTestId('workspace-tab-create-menu');
}

function activeTab() {
  return screen.getAllByTestId('workspace-tab').find((tab) => tab.classList.contains('is-active'));
}

describe('AppMain workspace tabs', () => {
  beforeEach(() => {
    setViewportWidth(1366);
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts on an Equation tab rendered as app chrome around the page', async () => {
    await renderAppAtEquation();

    const appFrame = screen.getByTestId('app-frame');
    const tabList = screen.getByRole('tablist', { name: 'Open workspaces' });

    expect(appFrame).toContainElement(tabList);
    expect(appFrame).toContainElement(screen.getByTestId('new-equation-page'));
    expect(screen.queryByTestId('calculator-shell')).not.toBeInTheDocument();
    expect(activeTab()).toHaveAttribute('data-workspace-kind', 'new-equation');
    expect(within(activeTab() as HTMLElement).getByRole('tab')).toHaveTextContent('Equation');
  });

  it('never zooms single surfaces: UI scale is the webview\'s native zoom (GRAPHING-UI1)', async () => {
    window.localStorage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'calculate',
      settings: {
        ...DEFAULT_SETTINGS,
        uiScale: 145, // saved by an older version; it becomes the 150 % step
      },
      history: [],
      variableMemory: [],
    }));

    await renderAppAtEquation();

    expect(screen.getByTestId('app-frame').getAttribute('style') ?? '')
      .not.toContain('--ui-scale');
  });

  it('shows no quick inspectors on pages and opens Settings as a page', async () => {
    const { user } = await renderAppAtEquation();

    expect(screen.queryByTestId('side-surface-host')).not.toBeInTheDocument();
    expect(screen.queryByTestId('left-menu-inspector')).not.toBeInTheDocument();

    const menu = await openCreateMenu(user);
    await user.click(within(menu).getByRole('menuitem', { name: 'Open Settings Page' }));

    await waitFor(() => {
      expect(screen.getByTestId('active-surface-page')).toHaveAttribute('data-surface-kind', 'settings');
      expect(screen.queryByTestId('side-surface-host')).not.toBeInTheDocument();
    });
  });

  it('opens Guide as a singleton page tab beside Equation', async () => {
    const { user } = await renderAppAtEquation();

    await user.click(within(await openCreateMenu(user)).getByRole('menuitem', { name: 'Open Guide Page' }));
    await waitFor(() => expect(screen.getByTestId('guide-page')).toBeInTheDocument());

    let tabs = screen.getAllByTestId('workspace-tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute('data-workspace-kind', 'new-equation');
    expect(tabs[1]).toHaveAttribute('data-workspace-kind', 'guide-page');

    await user.click(within(tabs[0]).getByRole('tab', { name: /Equation/ }));
    await waitFor(() => {
      expect(screen.getByTestId('new-equation-page')).toBeInTheDocument();
      expect(screen.queryByTestId('guide-page')).not.toBeInTheDocument();
    });

    await user.click(within(await openCreateMenu(user)).getByRole('menuitem', { name: 'Open Guide Page' }));
    await waitFor(() => {
      tabs = screen.getAllByTestId('workspace-tab');
      expect(tabs.filter((tab) => tab.getAttribute('data-workspace-kind') === 'guide-page')).toHaveLength(1);
    });
  });

  it('opens a blank Equation tab from plus and New Integration from the plus menu', async () => {
    const { user } = await renderAppAtEquation();

    await user.click(screen.getByTestId('workspace-tab-add'));
    await waitFor(() => {
      expect(screen.getAllByTestId('workspace-tab')).toHaveLength(2);
      expect(activeTab()).toHaveAttribute('data-workspace-kind', 'new-equation');
    });

    await user.click(within(await openCreateMenu(user)).getByRole('menuitem', { name: 'New Integration' }));
    await waitFor(() => expect(activeTab()).toHaveAttribute('data-workspace-kind', 'new-integration'));
  });

  it('lists the workspaces being rebuilt in the plus menu, disabled and signed', async () => {
    const { user } = await renderAppAtEquation();

    const group = within(await openCreateMenu(user)).getByTestId('workspace-tab-unavailable-group');
    const calculate = within(group).getByRole('menuitem', { name: /^Calculate/ });
    expect(calculate).toBeDisabled();
    expect(calculate).toHaveTextContent('Unavailable: being rebuilt');

    await user.click(calculate);
    expect(screen.getAllByTestId('workspace-tab')).toHaveLength(1);
    expect(screen.getByTestId('new-equation-page')).toBeInTheDocument();
  });
});
