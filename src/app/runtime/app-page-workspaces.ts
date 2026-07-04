export const SETTINGS_PAGE_WORKSPACE_KIND = 'settings' as const;
export const HISTORY_PAGE_WORKSPACE_KIND = 'history' as const;
export const GUIDE_PAGE_WORKSPACE_KIND = 'guide-page' as const;

export type AppPageWorkspaceKind =
  | typeof SETTINGS_PAGE_WORKSPACE_KIND
  | typeof HISTORY_PAGE_WORKSPACE_KIND
  | typeof GUIDE_PAGE_WORKSPACE_KIND;

export const APP_PAGE_WORKSPACE_KINDS: readonly AppPageWorkspaceKind[] = [
  SETTINGS_PAGE_WORKSPACE_KIND,
  HISTORY_PAGE_WORKSPACE_KIND,
  GUIDE_PAGE_WORKSPACE_KIND,
];

export function isAppPageWorkspaceKind(
  workspaceKind: unknown,
): workspaceKind is AppPageWorkspaceKind {
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
  return 'Guide';
}
