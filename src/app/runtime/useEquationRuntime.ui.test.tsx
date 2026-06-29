import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import type {
  HistoryEntry,
  ModeId,
  SettingsPatch,
  StoredVariableValue,
} from '../../types/calculator';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import { useEquationRuntime } from './useEquationRuntime';

function renderEquationRuntime(
  initialProps: {
    currentMode?: ModeId;
    replayVariableSubstitutions?: {
      mode: ModeId;
      inputLatex: string;
      substitutions: {
        name: string;
        valueLatex: string;
        numericValue: number;
      }[];
    } | null;
    mainFieldLatex?: string;
    storedVariables?: StoredVariableValue[];
  } = {},
) {
  const currentModeRef = {
    current: initialProps.currentMode ?? 'equation',
  };
  const commitOutcome = vi.fn();
  const discardHistoryTicket = vi.fn();
  const openGuideArticle = vi.fn();
  const openGuideMode = vi.fn();
  const openLauncher = vi.fn();
  const patchSettings = vi.fn();
  const reserveHistoryTicket = vi.fn((): PendingHistoryTicketReservation | null => null);
  const setDisplayOutcome = vi.fn();
  const setMode = vi.fn();
  const setRuntimeStatusOverride = vi.fn();
  const startTransition = vi.fn((callback: () => void) => callback());

  const hook = renderHook(
    (props: {
      currentMode: ModeId;
      replayVariableSubstitutions: typeof initialProps.replayVariableSubstitutions;
      mainFieldLatex?: string;
      storedVariables?: StoredVariableValue[];
    }) => {
      currentModeRef.current = props.currentMode;
      const mainFieldRef = useRef(null);
      const activeFieldRef = useRef(null);
      if (props.mainFieldLatex !== undefined) {
        mainFieldRef.current = {
          getValue: () => props.mainFieldLatex,
        } as never;
      }

      return useEquationRuntime({
        activeFieldRef,
        ansLatex: '0',
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        discardHistoryTicket,
        displayOutcome: null,
        editorAnalysisControl: {
          stopped: false,
          generation: 0,
          restartEditor: vi.fn(),
        },
        isLauncherOpen: false,
        mainFieldRef,
        openGuideArticle,
        openGuideMode,
        openLauncher,
        patchSettings: patchSettings as (patch: SettingsPatch) => void,
        replayVariableSubstitutions: props.replayVariableSubstitutions ?? null,
        reserveHistoryTicket,
        settings: {
          angleUnit: 'rad',
          outputStyle: 'exact',
          equationAnswerMode: 'exact',
          equationDomainIntent: 'real',
          complexExactForm: 'rectangular',
        },
        setDisplayOutcome,
        setMode,
        setRuntimeStatusOverride,
        startTransition,
        storedVariables: props.storedVariables ?? [],
        clearReplayVariableSubstitutions: vi.fn(),
      });
    },
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'equation',
        replayVariableSubstitutions: initialProps.replayVariableSubstitutions ?? null,
        mainFieldLatex: initialProps.mainFieldLatex,
        storedVariables: initialProps.storedVariables ?? [],
      },
    },
  );

  return {
    commitOutcome,
    discardHistoryTicket,
    hook,
    openLauncher,
    patchSettings,
    reserveHistoryTicket,
    setDisplayOutcome,
    setMode,
    setRuntimeStatusOverride,
    startTransition,
  };
}

