import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../../types/calculator';
import { useHistoryDisplayRuntime } from './useHistoryDisplayRuntime';

vi.mock('../../lib/app-state/persistence', () => ({
  appendHistoryEntry: vi.fn(),
  clearHistoryEntries: vi.fn(),
  deleteHistoryEntry: vi.fn(),
}));

function renderSnapshotRuntime(settings: Settings) {
  return renderHook(
    (props: { settings: Settings }) => useHistoryDisplayRuntime({
      autoSwitchToEquation: false,
      closeHistoryPanel: vi.fn(),
      currentCalculusHistoryContext: () => ({}),
      currentCalculateHistoryContext: () => ({}),
      getGeometryScreen: () => 'triangleArea',
      getReplayVariableSubstitutions: () => null,
      getStatisticsScreen: () => 'regression',
      getTrigScreen: () => 'equationSolve',
      historyEnabled: true,
      settings: props.settings,
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
      setReplayVariableSubstitutions: vi.fn(),
      setRuntimeElapsedMs: vi.fn(),
      setRuntimeStatusOverride: vi.fn(),
      switchToEquationWithLatex: vi.fn(),
      applyCalculusSeed: vi.fn(),
      clearCalculateReplayVariableSubstitutions: vi.fn(),
    }),
    { initialProps: { settings } },
  );
}

describe('useHistoryDisplayRuntime replay snapshot', () => {
  it('commits settings and Ans captured when the ticket was reserved', () => {
    const launchSettings: Settings = {
      ...DEFAULT_SETTINGS,
      angleUnit: 'rad',
      outputStyle: 'exact',
      approxDigits: 12,
      mathNotationDisplay: 'latex',
    };
    const hook = renderSnapshotRuntime(launchSettings);
    let reservation: ReturnType<typeof hook.result.current.reservePendingHistoryTicket> = null;
    act(() => {
      reservation = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: 'arcsin(1)',
      });
    });
    hook.rerender({
      settings: {
        ...launchSettings,
        angleUnit: 'grad',
        outputStyle: 'decimal',
        approxDigits: 4,
        mathNotationDisplay: 'plainText',
      },
    });
    act(() => {
      hook.result.current.commitOutcome(
        { kind: 'success', title: 'Numeric', exactLatex: '\\frac{\\pi}{2}', warnings: [] },
        'arcsin(1)',
        'calculate',
        { historyLaunchOrder: reservation!.historyLaunchOrder, historyTicketId: reservation!.id },
      );
    });

    expect(hook.result.current.history[0]?.replaySnapshot).toMatchObject({
      version: 1,
      ansLatex: '0',
      angleUnit: 'rad',
      outputStyle: 'exact',
      approxDigits: 12,
      mathNotationDisplay: 'latex',
    });
  });
});
