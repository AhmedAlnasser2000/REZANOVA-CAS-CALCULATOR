import { act, renderHook } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { useWorkspaceRuntimeStateHostRuntime } from './useWorkspaceRuntimeStateHostRuntime';
import type {
  WorkspaceInstanceFactoryOptions,
  WorkspaceKind,
} from './workspace-instances';
import {
  EMPTY_WORKSPACE_RUNTIME_STATE,
  type WorkspaceRuntimeState,
} from './workspace-runtime-state';

function createDeterministicOptions(): Required<WorkspaceInstanceFactoryOptions> {
  let timestamp = 7000;
  return {
    idFactory: (workspaceKind: WorkspaceKind, order: number) => `${workspaceKind}.${order}`,
    now: () => timestamp++,
  };
}

function renderRuntimeHost() {
  return renderHook(() => {
    const instances = useWorkspaceInstancesRuntime(createDeterministicOptions());
    const [runtimeState, setRuntimeState] = useState<WorkspaceRuntimeState>(
      EMPTY_WORKSPACE_RUNTIME_STATE,
    );
    const restoredStatesRef = useRef<WorkspaceRuntimeState[]>([]);
    const restoreRuntimeState = useCallback((state: WorkspaceRuntimeState) => {
      restoredStatesRef.current.push(state);
      setRuntimeState(state);
    }, []);
    const host = useWorkspaceRuntimeStateHostRuntime({
      activeInstance: instances.activeInstance,
      activeRuntimeState: runtimeState,
      restoreRuntimeState,
      updateInstanceRuntimeState: instances.updateInstanceRuntimeState,
    });

    return {
      host,
      instances,
      restoredStatesRef,
      runtimeState,
      setRuntimeState,
    };
  });
}

describe('useWorkspaceRuntimeStateHostRuntime', () => {
  it('captures outgoing runtime status and restores the incoming tab runtime state', () => {
    const hook = renderRuntimeHost();

    act(() => {
      hook.result.current.setRuntimeState({
        clipboardNotice: 'Copied',
        editorAnalysisGeneration: 2,
        editorAnalysisStopped: true,
        lastRuntimeElapsedMs: 230,
        runtimeStatusOverride: 'Stop requested',
      });
    });

    act(() => {
      hook.result.current.host.captureActiveRuntimeState();
      hook.result.current.instances.createBlankInstance('equation');
    });

    expect(hook.result.current.instances.workspaceInstances.find((instance) =>
      instance.id === 'calculate.1')).toMatchObject({
        runtimeState: {
          clipboardNotice: 'Copied',
          editorAnalysisGeneration: 2,
          editorAnalysisStopped: true,
          lastRuntimeElapsedMs: 230,
          runtimeStatusOverride: 'Stop requested',
        },
      });
    expect(hook.result.current.runtimeState).toEqual(EMPTY_WORKSPACE_RUNTIME_STATE);

    act(() => {
      hook.result.current.setRuntimeState({
        clipboardNotice: null,
        editorAnalysisGeneration: 9,
        editorAnalysisStopped: false,
        lastRuntimeElapsedMs: null,
        runtimeStatusOverride: 'Computing',
      });
    });

    act(() => {
      hook.result.current.host.captureActiveRuntimeState();
      hook.result.current.instances.focusInstance('calculate.1');
    });

    expect(hook.result.current.runtimeState).toMatchObject({
      clipboardNotice: 'Copied',
      editorAnalysisGeneration: 2,
      editorAnalysisStopped: true,
      lastRuntimeElapsedMs: 230,
      runtimeStatusOverride: 'Stop requested',
    });
  });
});
