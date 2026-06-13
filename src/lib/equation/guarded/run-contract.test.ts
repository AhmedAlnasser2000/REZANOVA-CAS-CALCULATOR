import { describe, expect, it } from 'vitest';
import { baseEquationSolveRequest as request } from '../test-support/equation-request';
import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  listGuardedEquationStageDescriptors,
  runGuardedEquationSolve,
  runGuardedEquationSolveWithStageOrder,
  runGuardedEquationSolveWithStageOrderAsync,
} from '../guarded-solve';

describe('runGuardedEquationSolve contract', () => {
  it('keeps the guarded equation stage host order stable with direct symbolic as the terminal stage', () => {
    expect(listGuardedEquationStageDescriptors().map((stage) => stage.id)).toEqual([
      'numeric-interval',
      'bounded-polynomial',
      'algebra-transform',
      'composition',
      'direct-trig',
      'rewrite-trig',
      'substitution',
      'direct-symbolic',
    ]);
  });

  it('replays the baseline stage order without changing the default guarded outcome', () => {
    const baselineOrder = listGuardedEquationStageDescriptors().map((stage) => stage.id);
    const direct = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
    });
    const replayed = runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
        resolvedLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
      },
      baselineOrder,
    );

    expect(replayed.outcome).toMatchObject({
      kind: direct.kind,
      exactLatex: direct.kind === 'prompt' ? undefined : direct.exactLatex,
      solveSummaryText: direct.kind === 'prompt' ? undefined : direct.solveSummaryText,
    });
    expect(replayed.trace.winningStageId).toBeDefined();
    expect(replayed.trace.attempts.some((attempt) => attempt.depth === 0 && attempt.returnedOutcome)).toBe(true);
  });

  it('rejects custom stage orders with missing or duplicate guarded stages', () => {
    expect(() => runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
        resolvedLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      },
      [
        'numeric-interval',
        'bounded-polynomial',
        'composition',
        'algebra-transform',
        'substitution',
        'direct-trig',
        'rewrite-trig',
      ],
    )).toThrow(/exact permutation/i);

    expect(() => runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
        resolvedLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      },
      [
        'numeric-interval',
        'bounded-polynomial',
        'composition',
        'composition',
        'substitution',
        'direct-trig',
        'rewrite-trig',
        'direct-symbolic',
      ],
    )).toThrow(/duplicate/i);
  });

  it('reuses the chosen custom stage order in recursive solves and records trace depth', () => {
    const customOrder = [
      'numeric-interval',
      'bounded-polynomial',
      'composition',
      'algebra-transform',
      'substitution',
      'direct-trig',
      'rewrite-trig',
      'direct-symbolic',
    ] as const;

    const replayed = runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
        resolvedLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
      },
      [...customOrder],
    );

    const depthOneAttempts = replayed.trace.attempts.filter((attempt) => attempt.depth === 1);
    expect(depthOneAttempts.length).toBeGreaterThan(0);
    expect(depthOneAttempts[0]?.stageId).toBe(customOrder[0]);
  });

  it('cancels before a guarded stage when the control asks to stop', () => {
    let checkpointCount = 0;
    const result = runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: 'x^2-5x+6=0',
        resolvedLatex: 'x^2-5x+6=0',
      },
      listGuardedEquationStageDescriptors().map((stage) => stage.id),
      {
        control: {
          checkpoint: () => {
            checkpointCount += 1;
          },
          shouldCancel: () => true,
        },
      },
    );

    expect(result.outcome.kind).toBe('error');
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected cancellation outcome');
    }
    expect(result.outcome.error).toBe(EQUATION_SOLVE_CANCELLED_MESSAGE);
    expect(result.trace.attempts).toEqual([]);
    expect(result.trace.winningStageId).toBeUndefined();
    expect(result.trace.cancellation).toMatchObject({
      depth: 0,
      stageId: 'numeric-interval',
      phase: 'before-stage',
      reason: EQUATION_SOLVE_CANCELLED_MESSAGE,
    });
    expect(checkpointCount).toBe(1);
  });

  it('cancels before a recursive guarded-solve handoff', () => {
    let latestCheckpoint = '';
    const result = runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
        resolvedLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
      },
      listGuardedEquationStageDescriptors().map((stage) => stage.id),
      {
        control: {
          checkpoint: (message) => {
            latestCheckpoint = message;
          },
          shouldCancel: () => latestCheckpoint.includes('before-recursive-handoff'),
        },
      },
    );

    expect(result.outcome.kind).toBe('error');
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected cancellation outcome');
    }
    expect(result.outcome.error).toBe(EQUATION_SOLVE_CANCELLED_MESSAGE);
    expect(result.trace.winningStageId).toBeUndefined();
    expect(result.trace.cancellation).toMatchObject({
      depth: 0,
      stageId: 'composition',
      phase: 'before-recursive-handoff',
    });
  });

  it('cancels before direct symbolic fallback', () => {
    let latestCheckpoint = '';
    const result = runGuardedEquationSolveWithStageOrder(
      {
        ...request,
        originalLatex: '\\sin\\left(x\\right)+x=1',
        resolvedLatex: '\\sin\\left(x\\right)+x=1',
      },
      listGuardedEquationStageDescriptors().map((stage) => stage.id),
      {
        control: {
          checkpoint: (message) => {
            latestCheckpoint = message;
          },
          shouldCancel: () => latestCheckpoint.includes('before-direct-symbolic'),
        },
      },
    );

    expect(result.outcome.kind).toBe('error');
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected cancellation outcome');
    }
    expect(result.outcome.error).toBe(EQUATION_SOLVE_CANCELLED_MESSAGE);
    expect(result.trace.cancellation).toMatchObject({
      depth: 0,
      stageId: 'direct-symbolic',
      phase: 'before-direct-symbolic',
    });
    expect(result.trace.winningStageId).toBeUndefined();
  });

  it('cancels during async substitution branch work with helper evidence', async () => {
    let shouldCancel = false;
    const checkpoints: string[] = [];
    const result = await runGuardedEquationSolveWithStageOrderAsync(
      {
        ...request,
        originalLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
        resolvedLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
      },
      listGuardedEquationStageDescriptors().map((stage) => stage.id),
      {
        control: {
          checkpoint: (message) => {
            checkpoints.push(message);
          },
          shouldCancel: () => shouldCancel,
          yieldIfBudgetExceeded: async (message) => {
            if (message?.includes('helper substitution')) {
              shouldCancel = true;
            }
          },
        },
      },
    );

    expect(result.outcome.kind).toBe('error');
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected cancellation outcome');
    }
    expect(result.outcome.error).toBe(EQUATION_SOLVE_CANCELLED_MESSAGE);
    expect(result.trace.cancellation).toMatchObject({
      depth: 0,
      stageId: 'substitution',
      phase: 'helper-yield',
      helperId: 'substitution',
      branchIndex: 0,
    });
    expect(checkpoints.some((message) => message.includes('helper substitution'))).toBe(true);
    expect(result.trace.winningStageId).toBeUndefined();
  });
});
