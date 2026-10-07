import type { ExecutionContext } from '../execution';
import { rAdd, rational, rCompare, rDivide, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { rangeOps, type XRange } from '../composition/range';

/**
 * Closed rational intervals for the systems solver (EQUATION-CERTIFIED-NUMERICS1 PR B). Every operation rounds
 * outward to a multiple of 2^−bits, so the result always contains the exact one; boxes are vectors of
 * intervals. Floating point appears only in `approximateInverse`, whose result is converted exactly to dyadic
 * rationals: it is a preconditioner, and the proofs that use it (the Krawczyk inclusion) hold for any matrix.
 */
export type Iv = { readonly lo: Rational; readonly hi: Rational };

const { roundDown, roundUp } = rangeOps;
const lo = (ctx: ExecutionContext, q: Rational, bits: number) => roundDown(ctx, q, bits);
const hi = (ctx: ExecutionContext, q: Rational, bits: number) => roundUp(ctx, q, bits);

export const point = (q: Rational): Iv => ({ lo: q, hi: q });

export function ivAdd(ctx: ExecutionContext, a: Iv, b: Iv, bits: number): Iv {
  return { lo: lo(ctx, rAdd(ctx, a.lo, b.lo), bits), hi: hi(ctx, rAdd(ctx, a.hi, b.hi), bits) };
}

export function ivSub(ctx: ExecutionContext, a: Iv, b: Iv, bits: number): Iv {
  return { lo: lo(ctx, rSubtract(ctx, a.lo, b.hi), bits), hi: hi(ctx, rSubtract(ctx, a.hi, b.lo), bits) };
}

export function ivMul(ctx: ExecutionContext, a: Iv, b: Iv, bits: number): Iv {
  const p = [rMultiply(ctx, a.lo, b.lo), rMultiply(ctx, a.lo, b.hi), rMultiply(ctx, a.hi, b.lo), rMultiply(ctx, a.hi, b.hi)];
  const min = p.reduce((x, y) => (rCompare(ctx, y, x) < 0 ? y : x)), max = p.reduce((x, y) => (rCompare(ctx, y, x) > 0 ? y : x));
  return { lo: lo(ctx, min, bits), hi: hi(ctx, max, bits) };
}

export function ivMid(ctx: ExecutionContext, a: Iv): Rational {
  return rDivide(ctx, rAdd(ctx, a.lo, a.hi), rational(ctx, 2n));
}

export function ivWidth(ctx: ExecutionContext, a: Iv): Rational { return rSubtract(ctx, a.hi, a.lo); }

/** a lies strictly inside b. */
export function strictlyInside(ctx: ExecutionContext, a: Iv, b: Iv): boolean {
  return rCompare(ctx, b.lo, a.lo) < 0 && rCompare(ctx, a.hi, b.hi) < 0;
}

export function ivIntersect(ctx: ExecutionContext, a: Iv, b: Iv): Iv | undefined {
  const l = rCompare(ctx, a.lo, b.lo) >= 0 ? a.lo : b.lo, h = rCompare(ctx, a.hi, b.hi) <= 0 ? a.hi : b.hi;
  return rCompare(ctx, l, h) <= 0 ? { lo: l, hi: h } : undefined;
}

export function ivHull(ctx: ExecutionContext, a: Iv, b: Iv): Iv {
  return { lo: rCompare(ctx, a.lo, b.lo) <= 0 ? a.lo : b.lo, hi: rCompare(ctx, a.hi, b.hi) >= 0 ? a.hi : b.hi };
}

export const ivContainsZero = (a: Iv): boolean => a.lo.numerator <= 0n && a.hi.numerator >= 0n;

/** A bounded range as a closed interval (undefined when unbounded). */
export function fromRange(r: XRange): Iv | undefined {
  return r.lo !== undefined && r.hi !== undefined ? { lo: r.lo, hi: r.hi } : undefined;
}

export const toRange = (a: Iv): XRange => ({ lo: a.lo, hi: a.hi, loOpen: false, hiOpen: false });

/** The exact rational value of a finite double. */
export function fromDouble(ctx: ExecutionContext, v: number): Rational {
  if (!Number.isFinite(v)) throw new RangeError('not a finite double');
  if (v === 0) return rational(ctx, 0n);
  let m = Math.abs(v), e = 0;
  while (!Number.isInteger(m)) { m *= 2; e++; }
  const n = BigInt(m) * (v < 0 ? -1n : 1n);
  return e > 0 ? rational(ctx, n, 1n << BigInt(e)) : rational(ctx, n);
}

/** A double near a rational (an approximation only: it guides, never proves). */
export function toDouble(q: Rational): number {
  const n = q.numerator, d = q.denominator;
  const size = (n < 0n ? -n : n) > d ? (n < 0n ? -n : n) : d;
  const shift = BigInt(Math.max(0, size.toString(2).length - 1000));
  return Number(n >> shift) / Number(d >> shift);
}

/** An approximate inverse by Gauss–Jordan elimination with partial pivoting, or undefined when (nearly) singular. */
export function approximateInverse(m: readonly (readonly number[])[]): number[][] | undefined {
  const n = m.length, a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (!(Math.abs(a[p][c]) > 0) || !Number.isFinite(a[p][c])) return undefined;
    [a[c], a[p]] = [a[p], a[c]];
    const pivot = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === c || a[r][c] === 0) continue;
      const k = a[r][c];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= k * a[c][j];
    }
  }
  const inv = a.map(row => row.slice(n));
  return inv.every(row => row.every(Number.isFinite)) ? inv : undefined;
}

/** A rational matrix times an interval vector. */
export function matVec(ctx: ExecutionContext, m: readonly (readonly Rational[])[], v: readonly Iv[], bits: number): Iv[] {
  return m.map(row => row.reduce((acc: Iv, c, j) => ivAdd(ctx, acc, ivMul(ctx, point(c), v[j], bits), bits), point(rational(ctx, 0n))));
}

/** I − Y·J for a rational Y and an interval J. */
export function identityMinus(ctx: ExecutionContext, y: readonly (readonly Rational[])[], j: readonly (readonly Iv[])[], bits: number): Iv[][] {
  const n = y.length, zero = point(rational(ctx, 0n));
  return y.map((row, r) => Array.from({ length: n }, (_, c) => {
    const product = row.reduce((acc: Iv, yk, k) => ivAdd(ctx, acc, ivMul(ctx, point(yk), j[k][c], bits), bits), zero);
    return ivSub(ctx, point(rational(ctx, r === c ? 1n : 0n)), product, bits);
  }));
}

/** An interval matrix times an interval vector. */
export function ivMatVec(ctx: ExecutionContext, m: readonly (readonly Iv[])[], v: readonly Iv[], bits: number): Iv[] {
  return m.map(row => row.reduce((acc: Iv, c, j) => ivAdd(ctx, acc, ivMul(ctx, c, v[j], bits), bits), point(rational(ctx, 0n))));
}

export const ivNegate = (ctx: ExecutionContext, a: Iv): Iv => ({ lo: rNegate(ctx, a.hi), hi: rNegate(ctx, a.lo) });
