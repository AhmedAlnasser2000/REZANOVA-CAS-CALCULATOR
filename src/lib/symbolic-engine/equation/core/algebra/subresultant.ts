import { demand, type ExecutionContext } from '../execution';
import { QQ, ZZ } from './domain';
import { iexact, imul, ipow } from './integer';
import { PolynomialRing, type Polynomial } from './polynomial';
import { exactQuotient, integerContent, primitivePart, pseudoDivide, rationalToPrimitive } from './polynomial-division';
import { rational, rMultiply, type Rational } from './rational';

/** h^(1−δ)·g^δ for δ ≥ 0, computed exactly in ℤ. */
function nextH(ctx: ExecutionContext, h: bigint, g: bigint, delta: number): bigint {
  if (delta === 0) return h;
  if (delta === 1) return g;
  return iexact(ctx, ipow(ctx, g, delta), ipow(ctx, h, delta - 1));
}

/**
 * Resultant over ℤ by the subresultant algorithm (Cohen, Algorithm 3.3.7).
 * Polynomial cost in the degrees; no determinant expansion.
 */
export function resultantZ(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>, b: Polynomial<bigint>): bigint {
  demand(ring.domain === ZZ, 'domain-mismatch', 'integer resultant needs Z[x]');
  if (ring.isZero(ctx, a) || ring.isZero(ctx, b)) return 0n;
  let A = a, B = b, s = 1n;
  if (ring.degree(ctx, A) < ring.degree(ctx, B)) {
    [A, B] = [B, A];
    if ((ring.degree(ctx, A) * ring.degree(ctx, B)) % 2 === 1) s = -s;
  }
  const da0 = ring.degree(ctx, A), db0 = ring.degree(ctx, B);
  if (db0 === 0) return imul(ctx, s, ipow(ctx, ring.leading(ctx, B), da0));
  const ca = integerContent(ctx, ring, A), cb = integerContent(ctx, ring, B);
  A = ring.divideScalar(ctx, A, ca); B = ring.divideScalar(ctx, B, cb);
  const t = imul(ctx, ipow(ctx, ca, db0), ipow(ctx, cb, da0));
  let g = 1n, h = 1n;
  for (;;) {
    ctx.tick();
    const dA = ring.degree(ctx, A), dB = ring.degree(ctx, B), delta = dA - dB;
    if (dA % 2 === 1 && dB % 2 === 1) s = -s;
    const R = pseudoDivide(ctx, ring, A, B).remainder;
    A = B;
    if (ring.isZero(ctx, R)) return 0n;
    B = ring.divideScalar(ctx, R, imul(ctx, g, ipow(ctx, h, delta)));
    g = ring.leading(ctx, A);
    h = nextH(ctx, h, g, delta);
    if (ring.degree(ctx, B) === 0) {
      const dA2 = ring.degree(ctx, A);
      const hFinal = iexact(ctx, ipow(ctx, ring.leading(ctx, B), dA2), ipow(ctx, h, dA2 - 1));
      return imul(ctx, imul(ctx, s, t), hFinal);
    }
  }
}

/** Resultant over ℚ via primitive integer parts: res(cA, dB) = c^deg B · d^deg A · res(A, B). */
export function resultantQ(ctx: ExecutionContext, ring: PolynomialRing<Rational>, a: Polynomial<Rational>, b: Polynomial<Rational>): Rational {
  demand(ring.domain === QQ, 'domain-mismatch', 'rational resultant needs Q[x]');
  if (ring.isZero(ctx, a) || ring.isZero(ctx, b)) return rational(ctx, 0n);
  const z = new PolynomialRing(ZZ, ring.variable);
  const pa = rationalToPrimitive(ctx, z, a), pb = rationalToPrimitive(ctx, z, b);
  const da = ring.degree(ctx, a), db = ring.degree(ctx, b);
  let out = rational(ctx, resultantZ(ctx, z, pa.primitive, pb.primitive));
  for (let i = 0; i < db; i++) out = rMultiply(ctx, out, pa.content);
  for (let i = 0; i < da; i++) out = rMultiply(ctx, out, pb.content);
  return out;
}

/**
 * GCD in ℤ[x] by the primitive subresultant PRS (Cohen, Algorithm 3.3.1).
 * Result has positive leading coefficient; gcd(0, 0) = 0.
 */
export function subresultantGcdZ(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>, b: Polynomial<bigint>): Polynomial<bigint> {
  demand(ring.domain === ZZ, 'domain-mismatch', 'integer gcd needs Z[x]');
  if (ring.isZero(ctx, a)) return primitiveTimesContent(ctx, ring, b);
  if (ring.isZero(ctx, b)) return primitiveTimesContent(ctx, ring, a);
  let A = a, B = b;
  if (ring.degree(ctx, A) < ring.degree(ctx, B)) [A, B] = [B, A];
  const d = gcdBig(ctx, integerContent(ctx, ring, A), integerContent(ctx, ring, B));
  A = primitivePart(ctx, ring, A); B = primitivePart(ctx, ring, B);
  let g = 1n, h = 1n;
  for (;;) {
    ctx.tick();
    const delta = ring.degree(ctx, A) - ring.degree(ctx, B);
    const R = pseudoDivide(ctx, ring, A, B).remainder;
    if (ring.isZero(ctx, R)) return ring.scale(ctx, primitivePart(ctx, ring, B), d);
    if (ring.degree(ctx, R) === 0) return ring.constant(ctx, d);
    A = B;
    B = ring.divideScalar(ctx, R, imul(ctx, g, ipow(ctx, h, delta)));
    g = ring.leading(ctx, A);
    h = nextH(ctx, h, g, delta);
  }
}

function gcdBig(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  while (b !== 0n) { ctx.tick(); [a, b] = [b, a % b]; }
  return a < 0n ? -a : a;
}

function primitiveTimesContent(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>) {
  if (ring.isZero(ctx, a)) return a;
  return ring.scale(ctx, primitivePart(ctx, ring, a), integerContent(ctx, ring, a));
}

/** Check that g divides both inputs (used by every gcd result). */
export function checkCommonDivisor<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, g: Polynomial<E>, a: Polynomial<E>, b: Polynomial<E>): void {
  if (ring.isZero(ctx, g)) { demand(ring.isZero(ctx, a) && ring.isZero(ctx, b), 'verification-failed', 'zero gcd'); return; }
  exactQuotient(ctx, ring, a, g);
  exactQuotient(ctx, ring, b, g);
}
