import {
  FORMULA_VIEWER_WORKSPACE_KIND,
  type FormulaViewerWorkspaceKind,
} from './formula-viewer-artifacts';
import {
  isAppPageWorkspaceKind,
  type SingletonAppPageWorkspaceKind,
  type AppPageWorkspaceKind,
} from './app-page-workspaces';
import type { WorkspaceKind } from './workspace-instances';

export type WorkspaceSurfaceKind = 'calculator' | 'page';
export type LivePageSurfaceKind = FormulaViewerWorkspaceKind | AppPageWorkspaceKind;

export type WorkspaceTabActionPolicy = {
  canClearState: boolean;
  canClose: boolean;
  canCloseOthers: boolean;
  canDuplicate: boolean;
  canRename: boolean;
  canStopJobs: boolean;
};

export type WorkspaceSurfaceDescriptor =
  | {
      allowsQuickInspectors: true;
      surfaceKind: 'calculator';
      tabActionPolicy: WorkspaceTabActionPolicy;
    }
  | {
      allowsQuickInspectors: false;
      pageKind: LivePageSurfaceKind;
      surfaceKind: 'page';
      tabActionPolicy: WorkspaceTabActionPolicy;
    };

export type SingletonPageSurfacePolicy = {
  pageKind: SingletonAppPageWorkspaceKind;
  singleton: true;
};

export const CALCULATOR_WORKSPACE_TAB_ACTION_POLICY: WorkspaceTabActionPolicy = {
  canClearState: true,
  canClose: true,
  canCloseOthers: true,
  canDuplicate: true,
  canRename: true,
  canStopJobs: true,
};

export const FORMULA_VIEWER_PAGE_TAB_ACTION_POLICY: WorkspaceTabActionPolicy = {
  canClearState: false,
  canClose: true,
  canCloseOthers: true,
  canDuplicate: false,
  canRename: true,
  canStopJobs: false,
};

export const APP_PAGE_TAB_ACTION_POLICY: WorkspaceTabActionPolicy = {
  canClearState: false,
  canClose: true,
  canCloseOthers: true,
  canDuplicate: false,
  canRename: false,
  canStopJobs: false,
};

export const SINGLETON_PAGE_SURFACE_POLICIES: readonly SingletonPageSurfacePolicy[] = [
  {
    pageKind: 'settings',
    singleton: true,
  },
  {
    pageKind: 'history',
    singleton: true,
  },
  {
    pageKind: 'guide-page',
    singleton: true,
  },
];

export function resolveWorkspaceSurfaceDescriptor(
  workspaceKind: WorkspaceKind,
): WorkspaceSurfaceDescriptor {
  if (workspaceKind === FORMULA_VIEWER_WORKSPACE_KIND) {
    return {
      allowsQuickInspectors: false,
      pageKind: FORMULA_VIEWER_WORKSPACE_KIND,
      surfaceKind: 'page',
      tabActionPolicy: FORMULA_VIEWER_PAGE_TAB_ACTION_POLICY,
    };
  }

  if (isAppPageWorkspaceKind(workspaceKind)) {
    return {
      allowsQuickInspectors: false,
      pageKind: workspaceKind,
      surfaceKind: 'page',
      tabActionPolicy: APP_PAGE_TAB_ACTION_POLICY,
    };
  }

  return {
    allowsQuickInspectors: true,
    surfaceKind: 'calculator',
    tabActionPolicy: CALCULATOR_WORKSPACE_TAB_ACTION_POLICY,
  };
}
