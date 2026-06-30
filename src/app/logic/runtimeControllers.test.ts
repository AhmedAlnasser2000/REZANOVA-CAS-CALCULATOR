import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import {
  createCalculateRuntimeController,
  createEquationRuntimeController,
} from './runtimeControllers';
import { runEquationModeWithOoePilot } from '../../lib/modes/equation';

vi.mock('../../lib/modes/equation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/equation')>();
  return {
    ...actual,
    runEquationModeWithOoePilot: vi.fn(actual.runEquationModeWithOoePilot),
  };
});

function createCommitOutcomeSpy() {
  return vi.fn<
    (outcome: DisplayOutcome, inputLatex: string, mode: 'calculate' | 'equation', replayContext?: Record<string, unknown>) => void
  >();
}

async function waitForCommit(commitOutcome: ReturnType<typeof createCommitOutcomeSpy>) {
  await vi.waitFor(() => {
    expect(commitOutcome).toHaveBeenCalled();
  }, { timeout: 5_000 });
}

function cancelledEquationEnvelope(): Awaited<ReturnType<typeof runEquationModeWithOoePilot>> {
  const job = {
    jobId: 'job.equation.solve.cancelled',
    planId: 'plan.equation.solve',
    capabilityId: 'equation.solve',
    hostId: 'equation-worker-runtime',
    nodeId: 'node.equation.solve',
    phaseId: 'equation.solve',
    inputRevisionId: 'input.equation.solve.cancelled',
  };
  return {
    payload: {
      kind: 'error',
      title: 'Solve',
      error: 'Equation solve was stopped before it finished.',
      warnings: [],
    },
    ooe: {
      planId: 'plan.equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-worker-runtime',
      nodeId: 'node.equation.solve',
      phaseId: 'equation.solve',
      status: {
        kind: 'ready',
        planId: 'plan.equation.solve',
      },
      completion: {
        kind: 'cancelled',
        reason: 'Equation solve was stopped before it finished.',
      },
      job,
      commitAssessment: {
        job,
        activeInputRevisionId: job.inputRevisionId,
        commitPolicy: 'commitLatestOnly',
        legality: 'notApplicable',
        commitDecision: 'notApplicable',
        resultStability: 'stale',
      },
      stageOrder: [],
      guardedTrace: {
        attempts: [],
        cancellation: {
          depth: 0,
          stageId: 'numeric-interval',
          phase: 'before-stage',
          reason: 'Equation solve was stopped before it finished.',
        },
      },
      traceEvents: [],
    },
  };
}

