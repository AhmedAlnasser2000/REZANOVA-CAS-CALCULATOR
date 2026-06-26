import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ModeId } from '../../types/calculator';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  startOoeJob,
} from '../../lib/ooe/job-launch/active-job-registry';
import {
  buildOoeJobCommitContext,
  buildOoeJobCommitContextForJob,
  type OoeJobIdentityDefinition,
} from '../../lib/ooe/job-launch/job-contract';
import { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { useWorkspaceTabsShellRuntime } from './useWorkspaceTabsShellRuntime';
import {
  EMPTY_WORKSPACE_DISPLAY_STATE,
  type WorkspaceDisplayState,
} from './workspace-display-state';
import {
  EMPTY_WORKSPACE_RUNTIME_STATE,
  type WorkspaceRuntimeState,
} from './workspace-runtime-state';
import type {
  CalculateSurfaceState,
  CalculusSurfaceState,
  EquationSurfaceState,
  GeometrySurfaceState,
  MatrixSurfaceState,
  StatisticsSurfaceState,
  TableSurfaceState,
  TrigonometrySurfaceState,
  VectorSurfaceState,
} from './workspace-surface-state';
import type {
  WorkspaceInstanceFactoryOptions,
  WorkspaceKind,
} from './workspace-instances';
import {
  buildFormulaViewerArtifact,
  type FormulaViewerArtifact,
} from './formula-viewer-artifacts';
import type { DisplayBlock } from '../../lib/display/result/display-blocks';

const definition: OoeJobIdentityDefinition = {
  capabilityId: 'expression.evaluate',
  hostId: 'calculate-worker-runtime',
  nodeId: 'node.expression.evaluate',
  phaseId: 'expression.evaluate',
  planId: 'plan.expression.evaluate',
};

function createDeterministicOptions(): Required<WorkspaceInstanceFactoryOptions> {
  let timestamp = 6000;
  return {
    idFactory: (workspaceKind: WorkspaceKind, order: number) => `${workspaceKind}.${order}`,
    now: () => timestamp++,
  };
}

function createFormulaViewerArtifact(suffix = 'one'): FormulaViewerArtifact {
  const block: DisplayBlock = {
    id: `answer.${suffix}`,
    kind: 'answer',
    label: 'Answer',
    rawContent: [],
    renderKind: 'caseMath',
    lines: [
      {
        conditionLatex: String.raw`\Delta>0`,
        groupLatex: String.raw`F=b`,
        id: `row.${suffix}`,
        latex: `z_${suffix}`,
      },
    ],
    text: 'z\\in',
  };
  return buildFormulaViewerArtifact({
    block,
    displayBlocks: [block],
    now: () => 10,
    source: {
      sourceWorkspaceInstanceId: 'equation.1',
      sourceWorkspaceKind: 'equation',
      sourceWorkspaceTitle: 'Equation',
    },
  });
}

function useSurfaceAdapter<TSurfaceState>(name: string) {
  const defaultState = { value: `${name}-default` } as TSurfaceState;
  const stateRef = useRef<TSurfaceState>(defaultState);

  return {
    captureSurfaceState: () => stateRef.current,
    restoreSurfaceState: (state: TSurfaceState | null) => {
      stateRef.current = state ?? defaultState;
    },
  };
}

function renderWorkspaceTabsShell() {
  const markPendingHistoryTicketsForWorkspaceInstanceAsStopping = vi.fn();
  const discardPendingHistoryTicketsForWorkspaceInstance = vi.fn();
  const setEditorRuntimeStatusOverride = vi.fn();
  const workspaceInstanceOptions = createDeterministicOptions();

  const hook = renderHook(() => {
    const [currentMode, setCurrentMode] = useState<ModeId>('calculate');
    const workspaceInstances = useWorkspaceInstancesRuntime(workspaceInstanceOptions);
    const displayStateRef = useRef<WorkspaceDisplayState>(EMPTY_WORKSPACE_DISPLAY_STATE);
    const runtimeStateRef = useRef<WorkspaceRuntimeState>(EMPTY_WORKSPACE_RUNTIME_STATE);
    const shell = useWorkspaceTabsShellRuntime({
      calculus: useSurfaceAdapter<CalculusSurfaceState>('calculus'),
      calculate: useSurfaceAdapter<CalculateSurfaceState>('calculate'),
      commitVisibleModeSelection: setCurrentMode,
      currentMode,
      discardPendingHistoryTicketsForWorkspaceInstance,
      display: {
        ansLatex: displayStateRef.current.ansLatex,
        captureDisplayState: () => displayStateRef.current,
        displayOutcome: displayStateRef.current.displayOutcome,
        replayVariableSubstitutions: displayStateRef.current.replayVariableSubstitutions,
        restoreDisplayState: (state) => {
          displayStateRef.current = state as WorkspaceDisplayState | null
            ?? EMPTY_WORKSPACE_DISPLAY_STATE;
        },
      },
      equation: useSurfaceAdapter<EquationSurfaceState>('equation'),
      geometry: useSurfaceAdapter<GeometrySurfaceState>('geometry'),
      labsEnabled: false,
      markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
      matrix: useSurfaceAdapter<MatrixSurfaceState>('matrix'),
      pendingHistoryTickets: [],
      runtime: {
        activeRuntimeState: runtimeStateRef.current,
        restoreRuntimeState: (state) => {
          runtimeStateRef.current = state;
        },
      },
      setEditorRuntimeStatusOverride,
      statistics: useSurfaceAdapter<StatisticsSurfaceState>('statistics'),
      table: useSurfaceAdapter<TableSurfaceState>('table'),
      trigonometry: useSurfaceAdapter<TrigonometrySurfaceState>('trigonometry'),
      vector: useSurfaceAdapter<VectorSurfaceState>('vector'),
      workspaceInstances,
    });

    return {
      currentMode,
      markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
      selectMode: (mode: ModeId) => {
        shell.retargetActiveWorkspaceKind(mode);
        setCurrentMode(mode);
      },
      setEditorRuntimeStatusOverride,
      shell,
      workspaceInstances,
    };
  });

  return {
    discardPendingHistoryTicketsForWorkspaceInstance,
    hook,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    setEditorRuntimeStatusOverride,
  };
}

function startJobForActiveInstance(
  activeWorkspaceInstance: ReturnType<typeof useWorkspaceInstancesRuntime>['activeRuntimeContext'],
) {
  if (!activeWorkspaceInstance) {
    throw new Error('Expected active workspace instance context');
  }
  const context = buildOoeJobCommitContext(
    definition,
    { request: { latex: '2+2' } },
    {
      commitPolicy: 'alwaysCommit',
      workspaceInstance: activeWorkspaceInstance,
    },
  );
  const started = startOoeJob({
    job: context.job,
    routeLabel: context.job.capabilityId,
  });
  return {
    context,
    started,
  };
}

describe('useWorkspaceTabsShellRuntime job lifecycle', () => {
  beforeEach(() => {
    clearOoeJobRegistry();
    vi.clearAllMocks();
  });

  it('does not cancel active jobs when same-tab mode navigation retargets the workspace', () => {
    const { hook, markPendingHistoryTicketsForWorkspaceInstanceAsStopping } =
      renderWorkspaceTabsShell();
    const { context } = startJobForActiveInstance(
      hook.result.current.workspaceInstances.activeRuntimeContext,
    );

    act(() => {
      hook.result.current.selectMode('calculus');
    });

    expect(hook.result.current.workspaceInstances.activeInstance).toMatchObject({
      id: 'calculate.1',
      navigationRevision: 1,
      workspaceKind: 'calculus',
    });
    expect(listActiveOoeJobs()).toMatchObject([
      {
        status: 'started',
        cancellationRequest: undefined,
      },
    ]);
    expect(hook.result.current.shell.workspaceTabsRuntime.tabs[0]).toMatchObject({
      activeJobCount: 0,
      pendingTicketCount: 0,
      workspaceKind: 'calculus',
    });
    expect(markPendingHistoryTicketsForWorkspaceInstanceAsStopping).not.toHaveBeenCalled();

    const lateContext = buildOoeJobCommitContextForJob(context.job, {
      commitPolicy: 'alwaysCommit',
      isWorkspaceInstanceOpen: hook.result.current.workspaceInstances.isWorkspaceInstanceOpen,
    });
    expect(lateContext.commitAssessment).toMatchObject({
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      workspaceInstanceOpen: false,
    });
  });

  it('opens Formula Viewer tabs without committing a non-mode workspace kind', () => {
    const { hook } = renderWorkspaceTabsShell();

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onOpenFormulaViewerTab(
        createFormulaViewerArtifact('one'),
      );
    });

    expect(hook.result.current.currentMode).toBe('calculate');
    expect(hook.result.current.workspaceInstances.activeInstance).toMatchObject({
      id: 'formula-viewer.2',
      workspaceKind: 'formula-viewer',
    });
    expect(hook.result.current.workspaceInstances.activeRuntimeContext).toBeNull();

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onOpenFormulaViewerTab(
        createFormulaViewerArtifact('one'),
      );
    });

    expect(hook.result.current.workspaceInstances.workspaceInstances
      .filter((instance) => instance.workspaceKind === 'formula-viewer'))
      .toHaveLength(1);

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onOpenFormulaViewerTab(
        createFormulaViewerArtifact('two'),
      );
    });

    expect(hook.result.current.currentMode).toBe('calculate');
    expect(hook.result.current.workspaceInstances.workspaceInstances
      .filter((instance) => instance.workspaceKind === 'formula-viewer'))
      .toHaveLength(2);
  });

  it('does not cancel the origin tab job when focusing a different tab', () => {
    const { hook } = renderWorkspaceTabsShell();

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onCreateBlankTab();
    });
    const { context } = startJobForActiveInstance(
      hook.result.current.workspaceInstances.activeRuntimeContext,
    );

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onFocusTab('calculate.1');
    });

    expect(hook.result.current.workspaceInstances.activeInstance?.id).toBe('calculate.1');
    expect(listActiveOoeJobs()).toMatchObject([
      {
        workspaceInstanceId: 'calculate.2',
        status: 'started',
        cancellationRequest: undefined,
      },
    ]);

    const completionContext = buildOoeJobCommitContextForJob(context.job, {
      commitPolicy: 'alwaysCommit',
      isWorkspaceInstanceOpen: hook.result.current.workspaceInstances.isWorkspaceInstanceOpen,
    });
    expect(completionContext.commitAssessment).toMatchObject({
      legality: 'commitAllowed',
      commitDecision: 'committed',
      workspaceInstanceOpen: true,
    });
  });

  it('still cancels jobs for explicit close and Stop tab actions', () => {
    const { hook, setEditorRuntimeStatusOverride } = renderWorkspaceTabsShell();

    startJobForActiveInstance(hook.result.current.workspaceInstances.activeRuntimeContext);

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onStopJobsInTab('calculate.1');
    });

    expect(listActiveOoeJobs()[0]).toMatchObject({
      status: 'cancelRequested',
      cancellationRequest: {
        reason: 'Workspace tab Stop requested.',
        requestedBy: 'user',
      },
    });
    expect(setEditorRuntimeStatusOverride).toHaveBeenCalledWith('Stop requested');

    clearOoeJobRegistry();
    startJobForActiveInstance(hook.result.current.workspaceInstances.activeRuntimeContext);

    act(() => {
      hook.result.current.shell.workspaceTabsRuntime.onCloseTab('calculate.1');
    });

    expect(listActiveOoeJobs()[0]).toMatchObject({
      status: 'cancelRequested',
      cancellationRequest: {
        reason: 'Workspace tab closed.',
        requestedBy: 'user',
      },
    });
  });
});
