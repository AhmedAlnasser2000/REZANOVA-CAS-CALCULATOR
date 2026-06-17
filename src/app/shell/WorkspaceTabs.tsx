import {
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import type {
  WorkspaceInstanceId,
  WorkspaceKind,
} from '../runtime/workspace-instances';

export type WorkspaceTabItem = {
  id: WorkspaceInstanceId;
  title: string;
  workspaceKind: WorkspaceKind;
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

export function WorkspaceTabs({
  onClearTabState,
  onCloseOtherTabs,
  onCloseTab,
  onCreateBlankTab,
  onDuplicateTab,
  onFocusTab,
  onRenameTab,
  onStopJobsInTab,
  tabs,
}: WorkspaceTabsProps) {
  const [openMenuTabId, setOpenMenuTabId] = useState<WorkspaceInstanceId | null>(null);
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
    setRenameDraft(tab.title);
    setRenamingTabId(tab.id);
    setOpenMenuTabId(null);
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
    <section className="workspace-tabs-shell" aria-label="Workspace tabs">
      <div className="workspace-tabs-list" role="tablist" aria-label="Open workspaces">
        {tabs.map((tab) => {
          const tabRunningCount = runningCount(tab);
          const tabIsBusy = tabRunningCount > 0;
          const isRenaming = renamingTabId === tab.id;

          return (
            <div
              key={tab.id}
              className={`workspace-tab ${tab.isActive ? 'is-active' : ''} ${tabIsBusy ? 'is-busy' : ''}`}
              data-testid="workspace-tab"
              data-workspace-kind={tab.workspaceKind}
              onContextMenu={(event) => {
                event.preventDefault();
                setOpenMenuTabId(tab.id);
              }}
            >
              {isRenaming ? (
                <form className="workspace-tab-rename" onSubmit={submitRename}>
                  <input
                    aria-label="Workspace tab name"
                    autoFocus
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onClick={stopEvent}
                  />
                  <button type="submit">Save</button>
                  <button
                    type="button"
                    onClick={(event) => {
                      stopEvent(event);
                      setRenamingTabId(null);
                    }}
                  >
                    Cancel
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
                    <span className="workspace-tab-title">{tab.title}</span>
                    <span className="workspace-tab-meta">
                      {tab.compartmentLabel}
                      {tabIsBusy ? ` · ${tab.stoppingTicketCount > 0 ? 'stopping' : 'running'}` : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="workspace-tab-menu-button"
                    aria-label={`Open actions for ${tab.title}`}
                    data-testid="workspace-tab-menu-button"
                    onClick={(event) => {
                      stopEvent(event);
                      setOpenMenuTabId((currentId) => currentId === tab.id ? null : tab.id);
                    }}
                  >
                    ...
                  </button>
                  <button
                    type="button"
                    className="workspace-tab-close"
                    aria-label={`Close ${tab.title}`}
                    onClick={(event) => {
                      stopEvent(event);
                      requestClose(tab);
                    }}
                  >
                    x
                  </button>
                </>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="workspace-tab-add"
          aria-label="New Calculate tab"
          data-testid="workspace-tab-add"
          onClick={onCreateBlankTab}
        >
          +
        </button>
      </div>

      {openMenuTab ? (
        <div className="workspace-tab-menu" role="menu" data-testid="workspace-tab-menu">
          <strong>{openMenuTab.title}</strong>
          <button type="button" role="menuitem" onClick={() => beginRename(openMenuTab)}>
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenuTabId(null);
              onDuplicateTab(openMenuTab.id);
            }}
          >
            Duplicate
          </button>
          <button type="button" role="menuitem" onClick={() => requestClose(openMenuTab)}>
            Close
          </button>
          <button type="button" role="menuitem" onClick={() => requestCloseOthers(openMenuTab)}>
            Close Others
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenuTabId(null);
              onClearTabState(openMenuTab.id);
            }}
          >
            Clear Tab State
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!isBusy(openMenuTab) || openMenuTab.stoppingTicketCount > 0}
            onClick={() => {
              setOpenMenuTabId(null);
              onStopJobsInTab(openMenuTab.id);
            }}
          >
            Stop Jobs in This Tab
          </button>
        </div>
      ) : null}

      {confirmAction ? (
        <div
          className="workspace-tab-confirm"
          role="alertdialog"
          aria-label="Close workspace tab with active jobs"
        >
          <strong>
            {confirmAction.kind === 'close'
              ? `Close ${confirmAction.tab.title}?`
              : `Close other tabs around ${confirmAction.tab.title}?`}
          </strong>
          <p>
            {confirmAction.kind === 'close'
              ? 'This tab has active work. Cancel jobs before closing?'
              : `${confirmAction.affectedCount} other tab${confirmAction.affectedCount === 1 ? ' has' : 's have'} active work. Cancel jobs before closing?`}
          </p>
          <div className="workspace-tab-confirm-actions">
            <button type="button" onClick={confirmClose}>
              Cancel jobs and close
            </button>
            <button type="button" onClick={cancelClose}>
              Keep open
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
