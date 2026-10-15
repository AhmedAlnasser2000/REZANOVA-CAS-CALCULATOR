/** Exact polynomial norm over a supplied finite number-field extension. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, assertPolynomialRingOwner, type Polynomial} from './polynomial';
import {PolynomialDomain} from './polynomial-domain';
import {isAlgebraicField, type AlgebraicField, type AlgebraicElement} from './algebraic-field';
import {verifyAlgebraicChainWithin} from './algebraic-derivative';
import {numberFieldModularDescriptor} from './number-field-modular-image';
import {produceNumberFieldPolynomialResultantWithin, verifyNumberFieldPolynomialResultantWithin,
  type NumberFieldBivariateRing, type NumberFieldBivariate, type NumberFieldPolynomialResultant} from './number-field-polynomial-resultant';

export interface NumberFieldPolynomialNorm<E> {
  readonly input: Polynomial<AlgebraicElement<E>>; readonly ring: NumberFieldBivariateRing<E>;
  readonly defining: NumberFieldBivariate<E>; readonly converted: NumberFieldBivariate<E>;
  readonly resultant: NumberFieldPolynomialResultant<E>; readonly value: Polynomial<E>;
}
export function requireNumberFieldPolynomialNormInputWithin<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, bounds: DifferentialBounds): void {
  demand(isAlgebraicField(owner), 'domain-mismatch', 'owned finite constant norm extension'); verifyAlgebraicChainWithin(ctx, owner, bounds); numberFieldModularDescriptor(ctx, owner);
  assertPolynomialRingOwner(ctx, input.ring); demand(input.ring.domain === owner, 'domain-mismatch', 'polynomial norm coefficient owner'); input.ring.assert(ctx, input);
}
/** Transposition is checked in both directions, without numerical root matching. */
export function verifyNumberFieldNormConversionWithin<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, ring: NumberFieldBivariateRing<E>, defining: NumberFieldBivariate<E>, converted: NumberFieldBivariate<E>): void {
  const inner = ring.domain.ring; demand(inner.domain === owner.parent && inner.variable === input.ring.variable && ring.variable === owner.ring.variable, 'domain-mismatch', 'norm exact auxiliary coefficient/binder owners');
  ring.assert(ctx, defining); ring.assert(ctx, converted);
  demand(defining.coefficients.length === owner.modulus.coefficients.length, 'verification-failed', 'complete monic norm relation coverage');
  for (let i = 0; i < defining.coefficients.length; i++) demand(inner.equal(ctx, defining.coefficients[i], inner.constant(ctx, owner.modulus.coefficients[i])), 'verification-failed', 'norm complete defining polynomial conversion');
  const degree = owner.ring.degree(ctx, owner.modulus); demand(converted.coefficients.length <= degree, 'verification-failed', 'norm reduced root-coordinate coverage');
  let length = input.coefficients.length; for (const p of converted.coefficients) length = Math.max(length, p.coefficients.length);
  for (let i = 0; i < length; i++) {
    ctx.allocate(degree); const coordinates: E[] = [];
    for (let j = 0; j < degree; j++) coordinates.push(converted.coefficients[j]?.coefficients[i] ?? owner.parent.fromInteger(ctx, 0n));
    const expected = input.coefficients[i] ?? owner.fromInteger(ctx, 0n);
    demand(owner.equal(ctx, owner.make(ctx, owner.ring.make(ctx, coordinates)), expected), 'verification-failed', 'norm inverse native coefficient conversion');
    for (let j = 0; j < degree; j++) demand(owner.parent.equal(ctx, expected.representative.coefficients[j] ?? owner.parent.fromInteger(ctx, 0n), coordinates[j]), 'verification-failed', 'norm forward native coefficient conversion');
  }
}
export function verifyNumberFieldPolynomialNormWithin<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, proof: NumberFieldPolynomialNorm<E>, bounds: DifferentialBounds): void {
  requireNumberFieldPolynomialNormInputWithin(ctx, owner, input, bounds); demand(input.ring.equal(ctx, input, proof.input), 'verification-failed', 'exact polynomial norm input');
  // The resultant verifier checks the registered polynomial coefficient ring
  // before conversion invokes any arithmetic belonging to that ring.
  verifyNumberFieldPolynomialResultantWithin(ctx, proof.ring, proof.defining, proof.converted, proof.resultant, bounds);
  verifyNumberFieldNormConversionWithin(ctx, owner, input, proof.ring, proof.defining, proof.converted);
  demand(proof.ring.domain.ring.equal(ctx, proof.value, proof.resultant.resultant), 'verification-failed', 'ordered monic polynomial norm resultant');
}
export function produceNumberFieldPolynomialNormWithin<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, bounds: DifferentialBounds): NumberFieldPolynomialNorm<E> {
  requireNumberFieldPolynomialNormInputWithin(ctx, owner, input, bounds); const inner = new PolynomialRing(owner.parent, input.ring.variable), ring = new PolynomialRing(new PolynomialDomain(inner), owner.ring.variable), degree = owner.ring.degree(ctx, owner.modulus);
  const slots = ctx.add(ctx.multiply(BigInt(degree), ctx.add(BigInt(input.coefficients.length), 1n)), BigInt(owner.modulus.coefficients.length));
  if (slots > BigInt(Number.MAX_SAFE_INTEGER)) ctx.exhaust('polynomial norm conversion dimensions'); ctx.allocate(Number(slots));
  const defining = ring.make(ctx, owner.modulus.coefficients.map(c => inner.constant(ctx, c))), columns: Polynomial<E>[] = [];
  for (let j = 0; j < degree; j++) columns.push(inner.make(ctx, input.coefficients.map(c => c.representative.coefficients[j] ?? owner.parent.fromInteger(ctx, 0n))));
  const converted = ring.make(ctx, columns); verifyNumberFieldNormConversionWithin(ctx, owner, input, ring, defining, converted);
  const resultant = produceNumberFieldPolynomialResultantWithin(ctx, ring, defining, converted, bounds); ctx.allocate(6);
  const proof = Object.freeze({input, ring, defining, converted, resultant, value: resultant.resultant}); verifyNumberFieldPolynomialNormWithin(ctx, owner, input, proof, bounds); return proof;
}
export function produceNumberFieldPolynomialNorm<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, bounds: DifferentialBounds): NumberFieldPolynomialNorm<E> {
  return ctx.operation(() => produceNumberFieldPolynomialNormWithin(ctx, owner, input, bounds));
}
export function verifyNumberFieldPolynomialNorm<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, proof: NumberFieldPolynomialNorm<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyNumberFieldPolynomialNormWithin(ctx, owner, input, proof, bounds));
}
