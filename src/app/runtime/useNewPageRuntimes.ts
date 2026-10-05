import { useNewEquationRuntime, type EquationSettings } from './useNewEquationRuntime';
import { useNewIntegrationRuntime } from './useNewIntegrationRuntime';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';

/** The runtimes of the client-owned new workspaces (New Integration, New Equation). */
export function useNewPageRuntimes(workspaces: ReturnType<typeof useWorkspaceInstancesRuntime>, settings: EquationSettings) {
  return { newIntegrationRuntime: useNewIntegrationRuntime(workspaces), newEquationRuntime: useNewEquationRuntime(workspaces, settings) };
}
