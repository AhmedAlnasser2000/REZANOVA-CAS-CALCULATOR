import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type {
  CalculateScreen,
  DisplayOutcome,
  HistoryEntry,
  ModeId,
} from '../../types/calculator';
import {
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
} from '../../lib/calculus/calculus-workbench';
import {
  buildCalculateRuntimeOoeInputRevisionId,
  runCalculateRuntimeWithOoePilot,
} from '../../lib/modes/calculate';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import { useCalculateRuntime } from './useCalculateRuntime';

vi.mock('../../lib/modes/calculate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/calculate')>();
  return {
    ...actual,
    runCalculateRuntimeWithOoePilot: vi.fn(),
  };
});

function calculatePayload(title = 'Calculate'): DisplayOutcome {
  return {
    kind: 'success',
    title,
    exactLatex: '4',
    warnings: [],
  };
}

function calculateEnvelope(
  legality: 'commitAllowed' | 'staleDrop' | 'cancelled',
  payload = calculatePayload(),
) {
  const job = {
    jobId: 'job.calculate.test',
    planId: 'plan.calculate.test',
    capabilityId: 'expression.evaluate',
    hostId: 'calculate-worker-runtime',
    nodeId: 'node.calculate.test',
    phaseId: 'expression.evaluate',
    inputRevisionId: 'input.calculate.test',
  };
  return {
    payload,
    ooe: {
      completion: legality === 'cancelled'
        ? {
            kind: 'cancelled',
            reason: 'Calculate stopped before it finished.',
          }
        : undefined,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.calculate.stale',
        commitPolicy: 'commitLatestOnly',
        legality: legality === 'cancelled' ? 'notApplicable' : legality,
        commitDecision: legality === 'commitAllowed'
          ? 'committed'
          : legality === 'staleDrop'
            ? 'staleDropped'
            : 'notApplicable',
        resultStability: legality === 'commitAllowed' ? 'stable' : 'stale',
      },
    },
  } as Awaited<ReturnType<typeof runCalculateRuntimeWithOoePilot>>;
}

function renderCalculateRuntime(
  initialProps: {
    currentMode?: ModeId;
    isLauncherOpen?: boolean;
  } = {},
) {
  const calculateScreenRef = {
    current: 'standard',
  } as MutableRefObject<CalculateScreen>;
  const currentModeRef = {
    current: initialProps.currentMode ?? 'calculate',
  } as MutableRefObject<ModeId>;
  const commitOutcome = vi.fn();
  const discardHistoryTicket = vi.fn();
  const openCalculusScreen = vi.fn();
  const openLegacyCalculateCalculusInCalculus = vi.fn(() => false);
  const reserveHistoryTicket = vi.fn((): PendingHistoryTicketReservation | null => null);
  const setDisplayOutcome = vi.fn();
  const setMode = vi.fn();
  const setRuntimeStatusOverride = vi.fn();
  const startTransition = vi.fn((callback: () => void) => callback());

  const hook = renderHook(
    (props: { currentMode: ModeId; isLauncherOpen: boolean }) => {
      currentModeRef.current = props.currentMode;
      const derivativeFieldRef = useRef(null);
      const derivativePointFieldRef = useRef(null);
      const derivativePointValueRef = useRef(null);
      const [derivativeWorkbench, setDerivativeWorkbench] = useState(
        DEFAULT_DERIVATIVE_WORKBENCH,
      );
      const [derivativePointWorkbench, setDerivativePointWorkbench] = useState(
        DEFAULT_DERIVATIVE_POINT_WORKBENCH,
      );

      return useCalculateRuntime({
        ansLatex: '0',
        calculateScreenRef,
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        derivativeFieldRef,
        derivativePointFieldRef,
        derivativePointValueRef,
        derivativeWorkbench,
        derivativePointWorkbench,
        discardHistoryTicket,
        isLauncherOpen: props.isLauncherOpen,
        openCalculusScreen,
        openLegacyCalculateCalculusInCalculus,
        reserveHistoryTicket,
        settings: {
          angleUnit: 'rad',
          outputStyle: 'exact',
        },
        setDerivativePointWorkbench,
        setDerivativeWorkbench,
        setDisplayOutcome,
        setMode,
        setRuntimeStatusOverride,
        startTransition,
        storedVariables: [],
      });
    },
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'calculate',
        isLauncherOpen: initialProps.isLauncherOpen ?? false,
      },
    },
  );

  return {
    calculateScreenRef,
    commitOutcome,
    discardHistoryTicket,
    hook,
    openCalculusScreen,
    openLegacyCalculateCalculusInCalculus,
    reserveHistoryTicket,
    setDisplayOutcome,
    setMode,
    setRuntimeStatusOverride,
    startTransition,
  };
}

