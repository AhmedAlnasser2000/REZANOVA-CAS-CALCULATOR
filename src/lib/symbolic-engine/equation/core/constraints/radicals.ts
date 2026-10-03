import { igcd, imul, iquot } from '../algebra/integer';
import type { Rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { evaluateExact } from '../representation/evaluate';
import { realSign } from '../representation/real-order';
import { polynomialCoefficients, replaceSubexpressions } from '../generators/lattice';

/**
 * Real radicals of the target.
 *
 * Semantics (ℝ): v^{p/q} with p/q reduced is (the real q-th root of v)^p,
 * defined for v ≥ 0 when q is even and for every v when q is odd (v ≠ 0 when
 * p < 0).
 *
 * - Inversion: v^{p/q} = c ⇔ r^p = c for the real root r of v; r ranges over
 *   the real |p|-th roots of c (or of 1/c), kept nonnegative for even q, and
 *   then v = r^q. Every step is an equivalence.
 * - Same-base lattice: radicals v^{pᵢ/qᵢ} of one base become integer powers
 *   of t = v^{1/L} with L = lcm(qᵢ); t ≥ 0 exactly when L is even (then some
 *   qᵢ is even and the domain already requires v ≥ 0). v = t^L is a bijection
 *   on that domain, so the substitution is an equivalence. When the variable
 *   also appears outside the radicals, v must be affine, v = a·x + b with an
 *   exact a ≠ 0, and x = (t^L − b)/a.
 */
export interface RadicalKernel { readonly kernel: ExprId; readonly base: ExprId; readonly exponent: Rational }

export function asRadical(store: ExpressionStore, kernel: ExprId): RadicalKernel | undefined {
  const n = store.node(kernel);
  if (n.kind !== 'pow') return undefined;
  const e = store.numberValue(n.exponent);
  return e && e.denominator > 1n ? { kernel, base: n.base, exponent: e } : undefined;
}

/** The real n-th roots of a closed form c (n ≥ 1). */
export function realNthRoots(store: ExpressionStore, c: ExprId, n: bigint): ExprId[] {
  const s = realSign(store, c);
  if (n === 1n) return [c];
  if (s === 0) return [store.integer(0)];
  if (n % 2n === 1n) return [s > 0 ? store.root(c, n) : store.neg(store.root(store.neg(c), n))];
  if (s < 0) return [];
  const r = store.root(c, n);
  return [r, store.neg(r)];
}

/** Goals for v^{p/q} = c. */
export function invertRadical(store: ExpressionStore, r: RadicalKernel, c: ExprId): { h: ExprId; level: ExprId }[] {
  const p = r.exponent.numerator, q = r.exponent.denominator;
  let target = c;
  if (p < 0n) {
    if (realSign(store, c) === 0) return [];
    target = store.div(store.integer(1), c);
  }
  const roots = realNthRoots(store, target, p < 0n ? -p : p).filter(s => q % 2n === 1n || realSign(store, s) >= 0);
  return roots.map(s => ({ h: r.base, level: store.pow(s, store.integer(q)) }));
}

export interface SameBase { readonly expression: ExprId; readonly order: bigint; readonly base: ExprId }

/**
 * Substitute v^{p/q} → τ^{(p/q)·L} (and, when the target also appears outside
 * the radicals, x → (τ^L − b)/a). Undefined unless every radical shares one
 * base, affine with an exact nonzero slope when the target is outside.
 */
export function sameBaseSubstitution(store: ExpressionStore, h: ExprId, radicals: readonly RadicalKernel[], variable: string, outside: boolean, tau: ExprId): SameBase | undefined {
  const ctx = store.ctx, base = radicals[0].base;
  if (radicals.some(r => r.base !== base)) return undefined;
  let L = 1n;
  for (const r of radicals) L = iquot(ctx, imul(ctx, L, r.exponent.denominator), igcd(ctx, L, r.exponent.denominator));
  let xOf: ExprId | undefined;
  if (outside) {
    const c = polynomialCoefficients(store, base, variable);
    if (!c || c.length !== 2) return undefined;
    const slope = evaluateExact(store, c[1], 'real');
    if (slope.kind !== 'exact' || (slope.value.kind === 'rational' && slope.value.value.numerator === 0n)) return undefined;
    xOf = store.div(store.sub(store.pow(tau, store.integer(L)), c[0]), c[1]);
  }
  const map = new Map(radicals.map(r => [r.kernel, store.pow(tau, store.integer(iquot(ctx, imul(ctx, r.exponent.numerator, L), r.exponent.denominator)))]));
  let expression = replaceSubexpressions(store, h, map);
  if (xOf !== undefined) expression = store.substitute(expression, new Map([[variable, xOf]]));
  return { expression, order: L, base };
}
