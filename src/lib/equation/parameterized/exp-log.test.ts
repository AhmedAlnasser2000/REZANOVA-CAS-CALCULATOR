import { describe, expect, it } from 'vitest';
import { createEquationSelectedTargetSearchTrace } from '../equation-target-shape';
import { solveParameterizedExpLogEquation } from './exp-log';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedExpLogEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedExpLogEquation(latex, target);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
}

function successWithTrace(latex: string, target: string) {
  const trace = createEquationSelectedTargetSearchTrace();
  const result = solveParameterizedExpLogEquation(latex, target, {
    searchTrace: trace.record,
  });
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  return { result, trace };
}

function expectFormulaSuccess(latex: string, target: string) {
  const result = solveParameterizedExpLogEquation(latex, target, {
    formulaHandoff: { domain: 'real' },
  });
  if (result.kind !== 'success') {
    throw new Error(`Expected formula success, received ${result.reason}: ${result.message}`);
  }
  expect(result.answerDomain).toBe('real');
  expect(result.exactLatex).toContain(`${target}\\in\\begin{cases}`);
  return result;
}

function formulaSuccessWithTrace(latex: string, target: string) {
  const trace = createEquationSelectedTargetSearchTrace();
  const result = solveParameterizedExpLogEquation(latex, target, {
    formulaHandoff: { domain: 'real' },
    searchTrace: trace.record,
  });
  if (result.kind !== 'success') {
    throw new Error(`Expected formula success, received ${result.reason}: ${result.message}`);
  }
  return { result, trace };
}

function unsupportedWithTrace(latex: string, target: string) {
  const trace = createEquationSelectedTargetSearchTrace();
  const result = solveParameterizedExpLogEquation(latex, target, {
    searchTrace: trace.record,
  });
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return { result, trace };
}

function expectNoGeneratedFormulaAttempt(events: ReturnType<typeof createEquationSelectedTargetSearchTrace>['events']) {
  expect(events).not.toContainEqual({
    kind: 'family-attempted',
    phase: 'generated-handoff',
    family: 'cubic-cardano',
  });
  expect(events).not.toContainEqual({
    kind: 'family-success',
    phase: 'generated-handoff',
    family: 'cubic-cardano',
  });
  expect(events).not.toContainEqual({
    kind: 'family-attempted',
    phase: 'generated-handoff',
    family: 'quartic-ferrari',
  });
  expect(events).not.toContainEqual({
    kind: 'family-success',
    phase: 'generated-handoff',
    family: 'quartic-ferrari',
  });
}

