import { describe, expect, it } from 'vitest';
import type { PlannerOutcome } from '../../types/calculator';
import {
  classifyCalculateRuntimeAdvisories,
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

  it('classifies calculate unsupported errors without widening controller behavior', () => {
    expect(classifyCalculateRuntimeAdvisories({
      error: 'Expression action is not supported by the shared runtime host.',
    })).toStrictEqual({
      stopReason: {
        kind: 'unsupported-family',
        source: 'host',
      },
    });
  });
});
