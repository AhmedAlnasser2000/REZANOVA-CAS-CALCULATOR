import { demand, type ExecutionContext } from '../execution';
import { igcd, imul, iquot } from '../algebra/integer';
import type { Polynomial } from '../algebra/polynomial';
import { exactQuotient } from '../algebra/polynomial-division';
import { gcdQ } from '../algebra/polynomial-gcd';
import { rational, rDivide, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { resultantQ } from '../algebra/subresultant';
import { QX } from '../decision/rational-form';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { coefficientsIn, degreeIn, type MPoly } from './mpoly';

/**
 * Polynomials in ℚ[p][x] for the one-parameter cells: ascending coefficients
 * in x, each a polynomial in p over ℚ (in the ring QX, whose variable name is
 * irrelevant here). Trimmed: the last coefficient is nonzero; zero is [].
 *
 * Contents and primitive parts are taken over ℚ[p], gcds in x by the
 * primitive pseudo-remainder sequence (Gauss's lemma), resultants in p by
 * evaluation at integer points and exact interpolation under the degree bound
 * deg_p res(A, B) ≤ deg_x B·deg_p A + deg_x A·deg_p B.
 */
export type BPoly = readonly Polynomial<Rational>[];
type P = Polynomial<Rational>;

const trim = (ctx: ExecutionContext, c: readonly P[]): BPoly => {
  let n = c.length;
  while (n > 0 && QX.isZero(ctx, c[n - 1])) n--;
  return Object.freeze(c.slice(0, n));
};
const zeroP = (ctx: ExecutionContext) => QX.zero(ctx);
export const degX = (a: BPoly) => a.length - 1;
export const lcX = (a: BPoly) => a[a.length - 1];
export function degP(ctx: ExecutionContext, a: BPoly): number { return Math.max(-1, ...a.map(c => QX.degree(ctx, c))); }

/** From a sparse polynomial in the variables [x, p] (positions xi and pi). */
export function fromMPoly(ctx: ExecutionContext, a: MPoly, xi: number, pi: number): BPoly {
  return trim(ctx, coefficientsIn(a, xi).map(c => {
    const out: Rational[] = Array.from({ length: Math.max(0, degreeIn(c, pi) + 1) }, () => rational(ctx, 0n));
    for (const [k, v] of c.terms) out[Number(k.split(',')[pi])] = v;
    return QX.make(ctx, out);
  }));
}

function sub(ctx: ExecutionContext, a: BPoly, b: BPoly): BPoly {
  return trim(ctx, Array.from({ length: Math.max(a.length, b.length) }, (_, i) => QX.subtract(ctx, a[i] ?? zeroP(ctx), b[i] ?? zeroP(ctx))));
}
const scale = (ctx: ExecutionContext, a: BPoly, c: P): BPoly => trim(ctx, a.map(v => QX.multiply(ctx, v, c)));
const shift = (ctx: ExecutionContext, a: BPoly, k: number): BPoly => trim(ctx, [...Array.from({ length: k }, () => zeroP(ctx)), ...a]);

export function derivX(ctx: ExecutionContext, a: BPoly): BPoly {
  return trim(ctx, a.slice(1).map((c, i) => QX.scale(ctx, c, rational(ctx, BigInt(i + 1)))));
}

/** Pseudo-remainder in x: lc(b)^k·a mod b. */
function prem(ctx: ExecutionContext, a: BPoly, b: BPoly): BPoly {
  let r = a;
  const lb = lcX(b);
  while (r.length && degX(r) >= degX(b)) {
    ctx.tick();
    r = sub(ctx, scale(ctx, r, lb), scale(ctx, shift(ctx, b, degX(r) - degX(b)), lcX(r)));
  }
  return r;
}

/** Monic gcd over ℚ of the coefficients (the content in ℚ[p]). */
export function content(ctx: ExecutionContext, a: BPoly): P {
  return a.reduce((g, c) => gcdQ(ctx, QX, g, c), zeroP(ctx));
}

/**
 * Primitive part, scaled to integer coefficients with gcd 1 and a positive
 * leading term (highest power of x, then of p): a canonical representative.
 */
export function primitive(ctx: ExecutionContext, a: BPoly): BPoly {
  if (a.length === 0) return a;
  const c = content(ctx, a);
  const pp = a.map(v => exactQuotient(ctx, QX, v, c));
  let den = 1n, num = 0n;
  for (const v of pp) for (const q of v.coefficients) { den = iquot(ctx, imul(ctx, den, q.denominator), igcd(ctx, den, q.denominator)); num = igcd(ctx, num, q.numerator); }
  const top = QX.leading(ctx, pp[pp.length - 1]);
  const factor = rational(ctx, top.numerator < 0n ? -den : den, num < 0n ? -num : num);
  return trim(ctx, pp.map(v => QX.scale(ctx, v, factor)));
}

/** Primitive gcd in x (deg ≥ 0) of nonzero a, b, by the primitive PRS. */
export function gcdX(ctx: ExecutionContext, a: BPoly, b: BPoly): BPoly {
  let x = primitive(ctx, a), y = primitive(ctx, b);
  if (degX(x) < degX(y)) [x, y] = [y, x];
  while (y.length) {
    ctx.tick();
    const r = prem(ctx, x, y);
    x = y;
    y = r.length ? primitive(ctx, r) : r;
  }
  return primitive(ctx, x);
}

/** Exact quotient a / b in ℚ[p][x] for a primitive b that divides a. */
export function divideX(ctx: ExecutionContext, a: BPoly, b: BPoly): BPoly {
  const r = [...a], db = degX(b), lb = lcX(b);
  const q: P[] = Array.from({ length: Math.max(0, r.length - db) }, () => zeroP(ctx));
  for (let k = r.length - 1; k >= db; k--) {
    ctx.tick();
    if (QX.isZero(ctx, r[k])) continue;
    const c = exactQuotient(ctx, QX, r[k], lb);
    q[k - db] = c;
    for (let j = 0; j <= db; j++) r[k - db + j] = QX.subtract(ctx, r[k - db + j], QX.multiply(ctx, c, b[j]));
  }
  demand(r.every(c => QX.isZero(ctx, c)), 'nonexact-division', 'bivariate exact division');
  return trim(ctx, q);
}

/** Square-free part in x of a primitive polynomial of positive degree. */
export function squareFreeX(ctx: ExecutionContext, a: BPoly): BPoly {
  return primitive(ctx, divideX(ctx, a, gcdX(ctx, a, derivX(ctx, a))));
}

/**
 * A coprime square-free basis: primitive polynomials of positive x-degree,
 * pairwise coprime over ℚ(p), whose products give the square-free parts of the inputs.
 */
export function coprimeBasis(ctx: ExecutionContext, inputs: readonly BPoly[]): BPoly[] {
  const basis: BPoly[] = [];
  for (const input of inputs) {
    let f = squareFreeX(ctx, input);
    for (let i = 0; i < basis.length && degX(f) > 0; i++) {
      ctx.tick();
      const g = gcdX(ctx, f, basis[i]);
      if (degX(g) === 0) continue;
      const rest = primitive(ctx, divideX(ctx, basis[i], g));
      basis.splice(i, 1, g, ...(degX(rest) > 0 ? [rest] : []));
      f = primitive(ctx, divideX(ctx, f, g));
      i += degX(rest) > 0 ? 1 : 0;
    }
    if (degX(f) > 0) basis.push(f);
  }
  return basis;
}

/** a(x, t) for a rational t: a polynomial in x (ring QX). */
export function specialize(ctx: ExecutionContext, a: BPoly, t: Rational): P {
  return QX.make(ctx, a.map(c => QX.evaluate(ctx, c, t)));
}

/** res_x(a, b) as a polynomial in p, by evaluation at integers and Newton interpolation. */
export function resultantX(ctx: ExecutionContext, a: BPoly, b: BPoly): P {
  const bound = degX(b) * degP(ctx, a) + degX(a) * degP(ctx, b);
  const xs: Rational[] = [], ys: Rational[] = [];
  for (let n = 0; xs.length <= bound; n++) {
    ctx.tick();
    const t = rational(ctx, BigInt(n % 2 ? (n + 1) / 2 : -n / 2));
    if (QX.evaluate(ctx, lcX(a), t).numerator === 0n || QX.evaluate(ctx, lcX(b), t).numerator === 0n) continue;
    xs.push(t);
    ys.push(resultantQ(ctx, QX, specialize(ctx, a, t), specialize(ctx, b, t)));
  }
  return interpolate(ctx, xs, ys);
}

function interpolate(ctx: ExecutionContext, xs: readonly Rational[], ys: readonly Rational[]): P {
  const c = [...ys];
  for (let j = 1; j < xs.length; j++) {
    for (let i = xs.length - 1; i >= j; i--) {
      ctx.tick();
      c[i] = rDivide(ctx, rSubtract(ctx, c[i], c[i - 1]), rSubtract(ctx, xs[i], xs[i - j]));
    }
  }
  let out = QX.constant(ctx, c[c.length - 1]);
  for (let i = c.length - 2; i >= 0; i--) {
    out = QX.add(ctx, QX.multiply(ctx, out, QX.make(ctx, [rMultiply(ctx, xs[i], rational(ctx, -1n)), rational(ctx, 1n)])), QX.constant(ctx, c[i]));
  }
  return out;
}

/** Σ cⱼ·pʲ as an expression. */
export function pExpression(store: ExpressionStore, c: P, p: string): ExprId {
  const s = store.symbol(p);
  return store.add(store.integer(0), ...c.coefficients.map((v, j) => (j === 0 ? store.number(v) : store.mul(store.number(v), store.pow(s, store.integer(j))))));
}

/** Σ cᵢ(p)·xⁱ as an expression. */
export function bExpression(store: ExpressionStore, a: BPoly, x: string, p: string): ExprId {
  const s = store.symbol(x);
  return store.add(store.integer(0), ...a.map((c, i) => (i === 0 ? pExpression(store, c, p) : store.mul(pExpression(store, c, p), store.pow(s, store.integer(i))))));
}