describe('solveParameterizedExpLogEquation', () => {
  it('isolates natural exponential target equations', () => {
    const result = expectSuccess('e^z=a', 'z');

    expect(result.exactLatex).toBe('z=\\ln(a)');
    expect(result.exactSupplementLatex).toEqual(['a>0']);
    expect(result.generatedEquationLatex).toBe('z=\\ln\\left(a\\right)');
  });

  it('solves affine natural exponential carriers', () => {
    const result = expectSuccess('e^{z+a}=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactLatex).toContain('\\ln(b)');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactSupplementLatex).toEqual(['b>0']);
  });

  it('records generated linear handoff route evidence', () => {
    const { result, trace } = successWithTrace('e^{z+a}=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'profile',
      phase: 'generated-handoff',
    }));
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'linear',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'linear',
    });
  });

  it('solves natural logarithmic target equations with domain facts', () => {
    const result = expectSuccess('\\ln\\left(z+a\\right)=b', 'z');

    expect(result.exactLatex).toBe('z=e^{b}-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0']);
  });

  it('solves common logarithmic target equations', () => {
    const result = expectSuccess('\\log\\left(z+a\\right)=b', 'z');

    expect(result.exactLatex).toBe('z=10^{b}-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0']);
  });

  it('solves numeric-base exponential target equations', () => {
    const result = expectSuccess('2^{z+a}=b', 'z');

    expect(result.exactLatex).toContain('\\frac{\\ln(b)}{\\ln(2)}');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactSupplementLatex).toEqual(['b>0']);
  });

  it('delegates isolated logarithmic quadratics to the polynomial helper', () => {
    const result = expectSuccess('\\ln\\left(z^2+a\\right)=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('e^{b}');
    expect(result.exactSupplementLatex?.join(' ')).toContain('z^2+a>0');
  });

  it('records generated polynomial handoff route evidence', () => {
    const { result, trace } = successWithTrace('\\ln\\left(z^2+a\\right)=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
  });

  it('keeps generated cubic and quartic exp/log branches outside formula handoff', () => {
    const { result, trace } = unsupportedWithTrace('\\ln\\left(z^3+z+1\\right)=b', 'z');

    expect(result.reason).toBe('handoff-unsupported');
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'profile',
      phase: 'generated-handoff',
    }));
    expectNoGeneratedFormulaAttempt(trace.events);

    const quartic = unsupportedWithTrace('\\ln\\left(z^4+z+1\\right)=b', 'z');
    expect(quartic.result.reason).toBe('handoff-unsupported');
    expectNoGeneratedFormulaAttempt(quartic.trace.events);
  });

  it('delegates generated cubic and quartic exp/log branches to Real formula handoff when opted in', () => {
    const logarithmicCubic = expectFormulaSuccess('\\ln\\left(z^3+z+1\\right)=b', 'z');
    expect(logarithmicCubic.generatedEquationLatex).toContain('e^{b}');
    expect(logarithmicCubic.exactSupplementLatex?.some((fact) => fact.includes('>0'))).toBe(true);
    expect(logarithmicCubic.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);

    const logarithmicQuartic = expectFormulaSuccess('\\ln\\left(z^4+z+1\\right)=b', 'z');
    expect(logarithmicQuartic.generatedEquationLatex).toContain('e^{b}');
    expect(logarithmicQuartic.detailSections.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);

    const exponentialCubic = expectFormulaSuccess('e^{z^3+z+1}=b', 'z');
    expect(exponentialCubic.generatedEquationLatex).toContain('\\ln\\left(b\\right)');
    expect(exponentialCubic.exactSupplementLatex).toContain('b>0');
    expect(exponentialCubic.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);

    const exponentialQuartic = expectFormulaSuccess('e^{z^4+z+1}=b', 'z');
    expect(exponentialQuartic.generatedEquationLatex).toContain('\\ln\\left(b\\right)');
    expect(exponentialQuartic.exactSupplementLatex).toContain('b>0');
    expect(exponentialQuartic.detailSections.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
  });

  it('delegates symbolic-base exp/log formula handoffs while preserving base facts', () => {
    const logarithmic = expectFormulaSuccess('\\log_a\\left(z^3+z+1\\right)=d', 'z');
    expect(logarithmic.generatedEquationLatex).toContain('a^{d}');
    expect(logarithmic.exactSupplementLatex).toContain('a>0');
    expect(logarithmic.exactSupplementLatex).toContain('a\\ne1');
    expect(logarithmic.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);

    const exponential = expectFormulaSuccess('a^{z^4+z+1}=d', 'z');
    expect(exponential.generatedEquationLatex).toContain('\\log_{a}\\left(d\\right)');
    expect(exponential.exactSupplementLatex).toContain('a>0');
    expect(exponential.exactSupplementLatex).toContain('a\\ne1');
    expect(exponential.exactSupplementLatex).toContain('d>0');
    expect(exponential.detailSections.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
  });

  it('delegates safely rational-cleared generated exp/log cubics to formula handoff', () => {
    const result = expectFormulaSuccess('\\ln\\left(\\frac{z^3+z+1}{z-m}\\right)=b', 'z');

    expect(result.generatedEquationLatex).toContain('e^{b}');
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.exactSupplementLatex?.some((fact) => fact.includes('>0'))).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
  });

  it('records generated formula route evidence for opted-in exp/log handoff', () => {
    const { result, trace } = formulaSuccessWithTrace('\\ln\\left(z^3+z+1\\right)=b', 'z');

    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
  });

  it('delegates isolated logarithmic rational equations to the rational helper', () => {
    const result = expectSuccess('\\ln\\left(1/(z-a)\\right)=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactSupplementLatex).toContain('z-a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('\\frac{1}{z-a}>0');
  });

  it('records generated rational handoff skips and success', () => {
    const { result, trace } = successWithTrace('\\ln\\left(1/(z-a)\\right)=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'linear',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'rational',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'rational',
    });
  });

  it('delegates isolated exponential carrier equations to the carrier helper', () => {
    const result = expectSuccess('e^{\\left|z-a\\right|}=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a+\\ln(b)');
    expect(result.exactLatex).toContain('a-\\ln(b)');
    expect(result.exactSupplementLatex).toEqual(['b>0', '\\ln(b)\\ge0']);
  });

  it('keeps generated carrier handoff available for unknown carrier profiles', () => {
    const { result, trace } = successWithTrace('e^{\\left|z-a\\right|}=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'carrier',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'carrier',
    });
  });

  it('reduces same-base exponential equalities', () => {
    const result = expectSuccess('e^{z+a}=e^b', 'z');

    expect(result.exactLatex).toBe('z=b-a');
    expect(result.generatedEquationLatex).toBe('a+z=b');
  });

  it('reduces same-base logarithmic equalities with domain facts', () => {
    const result = expectSuccess('\\ln\\left(z+a\\right)=\\ln\\left(b\\right)', 'z');

    expect(result.exactLatex).toBe('z=b-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0', 'b>0']);
  });

  it('solves target-free symbolic-base exponential target equations', () => {
    const result = expectSuccess('a^z=b', 'z');

    expect(result.exactLatex).toBe('z=\\log_{a}(b)');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'b>0']);
    expect(result.generatedEquationLatex).toBe('z=\\log_{a}\\left(b\\right)');
  });

  it('solves affine symbolic-base exponential carriers', () => {
    const result = expectSuccess('a^{z+c}=d', 'z');

    expect(result.exactLatex).toBe('z=\\log_{a}(d)-c');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'd>0']);
  });

  it('solves symbolic-base logarithmic target equations', () => {
    const result = expectSuccess('\\log_a(z+c)=d', 'z');

    expect(result.exactLatex).toBe('z=a^{d}-c');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'c+z>0']);
  });

  it('delegates symbolic-base exponential quadratics and rationals to existing helpers', () => {
    const quadratic = expectSuccess('a^{z^2+c}=d', 'z');
    expect(quadratic.exactLatex).toContain('z\\in');
    expect(quadratic.exactLatex).toContain('\\log_{a}(d)');
    expect(quadratic.exactSupplementLatex?.join(' ')).toContain('4\\log_{a}(d)-4c\\ge0');

    const rational = expectSuccess('a^{1/(z-c)}=d', 'z');
    expect(rational.exactLatex).toContain('z=');
    expect(rational.exactSupplementLatex).toContain('z-c\\ne0');
    expect(rational.exactSupplementLatex).toContain('\\log_{a}(d)\\ne0');
  });

  it('reduces same symbolic-base exponential and logarithmic equalities', () => {
    const exponential = expectSuccess('a^{z+c}=a^d', 'z');
    expect(exponential.exactLatex).toBe('z=d-c');
    expect(exponential.exactSupplementLatex).toEqual(['a>0', 'a\\ne1']);

    const logarithmic = expectSuccess('\\log_a(z+c)=\\log_a(d)', 'z');
    expect(logarithmic.exactLatex).toBe('z=d-c');
    expect(logarithmic.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'c+z>0', 'd>0']);
  });

  it('solves target-in-base powers with principal-positive facts', () => {
    const result = expectSuccess('z^a=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[a]{b}');
    expect(result.generatedEquationLatex).toBe('z=b^{\\frac{1}{a}}');
    expect(result.exactSupplementLatex).toEqual(['b>0', 'a\\ne0', 'z>0']);
  });

  it('threads target-base exp/log traces into the generated finalizer', () => {
    const { result, trace } = successWithTrace('z^a=b', 'z');

    expect(result.generatedEquationLatex).toBe('z=b^{\\frac{1}{a}}');
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

  it('parenthesizes generated target-base powers instead of rendering exponent lists', () => {
    const result = expectSuccess('a^z=b^z', 'a');

    expect(result.exactLatex).toBe('a=\\sqrt[z]{b^{z}}');
    expect(result.exactLatex).not.toContain('lbrack');
    expect(result.generatedEquationLatex).toBe('a=\\left(b^{z}\\right)^{\\frac{1}{z}}');
    expect(result.exactSupplementLatex).toEqual(['b^{z}>0', 'z\\ne0', 'a>0']);
  });

  it('solves affine target-in-base powers with principal-positive facts', () => {
    const result = expectSuccess('(z+c)^a=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[a]{b}-c');
    expect(result.generatedEquationLatex).toBe('c+z=b^{\\frac{1}{a}}');
    expect(result.exactSupplementLatex).toEqual(['b>0', 'a\\ne0', 'c+z>0']);
  });

  it('solves target-in-log-base equations with principal-positive facts', () => {
    const result = expectSuccess('\\log_z(a)=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[b]{a}');
    expect(result.generatedEquationLatex).toBe('z=a^{\\frac{1}{b}}');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'b\\ne0', 'z>0', 'z\\ne1']);
  });

  it('solves affine target-in-log-base equations with principal-positive facts', () => {
    const result = expectSuccess('\\log_{z+c}(a)=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[b]{a}-c');
    expect(result.generatedEquationLatex).toBe('c+z=a^{\\frac{1}{b}}');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'b\\ne0', 'c+z>0', 'c+z\\ne1']);
  });

  it('rejects logarithmic combinations for a later milestone', () => {
    const result = expectUnsupported('\\ln\\left(z\\right)+\\ln\\left(z-a\\right)=b', 'z');

    expect(result.reason).toBe('multiple-carriers');
  });

  it('rejects mixed target plus exp/log equations', () => {
    const result = expectUnsupported('z+a^z=b', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
  });

  it('rejects nested exp/log carriers', () => {
    const result = expectUnsupported('\\ln\\left(e^z\\right)=a', 'z');

    expect(result.reason).toBe('nested-exp-log');
  });

  it('rejects target in both base and exponent and zero log-base conditionals', () => {
    const mixedTarget = expectUnsupported('z^z=a', 'z');
    expect(mixedTarget.reason).toBe('target-in-unsupported-operation');

    const zeroLogBase = expectUnsupported('\\log_z(a)=0', 'z');
    expect(zeroLogBase.reason).toBe('unsupported-shell');
  });

  it('rejects raw adjacent products until variable hints can explain them', () => {
    const result = expectUnsupported('\\ln\\left(az\\right)=b', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
  });
});
