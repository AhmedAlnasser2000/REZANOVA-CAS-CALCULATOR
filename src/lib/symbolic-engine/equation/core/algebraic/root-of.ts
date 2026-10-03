import { demand, type ExecutionContext } from '../execution';
import { QQ, ZZ } from '../algebra/domain';
import { factorQ } from '../algebra/factor';
import { imul, ipow } from '../algebra/integer';
import { PolynomialRing, type Polynomial } from '../algebra/polynomial';
import { divides, rationalToPrimitive } from '../algebra/polynomial-division';
import { rational, rAdd, rDivide, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { compareRational, evaluateAt, isolateRealRoots, rootsInIntervalBound } from './real-roots';
import { certainlyNonReal, certifyApproximation, isolateComplexRoots, newtonStep, type CertifiedDisk } from './complex-roots';

/** The single integer polynomial ring that owns every RootOf minimal polynomial. */
export const ALGEBRAIC_RING = new PolynomialRing(ZZ, 'x');
const RATIONAL_RING = new PolynomialRing(QQ, 'x');

/**
 * A real algebraic number: its minimal polynomial (irreducible, primitive,
 * positive leading coefficient) and an isolating interval. For a rational
 * number the polynomial is linear and lo = hi is the value.
 */
export interface RealRootOf { readonly kind: 'real'; readonly poly: Polynomial<bigint>; readonly lo: Rational; readonly hi: Rational }

export interface RootWithMultiplicity<R> { readonly root: R; readonly multiplicity: number }

function toAlgebraicRing(ctx: ExecutionContext, p: Polynomial<bigint>) { return ALGEBRAIC_RING.make(ctx, p.coefficients); }

export function toRationalPolynomial<E>(ctx: ExecutionContext, p: Polynomial<E>): Polynomial<Rational> {
  if ((p.ring.domain as unknown) === QQ) return RATIONAL_RING.make(ctx, p.coefficients as unknown as readonly Rational[]);
  demand((p.ring.domain as unknown) === ZZ, 'domain-mismatch', 'polynomial over Z or Q expected');
  return RATIONAL_RING.make(ctx, (p.coefficients as readonly bigint[]).map(c => rational(ctx, c)));
}

/** All distinct real roots of a nonzero polynomial over ℤ or ℚ, ascending, with multiplicities. */
export function realRoots<E>(ctx: ExecutionContext, p: Polynomial<E>): RootWithMultiplicity<RealRootOf>[] {
  const q = toRationalPolynomial(ctx, p);
  demand(!RATIONAL_RING.isZero(ctx, q), 'invalid-input', 'real roots of the zero polynomial');
  const out: RootWithMultiplicity<RealRootOf>[] = [];
  if (RATIONAL_RING.degree(ctx, q) === 0) return out;
  for (const { factor, multiplicity } of factorQ(ctx, RATIONAL_RING, q, ALGEBRAIC_RING).factors) {
    for (const { lo, hi } of isolateRealRoots(ctx, ALGEBRAIC_RING, factor)) {
      out.push(Object.freeze({ root: makeReal(ctx, factor, lo, hi), multiplicity }));
    }
  }
  out.sort((a, b) => compareReal(ctx, a.root, b.root));
  return out;
}

function makeReal(ctx: ExecutionContext, poly: Polynomial<bigint>, lo: Rational, hi: Rational): RealRootOf {
  const p = toAlgebraicRing(ctx, poly);
  if (ALGEBRAIC_RING.degree(ctx, p) === 1) {
    const [c0, c1] = p.coefficients;
    const v = rational(ctx, -c0, c1);
    return Object.freeze({ kind: 'real' as const, poly: p, lo: v, hi: v });
  }
  return Object.freeze({ kind: 'real' as const, poly: p, lo, hi });
}

export function isRationalRoot(r: RealRootOf): boolean { return r.poly.coefficients.length === 2; }

function sign(ctx: ExecutionContext, f: Polynomial<bigint>, x: Rational): number {
  const v = evaluateAt(ctx, f, x).numerator;
  return v === 0n ? 0 : v < 0n ? -1 : 1;
}

/** Halve the isolating interval, keeping the sign change. */
export function bisectReal(ctx: ExecutionContext, r: RealRootOf): RealRootOf {
  if (isRationalRoot(r)) return r;
  const mid = rDivide(ctx, rAdd(ctx, r.lo, r.hi), rational(ctx, 2n));
  const sMid = sign(ctx, r.poly, mid), sLo = sign(ctx, r.poly, r.lo);
  demand(sMid !== 0 && sLo !== 0, 'verification-failed', 'irreducible polynomial vanished at a rational point');
  return Object.freeze({ ...r, ...(sMid === sLo ? { lo: mid } : { hi: mid }) });
}

/** Refine until the interval width is at most `width` (> 0). */
export function refineReal(ctx: ExecutionContext, r: RealRootOf, width: Rational): RealRootOf {
  demand(width.numerator > 0n, 'invalid-input', 'refinement width must be positive');
  let cur = r;
  while (compareRational(ctx, rSubtract(ctx, cur.hi, cur.lo), width) > 0) cur = bisectReal(ctx, cur);
  return cur;
}

function floorRational(n: bigint, d: bigint): bigint { return n >= 0n ? n / d : -((-n + d - 1n) / d); }

/** Decimal string of α rounded to `digits` places, exact (refines until the rounding is determined). */
export function realDecimal(ctx: ExecutionContext, r: RealRootOf, digits: number): string {
  demand(Number.isSafeInteger(digits) && digits >= 0, 'invalid-input', 'digit count');
  const scale = ipow(ctx, 10n, digits);
  const rounded = (x: Rational) => floorRational(imul(ctx, 2n, imul(ctx, x.numerator, scale)) + x.denominator, 2n * x.denominator);
  let cur = r;
  while (rounded(cur.lo) !== rounded(cur.hi)) cur = bisectReal(ctx, cur);
  const v = rounded(cur.lo), negative = v < 0n, abs = (negative ? -v : v).toString().padStart(digits + 1, '0');
  const text = digits === 0 ? abs : `${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
  return negative ? `-${text}` : text;
}

/** Exact ordering of two real algebraic numbers. */
export function compareReal(ctx: ExecutionContext, a: RealRootOf, b: RealRootOf): -1 | 0 | 1 {
  let x = a, y = b;
  for (;;) {
    ctx.tick();
    if (compareRational(ctx, x.hi, y.lo) < 0) return -1;
    if (compareRational(ctx, y.hi, x.lo) < 0) return 1;
    if (isRationalRoot(x) && isRationalRoot(y)) return 0; // overlapping points are equal
    if (ALGEBRAIC_RING.equal(ctx, x.poly, y.poly)) {
      // Same irreducible polynomial: equal iff the overlap still isolates a root.
      const lo = compareRational(ctx, x.lo, y.lo) > 0 ? x.lo : y.lo, hi = compareRational(ctx, x.hi, y.hi) < 0 ? x.hi : y.hi;
      if (compareRational(ctx, lo, hi) < 0 && sign(ctx, x.poly, lo) * sign(ctx, x.poly, hi) < 0) return 0;
    }
    // Distinct numbers: refining both eventually separates the intervals.
    x = bisectReal(ctx, x); y = bisectReal(ctx, y);
  }
}

/** Sign of g(α) for g over ℤ or ℚ, exact: zero iff the minimal polynomial divides g. */
export function signAtReal<E>(ctx: ExecutionContext, g: Polynomial<E>, r: RealRootOf): -1 | 0 | 1 {
  const gq = toRationalPolynomial(ctx, g);
  if (RATIONAL_RING.isZero(ctx, gq)) return 0;
  const gz = rationalToPrimitive(ctx, ALGEBRAIC_RING, gq);
  if (divides(ctx, ALGEBRAIC_RING, r.poly, gz.primitive)) return 0;
  const contentSign = gz.content.numerator < 0n ? -1 : 1;
  if (isRationalRoot(r)) return (sign(ctx, gz.primitive, r.lo) * contentSign) as -1 | 1;
  let cur = r;
  while (rootsInIntervalBound(ctx, gz.primitive, cur.lo, cur.hi) > 0 || sign(ctx, gz.primitive, cur.lo) === 0) cur = bisectReal(ctx, cur);
  return (sign(ctx, gz.primitive, cur.lo) * contentSign) as -1 | 1;
}

/**
 * A non-real algebraic number: minimal polynomial plus a certified disk
 * (center re + im·i, radius) that contains exactly this root of the polynomial.
 * Radius 0 means the center is the exact root.
 */
export interface ComplexRootOf {
  readonly kind: 'complex'; readonly poly: Polynomial<bigint>;
  readonly re: Rational; readonly im: Rational; readonly radius: Rational;
}

export type RootOf = RealRootOf | ComplexRootOf;

function diskToRoot(ctx: ExecutionContext, poly: Polynomial<bigint>, d: CertifiedDisk): ComplexRootOf {
  const den = 1n << BigInt(d.scale);
  const radius = d.radiusExponent === null ? rational(ctx, 0n)
    : d.radiusExponent >= 0 ? rational(ctx, 1n << BigInt(d.radiusExponent)) : rational(ctx, 1n, 1n << BigInt(-d.radiusExponent));
  return Object.freeze({ kind: 'complex' as const, poly, re: rational(ctx, d.center.re, den), im: rational(ctx, d.center.im, den), radius });
}

/**
 * All distinct complex roots (real ones as RealRootOf) of a nonzero polynomial
 * over ℤ or ℚ, with multiplicities: real roots ascending, then non-real roots
 * by real part and imaginary part.
 */
export function allRoots<E>(ctx: ExecutionContext, p: Polynomial<E>): RootWithMultiplicity<RootOf>[] {
  const q = toRationalPolynomial(ctx, p);
  demand(!RATIONAL_RING.isZero(ctx, q), 'invalid-input', 'roots of the zero polynomial');
  const real: RootWithMultiplicity<RealRootOf>[] = [], nonreal: RootWithMultiplicity<ComplexRootOf>[] = [];
  if (RATIONAL_RING.degree(ctx, q) === 0) return [];
  for (const { factor, multiplicity } of factorQ(ctx, RATIONAL_RING, q, ALGEBRAIC_RING).factors) {
    const intervals = isolateRealRoots(ctx, ALGEBRAIC_RING, factor);
    for (const { lo, hi } of intervals) real.push(Object.freeze({ root: makeReal(ctx, factor, lo, hi), multiplicity }));
    if (ALGEBRAIC_RING.degree(ctx, factor) === intervals.length) continue;
    for (const d of isolateComplexRoots(ctx, factor, intervals.length)) {
      if (certainlyNonReal(d)) nonreal.push(Object.freeze({ root: diskToRoot(ctx, factor, d), multiplicity }));
    }
  }
  real.sort((a, b) => compareReal(ctx, a.root, b.root));
  nonreal.sort((a, b) => compareRational(ctx, a.root.re, b.root.re) || compareRational(ctx, a.root.im, b.root.im));
  return [...real, ...nonreal];
}

/** All roots of one irreducible primitive polynomial of ALGEBRAIC_RING (real ones as RealRootOf). */
export function rootsOfIrreducible(ctx: ExecutionContext, factor: Polynomial<bigint>): RootOf[] {
  const poly = toAlgebraicRing(ctx, factor);
  const intervals = isolateRealRoots(ctx, ALGEBRAIC_RING, poly);
  const out: RootOf[] = intervals.map(({ lo, hi }) => makeReal(ctx, poly, lo, hi));
  if (ALGEBRAIC_RING.degree(ctx, poly) > intervals.length) {
    for (const d of isolateComplexRoots(ctx, poly, intervals.length)) if (certainlyNonReal(d)) out.push(diskToRoot(ctx, poly, d));
  }
  return out;
}

/** Whether disk (c', r') lies inside disk (c, r): |c' − c| + r' ≤ r. */
function inside(ctx: ExecutionContext, inner: ComplexRootOf, outer: ComplexRootOf): boolean {
  const slack = rSubtract(ctx, outer.radius, inner.radius);
  if (slack.numerator < 0n) return false;
  const dr = rSubtract(ctx, inner.re, outer.re), di = rSubtract(ctx, inner.im, outer.im);
  return compareRational(ctx, rAdd(ctx, rMultiply(ctx, dr, dr), rMultiply(ctx, di, di)), rMultiply(ctx, slack, slack)) <= 0;
}

/** Refine a non-real root until its disk diameter is at most `width`, keeping the same root. */
export function refineComplex(ctx: ExecutionContext, r: ComplexRootOf, width: Rational): ComplexRootOf {
  demand(width.numerator > 0n, 'invalid-input', 'refinement width must be positive');
  const f = r.poly.coefficients;
  let precision = 64, current = r;
  while (current.radius.numerator !== 0n && compareRational(ctx, rMultiply(ctx, current.radius, rational(ctx, 2n)), width) > 0) {
    ctx.tick();
    precision *= 2;
    const toFixed = (v: Rational) => (v.numerator << BigInt(precision)) / v.denominator;
    let z = { re: toFixed(current.re), im: toFixed(current.im) };
    for (let i = 0; i < 4; i++) z = newtonStep(ctx, f, z, precision);
    const disk = certifyApproximation(ctx, f, z, precision);
    if (!disk) continue;
    const candidate = diskToRoot(ctx, current.poly, disk);
    if (inside(ctx, candidate, current)) current = candidate;
  }
  return current;
}

/** Decimal strings of the real and imaginary parts, rounded to `digits` places (exact). */
export function complexDecimal(ctx: ExecutionContext, r: ComplexRootOf, digits: number): { re: string; im: string } {
  demand(Number.isSafeInteger(digits) && digits >= 0, 'invalid-input', 'digit count');
  const scale = ipow(ctx, 10n, digits);
  const rounded = (x: Rational) => floorRational(imul(ctx, 2n, imul(ctx, x.numerator, scale)) + x.denominator, 2n * x.denominator);
  const settled = (c: Rational, rad: Rational) => rounded(rSubtract(ctx, c, rad)) === rounded(rAdd(ctx, c, rad));
  let cur = r, width = rational(ctx, 1n, imul(ctx, 2n, scale));
  while (!settled(cur.re, cur.radius) || !settled(cur.im, cur.radius)) {
    cur = refineComplex(ctx, cur, width);
    width = rDivide(ctx, width, rational(ctx, 2n));
  }
  const format = (v: bigint) => {
    const negative = v < 0n, abs = (negative ? -v : v).toString().padStart(digits + 1, '0');
    const text = digits === 0 ? abs : `${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
    return negative ? `-${text}` : text;
  };
  return { re: format(rounded(cur.re)), im: format(rounded(cur.im)) };
}
