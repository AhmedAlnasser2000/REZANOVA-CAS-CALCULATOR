import { demand, type ExecutionContext } from '../execution';
import { QQ } from '../algebra/domain';
import { factorQ } from '../algebra/factor';
import { imul, ipow } from '../algebra/integer';
import { PolynomialRing, type Polynomial } from '../algebra/polynomial';
import { rational, rAbs, rAdd, rDivide, rEqual, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { resultantZ } from '../algebra/subresultant';
import { taylorShift } from './shift';
import { compareRational } from './real-roots';
import {
  ALGEBRAIC_RING, refineComplex, refineReal, rootsOfIrreducible, type ComplexRootOf, type RealRootOf, type RootOf,
} from './root-of';

const RATIONAL_RING = new PolynomialRing(QQ, 'x');

/** A region known to contain a value: a real interval or a complex disk. */
type Region = { kind: 'interval'; lo: Rational; hi: Rational } | { kind: 'disk'; re: Rational; im: Rational; radius: Rational };

function regionOf(r: RootOf): Region {
  return r.kind === 'real' ? { kind: 'interval', lo: r.lo, hi: r.hi } : { kind: 'disk', re: r.re, im: r.im, radius: r.radius };
}

/** Disk containing a region (center and radius bound). */
function asDisk(ctx: ExecutionContext, g: Region): { re: Rational; im: Rational; radius: Rational } {
  if (g.kind === 'disk') return g;
  const two = rational(ctx, 2n);
  return { re: rDivide(ctx, rAdd(ctx, g.lo, g.hi), two), im: rational(ctx, 0n), radius: rDivide(ctx, rSubtract(ctx, g.hi, g.lo), two) };
}

/** |c| ≤ |re| + |im| (a rational upper bound). */
function absBound(ctx: ExecutionContext, re: Rational, im: Rational): Rational { return rAdd(ctx, rAbs(ctx, re), rAbs(ctx, im)); }

function intersects(ctx: ExecutionContext, a: Region, b: Region): boolean {
  if (a.kind === 'interval' && b.kind === 'interval') return compareRational(ctx, a.lo, b.hi) <= 0 && compareRational(ctx, b.lo, a.hi) <= 0;
  if (a.kind === 'disk' && b.kind === 'disk') {
    const dr = rSubtract(ctx, a.re, b.re), di = rSubtract(ctx, a.im, b.im), s = rAdd(ctx, a.radius, b.radius);
    return compareRational(ctx, rAdd(ctx, rMultiply(ctx, dr, dr), rMultiply(ctx, di, di)), rMultiply(ctx, s, s)) <= 0;
  }
  const [iv, disk] = a.kind === 'interval' ? [a, b as Extract<Region, { kind: 'disk' }>] : [b as Extract<Region, { kind: 'interval' }>, a];
  const x = compareRational(ctx, disk.re, iv.lo) < 0 ? iv.lo : compareRational(ctx, disk.re, iv.hi) > 0 ? iv.hi : disk.re;
  const dx = rSubtract(ctx, x, disk.re);
  return compareRational(ctx, rAdd(ctx, rMultiply(ctx, dx, dx), rMultiply(ctx, disk.im, disk.im)), rMultiply(ctx, disk.radius, disk.radius)) <= 0;
}

type Operation = 'add' | 'subtract' | 'multiply';

/** Image region of the operation applied to two regions (interval arithmetic or disk arithmetic). */
function image(ctx: ExecutionContext, op: Operation, a: Region, b: Region): Region {
  if (a.kind === 'interval' && b.kind === 'interval') {
    if (op === 'add') return { kind: 'interval', lo: rAdd(ctx, a.lo, b.lo), hi: rAdd(ctx, a.hi, b.hi) };
    if (op === 'subtract') return { kind: 'interval', lo: rSubtract(ctx, a.lo, b.hi), hi: rSubtract(ctx, a.hi, b.lo) };
    const products = [rMultiply(ctx, a.lo, b.lo), rMultiply(ctx, a.lo, b.hi), rMultiply(ctx, a.hi, b.lo), rMultiply(ctx, a.hi, b.hi)];
    const sorted = products.sort((x, y) => compareRational(ctx, x, y));
    return { kind: 'interval', lo: sorted[0], hi: sorted[3] };
  }
  const x = asDisk(ctx, a), y = asDisk(ctx, b);
  if (op !== 'multiply') {
    const sign = op === 'add' ? rAdd : rSubtract;
    return { kind: 'disk', re: sign(ctx, x.re, y.re), im: sign(ctx, x.im, y.im), radius: rAdd(ctx, x.radius, y.radius) };
  }
  // (cx + ex)(cy + ey) = cx·cy + cx·ey + cy·ex + ex·ey with |ex| ≤ rx, |ey| ≤ ry.
  const re = rSubtract(ctx, rMultiply(ctx, x.re, y.re), rMultiply(ctx, x.im, y.im));
  const im = rAdd(ctx, rMultiply(ctx, x.re, y.im), rMultiply(ctx, x.im, y.re));
  const radius = rAdd(ctx, rAdd(ctx, rMultiply(ctx, absBound(ctx, x.re, x.im), y.radius), rMultiply(ctx, absBound(ctx, y.re, y.im), x.radius)), rMultiply(ctx, x.radius, y.radius));
  return { kind: 'disk', re, im, radius };
}

/**
 * Resultant polynomial R(t) whose roots include α∘β, computed by evaluation at
 * t = 0..D and exact interpolation (no bivariate arithmetic needed):
 * add: Res_y(P(y), Q(t − y)); subtract: Res_y(P(y), Q(y − t)); multiply: Res_y(P(y), y^dq·Q(t/y)).
 */
function candidatePolynomial(ctx: ExecutionContext, op: Operation, P: Polynomial<bigint>, Q: Polynomial<bigint>): Polynomial<Rational> {
  const dp = P.coefficients.length - 1, dq = Q.coefficients.length - 1, D = dp * dq;
  const values: Rational[] = [];
  for (let t = 0; t <= D; t++) {
    const T = BigInt(t);
    let inY: bigint[];
    if (op === 'multiply') {
      // y^dq·Q(t/y) = Σ qᵢ tⁱ y^(dq − i)
      inY = Array<bigint>(dq + 1).fill(0n);
      Q.coefficients.forEach((q, i) => { inY[dq - i] = imul(ctx, q, ipow(ctx, T, i)); });
    } else if (op === 'add') {
      // Q(t − y): shift to Q(t + u), then u = −y negates odd coefficients.
      inY = taylorShift(ctx, Q.coefficients, T).map((c, i) => (i % 2 === 1 ? -c : c));
    } else {
      // Q(y − t): shift by −t.
      inY = taylorShift(ctx, Q.coefficients, -T);
    }
    while (inY.length > 1 && inY[inY.length - 1] === 0n) inY.pop();
    values.push(rational(ctx, resultantZ(ctx, ALGEBRAIC_RING, P, ALGEBRAIC_RING.make(ctx, inY))));
  }
  return interpolate(ctx, values);
}

/** Newton divided differences at x = 0..D, converted to monomial coefficients. */
function interpolate(ctx: ExecutionContext, values: Rational[]): Polynomial<Rational> {
  const D = values.length - 1, dd = [...values];
  for (let level = 1; level <= D; level++) {
    for (let i = D; i >= level; i--) dd[i] = rDivide(ctx, rSubtract(ctx, dd[i], dd[i - 1]), rational(ctx, BigInt(level)));
  }
  // p(x) = dd0 + dd1·x + dd2·x(x−1) + … (Horner in the Newton basis).
  let poly = RATIONAL_RING.constant(ctx, dd[D]);
  for (let i = D - 1; i >= 0; i--) {
    poly = RATIONAL_RING.add(ctx, RATIONAL_RING.multiply(ctx, poly, RATIONAL_RING.make(ctx, [rational(ctx, BigInt(-i)), rational(ctx, 1n)])), RATIONAL_RING.constant(ctx, dd[i]));
  }
  for (let x = 0; x <= D; x++) {
    demand(rEqual(ctx, RATIONAL_RING.evaluate(ctx, poly, rational(ctx, BigInt(x))), values[x]), 'verification-failed', 'interpolation');
  }
  return poly;
}

function refine(ctx: ExecutionContext, r: RootOf): RootOf {
  if (r.kind === 'real') {
    if (r.poly.coefficients.length === 2) return r;
    return refineReal(ctx, r, rDivide(ctx, rSubtract(ctx, r.hi, r.lo), rational(ctx, 2n)));
  }
  if (r.radius.numerator === 0n) return r;
  return refineComplex(ctx, r, r.radius);
}

/**
 * α ∘ β for ∘ ∈ {+, −, ·}: compute the resultant candidate, factor it, and pick
 * the unique candidate root inside the image of the operands' regions, refining
 * operands and candidates until exactly one remains. Exact and canonical.
 */
export function combine(ctx: ExecutionContext, op: Operation, a: RootOf, b: RootOf): RootOf {
  const candidates = factorQ(ctx, RATIONAL_RING, candidatePolynomial(ctx, op, a.poly, b.poly), ALGEBRAIC_RING).factors
    .flatMap(({ factor }) => rootsOfIrreducible(ctx, factor));
  demand(candidates.length > 0, 'verification-failed', 'resultant has no roots');
  let x = a, y = b, pool = candidates;
  for (;;) {
    ctx.tick();
    const target = image(ctx, op, regionOf(x), regionOf(y));
    pool = pool.filter(c => intersects(ctx, regionOf(c), target));
    demand(pool.length > 0, 'verification-failed', 'no candidate inside the operand image');
    if (pool.length === 1) return pool[0];
    x = refine(ctx, x); y = refine(ctx, y);
    pool = pool.map(c => refine(ctx, c));
  }
}

export const add = (ctx: ExecutionContext, a: RootOf, b: RootOf) => combine(ctx, 'add', a, b);
export const subtract = (ctx: ExecutionContext, a: RootOf, b: RootOf) => combine(ctx, 'subtract', a, b);
export const multiply = (ctx: ExecutionContext, a: RootOf, b: RootOf) => combine(ctx, 'multiply', a, b);

/** −α: minimal polynomial P(−x) (sign-normalized), region mirrored. */
export function negate(ctx: ExecutionContext, a: RootOf): RootOf {
  const flipped = a.poly.coefficients.map((c, i) => (i % 2 === 1 ? -c : c));
  const poly = ALGEBRAIC_RING.make(ctx, flipped[flipped.length - 1] < 0n ? flipped.map(c => -c) : flipped);
  if (a.kind === 'real') return Object.freeze({ kind: 'real' as const, poly, lo: rNegate(ctx, a.hi), hi: rNegate(ctx, a.lo) }) as RealRootOf;
  return Object.freeze({ ...a, poly, re: rNegate(ctx, a.re), im: rNegate(ctx, a.im) }) as ComplexRootOf;
}

/** 1/α for α ≠ 0: minimal polynomial xⁿ·P(1/x), root selected by refinement. */
export function inverse(ctx: ExecutionContext, a: RootOf): RootOf {
  demand(!(a.poly.coefficients.length === 2 && a.poly.coefficients[0] === 0n), 'division-by-zero', 'inverse of zero');
  const reversed = [...a.poly.coefficients].reverse();
  const poly = ALGEBRAIC_RING.make(ctx, reversed[reversed.length - 1] < 0n ? reversed.map(c => -c) : reversed);
  const one = rootsOfIrreducible(ctx, ALGEBRAIC_RING.fromIntegers(ctx, [-1, 1]))[0];
  // 1/α is the root of the reversed polynomial r with r·α = 1: select it through multiplication.
  let pool = rootsOfIrreducible(ctx, poly), x = a;
  for (;;) {
    ctx.tick();
    pool = pool.filter(c => intersects(ctx, image(ctx, 'multiply', regionOf(c), regionOf(x)), regionOf(one)));
    demand(pool.length > 0, 'verification-failed', 'no inverse candidate');
    if (pool.length === 1) return pool[0];
    x = refine(ctx, x); pool = pool.map(c => refine(ctx, c));
  }
}
