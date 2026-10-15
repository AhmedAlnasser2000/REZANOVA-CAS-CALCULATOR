/** Registered characteristic-zero balanced arithmetic for split even models.
 * These owners are separate from ramified Cantor and finite-field domains. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {rationalField as Q} from './field';
import {isAlgebraicField, algebraicHeight} from './algebraic-field';
import {verifyAlgebraicChainWithin} from './algebraic-derivative';
import {assertPolynomialRingOwner, type Polynomial, type PolynomialRing} from './polynomial';
import {extendedGcd, verifyBezout, type Bezout} from './polynomial-division';
import {ScopedProof} from './scoped-proof';
import {cantorPolynomialArithmetic} from './hyperelliptic-cantor';
import {constructBalancedInfinity, verifyBalancedInfinity, type BalancedInfinity} from './balanced-cantor-model';
import {constructBalancedPair, normalizeBalancedDivisor, verifyBalancedNormalization, verifyBalancedDivisor,
  addBalancedDivisors, verifyBalancedAddition, multiplyBalancedDivisor, verifyBalancedMultiple,
  type BalancedModel, type BalancedDivisor, type BalancedNormalization, type BalancedAddition, type BalancedMultiple} from './balanced-cantor-arithmetic';

export interface BalancedDomain<E> extends BalancedModel<Polynomial<E>>, BalancedInfinity<Polynomial<E>> {
  readonly ring: PolynomialRing<E>; readonly squareFree: Bezout<E>;
}
export type BalancedMumfordDivisor<E> = BalancedDivisor<Polynomial<E>>;
export type BalancedMumfordNormalization<E> = BalancedNormalization<Polynomial<E>>;
export type BalancedMumfordAddition<E> = BalancedAddition<Polynomial<E>>;
export type BalancedMumfordMultiple<E> = BalancedMultiple<Polynomial<E>>;
const domains = new WeakSet<object>(), checks = new ScopedProof(), divisorChecks = new ScopedProof(), multipleChecks = new ScopedProof();
function source<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, bounds: DifferentialBounds): number {
  assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, h); algebraicHeight(ctx, ring.domain, bounds);
  let parent: unknown = ring.domain; while (isAlgebraicField(parent)) {ctx.tick(); parent = parent.parent;}
  demand(parent === Q, 'domain-mismatch', 'registered characteristic-zero balanced constants'); verifyAlgebraicChainWithin(ctx, ring.domain, bounds);
  const degree = ring.degree(ctx, h); demand(degree >= 2 && degree % 2 === 0, 'invalid-input', 'even-degree balanced model'); return degree / 2 - 1;
}
export function verifyBalancedDomainWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, bounds: DifferentialBounds): void {
  ctx.tick(); demand(domain !== null && typeof domain === 'object' && domains.has(domain), 'domain-mismatch', 'owned characteristic-zero balanced domain');
  checks.check(ctx, [domain, bounds], () => {
    demand(domain.genus === source(ctx, domain.ring, domain.polynomial, bounds), 'verification-failed', 'complete balanced genus');
    verifyBezout(ctx, domain.ring, domain.polynomial, domain.ring.derivative(ctx, domain.polynomial), domain.squareFree);
    demand(domain.ring.equal(ctx, domain.squareFree.gcd, domain.ring.one(ctx)), 'verification-failed', 'smooth balanced model');
    ctx.allocate(14); verifyBalancedInfinity(ctx, cantorPolynomialArithmetic(domain.ring), domain);
  }, [domain.ring, domain.ring.domain]);
}
export function reconstructBalancedDomainWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, squareFree: Bezout<E>, infinity: BalancedInfinity<Polynomial<E>>, bounds: DifferentialBounds): BalancedDomain<E> {
  const genus = source(ctx, ring, h, bounds);
  demand(squareFree !== null && typeof squareFree === 'object' && infinity !== null && typeof infinity === 'object'
    && Object.isFrozen(squareFree) && Object.isFrozen(infinity), 'invalid-input', 'immutable balanced construction evidence');
  for (const [value, keys] of [[squareFree, ['gcd', 's', 't']], [infinity, ['plus', 'minus', 'infinityRemainder']]] as const) {
    ctx.allocate(keys.length); demand(Reflect.ownKeys(value).length === keys.length, 'invalid-input', 'balanced construction keys');
    for (const key of keys) {const property = Object.getOwnPropertyDescriptor(value, key); demand(property !== undefined && 'value' in property, 'invalid-input', 'balanced construction accessor');}
  }
  verifyBezout(ctx, ring, h, ring.derivative(ctx, h), squareFree); demand(ring.equal(ctx, squareFree.gcd, ring.one(ctx)), 'invalid-input', 'square-free balanced model');
  ctx.allocate(21); const domain = Object.freeze({ring, polynomial: h, squareFree, genus, ...infinity}); verifyBalancedInfinity(ctx, cantorPolynomialArithmetic(ring), domain);
  domains.add(domain); verifyBalancedDomainWithin(ctx, domain, bounds); return domain;
}
export function constructBalancedDomain<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, root: E, bounds: DifferentialBounds): BalancedDomain<E> {
  return ctx.operation(() => constructBalancedDomainWithin(ctx, ring, h, root, bounds));
}
export function constructBalancedDomainWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, root: E, bounds: DifferentialBounds): BalancedDomain<E> {
  source(ctx, ring, h, bounds); ring.domain.assert(ctx, root); ctx.allocate(14);
  return reconstructBalancedDomainWithin(ctx, ring, h, extendedGcd(ctx, ring, h, ring.derivative(ctx, h)), constructBalancedInfinity(ctx, cantorPolynomialArithmetic(ring), h, root), bounds);
}
export function constructBalancedMumfordWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, u: Polynomial<E>, v: Polynomial<E>, n: bigint, bounds: DifferentialBounds): BalancedMumfordNormalization<E> {
  verifyBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); const r = cantorPolynomialArithmetic(domain.ring);
  return normalizeBalancedDivisor(ctx, r, domain, constructBalancedPair(ctx, r, domain, u, v), n);
}
export function verifyBalancedMumfordWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, divisor: BalancedMumfordDivisor<E>, bounds: DifferentialBounds): void {
  verifyBalancedDomainWithin(ctx, domain, bounds); divisorChecks.check(ctx, [domain, divisor, bounds], () => {
    ctx.allocate(14); verifyBalancedDivisor(ctx, cantorPolynomialArithmetic(domain.ring), domain, divisor);
  }, [domain.ring, domain.ring.domain]);
}
export function verifyBalancedMumfordNormalizationWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, u: Polynomial<E>, v: Polynomial<E>, n: bigint, proof: BalancedMumfordNormalization<E>, bounds: DifferentialBounds): void {
  verifyBalancedDomainWithin(ctx, domain, bounds); demand(domain.ring.equal(ctx, u, proof.input.u) && domain.ring.equal(ctx, v, proof.input.v), 'verification-failed', 'balanced original coordinates');
  ctx.allocate(14); verifyBalancedNormalization(ctx, cantorPolynomialArithmetic(domain.ring), domain, proof.input, n, proof);
}
export function addBalancedMumfordWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, left: BalancedMumfordDivisor<E>, right: BalancedMumfordDivisor<E>, bounds: DifferentialBounds): BalancedMumfordAddition<E> {
  verifyBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); return addBalancedDivisors(ctx, cantorPolynomialArithmetic(domain.ring), domain, left, right);
}
export function verifyBalancedMumfordAdditionWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, left: BalancedMumfordDivisor<E>, right: BalancedMumfordDivisor<E>, proof: BalancedMumfordAddition<E>, bounds: DifferentialBounds): void {
  verifyBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyBalancedAddition(ctx, cantorPolynomialArithmetic(domain.ring), domain, left, right, proof);
}
export function multiplyBalancedMumfordWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, input: BalancedMumfordDivisor<E>, coefficient: bigint, bounds: DifferentialBounds): BalancedMumfordMultiple<E> {
  verifyBalancedDomainWithin(ctx, domain, bounds); ctx.allocate(14); return multiplyBalancedDivisor(ctx, cantorPolynomialArithmetic(domain.ring), domain, input, coefficient);
}
export function verifyBalancedMumfordMultipleWithin<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, input: BalancedMumfordDivisor<E>, coefficient: bigint, proof: BalancedMumfordMultiple<E>, bounds: DifferentialBounds): void {
  verifyBalancedDomainWithin(ctx, domain, bounds); ctx.integer(coefficient); demand(proof.coefficient === coefficient, 'verification-failed', 'balanced explicit coefficient');
  multipleChecks.check(ctx, [domain, input, proof, bounds], () => {ctx.allocate(14); verifyBalancedMultiple(ctx, cantorPolynomialArithmetic(domain.ring), domain, input, coefficient, proof);}, [domain.ring, domain.ring.domain]);
}
export function constructBalancedMumford<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, u: Polynomial<E>, v: Polynomial<E>, n: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => constructBalancedMumfordWithin(ctx, domain, u, v, n, bounds));
}
export function multiplyBalancedMumford<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, input: BalancedMumfordDivisor<E>, coefficient: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => multiplyBalancedMumfordWithin(ctx, domain, input, coefficient, bounds));
}
export function verifyBalancedMumfordMultiple<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, input: BalancedMumfordDivisor<E>, coefficient: bigint, proof: BalancedMumfordMultiple<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyBalancedMumfordMultipleWithin(ctx, domain, input, coefficient, proof, bounds));
}
