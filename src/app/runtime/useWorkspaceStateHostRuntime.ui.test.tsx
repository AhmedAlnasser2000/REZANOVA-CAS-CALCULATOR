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
      ],
      createBlankInstance: instances.createBlankInstance,
      focusInstance: instances.focusInstance,
      syncSingletonMode: instances.syncSingletonMode,
      updateInstanceSurfaceState: instances.updateInstanceSurfaceState,
    });

    return {
      calculateStateRef,
      equationStateRef,
      host,
      instances,
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
      workspaceKind: 'equation',
    });
    expect(hook.result.current.instances.workspaceInstances.find((instance) => instance.id === 'calculate.1'))
      .toMatchObject({
        surfaceState: { value: 'sync-calculate' },
      });
  });

  it('ignores unsupported workspace kinds without crashing', () => {
    const hook = renderStateHost();

    act(() => {
      hook.result.current.host.createBlankInstance('statistics');
    });

    expect(hook.result.current.instances.activeInstance).toMatchObject({
      id: 'statistics.2',
      workspaceKind: 'statistics',
    });
  });
});
