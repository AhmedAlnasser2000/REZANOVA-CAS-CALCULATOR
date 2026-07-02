import { describe, expect, it } from 'vitest';

import {
  SINGLETON_PAGE_SURFACE_POLICIES,
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

  it('classifies Formula Viewer as a live page surface with viewer-safe actions', () => {
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

  it('classifies Settings and History as live protected singleton page surfaces', () => {
    expect(SINGLETON_PAGE_SURFACE_POLICIES).toEqual([
      {
        pageKind: 'settings',
        singleton: true,
      },
      {
        pageKind: 'history',
        singleton: true,
      },
    ]);

    expect(resolveWorkspaceSurfaceDescriptor('settings')).toEqual({
      pageKind: 'settings',
      surfaceKind: 'page',
      tabActionPolicy: {
        canClearState: false,
        canClose: true,
        canCloseOthers: true,
        canDuplicate: false,
        canRename: false,
        canStopJobs: false,
      },
    });
  });
});
