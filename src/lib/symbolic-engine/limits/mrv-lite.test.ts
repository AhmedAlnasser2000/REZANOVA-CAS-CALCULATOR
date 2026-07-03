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
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('contributes x');
    expect(methodText(result)).toContain('e^{1\\log(x)}');
    expect(methodText(result)).toContain('x^{1}');
    expect(methodText(result)).not.toContain('(i)^');
  });

  it('compares super-polynomial log-square exponentials', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\log(x)^2}/x^5`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('\\infty');
  });
});
