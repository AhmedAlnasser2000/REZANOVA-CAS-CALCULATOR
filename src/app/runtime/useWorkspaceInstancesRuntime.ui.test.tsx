import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
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
      id: 'equation.2',
      workspaceKind: 'equation',
    });

    act(() => {
      hook.result.current.syncSingletonMode('calculate');
    });

    expect(hook.result.current.activeInstance?.id).toBe('calculate.1');
    expect(hook.result.current.workspaceInstances).toHaveLength(2);
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