describe('useCalculateRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports empty Calculate workbench input before launching the runtime', () => {
    const { hook, setDisplayOutcome } = renderCalculateRuntime();

    act(() => {
      hook.result.current.openCalculateScreen('derivative');
    });
    act(() => {
      hook.result.current.runCalculateWorkbenchAction();
    });

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Derivative',
      error: 'Enter an expression in x before differentiating.',
      warnings: [],
    });
    expect(runCalculateRuntimeWithOoePilot).not.toHaveBeenCalled();
  });

  it('loads seeds, preserves the launcher screen ref, and resets current workbench state', () => {
    const { calculateScreenRef, hook } = renderCalculateRuntime();

    act(() => {
      hook.result.current.openCalculateScreen('integral');
      hook.result.current.applyCalculateSeed('integral', {
        bodyLatex: 'x^2',
        kind: 'definite',
        lower: '1',
        upper: '3',
      });
    });

    expect(calculateScreenRef.current).toBe('integral');
    expect(hook.result.current.integralWorkbench).toMatchObject({
      bodyLatex: 'x^2',
      kind: 'definite',
      lower: '1',
      upper: '3',
    });
    expect(hook.result.current.calculateWorkbenchExpression.latex)
      .toBe('\\int_{1}^{3} x^2\\,dx');

    act(() => {
      hook.result.current.resetCurrentCalculateScreen();
    });

    expect(hook.result.current.integralWorkbench).toMatchObject({
      bodyLatex: '',
      kind: 'definite',
      lower: '0',
      upper: '1',
    });
  });

  it('captures and restores Calculate surface state for workspace instances', () => {
    const { hook } = renderCalculateRuntime();

    act(() => {
      hook.result.current.setCalculateLatex('x+1');
      hook.result.current.openCalculateScreen('integral');
      hook.result.current.setIntegralWorkbench({
        kind: 'definite',
        bodyLatex: 'x',
        lower: '0',
        upper: '2',
      });
      hook.result.current.setDerivativeWorkbench({ bodyLatex: 'x^3' });
    });

    const snapshot = hook.result.current.captureCalculateSurfaceState();

    act(() => {
      hook.result.current.restoreCalculateSurfaceState(null);
    });
    expect(hook.result.current.calculateScreen).toBe('standard');
    expect(hook.result.current.derivativeWorkbench).toEqual(DEFAULT_DERIVATIVE_WORKBENCH);

    act(() => {
      hook.result.current.restoreCalculateSurfaceState(snapshot);
    });
    expect(hook.result.current.calculateLatex).toBe('x+1');
    expect(hook.result.current.calculateScreen).toBe('integral');
    expect(hook.result.current.integralWorkbench).toMatchObject({
      kind: 'definite',
      bodyLatex: 'x',
      lower: '0',
      upper: '2',
    });
    expect(hook.result.current.derivativeWorkbench.bodyLatex).toBe('x^3');
  });

  it('restores replay substitutions and passes them into the standard runtime request', async () => {
    vi.mocked(runCalculateRuntimeWithOoePilot).mockResolvedValue(
      calculateEnvelope('commitAllowed'),
    );
    const { hook } = renderCalculateRuntime();
    const entry = {
      id: 'history.calculate.variables',
      mode: 'calculate',
      inputLatex: 'a+1',
      resultLatex: '5',
      variableSubstitutions: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculateHistoryEntry(entry);
    });
    act(() => {
      hook.result.current.runCalculateAction('evaluate');
    });

    await waitFor(() => expect(runCalculateRuntimeWithOoePilot).toHaveBeenCalledTimes(1));

    const request = vi.mocked(runCalculateRuntimeWithOoePilot).mock.calls[0][0];
    expect(request).toMatchObject({
      kind: 'standard',
      request: {
        latex: 'a+1',
        variableSubstitutionSnapshot: [
          { name: 'a', valueLatex: '4', numericValue: 4 },
        ],
      },
    });
  });

  it('reserves a Calculate ticket and commits successful runtime payloads', async () => {
    const payload = calculatePayload('Numeric');
    vi.mocked(runCalculateRuntimeWithOoePilot).mockResolvedValue(
      calculateEnvelope('commitAllowed', payload),
    );
    const { commitOutcome, hook, reserveHistoryTicket } = renderCalculateRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.calculate.success',
      historyLaunchOrder: 41,
    });

    act(() => {
      hook.result.current.setCalculateLatex('2+2');
    });
    act(() => {
      hook.result.current.runCalculateAction('evaluate');
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const request = vi.mocked(runCalculateRuntimeWithOoePilot).mock.calls[0][0];
    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'calculate',
      inputLatex: '2+2',
      capabilityId: 'expression.evaluate',
      inputRevisionId: buildCalculateRuntimeOoeInputRevisionId(request),
      workspaceInstance: null,
    });
    expect(runCalculateRuntimeWithOoePilot).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        launchTicket: {
          id: 'ticket.calculate.success',
          historyLaunchOrder: 41,
        },
      }),
    );
    expect(commitOutcome).toHaveBeenCalledWith(
      payload,
      '2+2',
      'calculate',
      {
        historyTicketId: 'ticket.calculate.success',
        historyLaunchOrder: 41,
      },
    );
  });

  it('drops stale Calculate commits and discards the history ticket', async () => {
    vi.mocked(runCalculateRuntimeWithOoePilot).mockResolvedValue(
      calculateEnvelope('staleDrop'),
    );
    const {
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
    } = renderCalculateRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.calculate.stale',
      historyLaunchOrder: 42,
    });

    act(() => {
      hook.result.current.setCalculateLatex('1+1');
    });
    act(() => {
      hook.result.current.runCalculateAction('evaluate');
    });

    await waitFor(() =>
      expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.calculate.stale'));
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('drops cancelled Calculate work and reports stopped status', async () => {
    vi.mocked(runCalculateRuntimeWithOoePilot).mockResolvedValue(
      calculateEnvelope('cancelled'),
    );
    const {
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
      setRuntimeStatusOverride,
    } = renderCalculateRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.calculate.cancelled',
      historyLaunchOrder: 43,
    });

    act(() => {
      hook.result.current.setCalculateLatex('3+3');
    });
    act(() => {
      hook.result.current.runCalculateAction('evaluate');
    });

    await waitFor(() =>
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Calculate stopped'));

    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.calculate.cancelled');
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('routes guided Calculate menu entries through the supplied Calculus callback', () => {
    const {
      hook,
      openCalculusScreen,
      setMode,
    } = renderCalculateRuntime();

    act(() => {
      hook.result.current.openCalculateMenuEntry({
        id: 'calculus-derivative',
        hotkey: '1',
        label: 'Derivative',
        description: 'Open guided derivative.',
        target: {
          kind: 'calculus',
          screen: 'derivative',
        },
      });
    });

    expect(openCalculusScreen).toHaveBeenCalledWith('derivative');
    expect(setMode).toHaveBeenCalledWith('calculus');
  });
});
