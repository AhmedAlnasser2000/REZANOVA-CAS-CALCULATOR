import { describe as group, expect, it } from 'vitest';
import { context } from '../core/test-support';
import { decideEquation } from '../core/decide';
import { evaluateExact } from '../core/representation/evaluate';
import { ExpressionStore, type ExprId } from '../core/representation/expression';
import { readExpression, readRelations } from '../core/representation/mathjson';
import { relationProblem, type ProblemDomain } from '../core/representation/relation';
import type { PointValue } from '../core/representation/solution-set';
import { decimalOf, displayForm, extractPower, orderPoints } from './values';

const none = new Map<string, ExprId>();
function expr(store: ExpressionStore, json: unknown): ExprId {
  const r = readExpression(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  return r.value;
}
/** Independent check: the difference evaluates exactly to 0. */
function equalExactly(store: ExpressionStore, a: ExprId, b: ExprId) {
  const e = evaluateExact(store, store.sub(a, b), 'real');
  return e.kind === 'exact' && e.value.kind === 'rational' && e.value.value.numerator === 0n;
}
function finitePoints(json: unknown, domain: ProblemDomain) {
  const store = new ExpressionStore(context());
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error('parse');
  const o = decideEquation(relationProblem(store, { domain, targets: ['x'], relations: r.value }));
  if (o.kind !== 'solved' || o.set.kind !== 'finite') throw new Error(o.kind);
  return { store, points: o.set.points };
}

group('proven display rewrites', () => {
  it.each([
    ['√12 → 2√3', ['Sqrt', 12], ['Multiply', 2, ['Sqrt', 3]]],
    ['½·√8 → √2', ['Multiply', ['Rational', 1, 2], ['Sqrt', 8]], ['Sqrt', 2]],
    ['1/√2 → ½·√2', ['Divide', 1, ['Sqrt', 2]], ['Multiply', ['Rational', 1, 2], ['Sqrt', 2]]],
    ['√(3/4) → ½·√3', ['Sqrt', ['Rational', 3, 4]], ['Multiply', ['Rational', 1, 2], ['Sqrt', 3]]],
    ['∛54 → 3∛2', ['Root', 54, 3], ['Multiply', 3, ['Root', 2, 3]]],
    ['1 + √18 → 1 + 3√2', ['Add', 1, ['Sqrt', 18]], ['Add', 1, ['Multiply', 3, ['Sqrt', 2]]]],
  ])('%s', (_, from, to) => {
    const store = new ExpressionStore(context());
    const a = expr(store, from), b = displayForm(store, a, none, 'real');
    expect(b).toBe(expr(store, to));
    expect(equalExactly(store, a, b)).toBe(true);
  });

  it('moves the sign out of odd inverse functions of negative constants, never of symbolic arguments', () => {
    const store = new ExpressionStore(context());
    expect(displayForm(store, expr(store, ['Arcsin', ['Rational', -1, 3]]), none, 'real')).toBe(expr(store, ['Negate', ['Arcsin', ['Rational', 1, 3]]]));
    expect(displayForm(store, expr(store, ['Arctan', ['Multiply', -2, ['Sqrt', 5]]]), none, 'real')).toBe(expr(store, ['Negate', ['Arctan', ['Multiply', 2, ['Sqrt', 5]]]]));
    const symbolic = expr(store, ['Arctan', ['Multiply', -2, 'a']]);
    expect(displayForm(store, symbolic, none, 'real')).toBe(symbolic);
    // √(12a) is stored as √12·√a: only the constant factor is rewritten.
    const radical = expr(store, ['Sqrt', ['Multiply', 12, 'a']]);
    expect(displayForm(store, radical, none, 'real')).toBe(expr(store, ['Multiply', 2, ['Sqrt', 3], ['Sqrt', 'a']]));
  });

  it('extracts k-th powers completely and keeps the original when the budget stops', () => {
    const store = new ExpressionStore(context());
    expect(extractPower(store, 2n ** 7n * 3n ** 4n * 1_000_003n ** 2n, 2)).toEqual({ s: 2n ** 3n * 9n * 1_000_003n, m: 2n });
    expect(extractPower(store, 1_000_003n * 1_000_033n, 2)).toEqual({ s: 1n, m: 1_000_003n * 1_000_033n });
    const tiny = new ExpressionStore(context({ work: 3_000 }));
    const big = expr(tiny, ['Sqrt', { num: (10n ** 40n + 7n).toString() }]);
    expect(displayForm(tiny, big, none, 'real')).toBe(big);
  });
});

group('certified decimals', () => {
  it('rounds exactly at the requested places (mpmath references)', () => {
    const store = new ExpressionStore(context());
    const v = (json: unknown): PointValue => ({ kind: 'expression', id: expr(store, json) });
    expect(decimalOf(store, v(['Sqrt', 2]), 10, 'real')).toEqual({ re: '1.4142135624' });
    expect(decimalOf(store, v(['Ln', 2]), 10, 'real')).toEqual({ re: '0.6931471806' });
    expect(decimalOf(store, v(['Divide', 'Pi', 6]), 12, 'real')).toEqual({ re: '0.523598775598' });
    expect(decimalOf(store, { kind: 'rational', value: { numerator: -5n, denominator: 8n } as never }, 2, 'real')).toEqual({ re: '-0.63' });
    expect(decimalOf(store, v(['Add', 'x', 1]), 4, 'real')).toBeUndefined();
    const q = finitePoints(['Equal', ['Add', ['Power', 'x', 5], ['Negate', 'x'], -1], 0], 'real');
    expect(decimalOf(q.store, q.points[0][0], 10, 'real')).toEqual({ re: '1.1673039783' });
    const c = finitePoints(['Equal', ['Add', ['Power', 'x', 3], 2], 0], 'complex');
    const texts = c.points.map(p => decimalOf(c.store, p[0], 10, 'complex'));
    expect(texts).toContainEqual({ re: '-1.2599210499' });
    expect(texts).toContainEqual({ re: '0.6299605249', im: '1.0911236360' });
    expect(texts).toContainEqual({ re: '0.6299605249', im: '-1.0911236360' });
  });

  it('gives no decimal when the budget stops', () => {
    const store = new ExpressionStore(context({ work: 2_000 }));
    expect(decimalOf(store, { kind: 'expression', id: expr(store, ['Ln', 2]) }, 2_000, 'real')).toBeUndefined();
  });
});

group('numeric order', () => {
  const show = (store: ExpressionStore, points: readonly (readonly PointValue[])[]) =>
    points.map(p => { const d = decimalOf(store, p[0], 3, 'complex'); return d ? (d.im ? `${d.re}${d.im.startsWith('-') ? '' : '+'}${d.im}i` : d.re) : '?'; });
  it('x³ = 1 over ℂ: 1, then −½ ± (√3/2)i with + first', () => {
    const { store, points } = finitePoints(['Equal', ['Power', 'x', 3], 1], 'complex');
    expect(show(store, orderPoints(store, points, 'complex'))).toEqual(['1.000', '-0.500+0.866i', '-0.500-0.866i']);
  });
  it('x⁴ = 4 over ℂ: −√2, √2, then ±√2·i', () => {
    const { store, points } = finitePoints(['Equal', ['Power', 'x', 4], 4], 'complex');
    expect(show(store, orderPoints(store, points, 'complex'))).toEqual(['-1.414', '1.414', '0.000+1.414i', '0.000-1.414i']);
  });
  it('x⁵ − 5x³ + 4x = 0 over ℝ: ascending', () => {
    const { store, points } = finitePoints(['Equal', ['Add', ['Power', 'x', 5], ['Multiply', -5, ['Power', 'x', 3]], ['Multiply', 4, 'x']], 0], 'real');
    expect(show(store, orderPoints(store, points, 'real'))).toEqual(['-2.000', '-1.000', '0.000', '1.000', '2.000']);
  });
});
