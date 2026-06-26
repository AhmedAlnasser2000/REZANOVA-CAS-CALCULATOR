import { describe, expect, it } from 'vitest';
import { createEquationSelectedTargetSearchTrace } from '../equation-target-shape';
import {
  solveParameterizedCompositionEquation,
  type ParameterizedCompositionSolveOptions,
} from './composition';

function expectSuccess(
  latex: string,
  target: string,
  options?: ParameterizedCompositionSolveOptions,
) {
  const result = solveParameterizedCompositionEquation(latex, target, 'rad', options);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(
  latex: string,
  target: string,
  options?: ParameterizedCompositionSolveOptions,
) {
  const result = solveParameterizedCompositionEquation(latex, target, 'rad', options);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
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

describe('solveParameterizedCompositionEquation', () => {
  it('hands square-root compositions to bounded selected-target solvers', () => {
    const result = expectSuccess('\\sqrt{z^2+a}=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('4b^2-4a');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0', '4b^2-4a\\ge0']);
    expect(result.generatedEquationLatex).toEqual(['z^2+a=b^2']);
    expect(result.detailSections.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
  });

  it('branches absolute-value compositions', () => {
    const result = expectSuccess('\\left|z^2-a\\right|=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('4a+4b');
    expect(result.exactLatex).toContain('4a-4b');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.generatedEquationLatex).toEqual(['z^2-a=b', 'z^2-a=-b']);
  });

  it('hands logarithmic and exponential outer compositions to selected-target solvers', () => {
    const logarithmic = expectSuccess('\\ln\\left(z^2+a\\right)=b', 'z');
    expect(logarithmic.exactLatex).toContain('z\\in');
    expect(logarithmic.exactLatex).toContain('\\exponentialE^{b}');
    expect(logarithmic.exactSupplementLatex).toContain('z^2+a>0');

    const exponential = expectSuccess('e^{z^2+a}=b', 'z');
    expect(exponential.exactLatex).toContain('z\\in');
    expect(exponential.exactLatex).toContain('\\ln(b)');
    expect(exponential.exactSupplementLatex).toContain('b>0');
  });

  it('generates periodic handoff branches for trig compositions', () => {
    const sine = expectSuccess('\\sin\\left(z^2+a\\right)=b', 'z');

    expect(sine.exactLatex).toContain('z\\in');
    expect(sine.exactLatex).toContain('\\arcsin(b)');
    expect(sine.generatedEquationLatex.join(' ')).toContain('2\\pi n');
    expect(sine.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(sine.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');

    const cosine = expectSuccess('\\cos\\left((z-a)(z-b)\\right)=c', 'z');
    expect(cosine.exactLatex).toContain('z\\in');
    expect(cosine.exactLatex).toContain('\\arccos(c)');
    expect(cosine.exactSupplementLatex).toContain('-1\\le c\\le1');
  });

  it('solves two-layer nonperiodic selected-target composition chains', () => {
    const rootAbs = expectSuccess('\\sqrt{\\left|z-a\\right|}=b', 'z');
    expect(rootAbs.exactLatex).toContain('z\\in');
    expect(rootAbs.exactLatex).toContain('b^2+a');
    expect(rootAbs.exactLatex).toContain('a-b^2');
    expect(rootAbs.exactSupplementLatex).toContain('b\\ge0');
    const handoff = rootAbs.detailSections.find((section) => section.title === 'Parameterized Composition Handoff');
    const handoffMathParts = handoff?.lineParts?.[0]?.filter((part) => part.kind === 'math') ?? [];
    expect(handoffMathParts).toHaveLength(2);
    expect(handoffMathParts[0]).toHaveProperty('latex', '\\sqrt{\\vert z-a\\vert}');
    expect(handoffMathParts[1]).toHaveProperty('latex', '\\vert z-a\\vert');

    const logAbs = expectSuccess('\\ln\\left(\\left|z-a\\right|\\right)=b', 'z');
    expect(logAbs.exactLatex).toContain('a+\\exponentialE^{b}');
    expect(logAbs.exactLatex).toContain('a-\\exponentialE^{b}');
    expect(logAbs.exactSupplementLatex).toContain('\\vert z-a\\vert>0');

    const expRoot = expectSuccess('e^{\\sqrt{z+a}}=b', 'z');
    expect(expRoot.exactLatex).toBe('z=\\ln(b)^2-a');
    expect(expRoot.exactSupplementLatex).toContain('b>0');
    expect(expRoot.exactSupplementLatex).toContain('\\ln(b)\\ge0');
  });

  it('solves two-layer rational and trig selected-target composition chains', () => {
    const rationalRoot = expectSuccess('\\sqrt{\\frac{1}{z-a}}=b', 'z');
    expect(rationalRoot.exactLatex).toBe('z=\\frac{ab^2+1}{b^2}');
    expect(rationalRoot.exactSupplementLatex).toContain('z-a\\ne0');

    const sineRoot = expectSuccess('\\sin\\left(\\sqrt{z+a}\\right)=b', 'z');
    expect(sineRoot.exactLatex).toContain('(2\\pi n+\\arcsin(b))^2-a');
    expect(sineRoot.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(sineRoot.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');

    const rootSine = expectSuccess('\\sqrt{\\sin\\left(z+a\\right)}=b', 'z');
    expect(rootSine.exactLatex).toContain('\\arcsin(b^2)');
    expect(rootSine.exactSupplementLatex).toContain('b\\ge0');
    expect(rootSine.exactSupplementLatex).toContain('-1\\le b^2\\le1');
  });

  it('records generated branch trace evidence for delegated rational composition branches', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = solveParameterizedCompositionEquation('\\sqrt{\\frac{1}{z-a}}=b', 'z', 'rad', {
      searchTrace: trace.record,
    });

    expect(result.kind).toBe('success');
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'linear',
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

  it('keeps generated cubic and quartic composition branches outside formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = solveParameterizedCompositionEquation('\\sqrt{z^3+z+1}=b', 'z', 'rad', {
      searchTrace: trace.record,
    });

    expect(result.kind).toBe('unsupported');
    expect(result).toMatchObject({
      reason: 'unsupported-branch',
    });
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'profile',
      phase: 'generated-handoff',
    }));
    expectNoGeneratedFormulaAttempt(trace.events);

    const quarticTrace = createEquationSelectedTargetSearchTrace();
    const quartic = solveParameterizedCompositionEquation('\\sqrt{z^4+z+1}=b', 'z', 'rad', {
      searchTrace: quarticTrace.record,
    });

    expect(quartic.kind).toBe('unsupported');
    expect(quartic).toMatchObject({
      reason: 'unsupported-branch',
    });
    expectNoGeneratedFormulaAttempt(quarticTrace.events);
  });

  it('solves Real square-root cubic composition through generated Cardano formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\sqrt{z^3+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('\\Delta>0');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
  });

  it('solves Real square-root quartic composition through generated Ferrari formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\sqrt{z^4+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('p+2Y>0');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'quartic-ferrari',
    });
  });

  it('solves Real absolute-value cubic composition through grouped generated Cardano formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\left|z^3+z+1\\right|=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=b', 'z^3+z+1=-b']);
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=b');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=-b');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Abs Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Abs Branch 2 - Substituted Real Cardano Values')).toBe(true);
    expect(trace.events.filter((event) =>
      event.kind === 'family-success'
      && event.phase === 'generated-handoff'
      && event.family === 'cubic-cardano')).toHaveLength(2);
  });

  it('solves Real absolute-value quartic composition through grouped generated Ferrari formula handoff', () => {
    const result = expectSuccess('\\left|z^4+z+1\\right|=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^4+z+1=b', 'z^4+z+1=-b']);
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Abs Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Abs Branch 2 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('collapses exact zero absolute-value formula handoff to one generated branch', () => {
    const result = expectSuccess('\\left|z^3+z+1\\right|=0', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=0']);
    expect(result.detailSections.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
    expect(result.exactSupplementLatex ?? []).not.toContain('0\\ge0');
  });

  it('keeps exact negative absolute-value formula handoff domain-empty', () => {
    const result = expectUnsupported('\\left|z^3+z+1\\right|=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.reason).toBe('domain-empty');
  });

  it('keeps exact positive absolute-value wrappers legacy-only when both sign branches solve without formulas', () => {
    const result = expectSuccess('\\left|z^3+z+1\\right|=1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=1', 'z^3+z+1=-1']);
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactSupplementLatex ?? []).not.toContain('1\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(false);
  });

  it('uses grouped formulas for exact positive absolute-value wrappers when every sign branch is formula-backed', () => {
    const result = expectSuccess('\\left|z^3-z\\right|=1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3-z=1', 'z^3-z=-1']);
    expect(result.exactLatex).toContain('\\substack{z^3-z=1');
    expect(result.exactLatex).toContain('\\substack{z^3-z=-1');
    expect(result.exactSupplementLatex ?? []).not.toContain('1\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
  });

  it('keeps generated formula handoff target-agnostic', () => {
    const result = expectSuccess('\\sqrt{y^3+y+1}=b', 'y', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.exactLatex).toContain('y\\in\\begin{cases}');
    expect(result.generatedEquationLatex).toEqual(['y^3+y+1=b^2']);
  });

  it('preserves rational denominator exclusions for generated formula branches', () => {
    const cubic = expectSuccess('\\sqrt{\\frac{z^3+z+1}{z-m}}=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    expect(cubic.exactSupplementLatex).toContain('b\\ge0');
    expect(cubic.exactSupplementLatex).toContain('z-m\\ne0');

    const quartic = expectSuccess('\\sqrt{\\frac{z^4+z+1}{z-m}}=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    expect(quartic.exactSupplementLatex).toContain('b\\ge0');
    expect(quartic.exactSupplementLatex).toContain('z-m\\ne0');
  });

  it('solves Real square-power cubic composition through grouped generated Cardano formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\left(z^3+z+1\\right)^2=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      'z^3+z+1=\\sqrt{b}',
      'z^3+z+1=-\\sqrt{b}',
    ]);
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=\\sqrt{b}');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=-\\sqrt{b}');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Square-Power Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Square-Power Branch 2 - Substituted Real Cardano Values')).toBe(true);
    expect(trace.events.filter((event) =>
      event.kind === 'family-success'
      && event.phase === 'generated-handoff'
      && event.family === 'cubic-cardano')).toHaveLength(2);
  });

  it('solves Real square-power quartic composition through grouped generated Ferrari formula handoff', () => {
    const result = expectSuccess('\\left(z^4+z+1\\right)^2=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      'z^4+z+1=\\sqrt{b}',
      'z^4+z+1=-\\sqrt{b}',
    ]);
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Square-Power Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Square-Power Branch 2 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('allows target-free RHS expressions for Real square-power formula handoff', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^2=a+c', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex.join(' ')).toContain('\\sqrt{a+c}');
    expect(result.exactSupplementLatex).toContain('a+c\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
  });

  it('preserves rational denominator exclusions for Real square-power formula branches', () => {
    const result = expectSuccess('\\left(\\frac{z^3+z+1}{z-m}\\right)^2=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
  });

  it('collapses exact zero square-power formula handoff to one generated branch', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^2=0', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=0']);
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
    expect(result.exactSupplementLatex ?? []).not.toContain('0\\ge0');
  });

  it('keeps exact negative square-power formula handoff domain-empty', () => {
    const result = expectUnsupported('\\left(z^3+z+1\\right)^2=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.reason).toBe('domain-empty');
  });

  it('keeps exact positive square-power wrappers legacy-only when both square-root branches solve without formulas', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^2=1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=1', 'z^3+z+1=-1']);
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactSupplementLatex ?? []).not.toContain('1\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(false);
  });

  it('uses grouped formulas for exact positive square-power wrappers when every square-root branch is formula-backed', () => {
    const result = expectSuccess('\\left(z^3-z\\right)^2=1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3-z=1', 'z^3-z=-1']);
    expect(result.exactLatex).toContain('\\substack{z^3-z=1');
    expect(result.exactLatex).toContain('\\substack{z^3-z=-1');
    expect(result.exactSupplementLatex ?? []).not.toContain('1\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
  });

  it('solves Real odd-power cubic composition through generated Cardano formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\left(z^3+z+1\\right)^3=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=\\sqrt[3]{b}']);
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('\\Delta>0');
    expect(result.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(result.exactLatex).not.toContain('PrincipalRoot');
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Square-Power Formula Cases')).toBe(false);
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
  });

  it('solves Real odd-power quartic composition through generated Ferrari formula handoff', () => {
    const result = expectSuccess('\\left(z^4+z+1\\right)^5=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^4+z+1=\\sqrt[5]{b}']);
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(result.exactLatex).not.toContain('PrincipalRoot');
    expect(result.detailSections.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
  });

  it('allows target-free RHS expressions for Real odd-power formula handoff', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^7=a+c', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=\\sqrt[7]{a+c}']);
    expect(result.exactSupplementLatex ?? []).not.toContain('a+c\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
  });

  it('preserves rational denominator exclusions for Real odd-power formula branches', () => {
    const result = expectSuccess('\\left(\\frac{z^3+z+1}{z-m}\\right)^3=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['\\frac{z^3+z+1}{z-m}=\\sqrt[3]{b}']);
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
  });

  it('collapses exact zero odd-power formula handoff to one generated branch', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^3=0', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=0']);
    expect(result.exactSupplementLatex ?? []).not.toContain('0\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
  });

  it('allows exact negative odd-power formula handoff without nonnegative facts', () => {
    const result = expectSuccess('\\left(z^3+z\\right)^3=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.generatedEquationLatex).toEqual(['z^3+z=-1']);
    expect(result.exactSupplementLatex ?? []).not.toContain('-1\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
  });

  it('solves Real higher even-power cubic composition through grouped generated Cardano formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\left(z^3+z+1\\right)^4=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      'z^3+z+1=\\sqrt[4]{b}',
      'z^3+z+1=-\\sqrt[4]{b}',
    ]);
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=\\sqrt[4]{b}');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=-\\sqrt[4]{b}');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Even-Power Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Even-Power Branch 2 - Substituted Real Cardano Values')).toBe(true);
    expect(trace.events.filter((event) =>
      event.kind === 'family-success'
      && event.phase === 'generated-handoff'
      && event.family === 'cubic-cardano')).toHaveLength(2);
  });

  it('solves Real higher even-power quartic composition through grouped generated Ferrari formula handoff', () => {
    const result = expectSuccess('\\left(z^4+z+1\\right)^6=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      'z^4+z+1=\\sqrt[6]{b}',
      'z^4+z+1=-\\sqrt[6]{b}',
    ]);
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Even-Power Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Even-Power Branch 2 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('allows target-free RHS expressions for Real higher even-power formula handoff', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^8=a+c', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      'z^3+z+1=\\sqrt[8]{a+c}',
      'z^3+z+1=-\\sqrt[8]{a+c}',
    ]);
    expect(result.exactSupplementLatex).toContain('a+c\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
  });

  it('preserves rational denominator exclusions for Real higher even-power formula branches', () => {
    const result = expectSuccess('\\left(\\frac{z^3+z+1}{z-m}\\right)^4=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      '\\frac{z^3+z+1}{z-m}=\\sqrt[4]{b}',
      '\\frac{z^3+z+1}{z-m}=-\\sqrt[4]{b}',
    ]);
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.detailSections.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
  });

  it('collapses exact zero higher even-power formula handoff to one generated branch', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^{10}=0', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=0']);
    expect(result.detailSections.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
    expect(result.exactSupplementLatex ?? []).not.toContain('0\\ge0');
  });

  it('keeps exact negative higher even-power formula handoff domain-empty', () => {
    const result = expectUnsupported('\\left(z^3+z+1\\right)^4=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.reason).toBe('domain-empty');
    expect(result.message).toContain('even powers are nonnegative');
  });

  it('keeps exact positive higher even-power wrappers legacy-only when both even-root branches solve without formulas', () => {
    const result = expectSuccess('\\left(z^3+z+1\\right)^4=1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=1', 'z^3+z+1=-1']);
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactSupplementLatex ?? []).not.toContain('1\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Even-Power Formula Cases')).toBe(false);
  });

  it('solves Real nth-root cubic composition through generated Cardano formula handoff', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = expectSuccess('\\sqrt[3]{z^3+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: trace.record,
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^3+z+1=b^3']);
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactLatex).toContain('\\substack{z^3+z+1=b^3');
    expect(result.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Nth-Root Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
  });

  it('solves Real nth-root quartic composition through generated Ferrari formula handoff', () => {
    const result = expectSuccess('\\sqrt[4]{z^4+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['z^4+z+1=b^4']);
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Nth-Root Branch 1 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('allows target-free RHS expressions for Real nth-root formula handoff', () => {
    const odd = expectSuccess('\\sqrt[5]{z^3+z+1}=a+c', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    const even = expectSuccess('\\sqrt[6]{z^3+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(odd.generatedEquationLatex).toEqual(['z^3+z+1=(a+c)^5']);
    expect(odd.exactSupplementLatex ?? []).not.toContain('a+c\\ge0');
    expect(odd.detailSections.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(even.generatedEquationLatex).toEqual(['z^3+z+1=b^6']);
    expect(even.exactSupplementLatex).toContain('b\\ge0');
    expect(even.detailSections.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
  });

  it('preserves rational denominator exclusions for Real nth-root formula branches', () => {
    const result = expectSuccess('\\sqrt[3]{\\frac{z^3+z+1}{z-m}}=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual(['\\frac{z^3+z+1}{z-m}=b^3']);
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(result.detailSections.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
  });

  it('handles exact zero and signed RHS policy for Real nth-root formula handoff', () => {
    const zero = expectSuccess('\\sqrt[5]{z^3+z+1}=0', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    const oddNegative = expectSuccess('\\sqrt[3]{z^3+z+1}=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    const evenNegative = expectUnsupported('\\sqrt[4]{z^3+z+1}=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(zero.generatedEquationLatex).toEqual(['z^3+z+1=0']);
    expect(zero.detailSections.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(oddNegative.generatedEquationLatex).toEqual(['z^3+z+1=-1']);
    expect(oddNegative.exactSupplementLatex ?? []).not.toContain('-1\\ge0');
    expect(evenNegative.reason).toBe('domain-empty');
    expect(evenNegative.message).toContain('even-index root outputs are nonnegative');
  });

  it('solves Real trig composition branches through generated Cardano and Ferrari formula handoff', () => {
    const sineTrace = createEquationSelectedTargetSearchTrace();
    const sine = expectSuccess('\\sin\\left(z^3+z+1\\right)=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: sineTrace.record,
    });
    const cosine = expectSuccess('\\cos\\left(z^4+z+1\\right)=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    const tangent = expectSuccess('\\tan\\left(z^3+z+1\\right)=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(sine.answerDomain).toBe('real');
    expect(cosine.answerDomain).toBe('real');
    expect(tangent.answerDomain).toBe('real');
    expect(sine.generatedEquationLatex).toEqual([
      'z^3+z+1=\\arcsin(b)+2\\pi n',
      'z^3+z+1=\\pi-\\arcsin(b)+2\\pi n',
    ]);
    expect(cosine.generatedEquationLatex).toEqual([
      'z^4+z+1=\\arccos(b)+2\\pi n',
      'z^4+z+1=-\\arccos(b)+2\\pi n',
    ]);
    expect(tangent.generatedEquationLatex).toEqual([
      'z^3+z+1=\\arctan(b)+\\pi n',
    ]);
    expect(sine.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(cosine.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(tangent.exactSupplementLatex ?? []).not.toContain('-1\\le b\\le1');
    expect(tangent.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    for (const result of [sine, cosine, tangent]) {
      expect(result.detailSections.some((section) => section.title === 'Trig Formula Cases')).toBe(true);
      expect(result.exactLatex).toContain('\\substack{');
      expect(result.exactLatex).not.toContain('PrincipalRoot');
    }
    expect(sine.detailSections.some((section) => section.title === 'Trig Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(cosine.detailSections.some((section) => section.title === 'Trig Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(sineTrace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'cubic-cardano',
    });
  });

  it('preserves rational denominator exclusions for Real trig formula branches', () => {
    const result = expectSuccess('\\sin\\left(\\frac{z^3+z+1}{z-m}\\right)=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.answerDomain).toBe('real');
    expect(result.generatedEquationLatex).toEqual([
      '\\frac{z^3+z+1}{z-m}=\\arcsin(b)+2\\pi n',
      '\\frac{z^3+z+1}{z-m}=\\pi-\\arcsin(b)+2\\pi n',
    ]);
    expect(result.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.detailSections.some((section) => section.title === 'Trig Formula Cases')).toBe(true);
  });

  it('dedupes exact sine and cosine endpoint branches before formula handoff', () => {
    const sine = expectSuccess('\\sin\\left(z^3+z+1\\right)=1', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    const cosine = expectSuccess('\\cos\\left(z^4+z+1\\right)=-1', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(sine.generatedEquationLatex).toEqual(['z^3+z+1=\\frac{\\pi}{2}+2\\pi n']);
    expect(cosine.generatedEquationLatex).toEqual(['z^4+z+1=\\pi+2\\pi n']);
    expect(sine.exactSupplementLatex ?? []).not.toContain('-1\\le 1\\le1');
    expect(cosine.exactSupplementLatex ?? []).not.toContain('-1\\le -1\\le1');
    expect(sine.detailSections.some((section) => section.title === 'Trig Formula Cases')).toBe(true);
    expect(cosine.detailSections.some((section) => section.title === 'Trig Formula Cases')).toBe(true);
  });

  it('keeps out-of-range and Complex trig formula branches unsupported', () => {
    const outOfRange = expectUnsupported('\\sin\\left(z^3+z+1\\right)=2', 'z', {
      formulaHandoff: { domain: 'real' },
    });
    const trace = createEquationSelectedTargetSearchTrace();

    expectUnsupported('\\sin\\left(z^3+z+1\\right)=b', 'z', {
      searchTrace: trace.record,
    });

    expect(outOfRange.reason).toBe('domain-empty');
    expectNoGeneratedFormulaAttempt(trace.events);
  });

  it('keeps over-cap square-root formula branches unsupported', () => {
    const result = expectUnsupported('\\sqrt{z^5+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
    });

    expect(result.reason).toBe('unsupported-branch');
    expect(result.message).toContain('degree');
  });

  it('keeps over-cap power composition carriers outside generated formula handoff', () => {
    const squareTrace = createEquationSelectedTargetSearchTrace();
    expectUnsupported('\\left(z^3+z+1\\right)^{14}=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: squareTrace.record,
    });
    expectNoGeneratedFormulaAttempt(squareTrace.events);
  });

  it('keeps over-cap nth-root composition carriers outside generated formula handoff', () => {
    const rootTrace = createEquationSelectedTargetSearchTrace();
    expectUnsupported('\\sqrt[13]{z^3+z+1}=b', 'z', {
      formulaHandoff: { domain: 'real' },
      searchTrace: rootTrace.record,
    });
    expectNoGeneratedFormulaAttempt(rootTrace.events);
  });

  it('keeps Complex square-power composition carriers outside generated formula handoff', () => {
    const squareTrace = createEquationSelectedTargetSearchTrace();
    expectUnsupported('\\left(z^3+z+1\\right)^2=b', 'z', {
      searchTrace: squareTrace.record,
    });
    expectNoGeneratedFormulaAttempt(squareTrace.events);
  });

  it('keeps Complex odd-power composition carriers outside generated formula handoff', () => {
    const oddTrace = createEquationSelectedTargetSearchTrace();
    expectUnsupported('\\left(z^3+z+1\\right)^3=b', 'z', {
      searchTrace: oddTrace.record,
    });
    expectNoGeneratedFormulaAttempt(oddTrace.events);
  });

  it('keeps Complex higher even-power composition carriers outside generated formula handoff', () => {
    const evenTrace = createEquationSelectedTargetSearchTrace();
    expectUnsupported('\\left(z^3+z+1\\right)^4=b', 'z', {
      searchTrace: evenTrace.record,
    });
    expectNoGeneratedFormulaAttempt(evenTrace.events);
  });

  it('solves capped two-periodic selected-target composition chains with distinct integer parameters', () => {
    const result = expectSuccess('\\sin\\left(\\tan\\left(z\\right)\\right)=a', 'z');

    expect(result.exactLatex).toContain('\\arctan(2\\pi n+\\arcsin(a))');
    expect(result.exactLatex).toContain('\\pi m');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.exactSupplementLatex).toContain('m\\in\\mathbb{Z}');
  });

  it('keeps depth-three or additive mixed carriers out of the two-layer slice', () => {
    expect(expectUnsupported('\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)=b', 'z').reason).toBe('nested-composition');
    expect(expectUnsupported('\\sin(z)+\\sqrt{z}=a', 'z').reason).toBe('mixed-carriers');
  });

  it('rejects target appearances outside the one outer carrier and raw adjacent products', () => {
    expect(expectUnsupported('z+\\sin(z^2)=a', 'z').reason).toBe('target-outside-carrier');
    expect(expectUnsupported('az=1', 'z').reason).toBe('ambiguous-adjacent-product');
  });
});
