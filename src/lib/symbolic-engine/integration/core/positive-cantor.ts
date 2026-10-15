/** Finite Mumford arithmetic keeps separate positive-characteristic owners. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {FiniteField} from './positive-field';
import {verifyFiniteFieldConstructionWithin} from './positive-field-evidence';
import {assertPositivePolynomialRingOwner, positiveBezout, verifyPositiveBezout, type PositivePolynomialRing, type PositivePolynomial, type PositiveBezout} from './positive-polynomial';
import {constructCantorPair, verifyCantorPair, addCantorPairs, verifyCantorAddition, multiplyCantorPair, verifyCantorMultiple,
  type CantorPolynomialArithmetic, type CantorPair, type CantorAddition, type CantorMultiple} from './cantor-arithmetic';
import {ScopedProof} from './scoped-proof';

export interface PositiveCantorDomain<E> {
  readonly field: FiniteField<E>;
  readonly ring: PositivePolynomialRing<E>;
  readonly polynomial: PositivePolynomial<E>;
  readonly squareFree: PositiveBezout<E>;
  readonly genus: number;
}
export type PositiveMumfordPair<E> = CantorPair<PositivePolynomial<E>>;
export type PositiveMumfordAddition<E> = CantorAddition<PositivePolynomial<E>>;
export type PositiveMumfordMultiple<E> = CantorMultiple<PositivePolynomial<E>>;
const domains = new WeakSet<object>(), checks = new ScopedProof();
export function positiveCantorArithmetic<E>(r: PositivePolynomialRing<E>): CantorPolynomialArithmetic<E, PositivePolynomial<E>> {
  return {domain: r.field, assert: (ctx, p) => r.assert(ctx, p), make: (ctx, c) => r.make(ctx, c), zero: ctx => r.zero(ctx), one: ctx => r.one(ctx), equal: (ctx, a, b) => r.equal(ctx, a, b),
    scale: (ctx, a, c) => r.scale(ctx, a, c), add: (ctx, a, b) => r.add(ctx, a, b), subtract: (ctx, a, b) => r.subtract(ctx, a, b), negate: (ctx, p) => r.negate(ctx, p),
    multiply: (ctx, a, b) => r.multiply(ctx, a, b), remainder: (ctx, a, b) => r.divide(ctx, a, b).remainder, exactDivide: (ctx, a, b) => r.exactDivide(ctx, a, b),
    bezout: (ctx, a, b) => positiveBezout(ctx, r, a, b), verifyBezout: (ctx, a, b, p) => verifyPositiveBezout(ctx, r, a, b, p)};
}
function source<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, bounds: DifferentialBounds): number {
  verifyFiniteFieldConstructionWithin(ctx, field, bounds); assertPositivePolynomialRingOwner(ctx, r);
  demand(r.field === field && field.characteristic > 2n, 'domain-mismatch', 'odd-characteristic Cantor coefficient owner'); r.assert(ctx, h);
  const degree = r.degree(ctx, h); demand(degree >= 1 && degree % 2 === 1, 'invalid-input', 'finite ramified Cantor model'); return (degree - 1) / 2;
}
export function verifyPositiveCantorDomainWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, bounds: DifferentialBounds): void {
  ctx.tick(); demand(domain !== null && typeof domain === 'object' && domains.has(domain), 'domain-mismatch', 'owned finite Cantor domain');
  checks.check(ctx, [domain, bounds], () => {
    demand(domain.genus === source(ctx, domain.field, domain.ring, domain.polynomial, bounds), 'verification-failed', 'complete finite Cantor genus');
    verifyPositiveBezout(ctx, domain.ring, domain.polynomial, domain.ring.derivative(ctx, domain.polynomial), domain.squareFree);
    demand(domain.ring.equal(ctx, domain.squareFree.gcd, domain.ring.one(ctx)), 'verification-failed', 'smooth finite Cantor model');
  }, [domain.field, domain.ring]);
}
export function reconstructPositiveCantorDomainWithin<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, squareFree: PositiveBezout<E>, bounds: DifferentialBounds): PositiveCantorDomain<E> {
  demand(squareFree !== null && typeof squareFree === 'object' && Object.isFrozen(squareFree), 'invalid-input', 'immutable finite Cantor square-free evidence');
  ctx.allocate(3); demand(Reflect.ownKeys(squareFree).length === 3, 'invalid-input', 'finite Cantor square-free keys');
  for (const key of ['gcd', 's', 't']) {const property = Object.getOwnPropertyDescriptor(squareFree, key); demand(property !== undefined && 'value' in property, 'invalid-input', 'finite Cantor square-free accessor');}
  const genus = source(ctx, field, r, h, bounds); verifyPositiveBezout(ctx, r, h, r.derivative(ctx, h), squareFree);
  demand(r.equal(ctx, squareFree.gcd, r.one(ctx)), 'invalid-input', 'square-free finite Cantor polynomial');
  ctx.allocate(5); const domain = Object.freeze({field, ring: r, polynomial: h, squareFree, genus}); domains.add(domain); verifyPositiveCantorDomainWithin(ctx, domain, bounds); return domain;
}
export function constructPositiveCantorDomain<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, bounds: DifferentialBounds): PositiveCantorDomain<E> {
  return ctx.operation(() => {source(ctx, field, r, h, bounds); return reconstructPositiveCantorDomainWithin(ctx, field, r, h, positiveBezout(ctx, r, h, r.derivative(ctx, h)), bounds);});
}
export function constructPositiveMumfordPairWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, u: PositivePolynomial<E>, v: PositivePolynomial<E>, bounds: DifferentialBounds): PositiveMumfordPair<E> {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); return constructCantorPair(ctx, positiveCantorArithmetic(domain.ring), domain.polynomial, u, v);
}
export function verifyPositiveMumfordPairWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, proof: PositiveMumfordPair<E>, bounds: DifferentialBounds): void {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyCantorPair(ctx, positiveCantorArithmetic(domain.ring), domain.polynomial, proof);
}
export function addPositiveMumfordPairsWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, left: PositiveMumfordPair<E>, right: PositiveMumfordPair<E>, bounds: DifferentialBounds): PositiveMumfordAddition<E> {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); return addCantorPairs(ctx, positiveCantorArithmetic(domain.ring), domain.polynomial, domain.genus, left, right);
}
export function verifyPositiveMumfordAdditionWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, left: PositiveMumfordPair<E>, right: PositiveMumfordPair<E>, proof: PositiveMumfordAddition<E>, bounds: DifferentialBounds): void {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyCantorAddition(ctx, positiveCantorArithmetic(domain.ring), domain.polynomial, domain.genus, left, right, proof);
}
export function multiplyPositiveMumfordPairWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, coefficient: bigint, bounds: DifferentialBounds): PositiveMumfordMultiple<E> {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); return multiplyCantorPair(ctx, positiveCantorArithmetic(domain.ring), domain.polynomial, domain.genus, input, coefficient);
}
export function verifyPositiveMumfordMultipleWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, coefficient: bigint, proof: PositiveMumfordMultiple<E>, bounds: DifferentialBounds): void {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); ctx.allocate(14); verifyCantorMultiple(ctx, positiveCantorArithmetic(domain.ring), domain.polynomial, domain.genus, input, coefficient, proof);
}
export function constructPositiveMumfordPair<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, u: PositivePolynomial<E>, v: PositivePolynomial<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => constructPositiveMumfordPairWithin(ctx, domain, u, v, bounds));
}
export function multiplyPositiveMumfordPair<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, coefficient: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => multiplyPositiveMumfordPairWithin(ctx, domain, input, coefficient, bounds));
}
export function verifyPositiveMumfordMultiple<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, coefficient: bigint, proof: PositiveMumfordMultiple<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyPositiveMumfordMultipleWithin(ctx, domain, input, coefficient, proof, bounds));
}
