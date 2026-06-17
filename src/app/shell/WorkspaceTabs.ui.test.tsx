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
import '../../styles/app/shell.css';

function tab(input: Partial<WorkspaceTabItem> & Pick<WorkspaceTabItem, 'id'>): WorkspaceTabItem {
  const { id, ...rest } = input;
  return {
    activeJobCount: 0,
    compartmentLabel: 'Calculate',
    id,
    isActive: false,
    pendingTicketCount: 0,
    stoppingTicketCount: 0,
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
    onDuplicateTab: vi.fn(),
    onFocusTab: vi.fn(),
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

    fireEvent.click(screen.getByTestId('workspace-tab-add'));
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

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Cancel jobs before closing');
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
});
