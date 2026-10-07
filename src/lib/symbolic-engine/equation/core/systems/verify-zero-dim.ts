import { demand, type ExecutionContext } from '../execution';
import { factorQ } from '../algebra/factor';
import type { Polynomial } from '../algebra/polynomial';
import { divideWithRemainder, integerToRational } from '../algebra/polynomial-division';
import { extendedGcdQ } from '../algebra/polynomial-gcd';
import { rational, rNegate, type Rational } from '../algebra/rational';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { diskOf } from '../decision/algebraic-coefficients';
import { QX } from '../decision/rational-form';
import type { EvaluationDomain, ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import type { Point } from '../representation/solution-set';
import type { Poly } from './groebner';
import { diskPoly, meets, rootsOf, univariate, type Matrix } from './zero-dim';

/**
 * Exact point evidence for a finite polynomial system inside one number field (NEW-EQUATION-RESPONSIVE1).
 *
 * Substituting a point whose coordinates are separate algebraic numbers into an equation multiplies numbers of
 * different fields (composed resultants of degree d₁·d₂·…), which took a minute for two degree-7 coordinates.
 * Instead, with the certified basis's multiplication matrices and its Hermite count N of distinct solutions:
 *
 * 1. A separating t = Σ cᵥ·xᵥ gives a square-free f of degree N and coordinates xᵥ = rᵥ(t) in ℚ[t]/(f)
 *    (the rational univariate representation, with g₁ inverted modulo f).
 * 2. Exact checks in ℚ[t]/(f), by polynomial remainders: Σ cᵥ·rᵥ ≡ t (so distinct roots of f give distinct
 *    points), and every equation of the extended system (the rows, and each ≠ row and condition through its
 *    Rabinowitsch variable) is ≡ 0. So the N points (rᵥ(τ)) for f(τ) = 0 are N distinct solutions: all of them.
 * 3. Each claimed point equals the point of one root τ: per coordinate, its defining polynomial m vanishes at
 *    rᵥ(τ) exactly (the irreducible factor of f at τ divides m(rᵥ) mod f), and certified disks single out the same
 *    root of m for both. Distinct claimed points meet distinct roots.
 *
 * Returns false (nothing proven, nothing refuted) when the claimed coordinates are not exact algebraic numbers or
 * g₁ is not invertible; the caller then substitutes the points as before. A failed exact check is a refutation.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

export function verifyPointsInNumberField(store: ExpressionStore, domain: EvaluationDomain, vars: readonly Matrix[], rank: number,
  extended: readonly Poly[], points: readonly Point[], n: number): boolean {
  const ctx = store.ctx;
  if (rank === 0 || points.some(p => p.slice(0, n).some(v => v.kind !== 'rational' && v.kind !== 'algebraic'))) return false;
  const { f, cs, g } = univariate(ctx, vars, rank);
  const mod = (p: Polynomial<Rational>) => divideWithRemainder(ctx, QX, p, f).remainder;
  const inverse = extendedGcdQ(ctx, QX, g(undefined), f);
  if (QX.degree(ctx, inverse.gcd) !== 0) return false;
  const r = vars.map(m => mod(QX.multiply(ctx, g(m), inverse.s)));

  let t = QX.zero(ctx);
  r.forEach((rv, v) => { t = QX.add(ctx, t, QX.scale(ctx, rv, cs[v])); });
  if (!QX.equal(ctx, mod(t), mod(QX.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)])))) fail('the separating element is not reproduced');
  for (const eq of extended) if (!QX.isZero(ctx, evaluateAt(ctx, eq, r, mod))) fail('a solution of the representation does not satisfy the system');

  const taus = rootsOf(store, f, domain).map(tau => ({ tau, factor: factorOf(ctx, tau) }));
  if (taus.length !== points.length) fail('the number of points differs from the number of solutions');
  const used = new Set<number>();
  for (const p of points) {
    const k = taus.findIndex(({ tau, factor }, i) => !used.has(i) && p.slice(0, n).every((v, j) => sameRoot(store, v as ExactValue, r[j], tau, factor, mod)));
    if (k < 0) fail('a claimed point does not satisfy the system');
    used.add(k);
  }
  return true;
}

/** e(r₁(t), …, r_w(t)) mod f for a polynomial e of the extended system. */
function evaluateAt(ctx: ExecutionContext, e: Poly, r: readonly Polynomial<Rational>[], mod: (p: Polynomial<Rational>) => Polynomial<Rational>): Polynomial<Rational> {
  const powers = r.map(rv => [QX.one(ctx), rv]);
  const power = (v: number, k: number) => {
    const list = powers[v];
    while (list.length <= k) list.push(mod(QX.multiply(ctx, list[list.length - 1], r[v])));
    return list[k];
  };
  let sum = QX.zero(ctx);
  for (const term of e) {
    ctx.tick();
    let product = QX.constant(ctx, term.c);
    term.e.forEach((k, v) => { if (k) product = mod(QX.multiply(ctx, product, power(v, k))); });
    sum = QX.add(ctx, sum, product);
  }
  return mod(sum);
}

/** The irreducible factor over ℚ that `tau` (a root of f) is a root of. */
function factorOf(ctx: ExecutionContext, tau: ExactValue): Polynomial<Rational> {
  return tau.kind === 'rational' ? QX.make(ctx, [rNegate(ctx, tau.value), rational(ctx, 1n)]) : integerToRational(ctx, QX, tau.root.poly);
}

/** Whether the claimed coordinate `value` equals rᵥ(τ), exactly. */
function sameRoot(store: ExpressionStore, value: ExactValue, rv: Polynomial<Rational>, tau: ExactValue, factor: Polynomial<Rational>,
  mod: (p: Polynomial<Rational>) => Polynomial<Rational>): boolean {
  const ctx = store.ctx;
  const m = value.kind === 'rational' ? QX.make(ctx, [rNegate(ctx, value.value), rational(ctx, 1n)]) : integerToRational(ctx, QX, value.root.poly);
  // m(rᵥ(t)) mod f, by Horner; it vanishes at τ exactly when τ's factor divides it.
  let at = QX.zero(ctx);
  for (let i = m.coefficients.length - 1; i >= 0; i--) at = mod(QX.add(ctx, QX.multiply(ctx, at, rv), QX.constant(ctx, m.coefficients[i])));
  if (!QX.isZero(ctx, divideWithRemainder(ctx, QX, at, factor).remainder)) return false;
  // Both are roots of m: the certified disks of all of m's roots single out one root for each.
  const roots = factorQ(ctx, QX, m, ALGEBRAIC_RING).factors.flatMap(({ factor: q }) => store.roots.roots(ctx, q)).map(x => ({ kind: 'algebraic', root: x }) as const);
  const pick = (disk: (w: Rational) => ReturnType<typeof diskOf>) => {
    for (let bits = 16n; ; bits *= 2n) {
      ctx.tick();
      const w = rational(ctx, 1n, 1n << bits), z = disk(w);
      const hits = roots.map((x, i) => (meets(ctx, diskOf(ctx, x, w), z) ? i : -1)).filter(i => i >= 0);
      if (hits.length === 1) return hits[0];
      if (hits.length === 0) fail('a coordinate meets no root of its polynomial');
    }
  };
  if (roots.length === 1) return true;
  return pick(w => diskOf(ctx, value, w)) === pick(w => diskPoly(ctx, rv, diskOf(ctx, tau, w)));
}
