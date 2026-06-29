import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { tryRischNormanHermiteReductionRule } from './integration/risch-norman/hermite-reduction';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return tryRischNormanHermiteReductionRule(node(latex), variable);
}

function success(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return result;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('Risch-Norman Hermite rational correction', () => {
  it('detects exact rational derivatives of P over a symbolic quadratic denominator', () => {
    const result = success(
      '\\frac{A*(a*x^2+b*x+c)-(A*x+B)*(2a*x+b)}{(a*x^2+b*x+c)^2}',
    );

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('Risch-Norman Hermite rational-correction');
    expect(compact(result.exactLatex)).toContain('\\frac{Ax+B}{ax^2+bx+c}');
  });

  it('detects exact rational derivatives with denominator power three', () => {
    const result = success(
      '\\frac{a*x^2+b*x+c-2*x*(2a*x+b)}{(a*x^2+b*x+c)^3}',
    );

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.reason).toContain('Risch-Norman Hermite rational-correction');
    expect(compact(result.exactLatex)).toContain('\\frac{x}{\\left(ax^2+bx+c\\right)^{2}}');
  });

  it('reduces a bounded residual to a log-derivative correction', () => {
    const result = success(
      '\\frac{a*x^2+b*x+c-x*(2a*x+b)+k*(2a*x+b)*(a*x^2+b*x+c)}{(a*x^2+b*x+c)^2}',
    );

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.reason).toContain('Risch-Norman Hermite rational-correction');
    expect(compact(result.exactLatex)).toContain('\\frac{x}{ax^2+bx+c}');
    expect(compact(result.exactLatex)).toContain('k\\cdot\\ln');
  });

  it('honors arbitrary selected variables', () => {
    const result = success(
      '\\frac{A*(a*t^2+b*t+c)-(A*t+B)*(2a*t+b)}{(a*t^2+b*t+c)^2}',
      't',
    );

    expect(compact(result.exactLatex)).toContain('\\frac{At+B}{at^2+bt+c}');
  });

  it('exposes direct solver stops for over-scope cases', () => {
    expect(solve('\\frac{x}{(a*x^2+b*x+c)^4}')).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-power',
    });
    expect(solve('\\frac{2.5*x}{(x^2+1)^2}')).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'inexact-coefficient',
    });
    expect(solve('\\frac{|x|}{(x^2+1)^2}')).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'selected-variable-dependent-coefficient',
    });
  });
});
