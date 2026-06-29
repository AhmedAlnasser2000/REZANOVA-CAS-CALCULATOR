import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { tryRischNormanLogDerivativeRule } from './integration/risch-norman/log-derivative';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return tryRischNormanLogDerivativeRule(node(latex), variable);
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

describe('Risch-Norman log-derivative detector', () => {
  it('detects symbolic polynomial derivative-over-polynomial forms', () => {
    const result = success('\\frac{3a*x^2+2b*x+c}{a*x^3+b*x^2+c*x+d}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('Risch-Norman log-derivative');
    expect(compact(result.exactLatex)).toContain('\\ln\\left|ax^3+bx^2+cx+d\\right|');
    expect(result.exactLatex).not.toContain('\\arctan');
  });

  it('handles symbolic scalar multiples and arbitrary selected variables', () => {
    const scaled = success('\\frac{k*(2a*x+b)}{a*x^2+b*x+c}');

    expect(scaled.strategy).toBe('partial-fractions');
    expect(scaled.verification.reason).toContain('Risch-Norman log-derivative');
    expect(compact(scaled.exactLatex)).toContain('k\\cdot\\ln');
    expect(scaled.exactLatex).not.toContain('\\begin{cases}');

    const variableT = success('\\frac{k*(2a*t+b)}{a*t^2+b*t+c}', 't');
    expect(compact(variableT.exactLatex)).toContain('k\\cdot\\ln');
    expect(compact(variableT.exactLatex)).toContain('at^2+bt+c');
  });

  it('preserves existing exact-rational and affine symbolic overlap ownership', () => {
    const exactRational = success('\\frac{x}{x^2+1}');
    expect(exactRational.strategy).toBe('derivative-ratio');

    const affineSymbolic = success('\\frac{1}{a*x+b}');
    expect(affineSymbolic.strategy).toBe('direct-rule');
  });

  it('exposes node-backed internal evidence through the direct detector', () => {
    const result = solve('\\frac{k*(2a*x+b)}{a*x^2+b*x+c}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected detector success');
    }
    expect(result.antiderivativeNode).toBeDefined();
    expect(result.exactLatex).toContain('\\ln');
  });

  it('stops outside the bounded log-derivative scope', () => {
    expect(solve('\\frac{3a*x^2+2b*x+c+1}{a*x^3+b*x^2+c*x+d}')).toMatchObject({
      kind: 'stop',
      reason: 'not-log-derivative',
    });
    expect(solve('\\frac{2.5*x}{x^2+1}')).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'inexact-coefficient',
    });
    expect(solve('\\frac{|x|}{x^2+1}')).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'selected-variable-dependent-coefficient',
    });
    expect(solve('\\frac{8x^7}{x^8+1}')).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-degree',
    });
  });
});
