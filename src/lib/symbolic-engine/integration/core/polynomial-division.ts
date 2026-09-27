import { demand, type ExecutionContext } from './execution';
import { divide } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';

export interface Division<E> { readonly quotient: Polynomial<E>; readonly remainder: Polynomial<E> }
export interface Bezout<E> { readonly gcd: Polynomial<E>; readonly s: Polynomial<E>; readonly t: Polynomial<E> }

// Private computational primitive. Public division and Euclid always verify before returning.
function division<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Division<E> {
  ring.assert(ctx, a); ring.assert(ctx, b);
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'polynomial divisor');
  const n = Math.max(0, a.coefficients.length - b.coefficients.length + 1);
  ctx.allocate(n + a.coefficients.length);
  const q = Array<E>(n).fill(ring.field.fromInteger(ctx, 0n));
  const r = [...a.coefficients], degreeB = b.coefficients.length - 1;
  while (r.length >= b.coefficients.length) {
    ctx.tick();
    const offset = r.length - b.coefficients.length;
    const c = divide(ctx, ring.field, r[r.length - 1], b.coefficients[degreeB]);
    q[offset] = c;
    for (let j = 0; j <= degreeB; j++) {
      r[offset + j] = ring.field.add(ctx, r[offset + j], ring.field.negate(ctx, ring.field.multiply(ctx, c, b.coefficients[j])));
    }
    while (r.length && ring.field.isZero(ctx, r[r.length - 1])) r.pop();
  }
  return Object.freeze({ quotient: ring.make(ctx, q), remainder: ring.make(ctx, r) });
}

export function verifyDivision<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, result: Division<E>): void {
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'polynomial divisor');
  demand(ring.degree(ctx, result.remainder) < ring.degree(ctx, b), 'verification-failed', 'remainder degree');
  demand(ring.equal(ctx, a, ring.add(ctx, ring.multiply(ctx, result.quotient, b), result.remainder)),
    'verification-failed', 'division reconstruction');
}
export function polynomialDivide<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Division<E> {
  const result = division(ctx, ring, a, b);
  verifyDivision(ctx, ring, a, b, result); return result;
}
export function exactDivide<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
  const result = polynomialDivide(ctx, ring, a, b);
  demand(ring.isZero(ctx, result.remainder), 'nonexact-division', 'nonzero polynomial remainder');
  return result.quotient;
}
export function verifyBezout<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, result: Bezout<E>): void {
  const { gcd, s, t } = result;
  ring.assert(ctx, a); ring.assert(ctx, b); ring.assert(ctx, gcd); ring.assert(ctx, s); ring.assert(ctx, t);
  if (ring.isZero(ctx, gcd)) {
    demand(ring.isZero(ctx, a) && ring.isZero(ctx, b), 'verification-failed', 'zero gcd');
  } else {
    demand(ring.field.equal(ctx, ring.leading(ctx, gcd), ring.field.fromInteger(ctx, 1n)), 'verification-failed', 'nonmonic gcd');
    for (const p of [a, b]) {
      const d = division(ctx, ring, p, gcd);
      verifyDivision(ctx, ring, p, gcd, d);
      demand(ring.isZero(ctx, d.remainder), 'verification-failed', 'gcd does not divide input');
    }
  }
  demand(ring.equal(ctx, ring.add(ctx, ring.multiply(ctx, s, a), ring.multiply(ctx, t, b)), gcd),
    'verification-failed', 'Bezout identity');
}
export function extendedGcd<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Bezout<E> {
  ring.assert(ctx, a); ring.assert(ctx, b);
  let oldR = a, r = b, oldS = ring.one(ctx), s = ring.zero(ctx), oldT = ring.zero(ctx), t = ring.one(ctx);
  while (!ring.isZero(ctx, r)) {
    ctx.tick();
    const d = division(ctx, ring, oldR, r);
    const nextS = ring.subtract(ctx, oldS, ring.multiply(ctx, d.quotient, s));
    const nextT = ring.subtract(ctx, oldT, ring.multiply(ctx, d.quotient, t));
    oldR = r; r = d.remainder; oldS = s; s = nextS; oldT = t; t = nextT;
  }
  if (!ring.isZero(ctx, oldR)) {
    const inv = ring.field.inverse(ctx, ring.leading(ctx, oldR));
    oldR = ring.scale(ctx, oldR, inv); oldS = ring.scale(ctx, oldS, inv); oldT = ring.scale(ctx, oldT, inv);
  } else { oldS = ring.zero(ctx); oldT = ring.zero(ctx); }
  ctx.allocate(3);
  const result = Object.freeze({ gcd: oldR, s: oldS, t: oldT });
  verifyBezout(ctx, ring, a, b, result); return result;
}
export function polynomialGcd<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
  return extendedGcd(ctx, ring, a, b).gcd;
}
