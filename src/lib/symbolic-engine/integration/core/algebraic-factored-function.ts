import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { principalAlgebraicDivisorWithin, verifyAlgebraicPrincipalDivisorWithin, constructAlgebraicDivisorWithin,
  addAlgebraicDivisorsWithin, scaleAlgebraicDivisorWithin, equalAlgebraicDivisors, type AlgebraicDivisor, type AlgebraicPrincipalDivisor } from './algebraic-divisor';

export interface AlgebraicFunctionFactor<E> { readonly value: E; readonly exponent: bigint }
export interface AlgebraicFactoredFunction<E> {
  readonly unit: CurveConstant;
  readonly factors: readonly Readonly<AlgebraicFunctionFactor<E> & {principal: AlgebraicPrincipalDivisor<E>}>[];
  readonly divisor: AlgebraicDivisor<E>;
}
export function constructAlgebraicFactoredFunctionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, unit: CurveConstant,
  input: readonly AlgebraicFunctionFactor<E>[], bounds: DifferentialBounds): AlgebraicFactoredFunction<E> {
  const c = curve.coordinates.constantOwner; c.assert(ctx, unit); demand(!c.isZero(ctx, unit), 'division-by-zero', 'factored function constant unit');
  ctx.allocate(input.length); const factors = Object.freeze(input.map(f => {
    ctx.integer(f.exponent); return Object.freeze({...f, principal: principalAlgebraicDivisorWithin(ctx, curve, f.value, bounds)});
  }));
  let divisor = constructAlgebraicDivisorWithin(ctx, curve, []);
  for (const f of factors) divisor = addAlgebraicDivisorsWithin(ctx, curve, divisor, scaleAlgebraicDivisorWithin(ctx, curve, f.principal.divisor, f.exponent));
  const proof = Object.freeze({unit, factors, divisor}); verifyAlgebraicFactoredFunctionWithin(ctx, curve, unit, input, proof, bounds); return proof;
}
export function verifyAlgebraicFactoredFunctionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, unit: CurveConstant,
  input: readonly AlgebraicFunctionFactor<E>[], proof: AlgebraicFactoredFunction<E>, bounds: DifferentialBounds): void {
  const c = curve.coordinates.constantOwner; c.assert(ctx, unit);
  demand(!c.isZero(ctx, unit) && c.equal(ctx, unit, proof.unit) && proof.factors.length === input.length, 'verification-failed', 'factored function unit/coverage');
  let divisor = constructAlgebraicDivisorWithin(ctx, curve, []);
  for (let i = 0; i < input.length; i++) {
    const expected = input[i], f = proof.factors[i]; ctx.integer(f.exponent);
    demand(curve.owner.equal(ctx, expected.value, f.value) && expected.exponent === f.exponent, 'verification-failed', 'factored function ordered input');
    verifyAlgebraicPrincipalDivisorWithin(ctx, curve, f.value, f.principal, bounds);
    divisor = addAlgebraicDivisorsWithin(ctx, curve, divisor, scaleAlgebraicDivisorWithin(ctx, curve, f.principal.divisor, f.exponent));
  }
  demand(equalAlgebraicDivisors(ctx, curve, divisor, proof.divisor), 'verification-failed', 'factored function termwise divisor');
}
/** Deliberately separate from proof verification. Actual expanded degrees and
 * integer sizes use the caller's active budget, without affecting a verified
 * factored witness stored in another operation. */
export function expandAlgebraicFactoredFunction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicFactoredFunction<E>, bounds: DifferentialBounds): E {
  return ctx.operation(() => {
    verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    verifyAlgebraicFactoredFunctionWithin(ctx, curve, proof.unit, proof.factors, proof, bounds);
    const f = curve.owner; let result = curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, proof.unit));
    for (const factor of proof.factors) {
      let base = factor.exponent < 0n ? f.inverse(ctx, factor.value) : factor.value, n = factor.exponent < 0n ? -factor.exponent : factor.exponent; ctx.integer(n);
      while (n > 0n) { if (n % 2n) result = f.multiply(ctx, result, base); n = ctx.quotient(n, 2n); if (n) base = f.multiply(ctx, base, base); }
    }
    return result;
  });
}
export function constructAlgebraicFactoredFunction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, unit: CurveConstant, input: readonly AlgebraicFunctionFactor<E>[], bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return constructAlgebraicFactoredFunctionWithin(ctx, curve, unit, input, bounds); });
}
export function verifyAlgebraicFactoredFunction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, unit: CurveConstant, input: readonly AlgebraicFunctionFactor<E>[], proof: AlgebraicFactoredFunction<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicFactoredFunctionWithin(ctx, curve, unit, input, proof, bounds); });
}
