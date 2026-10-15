/** Complete bounded polynomial-unit recognition by formal continued fractions.
 * A bounded negative is not a non-torsion or integration decision. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {rationalField as Q} from './field';
import {algebraicHeight, isAlgebraicField} from './algebraic-field';
import {verifyAlgebraicChainWithin} from './algebraic-derivative';
import {assertPolynomialRingOwner, type PolynomialRing, type Polynomial} from './polynomial';
import {extendedGcd, verifyBezout, polynomialDivide, verifyDivision, type Bezout, type Division} from './polynomial-division';
import {solvePellArithmetic, verifyPellArithmetic, type PellPolynomialArithmetic} from './polynomial-pell-arithmetic';
import {ScopedProof} from './scoped-proof';
const pellProofs = new ScopedProof();

export interface PolynomialPellStep<E> {
  readonly offset: Polynomial<E>;
  readonly denominator: Polynomial<E>;
  readonly division: Division<E>;
  readonly nextOffset: Polynomial<E>;
  readonly nextDenominator: Polynomial<E>;
  readonly numerator: Polynomial<E> | null;
  readonly convergentDenominator: Polynomial<E> | null;
  readonly norm: Polynomial<E> | null;
}
export interface PolynomialPellDecision<E> {
  readonly rule: 'polynomial-pell-bounded-cf-v1';
  readonly input: Polynomial<E>;
  readonly maximumDegree: bigint;
  readonly squareFree: Bezout<E>;
  readonly polynomialPart: Polynomial<E>;
  readonly steps: readonly PolynomialPellStep<E>[];
  readonly kind: 'unit' | 'bounded-empty';
  readonly numerator: Polynomial<E> | null;
  readonly denominator: Polynomial<E> | null;
  readonly norm: E | null;
  readonly leastDegree: bigint | null;
}
function source<E>(ctx: ExecutionContext, r: PolynomialRing<E>, h: Polynomial<E>, maximumDegree: bigint, bounds: DifferentialBounds): number {
  assertPolynomialRingOwner(ctx, r); algebraicHeight(ctx, r.domain, bounds); r.assert(ctx, h); ctx.integer(maximumDegree);
  let parent: unknown = r.domain; while (isAlgebraicField(parent)) {ctx.tick(); parent = parent.parent;}
  demand(parent === Q, 'domain-mismatch', 'registered number-field Pell coefficients');
  verifyAlgebraicChainWithin(ctx, r.domain, bounds);
  demand(maximumDegree >= 0n && r.degree(ctx, h) > 0 && r.degree(ctx, h) % 2 === 0
    && r.domain.equal(ctx, r.leading(ctx, h), r.domain.fromInteger(ctx, 1n)), 'invalid-input', 'monic even-degree bounded Pell input');
  return r.degree(ctx, h) / 2;
}
function arithmetic<E>(r: PolynomialRing<E>): PellPolynomialArithmetic<E, Polynomial<E>> {
  return {domain: r.domain, assert: (ctx, p) => r.assert(ctx, p), make: (ctx, c) => r.make(ctx, c), zero: ctx => r.zero(ctx), one: ctx => r.one(ctx),
    degree: (ctx, p) => r.degree(ctx, p), leading: (ctx, p) => r.leading(ctx, p), isZero: (ctx, p) => r.isZero(ctx, p), equal: (ctx, a, b) => r.equal(ctx, a, b),
    add: (ctx, a, b) => r.add(ctx, a, b), subtract: (ctx, a, b) => r.subtract(ctx, a, b), negate: (ctx, p) => r.negate(ctx, p), multiply: (ctx, a, b) => r.multiply(ctx, a, b), derivative: (ctx, p) => r.derivative(ctx, p),
    divide: (ctx, a, b) => polynomialDivide(ctx, r, a, b), verifyDivision: (ctx, a, b, proof) => verifyDivision(ctx, r, a, b, proof),
    bezout: (ctx, a, b) => extendedGcd(ctx, r, a, b), verifyBezout: (ctx, a, b, proof) => verifyBezout(ctx, r, a, b, proof)};
}
export function verifyPolynomialPellWithin<E>(ctx: ExecutionContext, r: PolynomialRing<E>, h: Polynomial<E>, maximumDegree: bigint, proof: PolynomialPellDecision<E>, bounds: DifferentialBounds): void {
  const m = source(ctx, r, h, maximumDegree, bounds);
  demand(proof.maximumDegree === maximumDegree, 'verification-failed', 'Pell exact requested degree bound');
  pellProofs.check(ctx, [h, proof, bounds], () => {ctx.allocate(17); verifyPellArithmetic(ctx, arithmetic(r), h, maximumDegree, proof, m);}, [r, r.domain]);
}
export function solvePolynomialPellWithin<E>(ctx: ExecutionContext, r: PolynomialRing<E>, h: Polynomial<E>, maximumDegree: bigint, bounds: DifferentialBounds): PolynomialPellDecision<E> {
  const m = source(ctx, r, h, maximumDegree, bounds); ctx.allocate(17); return solvePellArithmetic(ctx, arithmetic(r), h, maximumDegree, m);
}
export function solvePolynomialPell<E>(ctx: ExecutionContext, r: PolynomialRing<E>, h: Polynomial<E>, maximumDegree: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => solvePolynomialPellWithin(ctx, r, h, maximumDegree, bounds));
}
export function verifyPolynomialPell<E>(ctx: ExecutionContext, r: PolynomialRing<E>, h: Polynomial<E>, maximumDegree: bigint, proof: PolynomialPellDecision<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyPolynomialPellWithin(ctx, r, h, maximumDegree, proof, bounds));
}
