import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

function compact(value: string) {
  return value.replace(/\s+/g, '').replace(/\^\{([0-9]+)\}/g, '^$1');
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

function supplements(result: ReturnType<typeof success>) {
  return compact(result.exactSupplementLatex?.join(' ') ?? '');
}

describe('Risch-Norman generic-case degeneracy facts', () => {
  it('keeps symbolic trig product-to-sum denominators visible as generic-case facts', () => {
    const result = success('\\sin(a x+b)\\cos(c x+d)');

    expect(result.strategy).toBe('direct-rule');
    expect(supplements(result)).toContain('a+c\\ne0');
    expect(supplements(result)).toContain('a-c\\ne0');
  });

  it('keeps unresolved same-slope different-shift trig products unsupported for now', () => {
    const sameSlope = error('\\sin(a x+b)\\sin(a x+d)');

    expect(sameSlope.candidate.method).not.toBe('direct-rule');
  });

  it('keeps exp-sincos pivots visible as generic-case facts', () => {
    const sine = success('x^2e^{a x+b}\\sin(c x+d)');
    expect(sine.strategy).toBe('integration-by-parts');
    expect(supplements(sine)).toContain('a^2+c^2\\ne0');

    const cosine = success('(c x+d)e^{a x+b}\\cos(k x+m)');
    expect(cosine.strategy).toBe('integration-by-parts');
    expect(supplements(cosine)).toContain('a^2+k^2\\ne0');
  });

  it('keeps positive-base exponential and affine-log facts explicit', () => {
    const exponential = success('(c x+d)q^{a x+b}');
    expect(supplements(exponential)).toContain('a\\ne0');
    expect(supplements(exponential)).toContain('q>0');
    expect(supplements(exponential)).toContain('q-1\\ne0');

    const logarithm = success('x^2\\ln(a x+b)');
    expect(supplements(logarithm)).toContain('a\\ne0');
    expect(supplements(logarithm)).toContain('ax+b>0');
  });
});
