import {
  FORMULA_VIEWER_WORKSPACE_KIND,
  type FormulaViewerWorkspaceKind,
} from './formula-viewer-artifacts';
import type { WorkspaceKind } from './workspace-instances';

export type WorkspaceSurfaceKind = 'calculator' | 'page';
export type LivePageSurfaceKind = FormulaViewerWorkspaceKind;
export type FutureSingletonPageSurfaceKind = 'settings' | 'history';

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
      surfaceKind: 'calculator';
      tabActionPolicy: WorkspaceTabActionPolicy;
    }
  | {
      pageKind: LivePageSurfaceKind;
      surfaceKind: 'page';
      tabActionPolicy: WorkspaceTabActionPolicy;
    };

export type FutureSingletonPageSurfacePolicy = {
  pageKind: FutureSingletonPageSurfaceKind;
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

export const FUTURE_SINGLETON_PAGE_SURFACE_POLICIES: readonly FutureSingletonPageSurfacePolicy[] = [
  {
    pageKind: 'settings',
    singleton: true,
  },
  {
    pageKind: 'history',
    singleton: true,
  },
];

export function resolveWorkspaceSurfaceDescriptor(
  workspaceKind: WorkspaceKind,
): WorkspaceSurfaceDescriptor {
  if (workspaceKind === FORMULA_VIEWER_WORKSPACE_KIND) {
    return {
      pageKind: FORMULA_VIEWER_WORKSPACE_KIND,
      surfaceKind: 'page',
      tabActionPolicy: FORMULA_VIEWER_PAGE_TAB_ACTION_POLICY,
    };
  }

  return {
    surfaceKind: 'calculator',
    tabActionPolicy: CALCULATOR_WORKSPACE_TAB_ACTION_POLICY,
  };
}
