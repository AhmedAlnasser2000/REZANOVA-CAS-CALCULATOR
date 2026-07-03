import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import {
  tryAlgebraicFunctionFieldOrchestrator,
} from './integration/algebraic-function-field-orchestrator';

const ce = new ComputeEngine();

function orchestrate(latex: string, variable = 'x') {
  const result = tryAlgebraicFunctionFieldOrchestrator(
    ce.parse(latex).json,
    variable,
  );
  expect(result).toBeDefined();
  if (!result) {
    throw new Error(`expected algebraic function-field orchestration for ${latex}`);
  }
  return result;
}

describe('algebraic function-field orchestrator', () => {
  it('centralizes existing genus-0 standard and rational-in-radical successes', () => {
    const standard = orchestrate('\\sqrt{x}');
    const rational = orchestrate('\\frac{x^2}{\\sqrt{1-x^2}}');

    expect(standard.family).toBe('genus0-standard-radical');
    expect(standard.resolution.kind).toBe('success');
    expect(rational.family).toBe('genus0-rational-in-radical');
    expect(rational.resolution.kind).toBe('success');
    if (rational.resolution.kind === 'success') {
      expect(rational.resolution.strategy).toBe('u-substitution');
      expect(rational.resolution.verification.status).toBe('verified-exact');
    }
  });

  it('centralizes existing genus-1 elliptic and Hermite successes', () => {
    const firstKind = orchestrate('\\frac{1}{\\sqrt{x^3-x}}');
    const hermite = orchestrate('\\frac{x^2}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(firstKind.family).toBe('genus1-elliptic-kinds');
    expect(firstKind.resolution.kind).toBe('success');
    expect(hermite.family).toBe('genus1-rational-in-radical-hermite');
    expect(hermite.resolution.kind).toBe('success');
    if (firstKind.resolution.kind === 'success' && hermite.resolution.kind === 'success') {
      expect(firstKind.resolution.exactLatex).toContain('EllipticF');
      expect(hermite.resolution.exactLatex).toContain('EllipticE');
      expect(hermite.resolution.verification.reason).toContain('Hermite reduction');
    }
  });

  it('centralizes genus-2 and deferred genus-1 boundary stops', () => {
    const genus2 = orchestrate('\\sqrt{x^5+x+1}');
    const genus1 = orchestrate('\\sqrt{x^3-x}');

    expect(genus2.family).toBe('genus2-hyperelliptic-boundary');
    expect(genus2.resolution.kind).toBe('error');
    expect(genus1.family).toBe('genus1-boundary');
    expect(genus1.resolution.kind).toBe('error');
    if (genus2.resolution.kind === 'error' && genus1.resolution.kind === 'error') {
      expect(genus2.resolution.error).toContain('hyperelliptic/genus-2');
      expect(genus1.resolution.error).toContain('elliptic/genus-1 analysis');
    }
  });

  it('preserves public dispatch labels and schemas through the orchestrator', () => {
    const firstKind = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3-x}}');
    const genus2 = resolveSymbolicIntegralFromLatex('\\sqrt{x^5+x+1}');

    expect(firstKind.kind).toBe('success');
    if (firstKind.kind === 'success') {
      expect(firstKind.strategy).toBe('u-substitution');
      expect(firstKind.exactLatex).toContain('EllipticF');
      expect(firstKind.candidate.method).toBe('u-substitution');
    }

    expect(genus2.kind).toBe('error');
    if (genus2.kind === 'error') {
      expect(genus2.error).toContain('hyperelliptic/genus-2');
      expect(genus2.candidate.method).toBe('unsupported');
    }
  });
});
