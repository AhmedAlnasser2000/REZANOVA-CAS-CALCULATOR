export const NOTEBOOK_WORKSPACE_FOCUS_EVENT = 'calcwiz:notebook-workspace-focus';
export const NOTEBOOK_WORKSPACE_CLOSE_EVENT = 'calcwiz:notebook-workspace-close';
export const NOTEBOOK_WORKSPACE_TITLE_EVENT = 'calcwiz:notebook-workspace-title';
export const NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT = 'calcwiz:notebook-workspace-open-query';

export type NotebookWorkspaceFocusDetail = {
  libraryId: string;
  handled: boolean;
};

export type NotebookWorkspaceCloseDetail = {
  instanceId: string;
};

export type NotebookWorkspaceTitleDetail = {
  instanceId: string;
  title: string;
};

export type NotebookWorkspaceOpenQueryDetail = {
  excludingInstanceId?: string;
  libraryId: string;
  open: boolean;
};

export function requestNotebookWorkspaceFocus(libraryId: string) {
  if (typeof window === 'undefined') {
    return false;
  }
  const detail: NotebookWorkspaceFocusDetail = { libraryId, handled: false };
  window.dispatchEvent(new CustomEvent(NOTEBOOK_WORKSPACE_FOCUS_EVENT, { detail }));
  return detail.handled;
}

export function requestNotebookWorkspaceClose(instanceId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTEBOOK_WORKSPACE_CLOSE_EVENT, {
      detail: { instanceId } satisfies NotebookWorkspaceCloseDetail,
    }));
  }
}

export function publishNotebookWorkspaceTitle(instanceId: string, title: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTEBOOK_WORKSPACE_TITLE_EVENT, {
      detail: { instanceId, title } satisfies NotebookWorkspaceTitleDetail,
    }));
  }
}

export function isNotebookWorkspaceOpen(
  libraryId: string,
  excludingInstanceId?: string,
) {
  if (typeof window === 'undefined') {
    return false;
  }
  const detail: NotebookWorkspaceOpenQueryDetail = {
    excludingInstanceId,
    libraryId,
    open: false,
  };
  window.dispatchEvent(new CustomEvent(NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT, { detail }));
  return detail.open;
}
