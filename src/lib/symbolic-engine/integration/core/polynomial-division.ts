import { demand, type ExecutionContext } from './execution';
import { divide, requireField } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';
import { fractionCoefficient } from './fraction-coefficient';
import { primitiveExtendedGcd } from './primitive-euclid';
import {checkedLinearPowerGcd} from './polynomial-linear-power';
import {numberFieldPolynomialGcd} from './number-field-polynomial-gcd';

export interface Division<E> { readonly quotient: Polynomial<E>; readonly remainder: Polynomial<E> }
export interface Bezout<E> { readonly gcd: Polynomial<E>; readonly s: Polynomial<E>; readonly t: Polynomial<E> }

// Private computational primitive. Public division and Euclid always verify before returning.
function division<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Division<E> {
  requireField(ring.domain);
  ring.assert(ctx, a); ring.assert(ctx, b);
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'polynomial divisor');
  const n = Math.max(0, a.coefficients.length - b.coefficients.length + 1);
  ctx.allocate(n + a.coefficients.length);
  const q = Array<E>(n).fill(ring.domain.fromInteger(ctx, 0n));
  const r = [...a.coefficients], degreeB = b.coefficients.length - 1;
  while (r.length >= b.coefficients.length) {
    ctx.tick();
    const offset = r.length - b.coefficients.length;
    const c = divide(ctx, ring.domain, r[r.length - 1], b.coefficients[degreeB]);
    q[offset] = c;
    for (let j = 0; j <= degreeB; j++) {
      r[offset + j] = ring.domain.add(ctx, r[offset + j], ring.domain.negate(ctx, ring.domain.multiply(ctx, c, b.coefficients[j])));
    }
    while (r.length && ring.domain.isZero(ctx, r[r.length - 1])) r.pop();
  }
  return Object.freeze({ quotient: ring.make(ctx, q), remainder: ring.make(ctx, r) });
}

export function verifyDivision<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, result: Division<E>): void {
  requireField(ring.domain);
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
  requireField(ring.domain);
  ring.assert(ctx, a); ring.assert(ctx, b); ring.assert(ctx, gcd); ring.assert(ctx, s); ring.assert(ctx, t);
  if (ring.isZero(ctx, gcd)) {
    demand(ring.isZero(ctx, a) && ring.isZero(ctx, b), 'verification-failed', 'zero gcd');
  } else {
    demand(ring.domain.equal(ctx, ring.leading(ctx, gcd), ring.domain.fromInteger(ctx, 1n)), 'verification-failed', 'nonmonic gcd');
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
  requireField(ring.domain);
  ring.assert(ctx, a); ring.assert(ctx, b);
  const adapter = fractionCoefficient(ring.domain);
  if (adapter && a.coefficients.length > 1 && b.coefficients.length > 1) {
    return primitiveExtendedGcd(ctx, ring, adapter, a, b);
  }
  let oldR = a, r = b, oldS = ring.one(ctx), s = ring.zero(ctx), oldT = ring.zero(ctx), t = ring.one(ctx);
  // Keep each Euclidean divisor monic and scale its Bezout pair with it.
  // This removes inessential scalar growth before the next division; it is
  // not a fallback and does not change the returned checked certificate.
  if(!ring.isZero(ctx,oldR)){const unit=ring.domain.inverse(ctx,ring.leading(ctx,oldR));oldR=ring.scale(ctx,oldR,unit);oldS=ring.scale(ctx,oldS,unit);oldT=ring.scale(ctx,oldT,unit);}
  if(!ring.isZero(ctx,r)){const unit=ring.domain.inverse(ctx,ring.leading(ctx,r));r=ring.scale(ctx,r,unit);s=ring.scale(ctx,s,unit);t=ring.scale(ctx,t,unit);}
  while (!ring.isZero(ctx, r)) {
    ctx.tick();
    const d = division(ctx, ring, oldR, r);
    const nextS = ring.subtract(ctx, oldS, ring.multiply(ctx, d.quotient, s));
    const nextT = ring.subtract(ctx, oldT, ring.multiply(ctx, d.quotient, t));
    oldR = r; r = d.remainder; oldS = s; s = nextS; oldT = t; t = nextT;
    if(!ring.isZero(ctx,r)){const unit=ring.domain.inverse(ctx,ring.leading(ctx,r));r=ring.scale(ctx,r,unit);s=ring.scale(ctx,s,unit);t=ring.scale(ctx,t,unit);}
  }
  if (!ring.isZero(ctx, oldR)) {
    const inv = ring.domain.inverse(ctx, ring.leading(ctx, oldR));
    oldR = ring.scale(ctx, oldR, inv); oldS = ring.scale(ctx, oldS, inv); oldT = ring.scale(ctx, oldT, inv);
  } else { oldS = ring.zero(ctx); oldT = ring.zero(ctx); }
  ctx.allocate(3);
  const result = Object.freeze({ gcd: oldR, s: oldS, t: oldT });
  verifyBezout(ctx, ring, a, b, result); return result;
}
export function polynomialGcd<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
  const linear=checkedLinearPowerGcd(ctx,ring,a,b);if(linear!==null)return linear;
  const primitive=numberFieldPolynomialGcd(ctx,ring,a,b);if(primitive!==null)return primitive;
  return extendedGcd(ctx, ring, a, b).gcd;
}
