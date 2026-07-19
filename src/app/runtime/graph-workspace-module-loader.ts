import type { WorkspaceInstance } from './workspace-instances';
import { GRAPHING_PAGE_WORKSPACE_KIND } from './app-page-workspaces';

export type GraphWorkspaceModuleLoadState = 'idle' | 'loading' | 'loaded' | 'failed';
export type GraphWorkspaceRuntimeModule = typeof import('../graphing/runtime-module');

let modulePromise: Promise<GraphWorkspaceRuntimeModule> | null = null;
let moduleLoadState: GraphWorkspaceModuleLoadState = 'idle';

export function getGraphWorkspaceModuleLoadState() {
  return moduleLoadState;
}

export function loadGraphWorkspaceRuntimeModule() {
  if (!modulePromise) {
    moduleLoadState = 'loading';
    modulePromise = import('../graphing/runtime-module')
      .then((module) => {
        moduleLoadState = 'loaded';
        return module;
      })
      .catch((error: unknown) => {
        moduleLoadState = 'failed';
        modulePromise = null;
        throw error;
      });
  }
  return modulePromise;
}

export async function loadGraphWorkspaceRuntimeForInstance(
  instance: WorkspaceInstance,
) {
  if (instance.workspaceKind !== GRAPHING_PAGE_WORKSPACE_KIND) {
    return null;
  }
  const module = await loadGraphWorkspaceRuntimeModule();
  return {
    moduleId: module.GRAPH_WORKSPACE_RUNTIME_MODULE_ID,
    validation: module.validateGraphWorkspaceSession(instance.surfaceState),
  };
}

export function resetGraphWorkspaceModuleLoaderForTest() {
  modulePromise = null;
  moduleLoadState = 'idle';
}
