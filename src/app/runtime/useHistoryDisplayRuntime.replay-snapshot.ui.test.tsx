import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  type Settings,
} from '../../types/calculator';
import { canonicalMathValue } from '../../lib/result-contract';
import { canonicalResultFixture } from '../../test-utils/canonical-result-fixture';
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
        canonicalResultFixture({
          outcomeKind: 'success',
          title: 'Numeric',
          primaryMath: canonicalMathValue('\\frac{\\pi}{2}'),
          warnings: [],
        }),
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

  it('replays a structured result before its stale legacy projection', () => {
    const hook = renderSnapshotRuntime(DEFAULT_SETTINGS);

    act(() => {
      hook.result.current.replayHistoryEntry({
        id: 'history.structured-equation',
        mode: 'equation',
        inputLatex: 'x^2=4',
        resultDocument: {
          version: 1,
          outcomeKind: 'success',
          title: 'Equation Solution',
          primaryMath: { canonicalLatex: 'x=\\pm 2' },
          details: [{
            title: 'Verification',
            lines: [[
              { kind: 'text', text: 'Substitute ' },
              { kind: 'math', math: { canonicalLatex: 'x=2' } },
            ]],
          }],
          warnings: ['Both roots were verified.'],
        },
        timestamp: '2026-07-12T00:00:00Z',
      });
    });

    expect(hook.result.current.displayOutcome).toMatchObject({
      kind: 'success',
      canonicalResult: {
        title: 'Equation Solution',
        primaryMath: canonicalMathValue('x=\\pm 2'),
        details: [{ title: 'Verification' }],
        warnings: ['Both roots were verified.'],
      },
    });
  });
});
