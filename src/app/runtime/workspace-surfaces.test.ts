import { describe, expect, it } from 'vitest';

import {
  SINGLETON_PAGE_SURFACE_POLICIES,
  resolveWorkspaceSurfaceDescriptor,
} from './workspace-surfaces';

describe('workspace surface descriptors', () => {
  it('keeps calculator workspaces on the calculator surface with full tab actions', () => {
    expect(resolveWorkspaceSurfaceDescriptor('calculate')).toEqual({
      allowsQuickInspectors: true,
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
      allowsQuickInspectors: false,
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

  it('classifies Settings, History, and Guide as live protected singleton page surfaces', () => {
    expect(SINGLETON_PAGE_SURFACE_POLICIES).toEqual([
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
    ]);

    for (const pageKind of ['settings', 'history', 'guide-page'] as const) {
      expect(resolveWorkspaceSurfaceDescriptor(pageKind)).toEqual({
      allowsQuickInspectors: false,
      pageKind,
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
    }
  });

  it('classifies Notebook as a protected document page surface, not a singleton', () => {
    expect(SINGLETON_PAGE_SURFACE_POLICIES.map((policy) => policy.pageKind))
      .not.toContain('notebook');
    expect(resolveWorkspaceSurfaceDescriptor('notebook')).toEqual({
      allowsQuickInspectors: false,
      pageKind: 'notebook',
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

  it('classifies Graphing as a non-singleton governed page with only truthful actions', () => {
    expect(SINGLETON_PAGE_SURFACE_POLICIES.map((policy) => policy.pageKind))
      .not.toContain('graphing');
    expect(resolveWorkspaceSurfaceDescriptor('graphing')).toEqual({
      allowsQuickInspectors: false,
      pageKind: 'graphing',
      surfaceKind: 'page',
      tabActionPolicy: {
        canClearState: false,
        canClose: true,
        canCloseOthers: true,
        canDuplicate: false,
        canRename: true,
        canStopJobs: true,
      },
    });
  });
});
