import { describe, expect, it } from 'vitest';

import {
  FUTURE_SINGLETON_PAGE_SURFACE_POLICIES,
  resolveWorkspaceSurfaceDescriptor,
} from './workspace-surfaces';

describe('workspace surface descriptors', () => {
  it('keeps calculator workspaces on the calculator surface with full tab actions', () => {
    expect(resolveWorkspaceSurfaceDescriptor('calculate')).toEqual({
      surfaceKind: 'calculator',
      tabActionPolicy: {
        canClearState: true,
        canClose: true,
        canCloseOthers: true,
        canDuplicate: true,
        canRename: true,
        canStopJobs: true,
      },
    });
  });

  it('classifies Formula Viewer as the only live protected page surface', () => {
    expect(resolveWorkspaceSurfaceDescriptor('formula-viewer')).toEqual({
      pageKind: 'formula-viewer',
      surfaceKind: 'page',
      tabActionPolicy: {
        canClearState: false,
        canClose: true,
        canCloseOthers: true,
        canDuplicate: false,
        canRename: true,
        canStopJobs: false,
      },
    });
  });

  it('documents future Settings and History as singleton page surfaces only', () => {
    expect(FUTURE_SINGLETON_PAGE_SURFACE_POLICIES).toEqual([
      {
        pageKind: 'settings',
        singleton: true,
      },
      {
        pageKind: 'history',
        singleton: true,
      },
    ]);
  });
});
