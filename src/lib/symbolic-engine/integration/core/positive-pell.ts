/** Bounded Pell evidence in separate registered finite-field domains. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {FiniteField} from './positive-field';
import {verifyFiniteFieldConstructionWithin} from './positive-field-evidence';
import {positiveBezout, verifyPositiveBezout, type PositivePolynomialRing, type PositivePolynomial} from './positive-polynomial';
import {solvePellArithmetic, verifyPellArithmetic, type PellArithmeticDecision, type PellPolynomialArithmetic} from './polynomial-pell-arithmetic';
import {isPositiveFiniteExtension} from './positive-extension';
import {ScopedProof} from './scoped-proof';
const pellProofs = new ScopedProof();

export type PositivePellDecision<E> = PellArithmeticDecision<E, PositivePolynomial<E>>;
export function verifyPositivePellField<E>(ctx: ExecutionContext, field: FiniteField<E>, bounds: DifferentialBounds): void {
  verifyFiniteFieldConstructionWithin(ctx, field, bounds);
}
function source<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, h: PositivePolynomial<E>, bound: bigint, bounds: DifferentialBounds): number {
  verifyPositivePellField(ctx, field, bounds); demand(r.field === field && field.characteristic > 2n, 'domain-mismatch', 'owned odd-characteristic finite Pell coefficients');
  r.assert(ctx, h); ctx.integer(bound); const degree = r.degree(ctx, h);
  demand(bound >= 0n && degree > 0 && degree % 2 === 0 && field.equal(ctx, r.leading(ctx, h), field.fromInteger(ctx, 1n)), 'invalid-input', 'monic even-degree finite Pell request'); return degree / 2;
}
function arithmetic<E>(r: PositivePolynomialRing<E>): PellPolynomialArithmetic<E, PositivePolynomial<E>> {
  return {domain: r.field, assert: (ctx, p) => r.assert(ctx, p), make: (ctx, c) => r.make(ctx, c), zero: ctx => r.zero(ctx), one: ctx => r.one(ctx),
    degree: (ctx, p) => r.degree(ctx, p), leading: (ctx, p) => r.leading(ctx, p), isZero: (ctx, p) => r.isZero(ctx, p), equal: (ctx, a, b) => r.equal(ctx, a, b),
    add: (ctx, a, b) => r.add(ctx, a, b), subtract: (ctx, a, b) => r.subtract(ctx, a, b), negate: (ctx, p) => r.negate(ctx, p), multiply: (ctx, a, b) => r.multiply(ctx, a, b), derivative: (ctx, p) => r.derivative(ctx, p),
    divide: (ctx, a, b) => r.divide(ctx, a, b), verifyDivision(ctx, a, b, proof) {
      demand(!r.isZero(ctx, b) && r.degree(ctx, proof.remainder) < r.degree(ctx, b) && r.equal(ctx, a, r.add(ctx, r.multiply(ctx, b, proof.quotient), proof.remainder)), 'verification-failed', 'finite Pell exact quotient and remainder');
    }, bezout: (ctx, a, b) => positiveBezout(ctx, r, a, b), verifyBezout: (ctx, a, b, proof) => verifyPositiveBezout(ctx, r, a, b, proof)};
}
export function solvePositivePellWithin<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, input: PositivePolynomial<E>, bound: bigint, bounds: DifferentialBounds): PositivePellDecision<E> {
  const m = source(ctx, field, r, input, bound, bounds); ctx.allocate(17); return solvePellArithmetic(ctx, arithmetic(r), input, bound, m);
}
export function verifyPositivePellWithin<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, input: PositivePolynomial<E>, bound: bigint, proof: PositivePellDecision<E>, bounds: DifferentialBounds): void {
  const m = source(ctx, field, r, input, bound, bounds);
  demand(proof.maximumDegree === bound, 'verification-failed', 'finite Pell exact requested degree bound');
  // Source has independently verified this registered field chain. Exclude
  // only those exact owner objects from immutable-graph eligibility.
  const owners: object[] = [r]; ctx.allocate(1);
  let parent: FiniteField<unknown> = field as FiniteField<unknown>;
  for (;;) {ctx.tick(); ctx.allocate(1); owners.push(parent); if (!isPositiveFiniteExtension(parent)) break; ctx.allocate(1); owners.push(parent.ring); parent = parent.parent;}
  pellProofs.check(ctx, [input, proof, bounds], () => {ctx.allocate(17); verifyPellArithmetic(ctx, arithmetic(r), input, bound, proof, m);}, owners);
}
export function solvePositivePell<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, input: PositivePolynomial<E>, bound: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => solvePositivePellWithin(ctx, field, r, input, bound, bounds));
}
export function verifyPositivePell<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, input: PositivePolynomial<E>, bound: bigint, proof: PositivePellDecision<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyPositivePellWithin(ctx, field, r, input, bound, proof, bounds));
}
