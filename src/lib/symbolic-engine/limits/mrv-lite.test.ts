import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveMrvLiteLimit } from './mrv-lite';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('MRV-lite limit comparison', () => {
  it('compares nested exponential scales by exponent difference', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\sqrt{x}}/e^x`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('0');
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('MRV-lite');
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('exponential decay');
  });

  it('lets sublinear exponential growth dominate powers', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\sqrt{x}}/x^5`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('\\infty');
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
  });

  it('compares super-polynomial log-square exponentials', () => {
    const result = resolveMrvLiteLimit(parse(String.raw`e^{\log(x)^2}/x^5`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('\\infty');
  });
});