function historyEntry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'history.test',
    mode: 'equation',
    inputLatex: 'x=1',
    resultLatex: 'x=1',
    timestamp: '2026-06-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('useEquationRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the prepare-only numeric action hidden from the Equation tray', () => {
    const { hook } = renderEquationRuntime({
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });

    act(() => {
      hook.result.current.switchToEquationWithLatex('z+a=5');
      hook.result.current.setEquationSolveTarget('z');
    });

    expect(hook.result.current.equationAlgebraTransforms).not.toContain('prepareNumericSolve');
  });

  it('moves Equation menu selection and opens selected route entries', () => {
    const { hook, setDisplayOutcome } = renderEquationRuntime();

    expect(hook.result.current.equationScreen).toBe('home');
    expect(hook.result.current.currentEquationMenuIndex).toBe(0);

    act(() => {
      hook.result.current.moveCurrentEquationMenuSelection(1);
    });
    expect(hook.result.current.currentEquationMenuIndex).toBe(1);

    act(() => {
      hook.result.current.openSelectedEquationMenuEntry();
    });
    expect(hook.result.current.equationScreen).toBe('polynomialMenu');
    expect(hook.result.current.currentEquationMenuIndex).toBe(0);

    act(() => {
      hook.result.current.moveCurrentEquationMenuSelection(2);
    });
    act(() => {
      hook.result.current.openSelectedEquationMenuEntry();
    });
    expect(hook.result.current.equationScreen).toBe('quartic');
    expect(setDisplayOutcome).toHaveBeenCalledWith(null);
  });

  it('persists polynomial, linear system, and polynomial-system form state', () => {
    const { hook } = renderEquationRuntime();

    act(() => {
      hook.result.current.openEquationScreen('quadratic');
      hook.result.current.equationWorkspaceProps.onSetPolynomialCoefficient('quadratic', 1, -7);
    });
    expect(hook.result.current.activePolynomialCoefficients).toEqual([1, -7, 6]);

    act(() => {
      hook.result.current.openEquationScreen('linear2');
      hook.result.current.equationWorkspaceProps.onSetSystemCell(2, 0, 1, 5);
    });
    expect(hook.result.current.system2[0][1]).toBe(5);

    act(() => {
      hook.result.current.openEquationScreen('polynomialSystem2');
      hook.result.current.equationWorkspaceProps.onSetPolynomialSystemEquation(0, 'x^2+y=1');
      hook.result.current.equationWorkspaceProps.onSetPolynomialSystemEquation(1, 'x-y=0');
    });
    expect(hook.result.current.polynomialSystem2Latex).toEqual(['x^2+y=1', 'x-y=0']);
    expect(hook.result.current.equationInputLatex).toBe('x^2+y=1\\quad;\\quadx-y=0');
  });

  it('captures and restores Equation surface state for workspace instances', () => {
    const { hook } = renderEquationRuntime();

    act(() => {
      hook.result.current.switchToEquationWithLatex('x^2=4', { openNumericSolve: true });
      hook.result.current.setEquationSolveTarget('x');
      hook.result.current.setEquationAlgebraTrayOpen(true);
    });

    const snapshot = hook.result.current.captureEquationSurfaceState();

    act(() => {
      hook.result.current.restoreEquationSurfaceState(null);
    });
    expect(hook.result.current.equationScreen).toBe('home');
    expect(hook.result.current.equationLatex).toBe('');

    act(() => {
      hook.result.current.restoreEquationSurfaceState(snapshot);
    });
    expect(hook.result.current.equationScreen).toBe('symbolic');
    expect(hook.result.current.equationLatex).toBe('x^2=4');
    expect(hook.result.current.equationSolveTarget).toBe('x');
    expect(hook.result.current.equationAlgebraTrayOpen).toBe(true);
    expect(hook.result.current.equationNumericSolvePanel.enabled).toBe(true);
  });

  it('builds active numeric solve requests from the live MathLive snapshot', () => {
    const { hook } = renderEquationRuntime({
      mainFieldLatex: 'x^2=4',
      replayVariableSubstitutions: {
        mode: 'equation',
        inputLatex: 'x^2=4',
        substitutions: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
      },
    });

    act(() => {
      hook.result.current.switchToEquationWithLatex('x=1');
      hook.result.current.equationWorkspaceProps.onSetNumericSolvePanelEnabled(true);
    });

    const request = hook.result.current.getActiveEquationRequest('numeric-interval');

    expect(request).toMatchObject({
      equationScreen: 'symbolic',
      equationLatex: 'x^2=4',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
      numericInterval: {
        start: '-10',
        end: '10',
        subdivisions: 256,
      },
      variableSubstitutionSnapshot: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });
  });

  it('restores Equation history replay settings, numeric interval, and polynomial coefficients', () => {
    const { hook, patchSettings } = renderEquationRuntime();

    act(() => {
      hook.result.current.restoreEquationHistoryEntry(historyEntry({
        inputLatex: 'x^2=4',
        numericInterval: { start: '-2', end: '2', subdivisions: 64 },
        equationDomainIntent: 'complex',
        complexExactForm: 'polar',
      }));
    });
    expect(hook.result.current.equationScreen).toBe('symbolic');
    expect(hook.result.current.equationNumericSolvePanel).toEqual({
      enabled: true,
      start: '-2',
      end: '2',
      subdivisions: 64,
    });
    expect(patchSettings).toHaveBeenLastCalledWith({
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
      complexExactForm: 'polar',
    });

    act(() => {
      hook.result.current.restoreEquationHistoryEntry(historyEntry({
        inputLatex: 'x^{2}-5x+6=0',
        resultLatex: 'x=2',
      }));
    });
    expect(hook.result.current.equationScreen).toBe('quadratic');
    expect(hook.result.current.activePolynomialCoefficients).toEqual([1, -5, 6]);
  });

  it('clears active drafts, resets current screens, and resets the full Equation runtime', () => {
    const { hook, openLauncher } = renderEquationRuntime();

    act(() => {
      hook.result.current.switchToEquationWithLatex('x=1');
      hook.result.current.setEquationSolveTarget('x');
    });
    act(() => {
      hook.result.current.clearActiveEquationDraft();
    });
    expect(hook.result.current.equationLatex).toBe('');
    expect(hook.result.current.equationSolveTarget).toBeNull();

    act(() => {
      hook.result.current.openEquationScreen('cubic');
      hook.result.current.equationWorkspaceProps.onSetPolynomialCoefficient('cubic', 2, 42);
    });
    act(() => {
      hook.result.current.resetCurrentEquationScreen();
    });
    expect(hook.result.current.activePolynomialCoefficients).toEqual([1, -6, 11, -6]);

    act(() => {
      hook.result.current.openEquationScreen('home');
    });
    act(() => {
      hook.result.current.goBackInEquation();
    });
    expect(openLauncher).toHaveBeenCalledTimes(1);

    act(() => {
      hook.result.current.openEquationScreen('linear2');
      hook.result.current.equationWorkspaceProps.onSetSystemCell(2, 0, 0, 9);
      hook.result.current.resetEquationRuntime();
    });
    expect(hook.result.current.equationScreen).toBe('home');
    expect(hook.result.current.system2).toEqual([
      [1, 1, 3],
      [2, -1, 0],
    ]);
  });
});
