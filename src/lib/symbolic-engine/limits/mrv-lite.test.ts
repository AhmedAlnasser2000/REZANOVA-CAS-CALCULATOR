import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveMrvLiteLimit } from './mrv-lite';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

function methodText(result: ReturnType<typeof resolveMrvLiteLimit>) {
  return result?.detailSections?.flatMap((section) =>
    (section.lineParts ?? []).flatMap((row) =>
      row.map((part) => part.kind === 'math' ? part.latex : part.text)))?.join(' ') ?? '';
}

describe('MRV-lite limit comparison', () => {
  it('compares nested exponential scales by exponent difference', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\sqrt{x}}/e^x`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('0');
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('MRV-lite');
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('exponential decay');
    expect(methodText(result)).toContain('x');
    expect(methodText(result)).not.toContain('(i)^');
  });

  it('lets sublinear exponential growth dominate powers', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\sqrt{x}}/x^5`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('\\infty');
    expect(methodText(result)).toContain('x^{-5}');
    expect(methodText(result)).not.toContain('(i)^');
  });

  it('converts exponential log differences into ordinary power scales', () => {
    const result = resolveMrvLiteLimit(
      parse(String.raw`e^{x+\log(x)}/(x e^x)`),
      'posInfinity',
      'x',
    );

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('1');
    expect(methodText(result)).toContain('logarithmic exponent difference');
    expect(methodText(result)).toContain('residual scale');
    expect(methodText(result)).toContain('x');
    expect(methodText(result)).not.toContain('(i)^');
  });

  it('cleans up nested logarithmic residuals inside exponential quotients', () => {
    const logLog = resolveMrvLiteLimit(
      parse(String.raw`e^{\log(\log(x))}/\log(x)`),
      'posInfinity',
      'x',
    );
    const productResidual = resolveMrvLiteLimit(
      parse(String.raw`e^{\log(x)+\log(\log(x))}/(x\log(x))`),
      'posInfinity',
      'x',
    );
    const decayingResidual = resolveMrvLiteLimit(
      parse(String.raw`e^{\log(x)-\log(\log(x))}/x`),
      'posInfinity',
      'x',
    );
    const growingResidual = resolveMrvLiteLimit(
      parse(String.raw`e^{2\log(\log(x))}/\log(x)`),
      'posInfinity',
      'x',
    );

    expect(logLog?.kind).toBe('success');
    expect(logLog?.exactLatex).toBe('1');
    expect(productResidual?.kind).toBe('success');
    expect(productResidual?.exactLatex).toBe('1');
    expect(decayingResidual?.kind).toBe('success');
    expect(decayingResidual?.exactLatex).toBe('0');
    expect(growingResidual?.kind).toBe('success');
    expect(growingResidual?.exactLatex).toBe('\\infty');
    expect(methodText(productResidual)).toContain('residual MRV-lite scales');
    expect(methodText(productResidual)).not.toContain('(i)^');
  });

  it('compares super-polynomial log-square exponentials', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\log(x)^2}/x^5`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('\\infty');
  });

  it('selects dominant MRV terms inside sums before quotient comparison', () => {
    const matchingDominantSums = resolveMrvLiteLimit(
      parse(String.raw`(e^{\sqrt{x}}+x^5)/(e^{\sqrt{x}}-\log(x))`),
      'posInfinity',
      'x',
    );
    const polynomialTail = resolveMrvLiteLimit(
      parse(String.raw`(e^{\sqrt{x}}+\log(x))/(e^{\sqrt{x}}+x^5)`),
      'posInfinity',
      'x',
    );
    const dominantSum = resolveMrvLiteLimit(parse(String.raw`e^{\sqrt{x}}+x^5`), 'posInfinity', 'x');

    expect(matchingDominantSums?.kind).toBe('success');
    expect(matchingDominantSums?.exactLatex).toBe('1');
    expect(methodText(matchingDominantSums)).toContain('Numerator dominant term');
    expect(methodText(matchingDominantSums)).toContain('e^{x^{\\frac{1}{2}}}');
    expect(methodText(matchingDominantSums)).not.toContain("(i)^");

    expect(polynomialTail?.kind).toBe('success');
    expect(polynomialTail?.exactLatex).toBe('1');

    expect(dominantSum?.kind).toBe('success');
    expect(dominantSum?.exactLatex).toBe('\\infty');
  });
});
