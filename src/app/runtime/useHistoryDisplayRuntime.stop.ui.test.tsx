import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listActiveOoeJobs,
  requestOoeJobCancellation,
} from '../../lib/ooe/job-launch/active-job-registry';
import type { HistoryDisplayReplayVariableSubstitutions } from './useHistoryDisplayRuntime';
import { useHistoryDisplayRuntime } from './useHistoryDisplayRuntime';
import { DEFAULT_SETTINGS, type WorkspaceInstanceRuntimeContext } from '../../types/calculator';

vi.mock('../../lib/app-state/persistence', () => ({
  appendHistoryEntry: vi.fn(),
  clearHistoryEntries: vi.fn(),
  deleteHistoryEntry: vi.fn(),
}));

vi.mock('../../lib/ooe/job-launch/active-job-registry', () => ({
  listActiveOoeJobs: vi.fn(),
  requestLatestOoeCapabilityCancellation: vi.fn(),
  requestOoeJobCancellation: vi.fn(),
}));

function renderRuntimeStopHook(activeWorkspaceInstance: WorkspaceInstanceRuntimeContext) {
  let replayVariableSubstitutions: HistoryDisplayReplayVariableSubstitutions = null;

  return renderHook(() =>
    useHistoryDisplayRuntime({
      autoSwitchToEquation: true,
      closeHistoryPanel: vi.fn(),
      currentCalculusHistoryContext: vi.fn(() => ({})),
      currentCalculateHistoryContext: vi.fn(() => ({})),
      getGeometryScreen: vi.fn(() => 'triangleArea' as const),
      getReplayVariableSubstitutions: () => replayVariableSubstitutions,
      getStatisticsScreen: vi.fn(() => 'regression' as const),
      getTrigScreen: vi.fn(() => 'equationSolve' as const),
      getActiveWorkspaceInstanceRuntimeContext: () => activeWorkspaceInstance,
      historyEnabled: true,
      settings: DEFAULT_SETTINGS,
      isWorkspaceInstanceOpen: () => true,
      openCalculusScreen: vi.fn(),
      restoreCalculateHistoryEntry: vi.fn(),
      restoreCalculusHistoryEntry: vi.fn(),
      restoreEquationHistoryEntry: vi.fn(),
      restoreGeometryHistoryEntry: vi.fn(),
      restoreLinearAlgebraTableHistoryEntry: vi.fn(),
      restoreStatisticsHistoryEntry: vi.fn(),
      restoreTrigHistoryEntry: vi.fn(),
      setClipboardNotice: vi.fn(),
      setLauncherSurfaceApp: vi.fn(),
      setMode: vi.fn(),
      setReplayVariableSubstitutions: vi.fn((next) => {
        replayVariableSubstitutions =
          typeof next === 'function' ? next(replayVariableSubstitutions) : next;
      }),
      setRuntimeElapsedMs: vi.fn(),
      setRuntimeStatusOverride: vi.fn(),
      switchToEquationWithLatex: vi.fn(),
      updateWorkspaceInstanceDisplayState: vi.fn(),
      updateWorkspaceInstanceRuntimeState: vi.fn(),
      applyCalculusSeed: vi.fn(),
      clearCalculateReplayVariableSubstitutions: vi.fn(),
    }));
}

describe('useHistoryDisplayRuntime stop controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests Stop for the active scoped runtime ticket', async () => {
    const activeWorkspaceInstance = {
      workspaceInstanceId: 'workspace.calculus.1',
      workspaceInstanceLabel: 'Calculus',
      workspaceInstanceRevision: 7,
      workspaceKind: 'calculus',
    };
    const hook = renderRuntimeStopHook(activeWorkspaceInstance);
    vi.mocked(listActiveOoeJobs).mockReturnValue([
      {
        registryId: 'ooe-job-calculus',
        capabilityId: 'calculus.evaluate',
        inputRevisionId: 'rev.calculus.current',
      } as ReturnType<typeof listActiveOoeJobs>[number],
    ]);
    vi.mocked(requestOoeJobCancellation).mockReturnValue({
      registryId: 'ooe-job-calculus',
    } as ReturnType<typeof requestOoeJobCancellation>);

    act(() => {
      hook.result.current.reservePendingHistoryTicket({
        mode: 'calculus',
        inputLatex: '\\frac{d}{dx}\\tan(x)',
        capabilityId: 'calculus.evaluate',
        inputRevisionId: 'rev.calculus.current',
      });
    });

    let requested = false;
    act(() => {
      requested = hook.result.current.stopPendingRuntimeTicket(
        ['calculus.evaluate'],
        {
          workspaceInstanceId: 'workspace.calculus.1',
          workspaceInstanceRevision: 7,
        },
      );
    });

    expect(requested).toBe(true);
    await waitFor(() => {
      expect(requestOoeJobCancellation).toHaveBeenCalledWith('ooe-job-calculus', {
        requestedBy: 'user',
        reason: 'Pending History ticket Stop requested.',
      });
    });
    expect(hook.result.current.pendingHistoryTickets[0]?.status).toBe('stopping');
  });
});
