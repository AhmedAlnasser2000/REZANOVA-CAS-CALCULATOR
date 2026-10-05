import { describe as group, expect, it } from 'vitest';
import type { CanonicalResultDocumentV6 } from '../../../../types/calculator';
import { autoTargets, checkRows, parseRow, pickOrder } from '../../../new-equation/parse';
import { DEFAULT_EQUATION_LIMITS, type EquationRequest } from '../../../new-equation/types';
import { verificationSummary } from '../../../new-equation/verification';
import { executeEquation } from './service';

const request = (rows: string[], targets: string[], over: Partial<EquationRequest> = {}): EquationRequest =>
  ({ rows, targets, domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6, ...over });
const solve = (rows: string[], targets?: string[], over: Partial<EquationRequest> = {}) =>
  executeEquation(request(rows, targets ?? autoTargets(rows.map(parseRow)), over));
const shown = (r: ReturnType<typeof solve>, style: 'exact' | 'decimal' | 'both' = 'exact') => r.presentations?.[style]?.plainText;
const v6 = (r: ReturnType<typeof solve>) => r.document as CanonicalResultDocumentV6;

group('New Equation rows', () => {
  it('reads relations, implicit products, constants and chains', () => {
    const r = parseRow('2x+e^{i\\pi}=1');
    expect(r.kind).toBe('relation');
    if (r.kind === 'relation') { expect(r.symbols).toEqual(['x']); expect(JSON.stringify(r.json)).toContain('ExponentialE'); expect(JSON.stringify(r.json)).toContain('ImaginaryUnit'); }
    const chain = parseRow('1<x<3');
    expect(chain.kind === 'relation' && chain.signs).toEqual(['order']);
    expect(parseRow('').kind).toBe('empty');
    expect(parseRow('\\placeholder{}').kind).toBe('empty');
  });

  it('names unreadable rows', () => {
    expect(parseRow('x=')).toEqual({ kind: 'error', message: 'This row is incomplete.' });
    expect(parseRow('x^2-1')).toEqual({ kind: 'error', message: 'Add a relation sign: =, ≠, <, ≤, > or ≥.' });
    expect(parseRow('x+\\placeholder{}=1').kind).toBe('error');
  });

  it('picks unknowns: x, y, z, t first, one per equation row', () => {
    expect(pickOrder(['b', 't', 'a', 'y', 'x'])).toEqual(['x', 'y', 't', 'a', 'b']);
    expect(autoTargets(['x^2=a', 'a>0'].map(parseRow))).toEqual(['x']);
    expect(autoTargets(['x^2+y^2=5', 'xy=2', 'x\\ne-1'].map(parseRow))).toEqual(['x', 'y']);
    expect(autoTargets(['a+b=1'].map(parseRow))).toEqual(['a']);
    expect(autoTargets(['x>1'].map(parseRow))).toEqual(['x']);
  });

  it('checks before solving: inequalities over ℂ, stray assumptions, missing unknowns', () => {
    const rows = ['x^2=a', 'a>0'].map(parseRow);
    expect(checkRows(rows, ['x'], 'real').rows.map(r => r.kind)).toEqual(['relation', 'assumption']);
    const complex = checkRows(rows, ['x'], 'complex');
    expect(complex.orderOverComplex).toBe(true);
    expect(complex.ready).toBe(false);
    expect(checkRows(['x=1', 'b>0'].map(parseRow), ['x'], 'real').rows[1]).toEqual({ kind: 'error', message: 'b does not appear in the other rows.' });
    expect(checkRows(['x=1'].map(parseRow), ['z'], 'real').missingTargets).toEqual(['z']);
  });
});

group('New Equation service', () => {
  it('solves a quadratic exactly, with every style', () => {
    const r = solve(['x^2-5x+6=0']);
    expect(v6(r).primary.outcome.kind).toBe('solved');
    expect(shown(r)).toBe('x = 2\nx = 3');
    expect(r.rowNotes).toEqual([{ kind: 'relation' }]);
  });

  it('keeps decimals in the input exact', () => {
    expect(shown(solve(['0.5x=1.25']))).toBe('x = 5/2');
  });

  it('solves a system with an excluded point', () => {
    expect(shown(solve(['x^2+y^2=5', 'xy=2', 'x\\ne-1']))).toBe('(x, y) = (-2, -1)\n(x, y) = (1, 2)\n(x, y) = (2, 1)');
  });

  it('applies assumptions, and solves every case without them', () => {
    const assumed = solve(['x^2=a', 'a>0']);
    expect(shown(assumed)).toBe('Assuming a > 0\nx = √a\nx = -√a');
    expect(v6(assumed).primary.assumptions?.length).toBe(1);
    expect(assumed.rowNotes).toEqual([{ kind: 'relation' }, { kind: 'assumption' }]);
    expect(shown(solve(['x^2=a']))).toContain('If a < 0:');
    expect(shown(solve(['ax+1=0', 'a\\ne0']))).toBe('Assuming a ≠ 0\nx = -1/a');
  });

  it('refuses contradictory assumptions', () => {
    const r = solve(['x^2=a', 'a>1', 'a<0']);
    expect(r.document.outcomeKind).toBe('error');
    expect(r.document.error).toBe('These assumptions cannot all hold.');
  });

  it('shows the domain the engine applies', () => {
    expect(solve(['\\ln(x)+\\sqrt{x-1}=0']).domainConditions.map(c => c.text)).toEqual(expect.arrayContaining(['x > 0', 'x ≥ 1']));
  });

  it('reports non-answers and row errors plainly', () => {
    expect(v6(solve(['\\cos x=x'])).primary.outcome.kind).toMatch(/incomplete|undecided/);
    const bad = solve(['x^2=1', 'x=']);
    expect(bad.document.outcomeKind).toBe('error');
    expect(bad.rowNotes[1]).toEqual({ kind: 'error', message: 'This row is incomplete.' });
    expect(solve(['x>1'], ['x'], { domain: 'complex' }).document.error).toBe('Inequalities need real numbers.');
  });

  it('stops on the work limit with a typed stop', () => {
    const r = solve(['x^5-x-1=0'], ['x'], { limits: { work: 2_000, allocation: DEFAULT_EQUATION_LIMITS.allocation } });
    const kind = r.document.version === 6 ? v6(r).primary.outcome.kind : r.document.title;
    expect(['stopped', 'Stopped']).toContain(kind);
  });

  it('presents roots as decimals with their definition', () => {
    const r = solve(['x^5-x-1=0']);
    expect(shown(r, 'decimal')).toBe("x ≈ 1.167304\n  the real root of x^5 - x - 1 = 0");
  });

  it('words the verification line from the typed outcome', () => {
    expect(verificationSummary(v6(solve(['x^2=4'])))?.detail).toMatch(/^Each solution was substituted back/);
    expect(verificationSummary(v6(solve(['x^2=-1'])))?.detail).toMatch(/no value satisfies every row/);
    expect(verificationSummary(v6(solve(['x^2=a', 'a>-1'])))?.detail).toMatch(/Each case .* ruled out by the assumptions/);
    expect(verificationSummary(v6(solve(['x^2<1'])))?.detail).toMatch(/endpoint/);
    expect(verificationSummary(v6(solve(['\\cos x=x'])))).toBeUndefined();
  });
});
