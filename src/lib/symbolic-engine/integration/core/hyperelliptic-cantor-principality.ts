/** Unique reduced odd-degree classes decide principality over the actual C. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {verifyRamifiedHyperellipticModelWithin, type RamifiedHyperellipticModel} from './ramified-hyperelliptic-model';
import {reduceCantorDivisorWithin, verifyCantorDivisorClassWithin, type CantorDivisorClass} from './hyperelliptic-cantor-divisor';

export const cantorPrincipalityRule = 'hyperelliptic-cantor-principality-v1' as const;
export interface CantorPrincipality<E> {
  readonly rule: typeof cantorPrincipalityRule;
  readonly model: RamifiedHyperellipticModel<E>;
  readonly divisor: AlgebraicDivisor<E>;
  readonly kind: 'principal' | 'not-principal';
  readonly reduction: CantorDivisorClass<E> | null;
}
export function verifyCantorPrincipalityWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, proof: CantorPrincipality<E>, bounds: DifferentialBounds): void {
  verifyRamifiedHyperellipticModelWithin(ctx, model.curve, model, bounds); verifyAlgebraicDivisorWithin(ctx, model.curve, divisor.input, divisor);
  demand(proof.rule === cantorPrincipalityRule && proof.model === model && proof.divisor === divisor, 'verification-failed', 'Cantor principality exact request/rule');
  if (divisor.degree !== 0n) {demand(proof.kind === 'not-principal' && proof.reduction === null, 'verification-failed', 'nonzero divisor degree obstruction'); return;}
  demand(proof.reduction !== null, 'verification-failed', 'complete Cantor principality class required'); verifyCantorDivisorClassWithin(ctx, model, divisor, proof.reduction, bounds);
  demand(proof.kind === (model.domain.ring.degree(ctx, proof.reduction.pair.u) === 0 ? 'principal' : 'not-principal'), 'verification-failed', 'unique reduced class principality');
}
export function decideCantorPrincipalityWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): CantorPrincipality<E> {
  verifyRamifiedHyperellipticModelWithin(ctx, model.curve, model, bounds); verifyAlgebraicDivisorWithin(ctx, model.curve, divisor.input, divisor);
  const reduction = divisor.degree === 0n ? reduceCantorDivisorWithin(ctx, model, divisor, bounds) : null;
  ctx.allocate(5); const proof = Object.freeze({rule: cantorPrincipalityRule, model, divisor, kind: reduction !== null && model.domain.ring.degree(ctx, reduction.pair.u) === 0 ? 'principal' as const : 'not-principal' as const, reduction});
  verifyCantorPrincipalityWithin(ctx, model, divisor, proof, bounds); return proof;
}
export function decideCantorPrincipality<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => decideCantorPrincipalityWithin(ctx, model, divisor, bounds));
}
export function verifyCantorPrincipality<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, proof: CantorPrincipality<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyCantorPrincipalityWithin(ctx, model, divisor, proof, bounds));
}
