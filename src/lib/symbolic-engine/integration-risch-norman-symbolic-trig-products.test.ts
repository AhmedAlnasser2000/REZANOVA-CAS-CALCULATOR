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

describe('Risch-Norman symbolic trig product-to-sum', () => {
  it('adopts symbolic affine sine-cosine products through direct-rule', () => {
    const result = success('\\sin(a x+b)\\cos(c x+d)');

    expect(result.strategy).toBe('direct-rule');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('symbolic trig product-to-sum');
    expect(result.exactLatex).toContain('\\cos');
    expect(supplements(result)).toContain('a+c\\ne0');
    expect(supplements(result)).toContain('a-c\\ne0');
  });

  it('adopts symbolic affine sine-sine and cosine-cosine products', () => {
    const sine = success('\\sin(a x+b)\\sin(c x+d)');
    expect(sine.strategy).toBe('direct-rule');
    expect(sine.exactLatex).toContain('\\sin');
    expect(supplements(sine)).toContain('a+c\\ne0');
    expect(supplements(sine)).toContain('a-c\\ne0');

    const cosine = success('\\cos(a x+b)\\cos(c x+d)');
    expect(cosine.strategy).toBe('direct-rule');
    expect(cosine.exactLatex).toContain('\\sin');
    expect(supplements(cosine)).toContain('a+c\\ne0');
    expect(supplements(cosine)).toContain('a-c\\ne0');
  });

  it('normalizes factor order and handles structural same-argument products', () => {
    const reordered = success('\\cos(c x+d)\\sin(a x+b)');
    expect(reordered.strategy).toBe('direct-rule');
    expect(supplements(reordered)).toContain('a+c\\ne0');
    expect(supplements(reordered)).toContain('a-c\\ne0');

    const same = success('\\sin(a x+b)\\cos(a x+b)');
    expect(same.strategy).toBe('u-substitution');
    expect(same.exactLatex).toContain('\\sin');
    expect(supplements(same)).toContain('a\\ne0');
  });

  it('keeps unresolved degenerate or broader products unsupported', () => {
    expect(error('\\sin(a x+b)\\sin(a x+d)').candidate.method).not.toBe('direct-rule');
    expect(error('\\sin(x^2)\\cos(a x+b)').candidate.method).not.toBe('direct-rule');
    expect(error('m\\sin(a x+b)\\cos(c x+d)').candidate.method).not.toBe('direct-rule');
  });
});
