/** Split even-degree finite domains remain separate from characteristic zero. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {FiniteField} from './positive-field';
import {verifyFiniteFieldConstructionWithin} from './positive-field-evidence';
import {assertPositivePolynomialRingOwner, positiveBezout, verifyPositiveBezout, type PositivePolynomialRing, type PositivePolynomial, type PositiveBezout} from './positive-polynomial';
import {positiveCantorArithmetic} from './positive-cantor';
import {constructBalancedInfinity, verifyBalancedInfinity, type BalancedInfinity} from './balanced-cantor-model';
import {constructBalancedPair, normalizeBalancedDivisor, verifyBalancedDivisor, addBalancedDivisors, verifyBalancedAddition,
  multiplyBalancedDivisor, verifyBalancedMultiple, type BalancedModel, type BalancedDivisor, type BalancedAddition, type BalancedMultiple} from './balanced-cantor-arithmetic';
import {ScopedProof} from './scoped-proof';

export interface PositiveBalancedDomain<E> extends BalancedModel<PositivePolynomial<E>>, BalancedInfinity<PositivePolynomial<E>> {
  readonly field: FiniteField<E>; readonly ring: PositivePolynomialRing<E>; readonly squareFree: PositiveBezout<E>;
}
export type PositiveBalancedDivisor<E> = BalancedDivisor<PositivePolynomial<E>>;
export type PositiveBalancedAddition<E> = BalancedAddition<PositivePolynomial<E>>;
export type PositiveBalancedMultiple<E> = BalancedMultiple<PositivePolynomial<E>>;
const domains = new WeakSet<object>(), checks = new ScopedProof();
function source<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, bounds: DifferentialBounds): number {
  verifyFiniteFieldConstructionWithin(ctx, field, bounds); assertPositivePolynomialRingOwner(ctx, r);
  demand(r.field === field && field.characteristic > 2n, 'domain-mismatch', 'odd-characteristic balanced owner'); r.assert(ctx, h);
  const degree = r.degree(ctx, h); demand(degree >= 2 && degree % 2 === 0, 'invalid-input', 'finite even-degree balanced model'); return degree / 2 - 1;
}
export function verifyPositiveBalancedDomainWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, bounds: DifferentialBounds): void {
  ctx.tick(); demand(domain !== null && typeof domain === 'object' && domains.has(domain), 'domain-mismatch', 'owned finite balanced domain');
  checks.check(ctx, [domain, bounds], () => {
    demand(domain.genus === source(ctx, domain.field, domain.ring, domain.polynomial, bounds), 'verification-failed', 'complete finite balanced genus');
    verifyPositiveBezout(ctx, domain.ring, domain.polynomial, domain.ring.derivative(ctx, domain.polynomial), domain.squareFree);
    demand(domain.ring.equal(ctx, domain.squareFree.gcd, domain.ring.one(ctx)), 'verification-failed', 'smooth finite balanced model');
    ctx.allocate(14); verifyBalancedInfinity(ctx, positiveCantorArithmetic(domain.ring), domain);
  }, [domain.field, domain.ring]);
}
export function reconstructPositiveBalancedDomainWithin<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, squareFree: PositiveBezout<E>, infinity: BalancedInfinity<PositivePolynomial<E>>, bounds: DifferentialBounds): PositiveBalancedDomain<E> {
  const genus = source(ctx, field, r, h, bounds);
  demand(squareFree !== null && typeof squareFree === 'object' && infinity !== null && typeof infinity === 'object'
    && Object.isFrozen(squareFree) && Object.isFrozen(infinity), 'invalid-input', 'immutable finite balanced construction evidence');
  for (const [value, keys] of [[squareFree, ['gcd', 's', 't']], [infinity, ['plus', 'minus', 'infinityRemainder']]] as const) {
    ctx.allocate(keys.length); demand(Reflect.ownKeys(value).length === keys.length, 'invalid-input', 'finite balanced construction keys');
    for (const key of keys) {const property = Object.getOwnPropertyDescriptor(value, key); demand(property !== undefined && 'value' in property, 'invalid-input', 'finite balanced construction accessor');}
  }
  verifyPositiveBezout(ctx, r, h, r.derivative(ctx, h), squareFree); demand(r.equal(ctx, squareFree.gcd, r.one(ctx)), 'invalid-input', 'square-free finite balanced model');
  ctx.allocate(22); const domain = Object.freeze({field, ring: r, polynomial: h, squareFree, genus, ...infinity}); verifyBalancedInfinity(ctx, positiveCantorArithmetic(r), domain);
  domains.add(domain); verifyPositiveBalancedDomainWithin(ctx, domain, bounds); return domain;
}
export function constructPositiveBalancedDomain<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, root: E, bounds: DifferentialBounds): PositiveBalancedDomain<E> {
  return ctx.operation(() => {
    source(ctx, field, r, h, bounds); field.assert(ctx, root); ctx.allocate(14);
    return reconstructPositiveBalancedDomainWithin(ctx, field, r, h, positiveBezout(ctx, r, h, r.derivative(ctx, h)), constructBalancedInfinity(ctx, positiveCantorArithmetic(r), h, root), bounds);
  });
}
export function constructPositiveBalancedDivisorWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, u: PositivePolynomial<E>, v: PositivePolynomial<E>, n: bigint, bounds: DifferentialBounds): PositiveBalancedDivisor<E> {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); const r = positiveCantorArithmetic(domain.ring);
  return normalizeBalancedDivisor(ctx, r, domain, constructBalancedPair(ctx, r, domain, u, v), n).result;
}
export function verifyPositiveBalancedDivisorWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, bounds: DifferentialBounds): void {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyBalancedDivisor(ctx, positiveCantorArithmetic(domain.ring), domain, input);
}
export function addPositiveBalancedDivisorsWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, left: PositiveBalancedDivisor<E>, right: PositiveBalancedDivisor<E>, bounds: DifferentialBounds): PositiveBalancedAddition<E> {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); return addBalancedDivisors(ctx, positiveCantorArithmetic(domain.ring), domain, left, right);
}
export function verifyPositiveBalancedAdditionWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, left: PositiveBalancedDivisor<E>, right: PositiveBalancedDivisor<E>, p: PositiveBalancedAddition<E>, bounds: DifferentialBounds): void {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyBalancedAddition(ctx, positiveCantorArithmetic(domain.ring), domain, left, right, p);
}
export function multiplyPositiveBalancedDivisorWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, coefficient: bigint, bounds: DifferentialBounds): PositiveBalancedMultiple<E> {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); return multiplyBalancedDivisor(ctx, positiveCantorArithmetic(domain.ring), domain, input, coefficient);
}
export function verifyPositiveBalancedMultipleWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, coefficient: bigint, p: PositiveBalancedMultiple<E>, bounds: DifferentialBounds): void {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyBalancedMultiple(ctx, positiveCantorArithmetic(domain.ring), domain, input, coefficient, p);
}
export function constructPositiveBalancedDivisor<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, u: PositivePolynomial<E>, v: PositivePolynomial<E>, n: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => constructPositiveBalancedDivisorWithin(ctx, domain, u, v, n, bounds));
}
export function multiplyPositiveBalancedDivisor<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, coefficient: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => multiplyPositiveBalancedDivisorWithin(ctx, domain, input, coefficient, bounds));
}
export function verifyPositiveBalancedMultiple<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, coefficient: bigint, p: PositiveBalancedMultiple<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyPositiveBalancedMultipleWithin(ctx, domain, input, coefficient, p, bounds));
}
