import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicInfinityCaseLimit } from './symbolic-infinity-cases';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('symbolic infinity case limits', () => {
  it('branches on one symbolic leading coefficient', () => {
    const result = resolveSymbolicInfinityCaseLimit(parse('a*x'), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toContain('\\infty,&a>0');
    expect(result?.exactLatex).toContain('0,&a=0');
    expect(result?.exactLatex).toContain('-\\infty,&a<0');
    expect(result?.detailSections?.map((section) => section.title)).toContain('Limit Cases');
  });

  it('branches on the next coefficient when the dominant one vanishes', () => {
    const result = resolveSymbolicInfinityCaseLimit(parse('b*x^2+a*x'), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toContain('\\infty,&b>0');
    expect(result?.exactLatex).toContain('-\\infty,&b<0');
    expect(result?.exactLatex).toContain('\\infty,&b=0,\\ a>0');
    expect(result?.exactLatex).toContain('0,&b=0,\\ a=0');
  });

  it('falls through to target-free constant terms when symbolic growth vanishes', () => {
    const result = resolveSymbolicInfinityCaseLimit(parse('b*x^2+a*x+c'), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toContain('\\infty,&b>0');
    expect(result?.exactLatex).toContain('-\\infty,&b<0');
    expect(result?.exactLatex).toContain('\\infty,&b=0,\\ a>0');
    expect(result?.exactLatex).toContain('-\\infty,&b=0,\\ a<0');
    expect(result?.exactLatex).toContain('c,&b=0,\\ a=0');
    expect(result?.detailSections?.find((section) => section.title === 'Limit Case Proof')?.lineParts?.flat())
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'math', latex: 'c' }),
      ]));
  });

  it('uses lower numeric growth when a symbolic leading term vanishes', () => {
    const result = resolveSymbolicInfinityCaseLimit(parse('a*x^2+3*x'), 'posInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toContain('\\infty,&a>0');
    expect(result?.exactLatex).toContain('-\\infty,&a<0');
    expect(result?.exactLatex).toContain('\\infty,&a=0');
  });

  it('honors negative-infinity parity for odd powers', () => {
    const result = resolveSymbolicInfinityCaseLimit(parse('a*x'), 'negInfinity', 'x');

    expect(result?.kind).toBe('success');
    expect(result?.exactLatex).toContain('-\\infty,&a>0');
    expect(result?.exactLatex).toContain('\\infty,&a<0');
  });
});
