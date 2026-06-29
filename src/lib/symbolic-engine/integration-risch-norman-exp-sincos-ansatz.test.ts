import { ComputeEngine } from '@cortex-js/compute-engine';
import { convertLatexToMarkup } from 'mathlive';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { solveRischNormanExpSinCosAnsatz } from './integration/risch-norman/exp-sincos-ansatz';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return solveRischNormanExpSinCosAnsatz(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function normalizePowerBraces(value: string) {
  return compact(value).replace(/\^\{([0-9]+)\}/g, '^$1');
}

function success(result: ReturnType<typeof solve>) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected exp-sincos ansatz success');
  }
  return result;
}

function expectRenderableLatex(latex: string) {
  expect(latex).not.toContain('--');
  expect(latex).not.toContain('-(-');
  expect(latex).not.toMatch(/\([^)]*\)\/[A-Za-z]/);
  expect(convertLatexToMarkup(latex, { defaultMode: 'math' })).not.toMatch(/blacksquare|ML__error|\\error/);
}

function nonzeroFacts(result: ReturnType<typeof solve>) {
  return success(result).facts
    .filter((fact) => fact.kind === 'nonzero')
    .map((fact) => normalizePowerBraces(fact.expressionLatex));
}

function supplementLatex(result: ReturnType<typeof resolveSymbolicIntegralFromLatex>) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return normalizePowerBraces(result.exactSupplementLatex?.join(' ') ?? '');
}

describe('Risch-Norman exponential-sine-cosine ansatz', () => {
  it('solves polynomial times affine exponential-sine candidates', () => {
    const result = success(solve('x^2e^{a*x+b}\\sin(c*x+d)'));

    expect(result.family).toBe('affine-exp-sin-cos');
    expect(result.source).toBe('Sin');
    expect(result.polynomialDegree).toBe(2);
    expect(compact(result.exactLatex)).toContain('e^{ax+b}');
    expect(compact(result.exactLatex)).toContain('\\sin');
    expect(compact(result.exactLatex)).toContain('\\cos');
    expect(result.exactLatex).not.toMatch(/\d+\.\d+/);
    expectRenderableLatex(result.exactLatex);
    expect(result.exactLatex).not.toMatch(/\\right\)x(?:\^|\b)/);
    expect(result.exactLatex).toMatch(/x\\left\(/);
    expect(result.exactLatex).toContain('\\cdot \\sin');
    expect(result.exactLatex).toContain('\\cdot \\cos');
    expect(nonzeroFacts(result).join(' ')).toContain('a^2+c^2');
  });

  it('solves symbolic-coefficient polynomial times affine exponential-cosine candidates', () => {
    const result = success(solve('(c*x+d)e^{a*x+b}\\cos(k*x+m)'));

    expect(result.source).toBe('Cos');
    expect(result.polynomialDegree).toBe(1);
    expect(compact(result.exactLatex)).toContain('c');
    expect(compact(result.exactLatex)).toContain('d');
    expectRenderableLatex(result.exactLatex);
    expect(result.exactLatex).toContain('\\cdot \\sin');
    expect(result.exactLatex).toContain('\\cdot \\cos');
    expect(nonzeroFacts(result).join(' ')).toContain('a^2+k^2');
  });

  it('honors arbitrary selected variables', () => {
    const result = success(solve('t e^{a*t+b}\\sin(c*t+d)', 't'));

    expect(result.variable).toBe('t');
    expect(result.polynomialDegree).toBe(1);
  });

  it('stops outside the bounded mixed exp-sincos scope', () => {
    expect(solve('e^{\\sin(x)}\\sin(x)')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-exponent',
    });
    expect(solve('e^{a*x+b}\\sin(c*x+d)\\sec(x)')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
    });
    expect(solve('e^{a*x+b}\\sin(c*x+d)\\cos(x)')).toMatchObject({
      kind: 'stop',
      reason: 'extra-trig-factor',
    });
  });

  it('adopts guarded mixed exp-sincos results after Tier I misses', () => {
    const sine = resolveSymbolicIntegralFromLatex('x^2e^{a x+b}\\sin(c x+d)');
    expect(sine.kind).toBe('success');
    if (sine.kind !== 'success') {
      throw new Error('expected integration success');
    }
    expect(sine.strategy).toBe('integration-by-parts');
    expect(sine.verification.status).toBe('verified-exact');
    expect(sine.verification.reason).toContain('Risch-Norman exponential-sine-cosine ansatz');
    expect(sine.exactLatex).toContain('e^{ax+b}');
    expect(sine.exactLatex).toContain('\\sin');
    expect(sine.exactLatex).toContain('\\cos');
    expectRenderableLatex(sine.exactLatex);
    expect(supplementLatex(sine)).toContain('a^2+c^2\\ne0');

    const cosine = resolveSymbolicIntegralFromLatex('(c x+d)e^{a x+b}\\cos(k x+m)');
    expect(cosine.kind).toBe('success');
    if (cosine.kind !== 'success') {
      throw new Error('expected integration success');
    }
    expect(cosine.strategy).toBe('integration-by-parts');
    expect(cosine.verification.reason).toContain('Risch-Norman exponential-sine-cosine ansatz');
    expect(cosine.exactLatex).toContain('e^{ax+b}');
    expectRenderableLatex(cosine.exactLatex);
    expect(supplementLatex(cosine)).toContain('a^2+k^2\\ne0');
  });
});
