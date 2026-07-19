import { beforeEach, describe, expect, it } from 'vitest';
import { createWorkspaceInstance } from './workspace-instances';
import {
  getGraphWorkspaceModuleLoadState,
  loadGraphWorkspaceRuntimeForInstance,
  loadGraphWorkspaceRuntimeModule,
  resetGraphWorkspaceModuleLoaderForTest,
} from './graph-workspace-module-loader';

describe('Graph workspace runtime module loader', () => {
  beforeEach(() => {
    resetGraphWorkspaceModuleLoaderForTest();
  });

  it('does not load the Graph runtime for existing workspace kinds', async () => {
    expect(getGraphWorkspaceModuleLoadState()).toBe('idle');
    await expect(loadGraphWorkspaceRuntimeForInstance(
      createWorkspaceInstance('calculate', 1, { now: () => 1 }),
    )).resolves.toBeNull();
    expect(getGraphWorkspaceModuleLoadState()).toBe('idle');
  });

  it('loads once for Graph and validates its document-local session state', async () => {
    const instance = createWorkspaceInstance('graphing', 2, {
      idFactory: () => 'graphing.2',
      now: () => 1,
    });
    const firstLoad = loadGraphWorkspaceRuntimeModule();
    const secondLoad = loadGraphWorkspaceRuntimeModule();
    expect(firstLoad).toBe(secondLoad);
    expect(getGraphWorkspaceModuleLoadState()).toBe('loading');

    await expect(loadGraphWorkspaceRuntimeForInstance(instance)).resolves.toMatchObject({
      moduleId: 'graphing-runtime-v1',
      validation: { ok: true },
    });
    expect(getGraphWorkspaceModuleLoadState()).toBe('loaded');
  });
});
