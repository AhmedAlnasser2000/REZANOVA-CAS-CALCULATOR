import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveInfiniteScaleLimit } from './infinity-scale-terms';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

function methodText(result: ReturnType<typeof resolveInfiniteScaleLimit>) {
  return result?.detailSections?.flatMap((section) =>
    (section.lineParts ?? []).flatMap((row) =>
      row.map((part) => part.kind === 'math' ? part.latex : part.text)))?.join(' ') ?? '';
}

describe('infinity scale terms', () => {
  it('compares logarithms against powers', () => {
    const result = resolveInfiniteScaleLimit(parse(String.raw`\log(x)/x`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('0');
    expect(result?.detailSections?.[0]?.lines.join(' ')).toContain('infinity scale comparison');
    expect(methodText(result)).toContain('\\log(x)');
    expect(methodText(result)).not.toContain('(i)^');
    expect(methodText(result)).not.toContain('a^2 c^3');
  });

  it('compares powers against exponentials', () => {
    const result = resolveInfiniteScaleLimit(parse(String.raw`x^5/e^x`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('0');
    expect(methodText(result)).toContain('e^{-x}');
    expect(methodText(result)).toContain('x^{5}');
    expect(methodText(result)).not.toContain('(i)^');
  });

  it('selects dominant exponential terms in sums before quotient comparison', () => {
    const result = resolveInfiniteScaleLimit(parse(String.raw`(e^x+x^3)/(e^x-1)`), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('1');
    expect(result?.value).toBe(1);
    expect(methodText(result)).toContain('Dominant scale');
    expect(methodText(result)).toContain('e^{x}');
    expect(methodText(result)).not.toContain('(i)^');
  });

  it('compares iterated logarithms with ordinary logarithms', () => {
    const result = resolveInfiniteScaleLimit(
      parse(String.raw`\log(\log(x))/\log(x)`),
      'posInfinity',
      'x',
    );

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('0');
  });

  it('extracts coefficients from logarithms of power and root scales', () => {
    const squaredLog = resolveInfiniteScaleLimit(
      parse(String.raw`\log(x^2)/\log(x)`),
      'posInfinity',
      'x',
    );
    const rootLog = resolveInfiniteScaleLimit(
      parse(String.raw`\log(\sqrt{x})/\log(x)`),
      'posInfinity',
      'x',
    );
    const scaledLog = resolveInfiniteScaleLimit(
      parse(String.raw`\log(2x)/\log(x)`),
      'posInfinity',
      'x',
    );

    expect(squaredLog?.exactLatex).toBe('2');
    expect(rootLog?.exactLatex).toBe('\\frac{1}{2}');
    expect(scaledLog?.exactLatex).toBe('1');
  });

  it('compares logarithms of exponential scales against powers', () => {
    const result = resolveInfiniteScaleLimit(
      parse(String.raw`\log(e^x)/x`),
      'posInfinity',
      'x',
    );

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toBe('1');
  });

  it('handles real square-root scales at negative infinity when the radicand is eventually positive', () => {
    const ratio = resolveInfiniteScaleLimit(
      parse(String.raw`\sqrt{x^2+x}/x`),
      'negInfinity',
      'x',
    );
    const evenPower = resolveInfiniteScaleLimit(
      parse(String.raw`\sqrt{x^4+x^2}/x^2`),
      'negInfinity',
      'x',
    );

    expect(ratio?.exactLatex).toBe('-1');
    expect(evenPower?.exactLatex).toBe('1');
  });
});
