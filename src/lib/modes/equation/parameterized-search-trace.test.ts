import { describe, expect, it } from 'vitest';

import { resolveEquationSolveTarget } from '../../equation/equation-target';
import { createEquationSelectedTargetSearchTrace } from '../../equation/equation-target-shape';
import { runParameterizedUnsupportedRoute } from './parameterized';

describe('Equation selected-target search trace', () => {
  it('records top-level profile skips and the winning family without changing the outcome', () => {
    const equationLatex = '\\ln\\left(z+a\\right)=b';
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'z'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'profile',
      phase: 'top-level',
    }));
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'top-level',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'exp-log',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'exp-log',
    });
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'profile',
      phase: 'generated-handoff',
    }));
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'linear',
    });
  });
});
