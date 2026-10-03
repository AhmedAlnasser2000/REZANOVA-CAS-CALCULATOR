import { demand, type ExecutionContext } from '../execution';
import { isField, QQ, ZZ } from './domain';
import { igcd, iexact, imul } from './integer';
import { PolynomialRing, type Polynomial } from './polynomial';
import { rational, type Rational } from './rational';

export interface DivisionResult<E> { readonly quotient: Polynomial<E>; readonly remainder: Polynomial<E> }

function checkDivision<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, lhs: Polynomial<E>, b: Polynomial<E>, q: Polynomial<E>, r: Polynomial<E>) {
  demand(ring.equal(ctx, lhs, ring.add(ctx, ring.multiply(ctx, q, b), r)), 'verification-failed', 'division identity');
  demand(ring.degree(ctx, r) < ring.degree(ctx, b), 'verification-failed', 'remainder degree');
}

/** Division with remainder over a field: a = q·b + r, deg r < deg b. */
export function divideWithRemainder<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): DivisionResult<E> {
  const d = ring.domain;
  demand(isField(d), 'domain-mismatch', 'division with remainder needs a field');
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'polynomial division');
  const db = ring.degree(ctx, b), invLead = d.inverse(ctx, ring.leading(ctx, b));
  const r = [...a.coefficients];
  const zero = d.fromInteger(ctx, 0n);
  const qLen = Math.max(0, r.length - db);
  ctx.allocate(qLen + r.length);
  const q = Array<typeof zero>(qLen).fill(zero);
  for (let k = r.length - 1; k >= db; k--) {
    if (d.isZero(ctx, r[k])) continue;
    const c = d.multiply(ctx, r[k], invLead);
    q[k - db] = c;
    for (let j = 0; j <= db; j++) r[k - db + j] = d.subtract(ctx, r[k - db + j], d.multiply(ctx, c, b.coefficients[j]));
  }
  const quotient = ring.make(ctx, q), remainder = ring.make(ctx, r.slice(0, db));
  demand(r.slice(db).every(c => d.isZero(ctx, c)), 'verification-failed', 'division leftover');
  checkDivision(ctx, ring, a, b, quotient, remainder);
  return { quotient, remainder };
}

/**
 * Pseudo-division over an integral domain:
 * lc(b)^(deg a − deg b + 1)·a = q·b + r, deg r < deg b.
 */
export function pseudoDivide<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): DivisionResult<E> & { readonly multiplier: E } {
  const d = ring.domain;
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'pseudo-division');
  const da = ring.degree(ctx, a), db = ring.degree(ctx, b), lb = ring.leading(ctx, b);
  const steps = Math.max(0, da - db + 1);
  let multiplier = d.fromInteger(ctx, 1n);
  for (let i = 0; i < steps; i++) multiplier = d.multiply(ctx, multiplier, lb);
  // Cohen, Algorithm 3.1.2: each step multiplies by lc(b) once; the unused
  // multiplications are applied at the end so the multiplier is exact.
  let r = a, q = ring.zero(ctx), e = steps;
  while (!ring.isZero(ctx, r) && ring.degree(ctx, r) >= db) {
    const term = ring.monomial(ctx, ring.leading(ctx, r), ring.degree(ctx, r) - db);
    q = ring.add(ctx, ring.scale(ctx, q, lb), term);
    r = ring.subtract(ctx, ring.scale(ctx, r, lb), ring.multiply(ctx, term, b));
    e--;
  }
  let rest = d.fromInteger(ctx, 1n);
  for (; e > 0; e--) rest = d.multiply(ctx, rest, lb);
  q = ring.scale(ctx, q, rest); r = ring.scale(ctx, r, rest);
  checkDivision(ctx, ring, ring.scale(ctx, a, multiplier), b, q, r);
  return { quotient: q, remainder: r, multiplier };
}

