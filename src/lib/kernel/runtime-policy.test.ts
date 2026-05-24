import { describe, expect, it } from 'vitest';
import type { PlannerOutcome } from '../../types/calculator';
import {
  classifyCalculateRuntimeAdvisories,
  classifyEquationRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from './runtime-policy';

describe('runtime-policy', () => {
  it('maps planner blocked results to planner-hard-stop', () => {
    const planner: PlannerOutcome = {
      kind: 'blocked',
      originalLatex: '\\int x\\,dx+x=3',
      canonicalLatex: '\\int x\\,dx+x=3',
      badges: ['Hard Stop'],
      steps: [],
      error: 'This indefinite integral is outside the supported symbolic rules.',
    };

    expect(classifyPlannerBlockedRuntimeAdvisories(planner, 'calculate')).toEqual({
      stopReason: {
        kind: 'planner-hard-stop',
        source: 'planner',
      },
    });
    expect(classifyPlannerBlockedRuntimeAdvisories(planner, 'equation')).toEqual({
      stopReason: {
        kind: 'planner-hard-stop',
        source: 'planner',
      },
      equationNumericSolve: {
        kind: 'blocked',
        reason: 'invalid-request',
      },
    });
  });

  it('maps invalid symbolic equation requests to invalid-request', () => {
    expect(classifyEquationRuntimeAdvisories({
      invalidRequest: true,
      outcome: {
        kind: 'error',
        title: 'Solve',
        error: 'Enter an equation containing x.',
        warnings: [],
      },
    })).toEqual({
      stopReason: {
        kind: 'invalid-request',
        source: 'host',
      },
      equationNumericSolve: {
        kind: 'blocked',
        reason: 'invalid-request',
      },
    });
  });

  it('maps range guard errors to the shared range-guard stop reason', () => {
    expect(classifyEquationRuntimeAdvisories({
      outcome: {
        kind: 'error',
        title: 'Solve',
        error: 'No real solution.',
        warnings: [],
        solveBadges: ['Range Guard'],
      },
    })).toEqual({
      stopReason: {
        kind: 'range-guard',
        source: 'stage',
      },
      equationNumericSolve: {
        kind: 'blocked',
        reason: 'range-guard',
      },
    });
  });

  it('maps bounded unsupported symbolic families to unsupported-family', () => {
    expect(classifyEquationRuntimeAdvisories({
      outcome: {
        kind: 'error',
        title: 'Solve',
        error: 'This equation is outside the supported exact symbolic solve families.',
        warnings: [],
      },
    })).toEqual({
      stopReason: {
        kind: 'unsupported-family',
        source: 'stage',
      },
      equationNumericSolve: {
        kind: 'suggest-on-error',
      },
    });
  });

  it('classifies calculate unsupported errors without widening controller behavior', () => {
    expect(classifyCalculateRuntimeAdvisories({
      error: 'Expression action is not supported by the shared runtime host.',
    })).toEqual({
      stopReason: {
        kind: 'unsupported-family',
        source: 'host',
      },
    });
  });
});
