import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { createCalculateRuntimeController } from './runtimeControllers';
import { createCanonicalRuntimeError } from '../../lib/result-contract';

function createCommitOutcomeSpy() {
  return vi.fn<
    (outcome: CanonicalRuntimeOutcome, inputLatex: string, mode: 'calculate' | 'equation', replayContext?: Record<string, unknown>) => void
  >();
}

async function waitForCommit(commitOutcome: ReturnType<typeof createCommitOutcomeSpy>) {
  await vi.waitFor(() => {
    expect(commitOutcome).toHaveBeenCalled();
  }, { timeout: 5_000 });
}

describe('runtimeControllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a workbench-specific calculate error before execution when generated input is blank', () => {
    const setDisplayOutcome = vi.fn<(outcome: CanonicalRuntimeOutcome) => void>();
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

    expect(setDisplayOutcome).toHaveBeenCalledWith(createCanonicalRuntimeError(
      'Derivative',
      'Enter an expression in x before differentiating.',
    ));
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
    expect(outcome.kind === 'prompt' ? outcome.title : outcome.canonicalResult.title).toBe('Derivative');
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
    if (outcome.canonicalResult.version !== 1) {
      throw new Error('Expected the untouched Calculate producer to remain V1');
    }
    expect(outcome.canonicalResult.metadata?.variableSubstitutions).toEqual([
      { name: 'c', value: { canonicalLatex: '4' }, numericValue: 4 },
    ]);
    expect(outcome.canonicalResult.primaryMath?.canonicalLatex).toContain('x^2');
  });
});
