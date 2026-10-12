import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, scaleAlgebraicDivisorWithin, equalAlgebraicDivisors,
  principalAlgebraicDivisorWithin, verifyAlgebraicPrincipalDivisorWithin, type AlgebraicDivisor, type AlgebraicPrincipalDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';

export const algebraicPrincipalityRule = 'algebraic-principality-riemann-roch-v1' as const;
export type AlgebraicPrincipality<E> = Readonly<{rule: typeof algebraicPrincipalityRule; divisor: AlgebraicDivisor<E>}> & (
  Readonly<{kind: 'not-principal'; reason: 'nonzero-degree'}> |
  Readonly<{kind: 'not-principal'; reason: 'zero-space'; negative: AlgebraicDivisor<E>; space: AlgebraicRiemannRoch<E>}> |
  Readonly<{kind: 'principal'; negative: AlgebraicDivisor<E>; space: AlgebraicRiemannRoch<E>; witness: E; principal: AlgebraicPrincipalDivisor<E>}>);

export function decideAlgebraicPrincipalityWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): AlgebraicPrincipality<E> {
  assertAlgebraicDivisor(ctx, curve, divisor);
  let result: AlgebraicPrincipality<E>;
  if (divisor.degree !== 0n) result = Object.freeze({kind: 'not-principal', reason: 'nonzero-degree', rule: algebraicPrincipalityRule, divisor});
  else {
    const negative = scaleAlgebraicDivisorWithin(ctx, curve, divisor, -1n), space = solveAlgebraicRiemannRochWithin(ctx, curve, negative, bounds);
    if (!space.dimension) result = Object.freeze({kind: 'not-principal', reason: 'zero-space', rule: algebraicPrincipalityRule, divisor, negative, space});
    else {
      const witness = space.basis[0], principal = principalAlgebraicDivisorWithin(ctx, curve, witness, bounds);
      demand(equalAlgebraicDivisors(ctx, curve, divisor, principal.divisor), 'verification-failed', 'principality witness exact divisor');
      result = Object.freeze({kind: 'principal', rule: algebraicPrincipalityRule, divisor, negative, space, witness, principal});
    }
  }
  verifyAlgebraicPrincipalityWithin(ctx, curve, divisor, result, bounds); return result;
}
export function verifyAlgebraicPrincipalityWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, decision: AlgebraicPrincipality<E>, bounds: DifferentialBounds): void {
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(decision.rule === algebraicPrincipalityRule && decision.divisor === divisor, 'verification-failed', 'principality exact request/rule');
  if (decision.kind === 'not-principal' && decision.reason === 'nonzero-degree') {
    demand(divisor.degree !== 0n, 'verification-failed', 'principality nonzero degree'); return;
  }
  demand(divisor.degree === 0n, 'verification-failed', 'principality degree-zero reduction');
  verifyAlgebraicDivisorWithin(ctx, curve, divisor.entries.map(e => ({place: e.place, coefficient: -e.coefficient})), decision.negative);
  verifyAlgebraicRiemannRochWithin(ctx, curve, decision.negative, decision.space, bounds);
  if (decision.kind === 'not-principal') {
    demand(decision.reason === 'zero-space' && decision.space.dimension === 0, 'verification-failed', 'complete zero Riemann–Roch obstruction'); return;
  }
  demand(decision.kind === 'principal' && decision.space.dimension > 0 && curve.owner.equal(ctx, decision.witness, decision.space.basis[0]), 'verification-failed', 'principality representative');
  verifyAlgebraicPrincipalDivisorWithin(ctx, curve, decision.witness, decision.principal, bounds);
  demand(equalAlgebraicDivisors(ctx, curve, divisor, decision.principal.divisor), 'verification-failed', 'principality complete witness equality');
  // A degree-zero divisor plus an effective divisor of equal degree can only
  // be zero. Full L(-D) therefore decides principality in both directions.
  // Riemann–Roch base change preserves this dimension under finite constants.
}
export function decideAlgebraicPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return decideAlgebraicPrincipalityWithin(ctx, curve, divisor, bounds); });
}
export function verifyAlgebraicPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, decision: AlgebraicPrincipality<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPrincipalityWithin(ctx, curve, divisor, decision, bounds); });
}
