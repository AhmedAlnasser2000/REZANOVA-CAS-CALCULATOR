/** Registered characteristic-zero Mumford arithmetic for ramified models. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {rationalField as Q} from './field';
import {isAlgebraicField, algebraicHeight} from './algebraic-field';
import {verifyAlgebraicChainWithin} from './algebraic-derivative';
import {assertPolynomialRingOwner, type Polynomial, type PolynomialRing} from './polynomial';
import {polynomialDivide, exactDivide, extendedGcd, verifyBezout, type Bezout} from './polynomial-division';
import {ScopedProof} from './scoped-proof';
import {constructCantorPair, verifyCantorPair, equalCantorPairs, addCantorPairs, verifyCantorAddition,
  multiplyCantorPair, verifyCantorMultiple, type CantorMultiple, type CantorPolynomialArithmetic, type CantorPair, type CantorAddition} from './cantor-arithmetic';

export interface CantorDomain<E> {
  readonly ring: PolynomialRing<E>;
  readonly polynomial: Polynomial<E>;
  readonly squareFree: Bezout<E>;
  readonly genus: number;
}
export type MumfordPair<E> = CantorPair<Polynomial<E>>;
export type MumfordAddition<E> = CantorAddition<Polynomial<E>>;
const domains = new WeakSet<object>(), checks = new ScopedProof(), pairChecks = new ScopedProof(), additionChecks = new ScopedProof(), multipleChecks = new ScopedProof();
export function cantorPolynomialArithmetic<E>(r: PolynomialRing<E>): CantorPolynomialArithmetic<E, Polynomial<E>> {
  return {domain: r.domain, assert: (ctx, p) => r.assert(ctx, p), make: (ctx, c) => r.make(ctx, c), zero: ctx => r.zero(ctx), one: ctx => r.one(ctx),
    equal: (ctx, a, b) => r.equal(ctx, a, b), scale: (ctx, a, c) => r.scale(ctx, a, c), add: (ctx, a, b) => r.add(ctx, a, b), subtract: (ctx, a, b) => r.subtract(ctx, a, b),
    negate: (ctx, a) => r.negate(ctx, a), multiply: (ctx, a, b) => r.multiply(ctx, a, b), remainder: (ctx, a, b) => polynomialDivide(ctx, r, a, b).remainder,
    exactDivide: (ctx, a, b) => exactDivide(ctx, r, a, b), bezout: (ctx, a, b) => extendedGcd(ctx, r, a, b), verifyBezout: (ctx, a, b, p) => verifyBezout(ctx, r, a, b, p)};
}
function source<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, bounds: DifferentialBounds): number {
  assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, h); algebraicHeight(ctx, ring.domain, bounds);
  let parent: unknown = ring.domain; while (isAlgebraicField(parent)) {ctx.tick(); parent = parent.parent;}
  demand(parent === Q, 'domain-mismatch', 'registered characteristic-zero Cantor constants'); verifyAlgebraicChainWithin(ctx, ring.domain, bounds);
  const degree = ring.degree(ctx, h); demand(degree >= 1 && degree % 2 === 1, 'invalid-input', 'odd-degree Cantor model'); return (degree - 1) / 2;
}
export function assertCantorDomain<E>(ctx: ExecutionContext, domain: CantorDomain<E>): void {
  ctx.tick(); demand(domain !== null && typeof domain === 'object' && domains.has(domain), 'domain-mismatch', 'owned Cantor domain');
}
export function verifyCantorDomainWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, bounds: DifferentialBounds): void {
  assertCantorDomain(ctx, domain);
  checks.check(ctx, [domain, bounds], () => {
    const genus = source(ctx, domain.ring, domain.polynomial, bounds);
    verifyBezout(ctx, domain.ring, domain.polynomial, domain.ring.derivative(ctx, domain.polynomial), domain.squareFree);
    demand(domain.genus === genus && domain.ring.equal(ctx, domain.squareFree.gcd, domain.ring.one(ctx)), 'verification-failed', 'smooth complete ramified model');
  }, [domain.ring, domain.ring.domain]);
}
export function reconstructCantorDomainWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, squareFree: Bezout<E>, bounds: DifferentialBounds): CantorDomain<E> {
  demand(squareFree !== null && typeof squareFree === 'object' && Object.isFrozen(squareFree), 'invalid-input', 'immutable Cantor square-free evidence');
  ctx.allocate(3); demand(Reflect.ownKeys(squareFree).length === 3, 'invalid-input', 'Cantor square-free evidence keys');
  for (const key of ['gcd', 's', 't']) {const property = Object.getOwnPropertyDescriptor(squareFree, key); demand(property !== undefined && 'value' in property, 'invalid-input', 'Cantor square-free accessor');}
  const genus = source(ctx, ring, h, bounds); verifyBezout(ctx, ring, h, ring.derivative(ctx, h), squareFree);
  demand(ring.equal(ctx, squareFree.gcd, ring.one(ctx)), 'invalid-input', 'square-free Cantor polynomial');
  ctx.allocate(4); const domain = Object.freeze({ring, polynomial: h, squareFree, genus}); domains.add(domain); verifyCantorDomainWithin(ctx, domain, bounds); return domain;
}
export function constructCantorDomain<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, h: Polynomial<E>, bounds: DifferentialBounds): CantorDomain<E> {
  return ctx.operation(() => {source(ctx, ring, h, bounds); return reconstructCantorDomainWithin(ctx, ring, h, extendedGcd(ctx, ring, h, ring.derivative(ctx, h)), bounds);});
}
export function constructMumfordPairWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, u: Polynomial<E>, v: Polynomial<E>, bounds: DifferentialBounds): MumfordPair<E> {
  verifyCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); return constructCantorPair(ctx, cantorPolynomialArithmetic(domain.ring), domain.polynomial, u, v);
}
export function verifyMumfordPairWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, pair: MumfordPair<E>, bounds: DifferentialBounds): void {
  verifyCantorDomainWithin(ctx, domain, bounds);
  pairChecks.check(ctx, [domain, pair, bounds], () => {ctx.allocate(14); verifyCantorPair(ctx, cantorPolynomialArithmetic(domain.ring), domain.polynomial, pair);}, [domain.ring, domain.ring.domain]);
}
export function addMumfordPairsWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, left: MumfordPair<E>, right: MumfordPair<E>, bounds: DifferentialBounds): MumfordAddition<E> {
  verifyCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); return addCantorPairs(ctx, cantorPolynomialArithmetic(domain.ring), domain.polynomial, domain.genus, left, right);
}
export function verifyMumfordAdditionWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, left: MumfordPair<E>, right: MumfordPair<E>, proof: MumfordAddition<E>, bounds: DifferentialBounds): void {
  verifyCantorDomainWithin(ctx, domain, bounds);
  additionChecks.check(ctx, [domain, left, right, proof, bounds], () => {ctx.allocate(14); verifyCantorAddition(ctx, cantorPolynomialArithmetic(domain.ring), domain.polynomial, domain.genus, left, right, proof);}, [domain.ring, domain.ring.domain]);
}
export function equalMumfordPairs<E>(ctx: ExecutionContext, domain: CantorDomain<E>, left: MumfordPair<E>, right: MumfordPair<E>): boolean {
  assertCantorDomain(ctx, domain); ctx.allocate(14); return equalCantorPairs(ctx, cantorPolynomialArithmetic(domain.ring), left, right);
}
export type MumfordMultiple<E> = CantorMultiple<Polynomial<E>>;
export function verifyMumfordMultipleWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, input: MumfordPair<E>, coefficient: bigint, proof: MumfordMultiple<E>, bounds: DifferentialBounds): void {
  verifyCantorDomainWithin(ctx, domain, bounds); ctx.integer(coefficient);
  demand(proof.coefficient === coefficient, 'verification-failed', 'Mumford exact coefficient');
  multipleChecks.check(ctx, [domain, input, proof, bounds], () => {ctx.allocate(14); verifyCantorMultiple(ctx, cantorPolynomialArithmetic(domain.ring), domain.polynomial, domain.genus, input, coefficient, proof);}, [domain.ring, domain.ring.domain]);
}
export function multiplyMumfordPairWithin<E>(ctx: ExecutionContext, domain: CantorDomain<E>, input: MumfordPair<E>, coefficient: bigint, bounds: DifferentialBounds): MumfordMultiple<E> {
  verifyCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); return multiplyCantorPair(ctx, cantorPolynomialArithmetic(domain.ring), domain.polynomial, domain.genus, input, coefficient);
}
export function constructMumfordPair<E>(ctx: ExecutionContext, domain: CantorDomain<E>, u: Polynomial<E>, v: Polynomial<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => constructMumfordPairWithin(ctx, domain, u, v, bounds));
}
export function verifyMumfordPair<E>(ctx: ExecutionContext, domain: CantorDomain<E>, pair: MumfordPair<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyMumfordPairWithin(ctx, domain, pair, bounds));
}
export function addMumfordPairs<E>(ctx: ExecutionContext, domain: CantorDomain<E>, left: MumfordPair<E>, right: MumfordPair<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => addMumfordPairsWithin(ctx, domain, left, right, bounds));
}
export function verifyMumfordAddition<E>(ctx: ExecutionContext, domain: CantorDomain<E>, left: MumfordPair<E>, right: MumfordPair<E>, proof: MumfordAddition<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyMumfordAdditionWithin(ctx, domain, left, right, proof, bounds));
}
export function multiplyMumfordPair<E>(ctx: ExecutionContext, domain: CantorDomain<E>, input: MumfordPair<E>, coefficient: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => multiplyMumfordPairWithin(ctx, domain, input, coefficient, bounds));
}
export function verifyMumfordMultiple<E>(ctx: ExecutionContext, domain: CantorDomain<E>, input: MumfordPair<E>, coefficient: bigint, proof: MumfordMultiple<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyMumfordMultipleWithin(ctx, domain, input, coefficient, proof, bounds));
}
