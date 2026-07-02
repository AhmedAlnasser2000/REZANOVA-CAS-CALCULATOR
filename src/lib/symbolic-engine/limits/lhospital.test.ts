import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { attemptInfiniteLHospital, attemptLHospital } from './lhospital';

const ce = new ComputeEngine();

describe("L'Hospital limit route", () => {
  it('iterates finite 0/0 quotients until the derivative quotient resolves', () => {
    const result = attemptLHospital(
      ce.parse('\\frac{\\sin(x)-x}{x^3}').json,
      0,
      'x',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(result.reason);
    }
    expect(result.value).toBeCloseTo(-1 / 6, 8);
    expect(result.exactLatex).toBe('-\\frac{1}{6}');
    expect(result.iterations).toBe(3);
    expect(result.detailSections[0].lines.join(' ')).toContain('Iteration 3');
  });

  it('resolves infinity-over-infinity quotient routes', () => {
    const result = attemptInfiniteLHospital(
      ce.parse('\\frac{x}{e^x}').json,
      'posInfinity',
      'x',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(result.reason);
    }
    expect(result.value).toBe(0);
    expect(result.exactLatex).toBe('0');
  });

  it('returns a controlled over-cap result', () => {
    const result = attemptLHospital(
      ce.parse('\\frac{\\sin(x)-x}{x^3}').json,
      0,
      'x',
      { maxIterations: 1 },
    );

    expect(result.kind).toBe('too-complex');
    if (result.kind === 'too-complex') {
      expect(result.reason).toContain('stopped after 1 iterations');
    }
  });
});
