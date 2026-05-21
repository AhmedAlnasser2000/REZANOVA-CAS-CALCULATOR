import { describe, expect, it } from 'vitest';
import { integrateAdaptiveSimpson } from './adaptive-simpson';

describe('adaptive simpson', () => {
  it('integrates x^2 from 0 to 1 near one third', () => {
    const result = integrateAdaptiveSimpson((value) => value ** 2, 0, 1);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a successful adaptive Simpson result');
    }
    expect(result.value).toBeCloseTo(1 / 3, 8);
  });

  it('integrates sin(x) from 0 to pi near 2', () => {
    const result = integrateAdaptiveSimpson((value) => Math.sin(value), 0, Math.PI);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a successful adaptive Simpson result');
    }
    expect(result.value).toBeCloseTo(2, 8);
  });

  it('returns a controlled failure for unstable/non-finite samples', () => {
    const result = integrateAdaptiveSimpson((value) => (Math.abs(value) < 1e-9 ? undefined : 1 / value), -1, 1);

    expect(result.kind).not.toBe('success');
  });
});
