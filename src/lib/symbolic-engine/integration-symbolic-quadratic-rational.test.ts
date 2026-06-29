import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import { convertLatexToMarkup } from 'mathlive';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { profileSymbolicQuadraticPowerReadiness } from './integration/symbolic-quadratic-readiness';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function success(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return result;
}

function error(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error('expected integration error');
  }
  return result;
}

function expectRenderableLatex(latex: string) {
  expect(convertLatexToMarkup(latex, { defaultMode: 'math' })).not.toMatch(/blacksquare|ML__error|\\error/);
}

describe('symbolic quadratic rational integration', () => {
  it('keeps reciprocal symbolic quadratics readable with explicit arctan multiplication', () => {
    const result = success('\\frac{1}{a x^2+b x+c}');

    expect(result.strategy).toBe('partial-fractions');
    expectRenderableLatex(result.exactLatex);
    expect(result.exactLatex).toContain('\\begin{cases}');
    expect(result.exactLatex).toContain('\\cdot \\arctan');
    expect(result.exactLatex).toContain('4ac-b^{2}>0');
    expect(result.exactLatex).toContain('4ac-b^{2}=0');
    expect(result.exactLatex).toContain('4ac-b^{2}<0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).not.toContain('4ac-b^{2}>0');
  });

  it('integrates degree-one numerators over one symbolic quadratic denominator', () => {
    const result = success('\\frac{A x+B}{a x^2+b x+c}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.reason).toContain('linear-numerator casewise decomposition');
    expectRenderableLatex(result.exactLatex);
    expect(result.exactLatex).toContain('\\begin{cases}');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('\\cdot \\arctan');
    expect(result.exactLatex).toContain('4ac-b^{2}=0');
    expect(result.exactLatex).toContain('4ac-b^{2}<0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).not.toContain('4ac-b^{2}>0');
  });

  it('keeps derivative-numerator symbolic quadratics in the log branch', () => {
    const result = success('\\frac{2a x+b}{a x^2+b x+c}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.reason).toContain('derivative-numerator');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).not.toContain('\\arctan');
  });

  it('honors arbitrary selected variables for symbolic quadratic numerators', () => {
    const result = success('\\frac{A t+B}{a t^2+b t+c}', 't');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('at^2+bt+c');
    expect(result.exactLatex).toContain('\\begin{cases}');
    expect(result.exactLatex).toContain('\\cdot \\arctan');
  });

  it('keeps symbolic quadratic branch facts inside the casewise answer', () => {
    const result = success('\\frac{A x+B}{a x^2+b x+c}');
    const facts = result.exactSupplementLatex?.join(' ') ?? '';

    expect(facts).toContain('a\\ne0');
    expect(facts).not.toContain('4ac-b^{2}>0');
    expect(result.exactLatex).toContain('4ac-b^{2}>0');
    expect(result.exactLatex).toContain('4ac-b^{2}=0');
    expect(result.exactLatex).toContain('4ac-b^{2}<0');
  });

  it('preserves exact-rational branch precedence outside the generic symbolic branch', () => {
    const reducible = success('\\frac{1}{x^2-1}');
    expect(reducible.strategy).toBe('partial-fractions');
    expect(reducible.exactLatex).toContain('\\ln');
    expect(reducible.exactLatex).not.toContain('\\arctan');

    const positive = success('\\frac{1}{x^2+1}');
    expect(positive.strategy).toBe('inverse-trig');
    expect(positive.exactLatex).toContain('\\arctan');
  });

  it('integrates repeated symbolic quadratic powers on the positive generic branch', () => {
    const square = success('\\frac{A x+B}{(a x^2+b x+c)^2}');
    expect(square.strategy).toBe('partial-fractions');
    expect(square.verification.reason).toContain('repeated-power positive-branch recurrence');
    expect(square.exactLatex).toContain('\\arctan');
    expect(square.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(square.exactSupplementLatex?.join(' ')).toContain('4ac-b^{2}>0');
    expectRenderableLatex(square.exactLatex);

    const cube = success('\\frac{A x+B}{(a x^2+b x+c)^3}');
    expect(cube.strategy).toBe('partial-fractions');
    expect(cube.verification.reason).toContain('repeated-power positive-branch recurrence');
    expect(cube.exactLatex).toContain('\\arctan');
    expect(cube.exactSupplementLatex?.join(' ')).toContain('4ac-b^{2}>0');
    expectRenderableLatex(cube.exactLatex);
  });

  it('keeps symbolic quadratic shapes outside the repeated-power adoption cap unsupported', () => {
    expect(error('\\frac{A x+B}{(a x^2+b x+c)^4}').candidate.method).toBe('unsupported');
    expect(error('\\frac{A x+B}{a x^2+b x+c+d x^3}').candidate.method).toBe('unsupported');
  });

  it('profiles repeated symbolic quadratic powers without adopting them', () => {
    const square = profileSymbolicQuadraticPowerReadiness(
      node('\\frac{A x+B}{(a x^2+b x+c)^2}'),
      'x',
    );
    expect(square.kind).toBe('ready');
    if (square.kind !== 'ready') {
      throw new Error('expected repeated quadratic readiness');
    }
    expect(square.denominatorPower).toBe(2);
    expect(square.adoption).toBe('live-route');
    expect(square.facts).toContainEqual({ expressionLatex: 'a', relation: '\\ne0' });
    expect(square.facts).toContainEqual({ expressionLatex: '4ac-b^{2}', relation: '>0' });

    const cube = profileSymbolicQuadraticPowerReadiness(
      node('\\frac{A x+B}{(a x^2+b x+c)^3}'),
      'x',
    );
    expect(cube.kind).toBe('ready');
    if (cube.kind !== 'ready') {
      throw new Error('expected cubed quadratic readiness');
    }
    expect(cube.denominatorPower).toBe(3);
  });

  it('records controlled readiness stops for over-scope symbolic quadratics', () => {
    expect(profileSymbolicQuadraticPowerReadiness(
      node('\\frac{A x+B}{(a x^2+b x+c)^4}'),
      'x',
    )).toMatchObject({ kind: 'stop', reason: 'unsupported-power' });
    expect(profileSymbolicQuadraticPowerReadiness(
      node('\\frac{A x+B}{(a x^2+b x+c)(d x^2+e x+f)}'),
      'x',
    )).toMatchObject({ kind: 'stop', reason: 'multiple-symbolic-quadratic-factors' });
    expect(profileSymbolicQuadraticPowerReadiness(
      node('\\frac{|x|}{(a x^2+b x+c)^2}'),
      'x',
    )).toMatchObject({ kind: 'stop', reason: 'branch-sensitive-carrier' });
    expect(profileSymbolicQuadraticPowerReadiness(
      node('\\frac{2.5x+1}{(a x^2+b x+c)^2}'),
      'x',
    )).toMatchObject({ kind: 'stop', reason: 'inexact-coefficient' });
  });
});
