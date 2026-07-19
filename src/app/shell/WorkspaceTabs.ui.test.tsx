import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { WorkspaceTabs, type WorkspaceTabItem } from './WorkspaceTabs';
import {
  APP_PAGE_TAB_ACTION_POLICY,
  CALCULATOR_WORKSPACE_TAB_ACTION_POLICY,
  FORMULA_VIEWER_PAGE_TAB_ACTION_POLICY,
} from '../runtime/workspace-surfaces';
import '../../styles/app/shell.css';

function tab(input: Partial<WorkspaceTabItem> & Pick<WorkspaceTabItem, 'id'>): WorkspaceTabItem {
  const { id, ...rest } = input;
  return {
    activeJobCount: 0,
    actionPolicy: CALCULATOR_WORKSPACE_TAB_ACTION_POLICY,
    compartmentLabel: 'Calculate',
    id,
    isActive: false,
    pendingTicketCount: 0,
    stoppingTicketCount: 0,
    surfaceKind: 'calculator',
    title: 'Calculate',
    workspaceKind: 'calculate',
    ...rest,
  };
}

function renderTabs(tabs: WorkspaceTabItem[]) {
  const handlers = {
    onClearTabState: vi.fn(),
    onCloseOtherTabs: vi.fn(),
    onCloseTab: vi.fn(),
    onCreateBlankTab: vi.fn(),
    onCreateGraphPageTab: vi.fn(),
    onCreateNotebookPageTab: vi.fn(),
    onDuplicateTab: vi.fn(),
    onFocusTab: vi.fn(),
    onOpenAppPageTab: vi.fn(),
    onRenameTab: vi.fn(),
    onStopJobsInTab: vi.fn(),
  };

  render(<WorkspaceTabs tabs={tabs} {...handlers} />);
  return handlers;
}

function openMenu(label: string) {
  const tabElement = screen.getByRole('tab', { name: new RegExp(label) }).closest('.workspace-tab');
  if (!tabElement) {
    throw new Error(`Missing tab element for ${label}`);
  }
  fireEvent.click(within(tabElement as HTMLElement).getByTestId('workspace-tab-menu-button'));
}

