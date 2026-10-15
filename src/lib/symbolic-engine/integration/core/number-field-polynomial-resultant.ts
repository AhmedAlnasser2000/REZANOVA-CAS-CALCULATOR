/** Polynomial resultants from complete, degree-preserving exact modular images.
 * The polynomial coefficient domain remains a ring. Brown indexed PRS stays separate. */
import {demand, type ExecutionContext} from './execution';
import {checkDifferentialBounds, type DifferentialBounds} from './differential-field';
import {PolynomialRing, assertPolynomialRingOwner, type Polynomial} from './polynomial';
import {PolynomialDomain} from './polynomial-domain';
import {verifyAlgebraicChainWithin} from './algebraic-derivative';
import {numberFieldModularDescriptor} from './number-field-modular-image';
import {produceNumberFieldModularResultantWithin, verifyNumberFieldModularResultantWithin, type NumberFieldModularResultant} from './number-field-modular-resultant';

export type NumberFieldBivariateRing<E> = PolynomialRing<Polynomial<E>, PolynomialDomain<E>>;
export type NumberFieldBivariate<E> = Polynomial<Polynomial<E>, PolynomialDomain<E>>;
interface Common<E> {readonly inputA: NumberFieldBivariate<E>; readonly inputB: NumberFieldBivariate<E>; readonly resultant: Polynomial<E>}
export type NumberFieldPolynomialResultant<E> = Readonly<Common<E> & (
  {method: 'boundary'} | {method: 'complete-specialization'; scalarRing: PolynomialRing<E>; bound: bigint;
    points: readonly Readonly<{point: bigint; proof: NumberFieldModularResultant<E>}>[]}
)>;
export function requireNumberFieldBivariateRing<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds);
  // The existing assertion's default generic describes a scalar-field ring;
  // check this registered outer owner without changing its ring coefficient type.
  const native: unknown = ring; assertPolynomialRingOwner(ctx, native); const domain = ring.domain;
  demand(Object.getPrototypeOf(domain) === PolynomialDomain.prototype && Object.isFrozen(domain), 'domain-mismatch', 'native polynomial coefficient ring');
  const keys = Reflect.ownKeys(domain); ctx.allocate(keys.length);
  demand(keys.length === 4 && keys.every(key => typeof key === 'string' && ['ring', 'capability', 'characteristic', 'identity'].includes(key)
    && 'value' in Object.getOwnPropertyDescriptor(domain, key)!), 'domain-mismatch', 'polynomial domain without foreign callbacks');
  demand(domain.capability === 'integral-domain' && domain.characteristic === 0 && typeof domain.identity === 'symbol', 'domain-mismatch', 'polynomial coefficient ring capability');
  assertPolynomialRingOwner(ctx, domain.ring); numberFieldModularDescriptor(ctx, domain.ring.domain); verifyAlgebraicChainWithin(ctx, domain.ring.domain, bounds);
}
export function evaluateNumberFieldPolynomial<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, value: Polynomial<E>, point: E): E {
  ring.assert(ctx, value); ring.domain.assert(ctx, point); let result = ring.domain.fromInteger(ctx, 0n);
  for (let i = value.coefficients.length - 1; i >= 0; i--) result = ring.domain.add(ctx, ring.domain.multiply(ctx, result, point), value.coefficients[i]);
  return result;
}
export function specializeNumberFieldBivariate<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, scalar: PolynomialRing<E>, input: NumberFieldBivariate<E>, point: bigint): Polynomial<E> {
  ring.assert(ctx, input); ctx.integer(point); demand(scalar.domain === ring.domain.ring.domain && scalar.variable === ring.variable, 'domain-mismatch', 'specialized coefficient owner/binder'); ctx.allocate(input.coefficients.length);
  const value = scalar.domain.fromInteger(ctx, point); return scalar.make(ctx, input.coefficients.map(p => evaluateNumberFieldPolynomial(ctx, ring.domain.ring, p, value)));
}
function bound<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>): bigint {
  const inner = ring.domain.ring; let da = 0, db = 0;
  for (const p of a.coefficients) da = Math.max(da, inner.degree(ctx, p)); for (const p of b.coefficients) db = Math.max(db, inner.degree(ctx, p));
  return ctx.add(ctx.multiply(BigInt(ring.degree(ctx, b)), BigInt(da)), ctx.multiply(BigInt(ring.degree(ctx, a)), BigInt(db)));
}
function boundary<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>): Polynomial<E> | null {
  const m = ring.degree(ctx, a), n = ring.degree(ctx, b), inner = ring.domain.ring;
  if (m < 0 || n < 0) return inner.zero(ctx);
  if (m === 0) return inner.power(ctx, ring.leading(ctx, a), n); if (n === 0) return inner.power(ctx, ring.leading(ctx, b), m); return null;
}
export function verifyNumberFieldPolynomialResultantWithin<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>, proof: NumberFieldPolynomialResultant<E>, bounds: DifferentialBounds): void {
  requireNumberFieldBivariateRing(ctx, ring, bounds); ring.assert(ctx, a); ring.assert(ctx, b); const inner = ring.domain.ring;
  demand(ring.equal(ctx, a, proof.inputA) && ring.equal(ctx, b, proof.inputB), 'verification-failed', 'ordered polynomial resultant inputs'); inner.assert(ctx, proof.resultant);
  if (proof.method === 'boundary') {const value = boundary(ctx, ring, a, b); demand(value !== null && inner.equal(ctx, value, proof.resultant), 'verification-failed', 'polynomial resultant boundary'); return;}
  demand(proof.method === 'complete-specialization' && boundary(ctx, ring, a, b) === null, 'verification-failed', 'positive polynomial resultant degrees');
  assertPolynomialRingOwner(ctx, proof.scalarRing); demand(proof.scalarRing.domain === inner.domain && proof.scalarRing.variable === ring.variable, 'domain-mismatch', 'polynomial resultant specialization owner');
  const expected = bound(ctx, ring, a, b); ctx.integer(proof.bound);
  demand(proof.bound === expected && BigInt(proof.points.length) === ctx.add(expected, 1n) && BigInt(inner.degree(ctx, proof.resultant)) <= expected, 'verification-failed', 'complete Sylvester degree/interpolation coverage');
  ctx.allocate(proof.points.length); const seen = new Set<bigint>();
  for (const p of proof.points) {
    ctx.integer(p.point); demand(!seen.has(p.point), 'verification-failed', 'distinct exact resultant points'); seen.add(p.point);
    const aa = specializeNumberFieldBivariate(ctx, ring, proof.scalarRing, a, p.point), bb = specializeNumberFieldBivariate(ctx, ring, proof.scalarRing, b, p.point);
    demand(aa.coefficients.length === a.coefficients.length && bb.coefficients.length === b.coefficients.length, 'verification-failed', 'resultant degree-preserving specialization');
    verifyNumberFieldModularResultantWithin(ctx, proof.scalarRing, aa, bb, p.proof, bounds);
    demand(inner.domain.equal(ctx, evaluateNumberFieldPolynomial(ctx, inner, proof.resultant, inner.domain.fromInteger(ctx, p.point)), p.proof.resultant), 'verification-failed', 'complete polynomial resultant evaluation identity');
  }
}
function interpolation<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, points: readonly Readonly<{point: bigint; proof: NumberFieldModularResultant<E>}>[]): Polynomial<E> {
  const field = ring.domain; ctx.allocate(points.length); const coefficients = points.map(p => p.proof.resultant);
  for (let order = 1; order < points.length; order++) for (let i = points.length - 1; i >= order; i--) {
    const difference = ctx.add(points[i].point, -points[i - order].point);
    coefficients[i] = field.exactDivide(ctx, field.subtract(ctx, coefficients[i], coefficients[i - 1]), field.fromInteger(ctx, difference));
  }
  // Compute scalar differences first. Zero high Newton coefficients never
  // construct a polynomial at the theoretical degree bound.
  let last = coefficients.length - 1; while (last >= 0 && field.isZero(ctx, coefficients[last])) last--;
  if (last < 0) return ring.zero(ctx);
  let result = ring.constant(ctx, coefficients[last]);
  for (let i = last - 1; i >= 0; i--) {ctx.allocate(2); const factor = ring.make(ctx, [field.fromInteger(ctx, -points[i].point), field.fromInteger(ctx, 1n)]);
    result = ring.add(ctx, ring.multiply(ctx, result, factor), ring.constant(ctx, coefficients[i]));}
  return result;
}
export function produceNumberFieldPolynomialResultantWithin<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>, bounds: DifferentialBounds): NumberFieldPolynomialResultant<E> {
  demand(ctx.operationToken !== undefined, 'invalid-input', 'polynomial resultant enclosing operation'); requireNumberFieldBivariateRing(ctx, ring, bounds); ring.assert(ctx, a); ring.assert(ctx, b);
  const value = boundary(ctx, ring, a, b); if (value !== null) {ctx.allocate(4); return Object.freeze({method: 'boundary', inputA: a, inputB: b, resultant: value});}
  const degree = bound(ctx, ring, a, b), count = ctx.add(degree, 1n), slots = ctx.multiply(count, 4n); if (slots > BigInt(Number.MAX_SAFE_INTEGER)) ctx.exhaust('polynomial resultant dimensions'); ctx.allocate(Number(slots));
  const inner = ring.domain.ring, scalarRing = new PolynomialRing(inner.domain, ring.variable), points: {point: bigint; proof: NumberFieldModularResultant<E>}[] = []; ctx.allocate(5);
  for (let index = 0n; BigInt(points.length) < count; index = ctx.add(index, 1n)) {
    const point = index === 0n ? 0n : ctx.remainder(index, 2n) === 1n ? ctx.quotient(ctx.add(index, 1n), 2n) : -ctx.quotient(index, 2n);
    const aa = specializeNumberFieldBivariate(ctx, ring, scalarRing, a, point), bb = specializeNumberFieldBivariate(ctx, ring, scalarRing, b, point);
    if (aa.coefficients.length !== a.coefficients.length || bb.coefficients.length !== b.coefficients.length) continue;
    const proof = produceNumberFieldModularResultantWithin(ctx, scalarRing, aa, bb, bounds); ctx.allocate(2); points.push(Object.freeze({point, proof}));
  }
  const resultant = interpolation(ctx, inner, points); ctx.allocate(7); const proof = Object.freeze({method: 'complete-specialization' as const, inputA: a, inputB: b, scalarRing, bound: degree, points: Object.freeze(points), resultant});
  verifyNumberFieldPolynomialResultantWithin(ctx, ring, a, b, proof, bounds); return proof;
}
export function produceNumberFieldPolynomialResultant<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>, bounds: DifferentialBounds): NumberFieldPolynomialResultant<E> {
  return ctx.operation(() => produceNumberFieldPolynomialResultantWithin(ctx, ring, a, b, bounds));
}
export function verifyNumberFieldPolynomialResultant<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>, proof: NumberFieldPolynomialResultant<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyNumberFieldPolynomialResultantWithin(ctx, ring, a, b, proof, bounds));
}
