import { convertLatexToMarkup } from 'mathlive';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

function compact(value: string) {
  return value.replace(/\s+/g, '').replace(/\^\{([0-9]+)\}/g, '^$1');
}

function success(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected integration success');
  }
  return result;
}

function expectRenderableLatex(latex: string) {
  expect(latex).not.toContain('--');
  expect(latex).not.toContain('-(-');
  expect(latex).not.toMatch(/\([^)]*\)\/[A-Za-z]/);
  expect(convertLatexToMarkup(latex, { defaultMode: 'math' })).not.toMatch(/blacksquare|ML__error|\\error/);
}

function error(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error('expected integration error');
  }
  return result;
}

function supplements(result: ReturnType<typeof success>) {
  return compact(result.exactSupplementLatex?.join(' ') ?? '');
}

describe('Risch-Norman affine rational correction', () => {
  it('integrates polynomial numerators over symbolic affine denominators', () => {
    const result = success('\\frac{x^2}{a x+b}');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('affine rational-correction');
    expectRenderableLatex(result.exactLatex);
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('ax+b');
    expect(supplements(result)).toContain('a\\ne0');
  });

  it('handles selected repeated affine powers inside the bounded correction substrate', () => {
    const repeated = success('\\frac{c x+d}{(a x+b)^2}');

    expect(repeated.strategy).toBe('partial-fractions');
    expect(repeated.exactLatex).not.toContain('\\left(-\\frac');
    expectRenderableLatex(repeated.exactLatex);
    expect(repeated.exactLatex).toContain('\\ln');
    expect(repeated.exactLatex).toContain('ax+b');
    expect(supplements(repeated)).toContain('a\\ne0');

    const cubic = success('\\frac{x^3}{(a x+b)^3}');
    expect(cubic.strategy).toBe('partial-fractions');
    expect(cubic.exactLatex).toContain('ax+b');
  });

  it('honors arbitrary selected variables', () => {
    const result = success('\\frac{t^2}{a t+b}', 't');

    expect(result.strategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('at+b');
  });

  it('keeps broader symbolic rational corrections out of scope', () => {
    expect(error('\\frac{x^2}{a x^2+b}').candidate.method).not.toBe('partial-fractions');
    expect(error('\\frac{x^7}{a x+b}').candidate.method).not.toBe('partial-fractions');
    expect(error('\\frac{x^2}{(a x+b)^4}').candidate.method).not.toBe('partial-fractions');
  });
});
