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

  it('records special-form root attempts and success for pure power carriers', () => {
    const equationLatex = 'x^6-5x^3+4=y-y';
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'factorable-polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'special-form-roots',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'special-form-roots',
    });
  });

  it('records special-form root success for affine carrier quadratics', () => {
    const equationLatex = '(x+a)^6-5(x+a)^3+4=0';
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'special-form-roots',
    });
  });

  it('records special-form root success for symbolic carrier coefficients', () => {
    const equationLatex = 'x^6-a*x^3+b=0';
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'special-form-roots',
    });
  });

  it('records factorable success for symbolic common target-power factors', () => {
    const equationLatex = 'x^5-a*x^3=0';
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'factorable-polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'factorable-polynomial',
    });
  });

  it('records factorable success for symbolic factor patterns', () => {
    const cases = [
      '(x+c)^3-a*(x+c)^2=0',
      'x^3-a^3=0',
    ];

    for (const equationLatex of cases) {
      const trace = createEquationSelectedTargetSearchTrace();
      const outcome = runParameterizedUnsupportedRoute({
        equationLatex,
        answerMode: 'exact',
        equationDomainIntent: 'real',
        angleUnit: 'rad',
        outputStyle: 'both',
        complexExactForm: 'rectangular',
        targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
        plannerResolvedLatex: equationLatex,
        searchTrace: trace.record,
      });

      expect(outcome?.kind).toBe('success');
      expect(trace.events).toContainEqual({
        kind: 'family-success',
        phase: 'top-level',
        family: 'factorable-polynomial',
      });
    }
  });

  it('records cubic Cardano success after top-level rational clearing', () => {
    const equationLatex = String.raw`\frac{a*x^3+b*x^2+c*x+d}{x-m}=0`;
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    if (outcome?.kind !== 'success') {
      throw new Error('Expected rational Cardano success');
    }
    expect(outcome.detailSections?.some((section) =>
      section.title === 'Cubic Rational Normalization')).toBe(true);
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'rational',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'cubic-cardano',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'cubic-cardano',
    });
  });

  it('records top-level quartic Ferrari attempts and success', () => {
    const equationLatex = String.raw`a*z^4+b*z^3+c*z^2+d*z+f=0`;
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
    if (outcome?.kind !== 'success') {
      throw new Error('Expected top-level Ferrari success');
    }
    expect(outcome.detailSections?.some((section) =>
      section.title === 'Real Ferrari Definitions')).toBe(true);
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'quartic-ferrari',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'quartic-ferrari',
    });
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'family-stop',
      phase: 'top-level',
      family: 'cubic-cardano',
      details: { degree: 4, algorithm: 'ferrari', domain: 'real' },
    }));
  });

  it('records carrier-elimination attempts and success for algebraic carrier quadratics', () => {
    const equationLatex = '(x^2+a)^2-5(x^2+a)+4=0';
    const trace = createEquationSelectedTargetSearchTrace();
    const outcome = runParameterizedUnsupportedRoute({
      equationLatex,
      answerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      outputStyle: 'both',
      complexExactForm: 'rectangular',
      targetResolution: resolveEquationSolveTarget(equationLatex, 'x'),
      plannerResolvedLatex: equationLatex,
      searchTrace: trace.record,
    });

    expect(outcome?.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'top-level',
      family: 'carrier-elimination',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'top-level',
      family: 'carrier-elimination',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
  });
});
