import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveFiniteRecursiveLeadingTermLimit } from './finite-leading-terms';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('finite recursive leading terms', () => {
  it('keeps target-free symbolic coefficients through local equivalents', () => {
    const result = resolveFiniteRecursiveLeadingTermLimit(
      parse(String.raw`a*\sin(x)/x`),
      0,
      'x',
      'two-sided',
    );

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('a');
    expect(result?.value).toBeUndefined();
    expect(result?.approxText).toBeUndefined();
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('recursive finite leading-term');
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('coefficient a with net order 0');
  });

  it('handles composed finite carriers such as ln(cos(x))', () => {
    const result = resolveFiniteRecursiveLeadingTermLimit(
      parse(String.raw`\ln(\cos(x))/x^2`),
      0,
      'x',
      'two-sided',
    );

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('-\\frac{1}{2}');
    expect(result?.value).toBeCloseTo(-0.5, 10);
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('ln(cos(u))');
  });

  it('continues through symbolic local cancellations', () => {
    const sine = resolveFiniteRecursiveLeadingTermLimit(
      parse(String.raw`(\sin(a*x)-a*x)/x^3`),
      0,
      'x',
      'two-sided',
    );
    const tangent = resolveFiniteRecursiveLeadingTermLimit(
      parse(String.raw`(\tan(a*x)-a*x)/x^3`),
      0,
      'x',
      'two-sided',
    );
    const exponential = resolveFiniteRecursiveLeadingTermLimit(
      parse(String.raw`(e^{a*x}-1-a*x)/x^2`),
      0,
      'x',
      'two-sided',
    );
    const logarithm = resolveFiniteRecursiveLeadingTermLimit(
      parse(String.raw`(\ln(1+a*x)-a*x)/x^2`),
      0,
      'x',
      'two-sided',
    );

    expect(sine?.kind).toBe('success');
    expect(sine?.exactLatex).toContain('-');
    expect(sine?.exactLatex).toMatch(/a(?:\^3|\^\{3\})/u);
    expect(sine?.exactLatex).toContain('6');
    expect(tangent?.kind).toBe('success');
    expect(tangent?.exactLatex).toMatch(/a(?:\^3|\^\{3\})/u);
    expect(tangent?.exactLatex).toContain('3');
    expect(exponential?.kind).toBe('success');
    expect(exponential?.exactLatex).toMatch(/a(?:\^2|\^\{2\})/u);
    expect(exponential?.exactLatex).toContain('2');
    expect(logarithm?.kind).toBe('success');
    expect(logarithm?.exactLatex).toContain('-');
    expect(logarithm?.exactLatex).toMatch(/a(?:\^2|\^\{2\})/u);
    expect(logarithm?.exactLatex).toContain('2');
    expect(sine?.detailSections?.[0]?.lines.join(' ')).toContain('capped symbolic local series');
  });
});
