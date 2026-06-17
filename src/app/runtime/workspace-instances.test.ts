import { describe, expect, it } from 'vitest';
import {
  clearWorkspaceInstanceState,
  closeOtherWorkspaceInstances,
  closeWorkspaceInstance,
  createBlankWorkspaceInstance,
  createInitialWorkspaceInstancesState,
  duplicateWorkspaceInstance,
  focusLatestWorkspaceKindOrCreate,
  focusWorkspaceInstance,
  getActiveWorkspaceInstance,
  renameWorkspaceInstance,
  retargetActiveWorkspaceInstanceKind,
  updateWorkspaceInstanceDisplayState,
  updateWorkspaceInstanceSurfaceState,
  workspaceInstanceRuntimeContext,
  type WorkspaceInstanceFactoryOptions,
  type WorkspaceKind,
} from './workspace-instances';

function createDeterministicOptions(): Required<WorkspaceInstanceFactoryOptions> {
  let timestamp = 1000;
  return {
    idFactory: (workspaceKind: WorkspaceKind, order: number) => `${workspaceKind}.${order}`,
    now: () => timestamp++,
  };
}

describe('workspace instance model', () => {
  it('creates an initial blank Calculate instance', () => {
    const options = createDeterministicOptions();
    const state = createInitialWorkspaceInstancesState(options);
    const activeInstance = getActiveWorkspaceInstance(state);

    expect(state.activeInstanceId).toBe('calculate.1');
    expect(state.instances).toHaveLength(1);
    expect(state.nextOrder).toBe(2);
    expect(activeInstance).toMatchObject({
      workspaceKind: 'calculate',
      title: 'Calculate',
      titleSource: 'default',
      compartmentId: 'calculate',
      navigationRevision: 0,
      surfaceState: null,
      displayState: null,
      runtimeState: null,
    });
  });

  it('focuses an existing instance and updates activation metadata', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = createBlankWorkspaceInstance(state, 'equation', options);
    state = focusWorkspaceInstance(state, 'calculate.1', options);

    expect(state.activeInstanceId).toBe('calculate.1');
    expect(getActiveWorkspaceInstance(state)?.lastActivatedAt).toBe(1002);
  });

  it('focuses the latest instance by kind or creates one when absent', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);

    state = focusLatestWorkspaceKindOrCreate(state, 'equation', options);
    expect(state.activeInstanceId).toBe('equation.2');
    expect(state.instances).toHaveLength(2);

    state = createBlankWorkspaceInstance(state, 'equation', options);
    expect(state.activeInstanceId).toBe('equation.3');

    state = focusWorkspaceInstance(state, 'calculate.1', options);
    state = focusLatestWorkspaceKindOrCreate(state, 'equation', options);

    expect(state.activeInstanceId).toBe('equation.3');
    expect(state.instances).toHaveLength(3);
  });

  it('creates blank instances with the correct compartment metadata', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);

    state = createBlankWorkspaceInstance(state, 'matrix', options);
    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      id: 'matrix.2',
      workspaceKind: 'matrix',
      title: 'Matrix',
      compartmentId: 'linear-algebra',
      compartmentLabel: 'Linear Algebra',
      surfaceLabel: 'Matrix workspace',
    });
  });

  it('builds a runtime context for OOE launch scoping', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = createBlankWorkspaceInstance(state, 'equation', options);
    const activeInstance = getActiveWorkspaceInstance(state);

    expect(activeInstance ? workspaceInstanceRuntimeContext(activeInstance) : null).toEqual({
      workspaceInstanceId: 'equation.2',
      workspaceInstanceLabel: 'Equation',
      workspaceInstanceRevision: 0,
      workspaceKind: 'equation',
      compartmentId: 'equation',
      compartmentLabel: 'Equation',
    });
  });

  it('renames with trimmed titles and falls back to the default label', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);

    state = renameWorkspaceInstance(state, 'calculate.1', '  Scratch numeric  ', options);
    expect(getActiveWorkspaceInstance(state)?.title).toBe('Scratch numeric');
    expect(getActiveWorkspaceInstance(state)?.titleSource).toBe('custom');

    state = renameWorkspaceInstance(state, 'calculate.1', '   ', options);
    expect(getActiveWorkspaceInstance(state)?.title).toBe('Calculate');
    expect(getActiveWorkspaceInstance(state)?.titleSource).toBe('default');
  });

  it('retargets the active instance to a new kind and invalidates prior surface state', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = updateWorkspaceInstanceSurfaceState(
      state,
      'calculate.1',
      { draft: '56+76' },
      options,
    );
    state = updateWorkspaceInstanceDisplayState(
      state,
      'calculate.1',
      { ansLatex: '132' },
      options,
    );
    state = retargetActiveWorkspaceInstanceKind(state, 'calculus', options);

    expect(state.activeInstanceId).toBe('calculate.1');
    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'calculus',
      title: 'Calculus',
      titleSource: 'default',
      compartmentId: 'calculus',
      navigationRevision: 1,
      surfaceState: null,
      displayState: null,
      runtimeState: null,
    });
  });

  it('preserves custom tab titles when retargeting the active instance', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = renameWorkspaceInstance(state, 'calculate.1', 'Scratch', options);
    state = retargetActiveWorkspaceInstanceKind(state, 'equation', options);

    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'equation',
      title: 'Scratch',
      titleSource: 'custom',
      navigationRevision: 1,
    });
  });

  it('duplicates metadata and placeholder state into a new active instance', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = renameWorkspaceInstance(state, 'calculate.1', 'Scratch', options);
    state = updateWorkspaceInstanceSurfaceState(
      state,
      'calculate.1',
      { draft: 'x+1' },
      options,
    );
    state = duplicateWorkspaceInstance(state, 'calculate.1', options);

    expect(state.activeInstanceId).toBe('calculate.2');
    expect(state.instances).toHaveLength(2);
    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      title: 'Scratch copy',
      titleSource: 'custom',
      workspaceKind: 'calculate',
      compartmentId: 'calculate',
      navigationRevision: 0,
      surfaceState: { draft: 'x+1' },
      displayState: null,
      runtimeState: null,
    });
  });

  it('duplicates with an explicit captured surface-state override', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = updateWorkspaceInstanceSurfaceState(
      state,
      'calculate.1',
      { draft: 'stale' },
      options,
    );
    state = duplicateWorkspaceInstance(state, 'calculate.1', {
      ...options,
      surfaceState: { draft: 'live' },
    });

    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      id: 'calculate.2',
      surfaceState: { draft: 'live' },
    });
  });

  it('updates a surface-state slot without changing the active instance', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);

    state = updateWorkspaceInstanceSurfaceState(
      state,
      'calculate.1',
      { latex: 'x^2' },
      options,
    );

    expect(state.activeInstanceId).toBe('calculate.1');
    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      surfaceState: { latex: 'x^2' },
      updatedAt: 1001,
    });
  });

  it('updates a display-state slot with direct values and updater functions', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);

    state = updateWorkspaceInstanceDisplayState(
      state,
      'calculate.1',
      { ansLatex: '2', displayOutcome: null },
      options,
    );
    state = updateWorkspaceInstanceDisplayState(
      state,
      'calculate.1',
      (currentState) => ({ ...(currentState ?? {}), ansLatex: '4' }),
      options,
    );

    expect(state.activeInstanceId).toBe('calculate.1');
    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      displayState: { ansLatex: '4', displayOutcome: null },
      updatedAt: 1002,
    });
  });

  it('clears state placeholders without changing identity', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = {
      ...state,
      instances: state.instances.map((instance) => ({
        ...instance,
        surfaceState: { draft: 'x+1' },
        displayState: { result: '2' },
        runtimeState: { busy: true },
      })),
    };
    state = clearWorkspaceInstanceState(state, 'calculate.1', options);

    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      id: 'calculate.1',
      surfaceState: null,
      displayState: null,
      runtimeState: null,
    });
  });

  it('closes instances and keeps the latest remaining instance active', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = createBlankWorkspaceInstance(state, 'equation', options);
    state = createBlankWorkspaceInstance(state, 'calculus', options);
    state = focusWorkspaceInstance(state, 'equation.2', options);
    state = closeWorkspaceInstance(state, 'equation.2', options);

    expect(state.instances.map((instance) => instance.id)).toEqual(['calculate.1', 'calculus.3']);
    expect(state.activeInstanceId).toBe('calculus.3');
  });

  it('closing the final instance creates a blank Calculate fallback', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = closeWorkspaceInstance(state, 'calculate.1', options);

    expect(state.instances).toHaveLength(1);
    expect(getActiveWorkspaceInstance(state)).toMatchObject({
      id: 'calculate.1',
      workspaceKind: 'calculate',
      title: 'Calculate',
    });
  });

  it('closes other instances around the selected target', () => {
    const options = createDeterministicOptions();
    let state = createInitialWorkspaceInstancesState(options);
    state = createBlankWorkspaceInstance(state, 'equation', options);
    state = createBlankWorkspaceInstance(state, 'calculus', options);
    state = closeOtherWorkspaceInstances(state, 'equation.2');

    expect(state.instances.map((instance) => instance.id)).toEqual(['equation.2']);
    expect(state.activeInstanceId).toBe('equation.2');
  });
});
