import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  useWorkspaceInstancesRuntime,
  useWorkspaceRuntimeContextGetters,
} from './useWorkspaceInstancesRuntime';
import type {
  WorkspaceInstanceFactoryOptions,
  WorkspaceKind,
} from './workspace-instances';

function createDeterministicOptions(): Required<WorkspaceInstanceFactoryOptions> {
  let timestamp = 2000;
  return {
    idFactory: (workspaceKind: WorkspaceKind, order: number) => `${workspaceKind}.${order}`,
    now: () => timestamp++,
  };
}

describe('useWorkspaceInstancesRuntime', () => {
  it('starts with a single active Calculate instance', () => {
    const hook = renderHook(() => useWorkspaceInstancesRuntime(createDeterministicOptions()));

    expect(hook.result.current.activeInstance).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'calculate',
      title: 'Calculate',
    });
    expect(hook.result.current.workspaceInstances).toHaveLength(1);
  });

  it('syncs external singleton mode changes into the shadow instance model', () => {
    const hook = renderHook(() => useWorkspaceInstancesRuntime(createDeterministicOptions()));

    act(() => {
      hook.result.current.syncSingletonMode('equation');
    });

    expect(hook.result.current.activeInstance).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'equation',
      title: 'Equation',
      navigationRevision: 1,
    });

    act(() => {
      hook.result.current.syncSingletonMode('calculate');
    });

    expect(hook.result.current.activeInstance?.id).toBe('calculate.1');
    expect(hook.result.current.activeInstance).toMatchObject({
      workspaceKind: 'calculate',
      title: 'Calculate',
      navigationRevision: 2,
    });
    expect(hook.result.current.workspaceInstances).toHaveLength(1);
  });

  it('retargets the active instance without focusing another matching tab', () => {
    const hook = renderHook(() => useWorkspaceInstancesRuntime(createDeterministicOptions()));

    act(() => {
      hook.result.current.createBlankInstance('calculate');
      hook.result.current.retargetActiveWorkspaceKind('calculus');
    });

    expect(hook.result.current.workspaceInstances.map((instance) => ({
      id: instance.id,
      workspaceKind: instance.workspaceKind,
    }))).toEqual([
      { id: 'calculate.1', workspaceKind: 'calculate' },
      { id: 'calculate.2', workspaceKind: 'calculus' },
    ]);
    expect(hook.result.current.activeInstance).toMatchObject({
      id: 'calculate.2',
      workspaceKind: 'calculus',
      title: 'Calculus',
      navigationRevision: 1,
    });
  });

  it('activates the latest matching workspace kind for existing mode switches', () => {
    const hook = renderHook(() => useWorkspaceInstancesRuntime(createDeterministicOptions()));

    act(() => {
      hook.result.current.createBlankInstance('equation');
      hook.result.current.createBlankInstance('equation');
      hook.result.current.activateWorkspaceKind('calculate');
      hook.result.current.activateWorkspaceKind('equation');
    });

    expect(hook.result.current.activeInstance).toMatchObject({
      id: 'equation.3',
      workspaceKind: 'equation',
    });
  });

  it('exposes active runtime context and open-instance checks', () => {
    const hook = renderHook(() => useWorkspaceInstancesRuntime(createDeterministicOptions()));

    act(() => {
      hook.result.current.createBlankInstance('equation');
    });

    expect(hook.result.current.activeRuntimeContext).toMatchObject({
      workspaceInstanceId: 'equation.2',
      workspaceInstanceLabel: 'Equation',
      workspaceInstanceRevision: 0,
      workspaceKind: 'equation',
    });
    expect(hook.result.current.isWorkspaceInstanceOpen('equation.2')).toBe(true);
    expect(hook.result.current.isWorkspaceInstanceOpen('equation.2', {
      workspaceInstanceRevision: 0,
    })).toBe(true);
    expect(hook.result.current.isWorkspaceInstanceOpen('equation.2', {
      workspaceInstanceRevision: 1,
    })).toBe(false);
    expect(hook.result.current.isWorkspaceInstanceOpen('equation.missing')).toBe(false);
  });

  it('keeps stable runtime getters fresh after focus and retarget changes', () => {
    const hook = renderHook(() => {
      const runtime = useWorkspaceInstancesRuntime(createDeterministicOptions());
      const getters = useWorkspaceRuntimeContextGetters(runtime);
      return { getters, runtime };
    });
    const getActiveContext =
      hook.result.current.getters.getActiveWorkspaceInstanceRuntimeContextForRuntime;
    const isInstanceOpen = hook.result.current.getters.isWorkspaceInstanceOpenForRuntime;

    expect(getActiveContext()).toMatchObject({
      workspaceInstanceId: 'calculate.1',
      workspaceInstanceRevision: 0,
      workspaceKind: 'calculate',
    });

    act(() => {
      hook.result.current.runtime.createBlankInstance('equation');
    });

    expect(getActiveContext()).toMatchObject({
      workspaceInstanceId: 'equation.2',
      workspaceInstanceRevision: 0,
      workspaceKind: 'equation',
    });
    expect(isInstanceOpen('equation.2', { workspaceInstanceRevision: 0 })).toBe(true);

    act(() => {
      hook.result.current.runtime.retargetActiveWorkspaceKind('calculus');
    });

    expect(getActiveContext()).toMatchObject({
      workspaceInstanceId: 'equation.2',
      workspaceInstanceRevision: 1,
      workspaceKind: 'calculus',
    });
    expect(isInstanceOpen('equation.2', { workspaceInstanceRevision: 0 })).toBe(false);
    expect(isInstanceOpen('equation.2', { workspaceInstanceRevision: 1 })).toBe(true);
  });

  it('supports rename, duplicate, close, and final-tab fallback operations', () => {
    const hook = renderHook(() => useWorkspaceInstancesRuntime(createDeterministicOptions()));

    act(() => {
      hook.result.current.renameInstance('calculate.1', '  Scratch  ');
      hook.result.current.duplicateInstance('calculate.1');
    });

    expect(hook.result.current.activeInstance).toMatchObject({
      id: 'calculate.2',
      title: 'Scratch copy',
    });

    act(() => {
      hook.result.current.closeOtherInstances('calculate.2');
      hook.result.current.closeInstance('calculate.2');
    });

    expect(hook.result.current.activeInstance).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'calculate',
      title: 'Calculate',
    });
    expect(hook.result.current.workspaceInstances).toHaveLength(1);
  });
});
