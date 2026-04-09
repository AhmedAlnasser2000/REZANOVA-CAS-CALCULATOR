import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from './runtime-envelope';

describe('runtime-envelope', () => {
  it('builds success and error outcomes without changing visible shape', () => {
    const success = buildRuntimeOutcome({
      title: 'Numeric',
      exactLatex: '2+2=4',
      approxText: '4',
      warnings: [],
      resultOrigin: 'symbolic-engine',
    });
    const error = buildRuntimeOutcome({
      title: 'Solve',
      error: 'Enter an equation containing x.',
      warnings: [],
    });

    expect(success).toEqual({
      kind: 'success',
      title: 'Numeric',
      exactLatex: '2+2=4',
      exactSupplementLatex: undefined,
      approxText: '4',
      warnings: [],
      resultOrigin: 'symbolic-engine',
      runtimeAdvisories: undefined,
    });
    expect(error).toEqual({
      kind: 'error',
      title: 'Solve',
      error: 'Enter an equation containing x.',
      warnings: [],
      exactLatex: undefined,
      exactSupplementLatex: undefined,
      approxText: undefined,
      runtimeAdvisories: undefined,
    });
  });

  it('replaces planner badges for calculate-style callers', () => {
    const outcome = attachRuntimeEnvelope(
      {
        kind: 'success',
        title: 'Numeric',
        exactLatex: '4',
        warnings: [],
      },
      {
        originalLatex: '2+2',
        resolvedLatex: '2+2',
        plannerBadges: [],
        plannerBadgeMode: 'replace',
      },
    );

    expect(outcome).toEqual({
      kind: 'success',
      title: 'Numeric',
      exactLatex: '4',
      exactSupplementLatex: undefined,
      warnings: [],
      resolvedInputLatex: undefined,
      plannerBadges: [],
      runtimeAdvisories: undefined,
    });
  });

  it('merges planner badges and runtime advisories for equation-style callers', () => {
    const outcome: DisplayOutcome = {
      kind: 'error',
      title: 'Solve',
      error: 'No real solution.',
      warnings: [],
      plannerBadges: ['Hard Stop'],
    };

    const enveloped = attachRuntimeEnvelope(outcome, {
      originalLatex: 'sin(x)=2',
      resolvedLatex: 'sin(x)=2',
      plannerBadges: ['Canonicalized'],
      plannerBadgeMode: 'merge',
      runtimeAdvisories: {
        equationNumericSolve: { kind: 'blocked', reason: 'range-guard' },
      },
    });

    expect(enveloped).toEqual({
      kind: 'error',
      title: 'Solve',
      error: 'No real solution.',
      warnings: [],
      plannerBadges: ['Canonicalized', 'Hard Stop'],
      resolvedInputLatex: undefined,
      runtimeAdvisories: {
        equationNumericSolve: { kind: 'blocked', reason: 'range-guard' },
      },
    });
  });
});