/** Exact polynomial quotient a / b; a nonzero remainder is `nonexact-division`. */
export function exactQuotient<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): Polynomial<E> {
  const d = ring.domain;
  demand(!ring.isZero(ctx, b), 'division-by-zero', 'exact polynomial division');
  const db = ring.degree(ctx, b), lb = ring.leading(ctx, b);
  const r = [...a.coefficients];
  const zero = d.fromInteger(ctx, 0n);
  const qLen = Math.max(0, r.length - db);
  ctx.allocate(qLen + r.length);
  const q = Array<typeof zero>(qLen).fill(zero);
  for (let k = r.length - 1; k >= db; k--) {
    if (d.isZero(ctx, r[k])) continue;
    const c = d.exactDivide(ctx, r[k], lb);
    q[k - db] = c;
    for (let j = 0; j <= db; j++) r[k - db + j] = d.subtract(ctx, r[k - db + j], d.multiply(ctx, c, b.coefficients[j]));
  }
  demand(r.every(c => d.isZero(ctx, c)), 'nonexact-division', 'polynomial exact division');
  const quotient = ring.make(ctx, q);
  demand(ring.equal(ctx, ring.multiply(ctx, quotient, b), a), 'verification-failed', 'exact quotient identity');
  return quotient;
}

/** Whether b divides a exactly (b nonzero). */
export function divides<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, b: Polynomial<E>, a: Polynomial<E>): boolean {
  try { exactQuotient(ctx, ring, a, b); return true; } catch (e) {
    if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'nonexact-division') return false;
    throw e;
  }
}

/** Non-negative integer content of a ℤ[x] polynomial; content(0) = 0. */
export function integerContent(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>): bigint {
  ring.assert(ctx, a);
  demand(ring.domain === ZZ, 'domain-mismatch', 'integer content needs Z[x]');
  let g = 0n;
  for (const c of a.coefficients) { g = igcd(ctx, g, c); if (g === 1n) break; }
  return g;
}

/** Primitive part with positive leading coefficient; zero stays zero. */
export function primitivePart(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>): Polynomial<bigint> {
  const g = integerContent(ctx, ring, a);
  if (g === 0n) return a;
  const sign = ring.leading(ctx, a) < 0n ? -1n : 1n;
  return ring.make(ctx, a.coefficients.map(c => iexact(ctx, c, g * sign)));
}

/**
 * Split a ℚ[x] polynomial as content · primitive with a primitive ℤ[x] part
 * of positive leading coefficient. Zero gives content 0 and primitive 0.
 */
export function rationalToPrimitive(ctx: ExecutionContext, zRing: PolynomialRing<bigint>, a: Polynomial<Rational>): { content: Rational; primitive: Polynomial<bigint> } {
  demand(zRing.domain === ZZ && a.ring.domain === QQ, 'domain-mismatch', 'rational to primitive conversion');
  a.ring.assert(ctx, a);
  if (a.coefficients.length === 0) return { content: rational(ctx, 0n), primitive: zRing.zero(ctx) };
  let lcm = 1n;
  for (const c of a.coefficients) lcm = iexact(ctx, imul(ctx, lcm, c.denominator), igcd(ctx, lcm, c.denominator));
  const ints = zRing.make(ctx, a.coefficients.map(c => imul(ctx, c.numerator, iexact(ctx, lcm, c.denominator))));
  const primitive = primitivePart(ctx, zRing, ints);
  const g = integerContent(ctx, zRing, ints) * (zRing.leading(ctx, ints) < 0n ? -1n : 1n);
  const content = rational(ctx, g, lcm);
  return { content, primitive };
}

export function integerToRational(ctx: ExecutionContext, qRing: PolynomialRing<Rational>, a: Polynomial<bigint>): Polynomial<Rational> {
  demand(qRing.domain === QQ && a.ring.domain === ZZ, 'domain-mismatch', 'integer to rational conversion');
  a.ring.assert(ctx, a);
  return qRing.make(ctx, a.coefficients.map(c => rational(ctx, c)));
}

/** Monic associate over a field; zero stays zero. */
export function monic<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>): Polynomial<E> {
  const d = ring.domain;
  demand(isField(d), 'domain-mismatch', 'monic needs a field');
  if (ring.isZero(ctx, a)) return a;
  return ring.scale(ctx, a, d.inverse(ctx, ring.leading(ctx, a)));
}
