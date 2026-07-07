export const SETTINGS_PAGE_WORKSPACE_KIND = 'settings' as const;
export const HISTORY_PAGE_WORKSPACE_KIND = 'history' as const;
export const GUIDE_PAGE_WORKSPACE_KIND = 'guide-page' as const;
export const NOTEBOOK_PAGE_WORKSPACE_KIND = 'notebook' as const;

export type AppPageWorkspaceKind =
  | typeof SETTINGS_PAGE_WORKSPACE_KIND
  | typeof HISTORY_PAGE_WORKSPACE_KIND
  | typeof GUIDE_PAGE_WORKSPACE_KIND
  | typeof NOTEBOOK_PAGE_WORKSPACE_KIND;

export type SingletonAppPageWorkspaceKind =
  | typeof SETTINGS_PAGE_WORKSPACE_KIND
  | typeof HISTORY_PAGE_WORKSPACE_KIND
  | typeof GUIDE_PAGE_WORKSPACE_KIND;

export const APP_PAGE_WORKSPACE_KINDS: readonly AppPageWorkspaceKind[] = [
  SETTINGS_PAGE_WORKSPACE_KIND,
  HISTORY_PAGE_WORKSPACE_KIND,
  GUIDE_PAGE_WORKSPACE_KIND,
  NOTEBOOK_PAGE_WORKSPACE_KIND,
];

export const SINGLETON_APP_PAGE_WORKSPACE_KINDS: readonly SingletonAppPageWorkspaceKind[] = [
  SETTINGS_PAGE_WORKSPACE_KIND,
  HISTORY_PAGE_WORKSPACE_KIND,
  GUIDE_PAGE_WORKSPACE_KIND,
];

export function isAppPageWorkspaceKind(
  workspaceKind: unknown,
): workspaceKind is AppPageWorkspaceKind {
  return workspaceKind === SETTINGS_PAGE_WORKSPACE_KIND
    || workspaceKind === HISTORY_PAGE_WORKSPACE_KIND
    || workspaceKind === GUIDE_PAGE_WORKSPACE_KIND
    || workspaceKind === NOTEBOOK_PAGE_WORKSPACE_KIND;
}

export function isSingletonAppPageWorkspaceKind(
  workspaceKind: unknown,
): workspaceKind is SingletonAppPageWorkspaceKind {
  return workspaceKind === SETTINGS_PAGE_WORKSPACE_KIND
    || workspaceKind === HISTORY_PAGE_WORKSPACE_KIND
    || workspaceKind === GUIDE_PAGE_WORKSPACE_KIND;
}

export function appPageWorkspaceTitle(workspaceKind: AppPageWorkspaceKind) {
  if (workspaceKind === SETTINGS_PAGE_WORKSPACE_KIND) {
    return 'Settings';
  }
  if (workspaceKind === HISTORY_PAGE_WORKSPACE_KIND) {
    return 'History';
  }
  if (workspaceKind === GUIDE_PAGE_WORKSPACE_KIND) {
    return 'Guide';
  }
  return 'Notebook';
}
