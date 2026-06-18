import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRef } from 'react';
import { useWorkspaceDisplayStateHostRuntime } from './useWorkspaceDisplayStateHostRuntime';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import type {
  WorkspaceInstanceFactoryOptions,
  WorkspaceKind,
} from './workspace-instances';
import type { WorkspaceDisplayState } from './workspace-display-state';

function createDeterministicOptions(): Required<WorkspaceInstanceFactoryOptions> {
  let timestamp = 4000;
  return {
    idFactory: (workspaceKind: WorkspaceKind, order: number) => `${workspaceKind}.${order}`,
    now: () => timestamp++,
  };
}

function renderDisplayStateHost() {
  return renderHook(() => {
    const instances = useWorkspaceInstancesRuntime(createDeterministicOptions());
    const displayStateRef = useRef<WorkspaceDisplayState>({
      ansLatex: '0',
      displayOutcome: null,
      replayVariableSubstitutions: null,
    });
    const host = useWorkspaceDisplayStateHostRuntime({
      activeInstance: instances.activeInstance,
      captureDisplayState: () => displayStateRef.current,
      restoreDisplayState: (state) => {
        displayStateRef.current = state as WorkspaceDisplayState | null ?? {
          ansLatex: '0',
          displayOutcome: null,
          replayVariableSubstitutions: null,
        };
      },
      updateInstanceDisplayState: instances.updateInstanceDisplayState,
    });

    return {
      displayStateRef,
      host,
      instances,
    };
  });
}

describe('useWorkspaceDisplayStateHostRuntime', () => {
  it('captures outgoing display state and restores incoming display state', () => {
    const hook = renderDisplayStateHost();

    act(() => {
      hook.result.current.displayStateRef.current = {
        ansLatex: '12',
        displayOutcome: {
          kind: 'success',
          title: 'Calculate',
          exactLatex: '12',
          warnings: [],
        },
        replayVariableSubstitutions: null,
      };
      hook.result.current.host.captureActiveDisplayState();
      hook.result.current.instances.createBlankInstance('equation');
    });

    expect(hook.result.current.instances.workspaceInstances.find((instance) => instance.id === 'calculate.1'))
      .toMatchObject({
        displayState: {
          ansLatex: '12',
          displayOutcome: {
            kind: 'success',
            exactLatex: '12',
          },
        },
      });
    expect(hook.result.current.displayStateRef.current).toEqual({
      ansLatex: '0',
      displayOutcome: null,
      replayVariableSubstitutions: null,
    });

    act(() => {
      hook.result.current.host.captureActiveDisplayState();
      hook.result.current.instances.activateWorkspaceKind('calculate');
    });

    expect(hook.result.current.displayStateRef.current).toMatchObject({
      ansLatex: '12',
      displayOutcome: {
        kind: 'success',
        exactLatex: '12',
      },
    });
  });

  it('does not copy the previous visible display into a newly focused tab', () => {
    const hook = renderDisplayStateHost();

    act(() => {
      hook.result.current.displayStateRef.current = {
        ansLatex: '48',
        displayOutcome: {
          kind: 'success',
          title: 'Calculate',
          exactLatex: '48',
          warnings: [],
        },
        replayVariableSubstitutions: null,
      };
      hook.result.current.instances.createBlankInstance('equation');
    });

    const equationInstance = hook.result.current.instances.workspaceInstances.find(
      (instance) => instance.id === 'equation.2',
    );

    expect(hook.result.current.displayStateRef.current).toEqual({
      ansLatex: '0',
      displayOutcome: null,
      replayVariableSubstitutions: null,
    });
    expect(equationInstance?.displayState).toBeNull();
  });
});
