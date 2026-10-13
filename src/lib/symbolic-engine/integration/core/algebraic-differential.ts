import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { certifyAlgebraicCurveGeometryWithin, verifyAlgebraicCurveGeometryWithin, type AlgebraicCurveGeometry } from './algebraic-curve-geometry';
import { principalAlgebraicDivisorWithin, verifyAlgebraicPrincipalDivisorWithin, constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin,
  type AlgebraicPrincipalDivisor, type AlgebraicDivisor, type AlgebraicDivisorEntry } from './algebraic-divisor';
import { algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition } from './algebraic-conditions';
import type { ExactField } from './field';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

export interface AlgebraicDifferential<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly input: E;
  readonly geometry: AlgebraicCurveGeometry<E>;
  readonly principal: AlgebraicPrincipalDivisor<E> | null;
  readonly divisor: AlgebraicDivisor<E> | null;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export function algebraicIntegrationConditionSources<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, returned: readonly E[] = []) {
  ctx.allocate(returned.length + 1);
  return [...algebraicConstructionSources(ctx, curve.owner), {field: curve.owner as ExactField<unknown>, value: input, path: 'integration.input'},
    ...returned.map((value, i) => ({field: curve.owner as ExactField<unknown>, value, path: `integration.returned.${i}`}))];
}
export function certifyAlgebraicDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicDifferential<E> {
  curve.owner.assert(ctx, input); const geometry = certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds), zero = curve.owner.isZero(ctx, input);
  const principal = zero ? null : principalAlgebraicDivisorWithin(ctx, curve, input, bounds), divisor = principal ? constructAlgebraicDivisorWithin(ctx, curve, [...principal.divisor.entries, ...geometry.canonical.entries]) : null;
  const conditions = algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input), bounds);
  const result = Object.freeze({input, geometry, principal, divisor, conditions}); verifyAlgebraicDifferentialWithin(ctx, curve, input, result, bounds); return result;
}
export function verifyAlgebraicDifferentialWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferential<E>, bounds: DifferentialBounds): void {
  curve.owner.assert(ctx, input); demand(curve.owner.equal(ctx, proof.input, input), 'verification-failed', 'differential complete expected input');
  verifyAlgebraicCurveGeometryWithin(ctx, curve, proof.geometry, bounds);
  if (curve.owner.isZero(ctx, input)) demand(proof.principal === null && proof.divisor === null, 'verification-failed', 'zero differential explicit representation');
  else {
    demand(proof.principal !== null && proof.divisor !== null, 'verification-failed', 'differential complete divisor evidence');
    verifyAlgebraicPrincipalDivisorWithin(ctx, curve, input, proof.principal, bounds);
    verifyAlgebraicDivisorWithin(ctx, curve, [...proof.principal.divisor.entries, ...proof.geometry.canonical.entries], proof.divisor);
    demand(proof.divisor.degree === proof.geometry.canonical.degree, 'verification-failed', 'differential canonical degree');
  }
  verifyAlgebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input), proof.conditions, bounds);
}
export function differentialPrimitiveBoundEntries<E>(ctx: ExecutionContext, proof: AlgebraicDifferential<E>, infinityOnly = false): readonly AlgebraicDivisorEntry<E>[] {
  const entries: AlgebraicDivisorEntry<E>[] = []; ctx.allocate(proof.divisor?.entries.length ?? 0);
  for (const e of proof.divisor?.entries ?? []) if (e.coefficient < -1n && (!infinityOnly || e.place.order.infinity))
    entries.push(Object.freeze({place: e.place, coefficient: ctx.add(-e.coefficient, -1n)}));
  return Object.freeze(entries);
}
export function certifyAlgebraicDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const p = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return certifyAlgebraicDifferentialWithin(ctx, curve, input, bounds); }); return Object.freeze({...p.value, arithmetic: p.evidence}); });
}
export function verifyAlgebraicDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferential<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'differential complete arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDifferentialWithin(ctx, curve, input, proof, bounds); }); });
}
