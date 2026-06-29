import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import {
  profileRischNormanTowerCandidate,
  tryRischNormanOrchestrator,
} from './integration/risch-norman/orchestrator';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function orchestrate(
  latex: string,
  options?: Parameters<typeof tryRischNormanOrchestrator>[2],
) {
  return tryRischNormanOrchestrator(node(latex), 'x', options);
}

function towerProfile(
  latex: string,
  options?: Parameters<typeof profileRischNormanTowerCandidate>[2],
) {
  return profileRischNormanTowerCandidate(node(latex), 'x', options);
}

function success(latex: string) {
  const result = resolveSymbolicIntegralFromLatex(latex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return result;
}

describe('Risch-Norman ansatz orchestrator', () => {
  it('profiles one bounded tower attempt plan before invoking family solvers', () => {
    expect(towerProfile('(c*x+d)e^{a*x+b}')).toMatchObject({
      kind: 'ready',
      attempts: [{ family: 'exponential', publicStrategy: 'integration-by-parts' }],
    });
    expect(towerProfile('x^2e^{a*x+b}\\sin(c*x+d)')).toMatchObject({
      kind: 'ready',
      attempts: [{ family: 'exp-sine-cosine', publicStrategy: 'integration-by-parts' }],
    });
    expect(towerProfile('\\frac{x^2\\ln(a*x+b)}{a*x+b}', {
      publicStrategies: ['integration-by-parts'],
    })).toMatchObject({
      kind: 'ready',
      attempts: [
        { family: 'affine-log', publicStrategy: 'integration-by-parts' },
        { family: 'affine-log-rational', publicStrategy: 'integration-by-parts' },
      ],
    });
    expect(towerProfile('\\frac{A*(a*x^2+b*x+c)-(A*x+B)*(2a*x+b)}{(a*x^2+b*x+c)^2}', {
      publicStrategies: ['partial-fractions'],
    })).toMatchObject({
      kind: 'ready',
      attempts: [
        { family: 'symbolic-log-derivative', publicStrategy: 'partial-fractions' },
        { family: 'symbolic-hermite-rational-correction', publicStrategy: 'partial-fractions' },
        { family: 'affine-rational-correction', publicStrategy: 'partial-fractions' },
      ],
    });
  });

  it('invokes polynomial exponential ansatz families through one internal entrypoint', () => {
    const result = orchestrate('(c*x+d)e^{a*x+b}');

    expect(result?.family).toBe('affine-exp');
    expect(result?.publicStrategy).toBe('integration-by-parts');
    expect(result?.proofReason).toContain('exponential ansatz');
    expect(result?.antiderivativeNode).toBeDefined();
    expect(result?.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
  });

  it('keeps sine/cosine, exp-sine-cosine, and affine-log families behind the same entrypoint', () => {
    expect(orchestrate('(c*x+d)\\sin(a*x+b)')?.family).toBe('affine-sin-cos');
    expect(orchestrate('x^2e^{a*x+b}\\sin(c*x+d)')?.family).toBe('affine-exp-sin-cos');
    expect(orchestrate('x^2\\ln(a*x+b)')?.family).toBe('affine-log-correction');
  });

  it('keeps affine rational correction in the partial-fractions route family', () => {
    const result = orchestrate('\\frac{x^2}{a*x+b}', {
      publicStrategies: ['partial-fractions'],
    });

    expect(result?.family).toBe('affine-rational-correction');
    expect(result?.publicStrategy).toBe('partial-fractions');
    expect(result?.proofReason).toContain('affine rational-correction');
    expect(result?.antiderivativeNode).toBeDefined();
    expect(result?.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
  });

  it('honors route-family filters so dispatch precedence stays external', () => {
    expect(orchestrate('(c*x+d)e^{a*x+b}', {
      publicStrategies: ['partial-fractions'],
    })).toBeUndefined();
    expect(orchestrate('\\frac{x^2}{a*x+b}', {
      publicStrategies: ['integration-by-parts'],
    })).toBeUndefined();
  });

  it('preserves public dispatch strategy labels', () => {
    const exponential = success('(c*x+d)e^{a*x+b}');
    expect(exponential.strategy).toBe('integration-by-parts');
    expect(exponential.verification.reason).toContain('Risch-Norman exponential');

    const rational = success('\\frac{x^2}{a*x+b}');
    expect(rational.strategy).toBe('partial-fractions');
    expect(rational.verification.reason).toContain('affine rational-correction');
  });
});