describe('runtimeControllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a workbench-specific calculate error before execution when generated input is blank', () => {
    const setDisplayOutcome = vi.fn<(outcome: DisplayOutcome) => void>();
    const controller = createCalculateRuntimeController({
      calculateLatex: '',
      calculateScreen: 'derivative',
      calculateRouteMeta: {
        screen: 'derivative',
        label: 'Derivative',
        breadcrumb: ['Calculate', 'Derivative'],
        description: '',
        helpText: '',
        focusTarget: 'body',
      },
      calculateWorkbenchExpression: { latex: '' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: true,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [],
      startTransition: (callback) => callback(),
      setDisplayOutcome,
      commitOutcome: createCommitOutcomeSpy(),
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateWorkbenchAction();

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Derivative',
      error: 'Enter an expression in x before differentiating.',
      warnings: [],
    });
  });

  it('commits only the visible outcome through the standard Calculate OOE pilot', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createCalculateRuntimeController({
      calculateLatex: '2+2',
      calculateScreen: 'standard',
      calculateRouteMeta: null,
      calculateWorkbenchExpression: { latex: '' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: false,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [],
      startTransition: (callback) => callback(),
      setDisplayOutcome: vi.fn(),
      commitOutcome,
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateAction('evaluate');

    await waitForCommit(commitOutcome);
    const [outcome, inputLatex, mode, replayContext] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('2+2');
    expect(mode).toBe('calculate');
    expect(replayContext).toBeUndefined();
    expect(outcome.kind).toBe('success');
  });

  it('skips stale standard Calculate commits and preserves replay substitution snapshots', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const clearCalculateReplayVariableSubstitutions = vi.fn();
    const discardHistoryTicket = vi.fn();
    const controller = createCalculateRuntimeController({
      calculateLatex: 'a+1',
      calculateScreen: 'standard',
      calculateRouteMeta: null,
      calculateWorkbenchExpression: { latex: '' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: false,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      calculateReplayVariableSubstitutions: {
        inputLatex: 'a+1',
        substitutions: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      },
      clearCalculateReplayVariableSubstitutions,
      startTransition: (callback) => callback(),
      setDisplayOutcome: vi.fn(),
      commitOutcome,
      retitleOutcome: (outcome) => outcome,
      reserveHistoryTicket: () => ({
        id: 'ticket-calculate-stale',
        historyLaunchOrder: 11,
      }),
      discardHistoryTicket,
      getActiveCalculateRuntimeRequest: (route) => route.kind === 'standard'
        ? {
            kind: 'standard',
            request: {
              action: route.action,
              latex: 'a+2',
              angleUnit: 'deg',
              outputStyle: 'both',
              ansLatex: '0',
              calculateScreen: 'standard',
              storedVariables: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
            },
          }
        : null,
    });

    controller.runCalculateAction('evaluate');

    await vi.waitFor(() => {
      expect(discardHistoryTicket).toHaveBeenCalledWith('ticket-calculate-stale');
    }, { timeout: 5_000 });
    expect(commitOutcome).not.toHaveBeenCalled();
    expect(clearCalculateReplayVariableSubstitutions).not.toHaveBeenCalled();
  });

  it('runs calculate workbench routes through the Calculate runtime branch', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createCalculateRuntimeController({
      calculateLatex: '',
      calculateScreen: 'derivative',
      calculateRouteMeta: {
        screen: 'derivative',
        label: 'Derivative',
        breadcrumb: ['Calculate', 'Derivative'],
        description: '',
        helpText: '',
        focusTarget: 'body',
      },
      calculateWorkbenchExpression: { latex: '\\frac{d}{dx}\\left(x^2\\right)' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: true,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [],
      startTransition: (callback) => callback(),
      setDisplayOutcome: vi.fn(),
      commitOutcome,
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateWorkbenchAction();

    await waitForCommit(commitOutcome);
    const [outcome, inputLatex, mode] = commitOutcome.mock.calls[0];
    expect(outcome.title).toBe('Derivative');
    expect(inputLatex).toBe('\\frac{d}{dx}\\left(x^2\\right)');
    expect(mode).toBe('calculate');
  });

  it('runs calculate algebra transforms through the Calculate runtime branch', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createCalculateRuntimeController({
      calculateLatex: 'x+0',
      calculateScreen: 'standard',
      calculateRouteMeta: null,
      calculateWorkbenchExpression: { latex: '' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: false,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [],
      startTransition: (callback) => callback(),
      setDisplayOutcome: vi.fn(),
      commitOutcome,
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateAlgebraTransformAction('cancelFactors');

    await waitForCommit(commitOutcome);
    const [, inputLatex, mode] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('x+0');
    expect(mode).toBe('calculate');
  });

  it('runs generated derivative workbench input with derivative substitution policy', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createCalculateRuntimeController({
      calculateLatex: '',
      calculateScreen: 'derivative',
      calculateRouteMeta: {
        screen: 'derivative',
        label: 'Derivative',
        breadcrumb: ['Calculate', 'Derivative'],
        description: '',
        helpText: '',
        focusTarget: 'body',
      },
      calculateWorkbenchExpression: { latex: '\\frac{d}{df}\\left(cx+4fx^2\\right)' },
      integralWorkbench: { kind: 'indefinite', bodyLatex: '', lower: '', upper: '' },
      limitWorkbench: { bodyLatex: '', target: '', direction: 'two-sided', targetKind: 'finite' },
      isCalculateToolOpen: true,
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      ansLatex: '0',
      variableMemory: [
        { name: 'c', valueLatex: '4', numericValue: 4 },
        { name: 'f', valueLatex: '2', numericValue: 2 },
      ],
      startTransition: (callback) => callback(),
      setDisplayOutcome: vi.fn(),
      commitOutcome,
      retitleOutcome: (outcome) => outcome,
    });

    controller.runCalculateWorkbenchAction();

    await waitForCommit(commitOutcome);

    const [outcome, inputLatex] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('\\frac{d}{df}\\left(cx+4fx^2\\right)');
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(outcome.variableSubstitutions).toEqual([
      { name: 'c', valueLatex: '4', numericValue: 4 },
    ]);
    expect(outcome.exactLatex).toContain('x^2');
  });

  it('opens prompt targets only for equation prompts', () => {
    const switchToEquationWithLatex = vi.fn<(latex: string) => void>();
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x=1',
      equationInputLatex: 'x=1',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: {
        kind: 'prompt',
        title: 'Calculate',
        message: 'Use Equation mode to solve this expression.',
        targetMode: 'equation',
        carryLatex: 'x^2=1',
        warnings: [],
      },
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome: createCommitOutcomeSpy(),
      switchToEquationWithLatex,
      isSimultaneousEquationScreen: () => false,
    });

    controller.openPromptTarget();

    expect(switchToEquationWithLatex).toHaveBeenCalledWith('x^2=1');
  });

  it('commits the same visible outcome through the Equation OOE symbolic pilot', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x^2-5x+6=0',
      equationInputLatex: 'x^2-5x+6=0',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: {
        angleUnit: 'deg',
        outputStyle: 'both',
        equationDomainIntent: 'complex',
        complexExactForm: 'cis',
      },
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAction();

    await waitForCommit(commitOutcome);
    const [outcome, inputLatex, mode, replayContext] = commitOutcome.mock.calls[0];
    expect(runEquationModeWithOoePilot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        equationAnswerMode: 'exact',
        equationDomainIntent: 'complex',
        complexExactForm: 'cis',
      }),
      expect.any(Object),
    );
    expect(inputLatex).toBe('x^2-5x+6=0');
    expect(mode).toBe('equation');
    expect(replayContext).toEqual({
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });
    expect(outcome.kind).toBe('success');
  });

  it('launches symbolic Equation from the live editor snapshot when React state is stale', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const liveSnapshot = {
      equationLatex: 'x^2-5x+6=0',
      equationInputLatex: 'x^2-5x+6=0',
    };
    const reserveHistoryTicket = vi.fn(() => ({
      id: 'ticket.equation.live',
      historyLaunchOrder: 42,
    }));
    const getActiveEquationRequest = vi.fn(() => ({
      equationScreen: 'symbolic' as const,
      equationLatex: liveSnapshot.equationLatex,
      equationSolveTarget: undefined,
      equationAnswerMode: 'exact' as const,
      equationDomainIntent: 'real' as const,
      complexExactForm: 'rectangular' as const,
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      angleUnit: 'deg' as const,
      outputStyle: 'both' as const,
      ansLatex: '0',
      storedVariables: [],
    }));
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: '',
      equationInputLatex: '',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      reserveHistoryTicket,
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
      getLiveEquationSnapshot: () => liveSnapshot,
      getActiveEquationRequest,
    });

    controller.runEquationAction();

    await waitForCommit(commitOutcome);
    expect(getActiveEquationRequest).toHaveBeenCalledWith('symbolic');
    expect(runEquationModeWithOoePilot).toHaveBeenLastCalledWith(
      expect.objectContaining({ equationLatex: liveSnapshot.equationLatex }),
      expect.objectContaining({
        activeInputRevisionId: expect.any(Function),
        launchTicket: {
          id: 'ticket.equation.live',
          historyLaunchOrder: 42,
        },
      }),
    );
    expect(reserveHistoryTicket).toHaveBeenCalledWith(expect.objectContaining({
      inputLatex: liveSnapshot.equationInputLatex,
      capabilityId: 'equation.solve',
    }));
    const [, inputLatex, mode, replayContext] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe(liveSnapshot.equationInputLatex);
    expect(mode).toBe('equation');
    expect(replayContext).toMatchObject({
      historyTicketId: 'ticket.equation.live',
      historyLaunchOrder: 42,
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
    });
  });

  it('reserves and finalizes Equation History tickets with launch-order context', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const reserveHistoryTicket = vi.fn(() => ({
      id: 'ticket.equation.1',
      historyLaunchOrder: 9001,
    }));
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x^2-5x+6=0',
      equationInputLatex: 'x^2-5x+6=0',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      reserveHistoryTicket,
      shouldCommitVisibleEquationOutcome: () => false,
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAction();

    await waitForCommit(commitOutcome);
    expect(reserveHistoryTicket).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'equation',
      inputLatex: 'x^2-5x+6=0',
      capabilityId: 'equation.solve',
      inputRevisionId: expect.stringMatching(/^input\.equation\.solve\./u),
    }));
    expect(runEquationModeWithOoePilot).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        launchTicket: {
          id: 'ticket.equation.1',
          historyLaunchOrder: 9001,
        },
      }),
    );
    expect(commitOutcome.mock.calls[0][3]).toMatchObject({
      historyTicketId: 'ticket.equation.1',
      historyLaunchOrder: 9001,
      suppressDisplayCommit: true,
      equationAnswerMode: 'exact',
    });
  });

  it('skips stale symbolic Equation OOE commits', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const discardHistoryTicket = vi.fn();
    const getActiveEquationRequest = vi.fn(() => ({
      equationScreen: 'symbolic' as const,
      equationLatex: 'x^2-5x+7=0',
      equationSolveTarget: undefined,
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      angleUnit: 'deg' as const,
      outputStyle: 'both' as const,
      ansLatex: '0',
      storedVariables: [],
    }));
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x^2-5x+6=0',
      equationInputLatex: 'x^2-5x+6=0',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      reserveHistoryTicket: () => ({
        id: 'ticket.equation.stale',
        historyLaunchOrder: 11,
      }),
      discardHistoryTicket,
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
      getActiveEquationRequest,
    });

    controller.runEquationAction();

    await vi.waitFor(() => {
      expect(getActiveEquationRequest).toHaveBeenCalledWith('symbolic');
    }, { timeout: 5_000 });
    expect(commitOutcome).not.toHaveBeenCalled();
    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.equation.stale');
  });

  it('reports cancelled symbolic Equation envelopes without committing or clearing replay state', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const clearReplayVariableSubstitutions = vi.fn();
    const discardHistoryTicket = vi.fn();
    const setRuntimeStatusOverride = vi.fn<(message: string) => void>();
    vi.mocked(runEquationModeWithOoePilot).mockResolvedValueOnce(cancelledEquationEnvelope());
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x^2-5x+6=0',
      equationInputLatex: 'x^2-5x+6=0',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: false, start: '0', end: '1', subdivisions: 10 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      replayVariableSubstitutions: {
        mode: 'equation',
        inputLatex: 'x^2-5x+6=0',
        substitutions: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      },
      clearReplayVariableSubstitutions,
      setRuntimeStatusOverride,
      reserveHistoryTicket: () => ({
        id: 'ticket.equation.cancelled',
        historyLaunchOrder: 12,
      }),
      discardHistoryTicket,
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAction();

    await vi.waitFor(() => {
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Equation solve stopped');
    }, { timeout: 5_000 });
    expect(commitOutcome).not.toHaveBeenCalled();
    expect(clearReplayVariableSubstitutions).not.toHaveBeenCalled();
    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.equation.cancelled');
  });

  it('routes the primary Equation action through the Equation OOE numeric pilot when the panel is visible', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationInputLatex: 'x+1=2',
      equationSolveTarget: 'x',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: true, start: '0', end: '3', subdivisions: 32 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [],
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
    });

    controller.runEquationAction();

    await waitForCommit(commitOutcome);
    const [outcome, inputLatex, mode, replayContext] = commitOutcome.mock.calls[0];
    expect(inputLatex).toBe('x+1=2');
    expect(mode).toBe('equation');
    expect(replayContext).toMatchObject({
      numericInterval: { start: '0', end: '3', subdivisions: 32 },
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(outcome.solutionKind).toBe('approximate-numeric');
  });

  it('skips stale Equation numeric OOE commits without clearing replay substitutions', async () => {
    const commitOutcome = createCommitOutcomeSpy();
    const clearReplayVariableSubstitutions = vi.fn();
    const getActiveEquationRequest = vi.fn(() => ({
      equationScreen: 'symbolic' as const,
      equationLatex: 'x+2=2',
      equationSolveTarget: 'x',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      angleUnit: 'deg' as const,
      outputStyle: 'both' as const,
      ansLatex: '0',
      numericInterval: { start: '0', end: '3', subdivisions: 32 },
      storedVariables: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      variableSubstitutionSnapshot: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
    }));
    const controller = createEquationRuntimeController({
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationInputLatex: 'x+1=2',
      equationSolveTarget: 'x',
      quadraticCoefficients: [1, 0, 0],
      cubicCoefficients: [1, 0, 0, 0],
      quarticCoefficients: [1, 0, 0, 0, 0],
      polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
      system2: [[0, 0, 0], [0, 0, 0]],
      system3: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      equationNumericSolvePanel: { enabled: true, start: '0', end: '3', subdivisions: 32 },
      currentMode: 'equation',
      displayOutcome: null,
      ansLatex: '0',
      settings: { angleUnit: 'deg', outputStyle: 'both' },
      variableMemory: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      replayVariableSubstitutions: {
        mode: 'equation',
        inputLatex: 'x+1=2',
        substitutions: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
      },
      clearReplayVariableSubstitutions,
      startTransition: (callback) => callback(),
      commitOutcome,
      switchToEquationWithLatex: vi.fn<(latex: string) => void>(),
      isSimultaneousEquationScreen: () => false,
      getActiveEquationRequest,
    });

    controller.runEquationNumericSolveAction();

    await vi.waitFor(() => {
      expect(getActiveEquationRequest).toHaveBeenCalledWith('numeric-interval');
    }, { timeout: 5_000 });
    expect(commitOutcome).not.toHaveBeenCalled();
    expect(clearReplayVariableSubstitutions).not.toHaveBeenCalled();
  });
});
