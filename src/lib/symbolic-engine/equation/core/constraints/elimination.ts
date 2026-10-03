import { determinant } from '../algebra/linear';
import { rAdd, rational, rDivide, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { OWNERS, QX, type Refusal } from '../decision/rational-form';
import { zerosOf as polynomialZeros } from '../decision/univariate';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { monomial, multiply, reduce, towerForm, type SPoly, type TowerLevel } from './tower';

/**
 * Radical elimination by the tower norm.
 *
 * With f = N/D in tower form, the norm R(x) = det(multiplication by N on
 * ℚ[x][w]/(tower)) is the product of N over every assignment of the tower's
 * roots (with multiplicity), so every real zero of f (one assignment: the real
 * branch, with D ≠ 0) is a root of R. R is computed exactly: the matrix
 * entries are polynomials in x, so deg R ≤ Σ_columns max entry degree; R is
 * evaluated (Bareiss determinant over ℚ) at that many integer points plus one
 * and interpolated. Each real root of R is a candidate, kept only when exact
 * evaluation of f there is 0 (outside the domain or nonzero: dropped). The
 * step is forward-only; the exact confirmation makes the list complete and
 * sound. R ≡ 0 with N ≢ 0 means dependent radicals (a zero divisor), refused.
 */
export type Eliminated =
  | { readonly kind: 'values'; readonly values: ExprId[] }
  | { readonly kind: 'all' }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

/** Mixed-radix basis of monomials w^β with βᵢ < dᵢ. */
function basis(tower: readonly TowerLevel[]): { size: number; index: (exponents: readonly number[]) => number; mono: (j: number) => number[] } {
  const strides: number[] = [];
  let size = 1;
  for (const level of tower) { strides.push(size); size *= level.degree; }
  return {
    size,
    index: e => e.reduce((acc, v, i) => acc + v * strides[i], 0),
    mono: j => [0, ...tower.map((level, i) => Math.floor(j / strides[i]) % level.degree)],
  };
}

/** Multiplication matrix of N: entry (row, column) is a dense polynomial in x. */
function multiplicationMatrix(store: ExpressionStore, n: SPoly, tower: readonly TowerLevel[]): Rational[][][] {
  const ctx = store.ctx, b = basis(tower);
  ctx.allocate(b.size * b.size);
  const m: Rational[][][] = Array.from({ length: b.size }, () => Array.from({ length: b.size }, () => []));
  for (let j = 0; j < b.size; j++) {
    const product = reduce(ctx, multiply(ctx, n, monomial(ctx, b.mono(j))), tower);
    for (const t of product.values()) {
      const row = b.index(tower.map((_, i) => t.mono[i + 1] ?? 0)), d = t.mono[0] ?? 0, entry = m[row][j];
      ctx.allocate(d + 1);
      while (entry.length <= d) entry.push(rational(ctx, 0n));
      entry[d] = rAdd(ctx, entry[d], t.c);
    }
  }
  return m;
}

function horner(store: ExpressionStore, p: readonly Rational[], x: Rational): Rational {
  const ctx = store.ctx;
  let acc = rational(ctx, 0n);
  for (let i = p.length - 1; i >= 0; i--) acc = rAdd(ctx, rMultiply(ctx, acc, x), p[i]);
  return acc;
}

/** Newton interpolation through (xᵢ, yᵢ), in monomial coefficients. */
function interpolate(store: ExpressionStore, xs: readonly Rational[], ys: readonly Rational[]): Rational[] {
  const ctx = store.ctx, n = xs.length, a = [...ys];
  for (let k = 1; k < n; k++) {
    for (let i = n - 1; i >= k; i--) { ctx.tick(); a[i] = rDivide(ctx, rSubtract(ctx, a[i], a[i - 1]), rSubtract(ctx, xs[i], xs[i - k])); }
  }
  let p: Rational[] = [a[n - 1]];
  for (let i = n - 2; i >= 0; i--) {
    // p ← p·(x − xᵢ) + aᵢ
    const next = Array.from({ length: p.length + 1 }, () => rational(ctx, 0n));
    p.forEach((c, k) => { next[k + 1] = rAdd(ctx, next[k + 1], c); next[k] = rSubtract(ctx, next[k], rMultiply(ctx, c, xs[i])); });
    next[0] = rAdd(ctx, next[0], a[i]);
    p = next;
  }
  return p;
}

/** The norm R(x) of N over the tower (exact). */
export function towerNorm(store: ExpressionStore, n: SPoly, tower: readonly TowerLevel[]): Rational[] {
  const ctx = store.ctx, m = multiplicationMatrix(store, n, tower), size = m.length;
  let bound = 0;
  for (let j = 0; j < size; j++) bound += Math.max(0, ...m.map(row => row[j].length - 1));
  const xs: Rational[] = [], ys: Rational[] = [];
  for (let i = 0; i <= bound; i++) {
    ctx.tick();
    const point = rational(ctx, BigInt(i % 2 === 1 ? (i + 1) / 2 : -i / 2));
    xs.push(point);
    ys.push(determinant(ctx, m.map(row => row.map(entry => horner(store, entry, point)))));
  }
  return interpolate(store, xs, ys);
}

export function eliminateRadicals(store: ExpressionStore, f: ExprId, x: string): Eliminated {
  const ctx = store.ctx;
  const form = towerForm(store, f, x);
  if (form.kind === 'refused') return form;
  if (form.kind === 'undefined-everywhere') return { kind: 'values', values: [] };
  if (form.num.size === 0) return { kind: 'all' };
  const norm = QX.make(ctx, towerNorm(store, form.num, form.tower));
  if (norm.coefficients.length === 0) return { kind: 'refused', refusal: { owner: OWNERS.constraints, detail: 'dependent radicals (the elimination norm vanishes identically)' } };
  const values: ExprId[] = [];
  for (const z of polynomialZeros(store, { kind: 'rational', poly: norm }, 'real')) {
    const c = z.kind === 'rational' ? store.number(z.value) : store.algebraic(z.root);
    const e = evaluateExact(store, store.substitute(f, new Map([[x, c]])), 'real');
    if (e.kind === 'undefined') continue;
    if (e.kind !== 'exact') return { kind: 'refused', refusal: { owner: OWNERS.constraints, detail: `a candidate cannot be confirmed exactly (${e.detail})` } };
    if (e.value.kind === 'rational' && e.value.value.numerator === 0n) values.push(c);
  }
  return { kind: 'values', values };
}
