import {
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import {
  BarChart3,
  BookOpen,
  Calculator,
  FileText,
  FlaskConical,
  FunctionSquare,
  Grid3X3,
  History,
  LineChart,
  MoreHorizontal,
  PenTool,
  Plus,
  Settings,
  Shapes,
  Sigma,
  Table2,
  Triangle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../../lib/language/language-context';
import type {
  WorkspaceInstanceId,
  WorkspaceKind,
} from '../runtime/workspace-instances';
import type {
  WorkspaceSurfaceKind,
  WorkspaceTabActionPolicy,
} from '../runtime/workspace-surfaces';
import {
  GUIDE_PAGE_WORKSPACE_KIND,
  HISTORY_PAGE_WORKSPACE_KIND,
  SETTINGS_PAGE_WORKSPACE_KIND,
  type AppPageWorkspaceKind,
} from '../runtime/app-page-workspaces';

export type WorkspaceTabItem = {
  id: WorkspaceInstanceId;
  title: string;
  workspaceKind: WorkspaceKind;
  surfaceKind: WorkspaceSurfaceKind;
  actionPolicy: WorkspaceTabActionPolicy;
  compartmentLabel: string;
  isActive: boolean;
  activeJobCount: number;
  pendingTicketCount: number;
  stoppingTicketCount: number;
};

type WorkspaceTabsProps = {
  tabs: readonly WorkspaceTabItem[];
  onClearTabState: (tabId: WorkspaceInstanceId) => void;
  onCloseOtherTabs: (tabId: WorkspaceInstanceId) => void;
  onCloseTab: (tabId: WorkspaceInstanceId) => void;
  onCreateBlankTab: () => void;
  onDuplicateTab: (tabId: WorkspaceInstanceId) => void;
  onFocusTab: (tabId: WorkspaceInstanceId) => void;
  onOpenAppPageTab: (workspaceKind: AppPageWorkspaceKind) => void;
  onRenameTab: (tabId: WorkspaceInstanceId, title: string) => void;
  onStopJobsInTab: (tabId: WorkspaceInstanceId) => void;
};

type ConfirmAction =
  | {
      kind: 'close';
      tab: WorkspaceTabItem;
    }
  | {
      kind: 'close-others';
      tab: WorkspaceTabItem;
      affectedCount: number;
    };

function runningCount(tab: WorkspaceTabItem) {
  return Math.max(tab.activeJobCount, tab.pendingTicketCount);
}

function isBusy(tab: WorkspaceTabItem) {
  return runningCount(tab) > 0;
}

function workspaceTabIcon(tab: WorkspaceTabItem): LucideIcon {
  if (tab.workspaceKind === SETTINGS_PAGE_WORKSPACE_KIND) {
    return Settings;
  }
  if (tab.workspaceKind === HISTORY_PAGE_WORKSPACE_KIND) {
    return History;
  }
  if (tab.workspaceKind === GUIDE_PAGE_WORKSPACE_KIND) {
    return BookOpen;
  }

  switch (tab.workspaceKind) {
    case 'calculus':
      return FunctionSquare;
    case 'equation':
      return Sigma;
    case 'formula-viewer':
      return FileText;
    case 'geometry':
      return Shapes;
    case 'guide':
      return PenTool;
    case 'labs':
      return FlaskConical;
    case 'matrix':
      return Grid3X3;
    case 'statistics':
      return BarChart3;
    case 'table':
      return Table2;
    case 'trigonometry':
      return Triangle;
    case 'vector':
      return LineChart;
    case 'calculate':
    default:
      return Calculator;
  }
}

export function WorkspaceTabs({
  onClearTabState,
  onCloseOtherTabs,
  onCloseTab,
  onCreateBlankTab,
  onDuplicateTab,
  onFocusTab,
  onOpenAppPageTab,
  onRenameTab,
  onStopJobsInTab,
  tabs,
}: WorkspaceTabsProps) {
  const { strings } = useLanguage();
  const tabText = strings.shell.workspaceTabs;
  const [openMenuTabId, setOpenMenuTabId] = useState<WorkspaceInstanceId | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<WorkspaceInstanceId | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const openMenuTab = useMemo(
    () => tabs.find((tab) => tab.id === openMenuTabId) ?? null,
    [openMenuTabId, tabs],
  );

  function stopEvent(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function beginRename(tab: WorkspaceTabItem) {
    if (!tab.actionPolicy.canRename) {
      setOpenMenuTabId(null);
      return;
    }
    setRenameDraft(tab.title);
    setRenamingTabId(tab.id);
    setOpenMenuTabId(null);
  }

  function createBlankTabFromMenu() {
    setCreateMenuOpen(false);
    onCreateBlankTab();
  }

  function openAppPageFromMenu(workspaceKind: AppPageWorkspaceKind) {
    setCreateMenuOpen(false);
    onOpenAppPageTab(workspaceKind);
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renamingTabId) {
      return;
    }
    onRenameTab(renamingTabId, renameDraft);
    setRenamingTabId(null);
    setRenameDraft('');
  }

  function requestClose(tab: WorkspaceTabItem) {
    setOpenMenuTabId(null);
    if (isBusy(tab)) {
      setConfirmAction({ kind: 'close', tab });
      return;
    }
    onCloseTab(tab.id);
  }

  function requestCloseOthers(tab: WorkspaceTabItem) {
    setOpenMenuTabId(null);
    const affectedCount = tabs.filter((candidate) => candidate.id !== tab.id && isBusy(candidate)).length;
    if (affectedCount > 0) {
      setConfirmAction({ kind: 'close-others', tab, affectedCount });
      return;
    }
    onCloseOtherTabs(tab.id);
  }

  function confirmClose() {
    if (!confirmAction) {
      return;
    }
    if (confirmAction.kind === 'close') {
      onCloseTab(confirmAction.tab.id);
    } else {
      onCloseOtherTabs(confirmAction.tab.id);
    }
    setConfirmAction(null);
  }

  function cancelClose() {
    setConfirmAction(null);
  }

  return (
    <section className="workspace-tabs-shell" aria-label={tabText.workspaceTabs}>
      <div className="workspace-tabs-list" role="tablist" aria-label={tabText.openWorkspaces}>
        {tabs.map((tab) => {
          const tabRunningCount = runningCount(tab);
          const tabIsBusy = tabRunningCount > 0;
          const isRenaming = renamingTabId === tab.id;
          const TabIcon = workspaceTabIcon(tab);

          return (
            <div
              key={tab.id}
              className={`workspace-tab ${tab.isActive ? 'is-active' : ''} ${tabIsBusy ? 'is-busy' : ''}`}
              data-testid="workspace-tab"
              data-surface-kind={tab.surfaceKind}
              data-workspace-kind={tab.workspaceKind}
              onContextMenu={(event) => {
                event.preventDefault();
                setOpenMenuTabId(tab.id);
              }}
            >
              {isRenaming ? (
                <form className="workspace-tab-rename" onSubmit={submitRename}>
                  <input
                    aria-label={tabText.workspaceTabName}
                    autoFocus
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onClick={stopEvent}
                  />
                  <button type="submit">{tabText.save}</button>
                  <button
                    type="button"
                    onClick={(event) => {
                      stopEvent(event);
                      setRenamingTabId(null);
                    }}
                  >
                    {tabText.cancel}
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="workspace-tab-main"
                    role="tab"
                    aria-selected={tab.isActive}
                    onClick={() => onFocusTab(tab.id)}
                  >
                    <TabIcon aria-hidden="true" size={17} />
                    <span>
                      <span className="workspace-tab-title">{tab.title}</span>
                      <span className="workspace-tab-meta">
                        {tab.compartmentLabel}
                        {tabIsBusy ? ` · ${tab.stoppingTicketCount > 0 ? tabText.stoppingMeta : tabText.runningMeta}` : ''}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="workspace-tab-menu-button"
                    aria-label={tabText.openActionsFor(tab.title)}
                    data-testid="workspace-tab-menu-button"
                    onClick={(event) => {
                      stopEvent(event);
                      setCreateMenuOpen(false);
                      setOpenMenuTabId((currentId) => currentId === tab.id ? null : tab.id);
                    }}
                  >
                    <MoreHorizontal aria-hidden="true" size={17} />
                  </button>
                  <button
                    type="button"
                    className="workspace-tab-close"
                    aria-label={tabText.closeTab(tab.title)}
                    onClick={(event) => {
                      stopEvent(event);
                      requestClose(tab);
                    }}
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                </>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="workspace-tab-add"
          aria-label={tabText.newCalculateTab}
          data-testid="workspace-tab-add"
          onClick={() => {
            setCreateMenuOpen(false);
            onCreateBlankTab();
          }}
        >
          <Plus aria-hidden="true" size={19} />
        </button>
        <button
          type="button"
          className="workspace-tab-add-menu"
          aria-label={tabText.openCreateMenu}
          aria-expanded={createMenuOpen}
          data-testid="workspace-tab-add-menu"
          onClick={() => {
            setOpenMenuTabId(null);
            setCreateMenuOpen((currentValue) => !currentValue);
          }}
        >
          <MoreHorizontal aria-hidden="true" size={17} />
        </button>
      </div>

      {createMenuOpen ? (
        <div
          className="workspace-tab-menu workspace-tab-create-menu"
          role="menu"
          data-testid="workspace-tab-create-menu"
        >
          <strong>{tabText.createMenuTitle}</strong>
          <button type="button" role="menuitem" onClick={createBlankTabFromMenu}>
            {tabText.newCalculateTab}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openAppPageFromMenu(GUIDE_PAGE_WORKSPACE_KIND)}
          >
            {tabText.openGuidePage}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openAppPageFromMenu(SETTINGS_PAGE_WORKSPACE_KIND)}
          >
            {tabText.openSettingsPage}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openAppPageFromMenu(HISTORY_PAGE_WORKSPACE_KIND)}
          >
            {tabText.openHistoryPage}
          </button>
        </div>
      ) : null}

      {openMenuTab ? (
        <div className="workspace-tab-menu" role="menu" data-testid="workspace-tab-menu">
          <strong>{openMenuTab.title}</strong>
          {openMenuTab.actionPolicy.canRename ? (
            <button type="button" role="menuitem" onClick={() => beginRename(openMenuTab)}>
              {tabText.rename}
            </button>
          ) : null}
          {openMenuTab.actionPolicy.canDuplicate ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuTabId(null);
                onDuplicateTab(openMenuTab.id);
              }}
            >
              {tabText.duplicate}
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => requestClose(openMenuTab)}>
            {tabText.close}
          </button>
          <button type="button" role="menuitem" onClick={() => requestCloseOthers(openMenuTab)}>
            {tabText.closeOthers}
          </button>
          {openMenuTab.actionPolicy.canClearState ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuTabId(null);
                onClearTabState(openMenuTab.id);
              }}
            >
              {tabText.clearTabState}
            </button>
          ) : null}
          {openMenuTab.actionPolicy.canStopJobs ? (
            <button
              type="button"
              role="menuitem"
              disabled={!isBusy(openMenuTab) || openMenuTab.stoppingTicketCount > 0}
              onClick={() => {
                setOpenMenuTabId(null);
                onStopJobsInTab(openMenuTab.id);
              }}
            >
              {tabText.stopJobsInThisTab}
            </button>
          ) : null}
        </div>
      ) : null}

      {confirmAction ? (
        <div
          className="workspace-tab-confirm"
          role="alertdialog"
          aria-label={tabText.closeWithActiveJobs}
        >
          <strong>
            {confirmAction.kind === 'close'
              ? tabText.closeTabPrompt(confirmAction.tab.title)
              : tabText.closeOtherTabsAround(confirmAction.tab.title)}
          </strong>
          <p>
            {confirmAction.kind === 'close'
              ? tabText.activeWorkCloseMessage
              : tabText.otherTabsActiveWorkCloseMessage(confirmAction.affectedCount)}
          </p>
          <div className="workspace-tab-confirm-actions">
            <button type="button" onClick={confirmClose}>
              {tabText.cancelJobsAndClose}
            </button>
            <button type="button" onClick={cancelClose}>
              {tabText.keepOpen}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
