import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { solveRischNormanLogRationalCorrection } from './integration/risch-norman/log-rational-correction';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string) {
  return solveRischNormanLogRationalCorrection(node(latex), 'x');
}

function success(latex: string) {
  const result = resolveSymbolicIntegralFromLatex(latex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return result;
}

function error(latex: string) {
  const result = resolveSymbolicIntegralFromLatex(latex);
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error('expected integration error');
  }
  return result;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('Risch-Norman affine log rational correction', () => {
  it('integrates polynomial times affine log over a matching affine denominator', () => {
    const result = success('\\frac{x^2\\ln(a*x+b)}{a*x+b}');

    expect(result.strategy).toBe('integration-by-parts');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('affine-log rational-correction');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).not.toMatch(/\d+\.\d+/);
    expect(compact(result.exactSupplementLatex?.join(' ') ?? '')).toContain('a\\ne0');
    expect(compact(result.exactSupplementLatex?.join(' ') ?? '')).toContain('ax+b>0');
  });

  it('supports base-10 log and repeated affine denominator powers through the cap', () => {
    const repeated = success('\\frac{(c*x+d)\\log(a*x+b)}{(a*x+b)^2}');

    expect(repeated.strategy).toBe('integration-by-parts');
    expect(repeated.exactLatex).toContain('\\ln(10)');
    expect(repeated.verification.reason).toContain('affine-log rational-correction');

    const cubic = success('\\frac{x^3\\ln(a*x+b)}{(a*x+b)^3}');
    expect(cubic.strategy).toBe('integration-by-parts');
    expect(cubic.exactLatex).toContain('\\ln');
  });

  it('exposes node-first evidence for direct solver calls', () => {
    const result = solve('\\frac{x^2\\ln(a*x+b)}{a*x+b}');

    expect(result?.kind).toBe('success');
    if (result?.kind !== 'success') {
      throw new Error('expected solver success');
    }
    expect(result.family).toBe('affine-log-rational-correction');
    expect(result.denominatorPower).toBe(1);
    expect(result.antiderivativeNode).toBeDefined();
  });

  it('stops outside the bounded affine-log rational correction scope', () => {
    expect(solve('\\frac{x^2\\ln(a*x+b)}{(a*x+b)^4}')).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-denominator-power',
    });
    expect(solve('\\frac{x^2\\ln(x^2+b)}{a*x+b}')).toMatchObject({
      kind: 'stop',
      reason: 'denominator-log-mismatch',
    });
    expect(solve('\\frac{x^2\\ln(a*x+b)}{a*x^2+b}')).toMatchObject({
      kind: 'stop',
      reason: 'denominator-log-mismatch',
    });
    expect(solve('\\frac{2.5*x\\ln(a*x+b)}{a*x+b}')).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'inexact-coefficient',
    });

    expect(error('\\frac{|x|\\ln(a*x+b)}{a*x+b}').candidate.method).not.toBe('integration-by-parts');
  });
});
