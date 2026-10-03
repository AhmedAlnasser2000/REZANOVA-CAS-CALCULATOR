import type { ExecutionContext } from '../execution';
import { imul, ipow } from '../algebra/integer';
import type { Rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { compareWithMinusInverseE, realSign } from '../representation/real-order';
import { parseLogLinear, singleLogTerm } from './constants';

/**
 * Real Lambert W solutions.
 *
 * u·eᵘ = K over ℝ: K > 0 → W₀(K); K = 0 → 0; −1/e < K < 0 → W₀(K) and W₋₁(K);
 * K = −1/e → −1; K < −1/e → none. K = −1/e is recognized structurally (the
 * builder folds W(−e⁻¹) = −1); otherwise the comparison with −1/e is decided
 * by certified enclosures.
 *
 * Exact simplification, each step justified:
 * - K algebraic and nonzero: W(K) is transcendental (Lindemann–Weierstrass), kept as W;
 * - K = s·eˢ for rational s: the builder folds W(K) = s on the matching branch;
 * - K = R·ln b for rational R and a coprime-base integer b ≥ 2: s = m·ln b with
 *   m·b^m = R. A rational m must be an integer (b is not a perfect power), and
 *   the integers are bounded by monotonicity of m·b^m, so the search is exact
 *   and finite. The branch is W₀ when s ≥ −1, W₋₁ when s ≤ −1.
 */
function integerSolutions(ctx: ExecutionContext, R: Rational, b: bigint): bigint[] {
  const out: bigint[] = [];
  const equal = (n: bigint, d: bigint) => n * R.denominator === R.numerator * d;
  if (R.numerator > 0n) {
    // m·b^m is increasing for m ≥ 1.
    for (let m = 1n; ; m++) {
      const v = imul(ctx, m, ipow(ctx, b, Number(m)));
      if (equal(v, 1n)) out.push(m);
      if (v * R.denominator > R.numerator) break;
    }
  } else if (R.numerator < 0n) {
    // m = −j: j/b^j = −R; j/b^j decreases once j·(b − 1) > 1.
    const target = { n: -R.numerator, d: R.denominator };
    for (let j = 1n; ; j++) {
      const den = ipow(ctx, b, Number(j));
      if (j * target.d === target.n * den) out.push(-j);
      if (j * (b - 1n) > 1n && j * target.d < target.n * den) break;
    }
  }
  return out;
}

/** Exact simplification of W_branch(K), or the W expression itself. */
export function simplifiedLambert(store: ExpressionStore, K: ExprId, branch: 0 | -1): ExprId {
  const built = store.lambertW(K, branch);
  if (store.numberValue(built)) return built;
  const ll = parseLogLinear(store, K);
  const single = ll ? singleLogTerm(store.ctx, ll) : undefined;
  if (single && single.base.denominator === 1n) {
    for (const m of integerSolutions(store.ctx, single.coefficient, single.base.numerator)) {
      store.ctx.tick();
      const s = store.mul(store.integer(m), store.log(store.number(single.base)));
      const position = realSign(store, store.add(s, store.integer(1)));
      if ((branch === 0 && position >= 0) || (branch === -1 && position <= 0)) return s;
    }
  }
  return built;
}

/** All real u with u·eᵘ = K, as closed forms. */
export function lambertRoots(store: ExpressionStore, K: ExprId): ExprId[] {
  const sign = realSign(store, K);
  if (sign === 0) return [store.integer(0)];
  if (sign > 0) return [simplifiedLambert(store, K, 0)];
  const principal = store.lambertW(K, 0);
  if (store.numberValue(principal)?.numerator === -1n && store.numberValue(principal)?.denominator === 1n) return [principal];
  if (compareWithMinusInverseE(store, K) < 0) return [];
  return [simplifiedLambert(store, K, 0), simplifiedLambert(store, K, -1)];
}

/**
 * Real x with (x + s)ⁿ·e^{p·x + q} = k (n ≥ 1, p ≠ 0), as closed forms.
 * Real n-th roots first; then y = x + s, u = (p/n)·y gives u·eᵘ = K.
 */
export function solveLambertForm(store: ExpressionStore, s: ExprId, n: number, p: ExprId, q: ExprId, k: ExprId): ExprId[] {
  const sk = realSign(store, k), minusS = store.neg(s);
  if (sk === 0) return [minusS];
  let levels: ExprId[];
  if (n === 1) levels = [k];
  else if (n % 2 === 1) levels = [sk > 0 ? store.root(k, n) : store.neg(store.root(store.neg(k), n))];
  else if (sk < 0) return [];
  else { const r = store.root(k, n); levels = [r, store.neg(r)]; }
  const pn = store.div(p, store.integer(n)), qn = store.div(q, store.integer(n));
  const out = new Map<ExprId, true>();
  for (const level of levels) {
    // (x + s)·e^{pn·x + qn} = level  ⇔  u·eᵘ = pn·level·e^{pn·s − qn} with u = pn·(x + s).
    const K = store.mul(pn, level, store.exp(store.sub(store.mul(pn, s), qn)));
    for (const u of lambertRoots(store, K)) out.set(store.sub(store.div(u, pn), s), true);
  }
  return [...out.keys()];
}

/** The integer search, exported for tests. */
export function lambertIntegerSolutions(ctx: ExecutionContext, R: Rational, b: bigint): bigint[] { return integerSolutions(ctx, R, b); }
