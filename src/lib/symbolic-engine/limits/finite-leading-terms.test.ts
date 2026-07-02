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
});
