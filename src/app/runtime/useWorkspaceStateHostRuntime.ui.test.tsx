import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRef } from 'react';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { useWorkspaceStateHostRuntime } from './useWorkspaceStateHostRuntime';
import type {
  WorkspaceInstanceFactoryOptions,
  WorkspaceInstanceStateSlot,
  WorkspaceKind,
} from './workspace-instances';

function createDeterministicOptions(): Required<WorkspaceInstanceFactoryOptions> {
  let timestamp = 3000;
  return {
    idFactory: (workspaceKind: WorkspaceKind, order: number) => `${workspaceKind}.${order}`,
    now: () => timestamp++,
  };
}

function renderStateHost() {
  return renderHook(() => {
    const instances = useWorkspaceInstancesRuntime(createDeterministicOptions());
    const calculateStateRef = useRef<WorkspaceInstanceStateSlot>({ value: 'calculate-default' });
    const equationStateRef = useRef<WorkspaceInstanceStateSlot>({ value: 'equation-current' });
    const matrixStateRef = useRef<WorkspaceInstanceStateSlot>({ value: 'matrix-current' });
    const vectorStateRef = useRef<WorkspaceInstanceStateSlot>({ value: 'vector-current' });
    const host = useWorkspaceStateHostRuntime({
      activeInstance: instances.activeInstance,
      activateWorkspaceKind: instances.activateWorkspaceKind,
      adapters: [
        {
          workspaceKind: 'calculate',
          captureSurfaceState: () => calculateStateRef.current,
          restoreSurfaceState: (state) => {
            calculateStateRef.current = state ?? { value: 'calculate-default' };
          },
        },
        {
          workspaceKind: 'equation',
          captureSurfaceState: () => equationStateRef.current,
          restoreSurfaceState: (state) => {
            equationStateRef.current = state ?? { value: 'equation-default' };
          },
        },
        {
          workspaceKind: 'matrix',
          captureSurfaceState: () => matrixStateRef.current,
          restoreSurfaceState: (state) => {
            matrixStateRef.current = state ?? { value: 'matrix-default' };
          },
        },
        {
          workspaceKind: 'vector',
          captureSurfaceState: () => vectorStateRef.current,
          restoreSurfaceState: (state) => {
            vectorStateRef.current = state ?? { value: 'vector-default' };
          },
        },
      ],
      createBlankInstance: instances.createBlankInstance,
      focusInstance: instances.focusInstance,
      retargetActiveWorkspaceKind: instances.retargetActiveWorkspaceKind,
      syncSingletonMode: instances.syncSingletonMode,
      updateInstanceSurfaceState: instances.updateInstanceSurfaceState,
    });

    return {
      calculateStateRef,
      equationStateRef,
      host,
      instances,
      matrixStateRef,
      vectorStateRef,
    };
  });
}

describe('useWorkspaceStateHostRuntime', () => {
  it('captures outgoing state before focusing and restores incoming saved state', () => {
    const hook = renderStateHost();

    act(() => {
      hook.result.current.calculateStateRef.current = { value: 'calculate-draft' };
      hook.result.current.host.createBlankInstance('equation');
    });

    expect(hook.result.current.instances.activeInstance).toMatchObject({
      id: 'equation.2',
      workspaceKind: 'equation',
    });
    expect(hook.result.current.equationStateRef.current).toEqual({ value: 'equation-default' });
    expect(hook.result.current.instances.workspaceInstances.find((instance) => instance.id === 'calculate.1'))
      .toMatchObject({
        surfaceState: { value: 'calculate-draft' },
      });

    act(() => {
      hook.result.current.equationStateRef.current = { value: 'equation-draft' };
      hook.result.current.host.activateWorkspaceKind('calculate');
    });

    expect(hook.result.current.instances.activeInstance).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'calculate',
    });
    expect(hook.result.current.calculateStateRef.current).toEqual({ value: 'calculate-draft' });
    expect(hook.result.current.instances.workspaceInstances.find((instance) => instance.id === 'equation.2'))
      .toMatchObject({
        surfaceState: { value: 'equation-draft' },
      });
  });

  it('syncs singleton mode changes through the same capture path', () => {
    const hook = renderStateHost();

    act(() => {
      hook.result.current.calculateStateRef.current = { value: 'sync-calculate' };
      hook.result.current.host.syncSingletonMode('equation');
    });

    expect(hook.result.current.instances.activeInstance).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'equation',
      surfaceState: null,
      navigationRevision: 1,
    });
    expect(hook.result.current.equationStateRef.current).toEqual({ value: 'equation-default' });
  });

  it('retargets the active tab and restores the new workspace defaults on the same instance', () => {
    const hook = renderStateHost();

    act(() => {
      hook.result.current.calculateStateRef.current = { value: 'same-tab-calculate' };
      hook.result.current.host.retargetActiveWorkspaceKind('equation');
    });

    expect(hook.result.current.instances.workspaceInstances).toHaveLength(1);
    expect(hook.result.current.instances.activeInstance).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'equation',
      title: 'Equation',
      surfaceState: null,
      navigationRevision: 1,
    });
    expect(hook.result.current.equationStateRef.current).toEqual({ value: 'equation-default' });
  });

  it('captures and restores non-core workspace kinds independently', () => {
    const hook = renderStateHost();

    act(() => {
      hook.result.current.host.createBlankInstance('matrix');
    });

    expect(hook.result.current.matrixStateRef.current).toEqual({ value: 'matrix-default' });

    act(() => {
      hook.result.current.matrixStateRef.current = { value: 'matrix-draft' };
      hook.result.current.host.createBlankInstance('vector');
    });

    expect(hook.result.current.vectorStateRef.current).toEqual({ value: 'vector-default' });

    act(() => {
      hook.result.current.vectorStateRef.current = { value: 'vector-draft' };
      hook.result.current.host.activateWorkspaceKind('matrix');
    });

    expect(hook.result.current.matrixStateRef.current).toEqual({ value: 'matrix-draft' });
    expect(hook.result.current.instances.workspaceInstances.find((instance) => instance.id === 'vector.3'))
      .toMatchObject({
        surfaceState: { value: 'vector-draft' },
      });
  });

  it('ignores unsupported workspace kinds without crashing', () => {
    const hook = renderStateHost();

    act(() => {
      hook.result.current.host.createBlankInstance('guide');
    });

    expect(hook.result.current.instances.activeInstance).toMatchObject({
      id: 'guide.2',
      workspaceKind: 'guide',
    });
  });
});