describe('WorkspaceTabs', () => {
  it('renders open workspace tabs and creates a blank Calculate tab from plus', () => {
    const handlers = renderTabs([
      tab({ id: 'workspace.calculate.1', isActive: true }),
      tab({
        id: 'workspace.equation.2',
        title: 'Equation',
        workspaceKind: 'equation',
        compartmentLabel: 'Equation',
      }),
    ]);

    expect(screen.getByRole('tab', { name: /Calculate/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Equation/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tablist', { name: 'Open workspaces' })).toBeInTheDocument();
    expect(screen.getByLabelText('Open actions for Calculate')).toBeInTheDocument();
    expect(screen.getByLabelText('New Calculate tab')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workspace-tab-add'));
    expect(handlers.onCreateBlankTab).toHaveBeenCalledTimes(1);
  });

  it('opens Graph, Guide, Notebook, Settings, and History pages from the adjacent plus menu', () => {
    const handlers = renderTabs([
      tab({ id: 'workspace.calculate.1', isActive: true }),
    ]);

    fireEvent.click(screen.getByTestId('workspace-tab-add-menu'));
    expect(screen.getByTestId('workspace-tab-create-menu')).toHaveTextContent('New workspace');
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Graph' }));
    expect(handlers.onCreateGraphPageTab).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('workspace-tab-add-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open Guide Page' }));
    expect(handlers.onOpenAppPageTab).toHaveBeenCalledWith('guide-page');

    fireEvent.click(screen.getByTestId('workspace-tab-add-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Notebook' }));
    expect(handlers.onCreateNotebookPageTab).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('workspace-tab-add-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open Settings Page' }));
    expect(handlers.onOpenAppPageTab).toHaveBeenCalledWith('settings');

    fireEvent.click(screen.getByTestId('workspace-tab-add-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open History Page' }));
    expect(handlers.onOpenAppPageTab).toHaveBeenCalledWith('history');

    fireEvent.click(screen.getByTestId('workspace-tab-add-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'New Calculate tab' }));
    expect(handlers.onCreateBlankTab).toHaveBeenCalledTimes(1);
  });

  it('focuses an existing workspace tab', () => {
    const handlers = renderTabs([
      tab({ id: 'workspace.calculate.1', isActive: true }),
      tab({
        id: 'workspace.equation.2',
        title: 'Equation',
        workspaceKind: 'equation',
        compartmentLabel: 'Equation',
      }),
    ]);

    fireEvent.click(screen.getByRole('tab', { name: /Equation/ }));

    expect(handlers.onFocusTab).toHaveBeenCalledWith('workspace.equation.2');
  });

  it('renames from the compact tab menu', () => {
    const handlers = renderTabs([
      tab({ id: 'workspace.calculate.1', isActive: true }),
    ]);

    openMenu('Calculate');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));

    const input = screen.getByLabelText('Workspace tab name');
    fireEvent.change(input, { target: { value: '  Scratch Work  ' } });
    fireEvent.click(screen.getByText('Save'));

    expect(handlers.onRenameTab).toHaveBeenCalledWith('workspace.calculate.1', '  Scratch Work  ');
  });

  it('dispatches duplicate, clear, close others, and stop actions from the tab menu', () => {
    const handlers = renderTabs([
      tab({
        activeJobCount: 1,
        id: 'workspace.calculate.1',
        isActive: true,
        pendingTicketCount: 1,
      }),
      tab({
        id: 'workspace.equation.2',
        title: 'Equation',
        workspaceKind: 'equation',
        compartmentLabel: 'Equation',
      }),
    ]);

    openMenu('Calculate');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(handlers.onDuplicateTab).toHaveBeenCalledWith('workspace.calculate.1');

    openMenu('Calculate');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear Tab State' }));
    expect(handlers.onClearTabState).toHaveBeenCalledWith('workspace.calculate.1');

    openMenu('Calculate');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Stop Jobs in This Tab' }));
    expect(handlers.onStopJobsInTab).toHaveBeenCalledWith('workspace.calculate.1');

    openMenu('Calculate');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Close Others' }));
    expect(handlers.onCloseOtherTabs).toHaveBeenCalledWith('workspace.calculate.1');
  });

  it('closes idle tabs immediately', () => {
    const handlers = renderTabs([
      tab({ id: 'workspace.calculate.1', isActive: true }),
    ]);

    fireEvent.click(screen.getByLabelText('Close Calculate'));

    expect(handlers.onCloseTab).toHaveBeenCalledWith('workspace.calculate.1');
  });

  it('confirms before closing a tab with active jobs', () => {
    const handlers = renderTabs([
      tab({
        activeJobCount: 1,
        id: 'workspace.calculate.1',
        isActive: true,
        pendingTicketCount: 1,
      }),
    ]);

    fireEvent.click(screen.getByLabelText('Close Calculate'));

    expect(screen.getByRole('alertdialog', { name: 'Close workspace tab with active jobs' }))
      .toHaveTextContent('Cancel jobs before closing');
    expect(handlers.onCloseTab).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Keep open'));
    expect(handlers.onCloseTab).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Close Calculate'));
    fireEvent.click(screen.getByText('Cancel jobs and close'));

    expect(handlers.onCloseTab).toHaveBeenCalledWith('workspace.calculate.1');
  });

  it('opens the tab menu from right-click', () => {
    renderTabs([
      tab({ id: 'workspace.calculate.1', isActive: true }),
    ]);

    fireEvent.contextMenu(screen.getByTestId('workspace-tab'));

    expect(screen.getByTestId('workspace-tab-menu')).toHaveTextContent('Calculate');
  });

  it('protects Formula Viewer page tabs from duplicate, clear, and stop actions', () => {
    renderTabs([
      tab({
        actionPolicy: FORMULA_VIEWER_PAGE_TAB_ACTION_POLICY,
        compartmentLabel: 'Formula Viewer',
        id: 'formula-viewer.2',
        isActive: true,
        surfaceKind: 'page',
        title: 'Formula Viewer',
        workspaceKind: 'formula-viewer',
      }),
    ]);

    openMenu('Formula Viewer');

    expect(screen.getByTestId('workspace-tab')).toHaveAttribute('data-surface-kind', 'page');
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Close Others' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Duplicate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Clear Tab State' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Stop Jobs in This Tab' })).not.toBeInTheDocument();
  });

  it('protects Settings and History app page tabs from rename and solver actions', () => {
    renderTabs([
      tab({
        actionPolicy: APP_PAGE_TAB_ACTION_POLICY,
        compartmentLabel: 'App Page',
        id: 'settings.2',
        isActive: true,
        surfaceKind: 'page',
        title: 'Settings',
        workspaceKind: 'settings',
      }),
    ]);

    openMenu('Settings');

    expect(screen.getByTestId('workspace-tab')).toHaveAttribute('data-surface-kind', 'page');
    expect(screen.queryByRole('menuitem', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Close Others' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Duplicate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Clear Tab State' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Stop Jobs in This Tab' })).not.toBeInTheDocument();
  });
});
