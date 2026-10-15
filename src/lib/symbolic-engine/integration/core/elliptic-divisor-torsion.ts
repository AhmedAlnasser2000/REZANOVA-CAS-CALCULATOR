import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {assertAlgebraicDivisor, type AlgebraicDivisor} from './algebraic-divisor';
import {tryEllipticCurveModelWithin, type EllipticCurveModel} from './elliptic-curve-model';
import {isEllipticRationalPlace} from './elliptic-place';
import {reduceEllipticDivisorWithin, verifyEllipticDivisorClassWithin, ellipticMultipleFactors, type EllipticDivisorClass} from './elliptic-miller';
import {multiplyEllipticPoint, verifyEllipticMultiple, type EllipticMultiple} from './elliptic-group';
import type {AlgebraicFunctionFactor} from './algebraic-factored-function';
import {algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition} from './algebraic-conditions';
import type {ExactField} from './field';
import {rationalEllipticOrders as rationalOrders} from './elliptic-rational-orders';
export const ellipticTorsionRule = 'elliptic-rational-torsion-miller-v1' as const;
// Mazur Theorem 4.1: this set is complete only over the certified field Q.
export interface EllipticDivisorTorsion<E> {
  readonly rule: typeof ellipticTorsionRule;
  readonly model: EllipticCurveModel<E>;
  readonly divisor: AlgebraicDivisor<E>;
  readonly reduction: EllipticDivisorClass<E>;
  readonly tests: readonly EllipticMultiple<E>[];
  readonly kind: 'torsion' | 'non-torsion';
  readonly order: bigint | null;
  readonly factors: readonly AlgebraicFunctionFactor<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function witness<E>(ctx: ExecutionContext, proof: EllipticDivisorClass<E>, multiple: EllipticMultiple<E>): readonly AlgebraicFunctionFactor<E>[] {
  ctx.allocate(proof.factors.length * 3); const factors = proof.factors.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(f.exponent, multiple.coefficient)}));
  const correction = ellipticMultipleFactors(ctx, multiple); ctx.allocate(correction.length); factors.push(...correction); return Object.freeze(factors);
}
function sources<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, factors: readonly AlgebraicFunctionFactor<E>[]) {
  const original = algebraicConstructionSources(ctx, curve.owner); ctx.allocate(original.length + factors.length);
  return [...original, ...factors.map((f, i) => ({field: curve.owner as ExactField<unknown>, value: f.value, nonzero: f.exponent < 0n, path: `elliptic.torsion.factor.${i}`}))];
}
export function verifyEllipticDivisorTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: EllipticDivisorTorsion<E>, bounds: DifferentialBounds): void {
  assertAlgebraicDivisor(ctx, curve, divisor);
  demand(proof.rule === ellipticTorsionRule && proof.divisor === divisor && proof.model.curve === curve
    && curve.coordinates.constantOwner.modulus.coefficients.length === 2, 'verification-failed', 'elliptic torsion construction/full rational constants');
  verifyEllipticDivisorClassWithin(ctx, proof.model, divisor, proof.reduction, bounds);
  demand(proof.tests.length > 0 && proof.tests.length <= rationalOrders.length, 'verification-failed', 'complete rational-order coverage');
  let order: bigint | null = null;
  for (let i = 0; i < proof.tests.length; i++) {
    verifyEllipticMultiple(ctx, proof.model, proof.reduction.point, rationalOrders[i], proof.tests[i]);
    if (proof.tests[i].point.kind === 'infinity') {demand(i === proof.tests.length - 1, 'verification-failed', 'first annihilator coverage'); order = rationalOrders[i];}
  }
  if (proof.kind === 'torsion') demand(order !== null && proof.order === order, 'verification-failed', 'least elliptic torsion order');
  else demand(proof.kind === 'non-torsion' && order === null && proof.order === null && proof.tests.length === rationalOrders.length, 'verification-failed', 'complete Mazur non-torsion obstruction');
  const factors = order === null ? Object.freeze([]) : witness(ctx, proof.reduction, proof.tests.at(-1)!);
  demand(factors.length === proof.factors.length && factors.every((f, i) => f.exponent === proof.factors[i].exponent && curve.owner.equal(ctx, f.value, proof.factors[i].value)), 'verification-failed', 'principal multiple Miller factors');
  verifyAlgebraicConditions(ctx, curve.owner, sources(ctx, curve, factors), proof.conditions, bounds);
}
export function tryDecideEllipticDivisorTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): EllipticDivisorTorsion<E> | null {
  assertAlgebraicDivisor(ctx, curve, divisor);
  if (divisor.degree !== 0n || curve.coordinates.constantOwner.modulus.coefficients.length !== 2) return null;
  const model = tryEllipticCurveModelWithin(ctx, curve, bounds); if (model === null || !divisor.entries.every(e => isEllipticRationalPlace(ctx, model, e.place))) return null;
  const reduction = reduceEllipticDivisorWithin(ctx, model, divisor, bounds), tests: EllipticMultiple<E>[] = []; let order: bigint | null = null;
  for (const n of rationalOrders) {
    const multiple = multiplyEllipticPoint(ctx, model, reduction.point, n); ctx.allocate(1); tests.push(multiple);
    if (multiple.point.kind === 'infinity') {order = n; break;}
  }
  const factors = order === null ? Object.freeze([]) : witness(ctx, reduction, tests.at(-1)!);
  const conditions = algebraicConditions(ctx, curve.owner, sources(ctx, curve, factors), bounds);
  ctx.allocate(10); const proof = Object.freeze({rule: ellipticTorsionRule, model, divisor, reduction, tests: Object.freeze(tests), kind: order === null ? 'non-torsion' as const : 'torsion' as const, order, factors, conditions});
  verifyEllipticDivisorTorsionWithin(ctx, curve, divisor, proof, bounds); return proof;
}
export function tryDecideEllipticDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => tryDecideEllipticDivisorTorsionWithin(ctx, curve, divisor, bounds));
}
export function verifyEllipticDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: EllipticDivisorTorsion<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyEllipticDivisorTorsionWithin(ctx, curve, divisor, proof, bounds));
}
