/** Distinct native Miller certificates. No incomplete legacy divisor evidence. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {verifyEllipticCurveModelWithin, type EllipticCurveModel} from './elliptic-curve-model';
import {ellipticInfinity, addEllipticPoints, multiplyEllipticPoint, verifyEllipticAddition, verifyEllipticMultiple, equalEllipticPoints,
  type EllipticPoint, type EllipticAddition, type EllipticMultiple} from './elliptic-group';
import {isEllipticRationalPlace, transportEllipticPlace, verifyEllipticPlaceTransport, type EllipticPlaceTransport} from './elliptic-place';
import type {AlgebraicFunctionFactor} from './algebraic-factored-function';
import {algebraicFunctionPower} from './algebraic-function-power';
import {algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition} from './algebraic-conditions';
import type {ExactField} from './field';
import {assertEllipticArithmeticModel, type EllipticArithmeticModel} from './elliptic-arithmetic-model';

export interface EllipticDivisorClass<E> {
  readonly model: EllipticCurveModel<E>;
  readonly divisor: AlgebraicDivisor<E>;
  readonly terms: readonly Readonly<{transport: EllipticPlaceTransport<E>; multiple: EllipticMultiple<E>}>[];
  readonly additions: readonly EllipticAddition<E>[];
  readonly point: EllipticPoint<E>;
  /** div(product)=D-([point]-[O]); all factors remain unexpanded. */
  readonly factors: readonly AlgebraicFunctionFactor<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function append<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, factors: AlgebraicFunctionFactor<E>[], proof: EllipticAddition<E, M>, coefficient = 1n): void {
  ctx.integer(coefficient);
  if (proof.line !== null) {ctx.allocate(3); factors.push(Object.freeze({value: proof.line, exponent: coefficient}));}
  if (proof.vertical !== null) {ctx.allocate(3); factors.push(Object.freeze({value: proof.vertical, exponent: -coefficient}));}
}
export function ellipticMultipleFactors<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, proof: EllipticMultiple<E, M>): readonly AlgebraicFunctionFactor<E>[] {
  let factors: AlgebraicFunctionFactor<E>[] = [];
  for (const step of proof.steps) {
    ctx.allocate(factors.length * 3); factors = factors.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(2n, f.exponent)}));
    append(ctx, factors, step.double); if (step.add !== null) append(ctx, factors, step.add);
  }
  if (proof.adjustment !== null) append(ctx, factors, proof.adjustment, proof.coefficient);
  return Object.freeze(factors);
}
function sources<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, factors: readonly AlgebraicFunctionFactor<E>[]) {
  const original = algebraicConstructionSources(ctx, model.curve.owner); ctx.allocate(original.length + factors.length);
  return [...original, ...factors.map((f, i) => ({field: model.curve.owner as ExactField<unknown>, value: f.value, nonzero: f.exponent < 0n, path: `elliptic.witness.factor.${i}`}))];
}
export function verifyEllipticDivisorClassWithin<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, divisor: AlgebraicDivisor<E>, proof: EllipticDivisorClass<E>, bounds: DifferentialBounds): void {
  const curve = model.curve, owner = curve.owner; verifyEllipticCurveModelWithin(ctx, curve, model, bounds);
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.model === model && proof.divisor === divisor && divisor.degree === 0n && proof.terms.length === divisor.entries.length && proof.additions.length === divisor.entries.length, 'verification-failed', 'elliptic complete divisor mapping');
  let point = ellipticInfinity(ctx, model); const factors: AlgebraicFunctionFactor<E>[] = [];
  for (let i = 0; i < divisor.entries.length; i++) {
    const entry = divisor.entries[i], term = proof.terms[i];
    verifyEllipticPlaceTransport(ctx, model, entry.place, term.transport, bounds);
    verifyEllipticMultiple(ctx, model, term.transport.point, entry.coefficient, term.multiple);
    const termFactors = ellipticMultipleFactors(ctx, term.multiple); ctx.allocate(termFactors.length); factors.push(...termFactors);
    verifyEllipticAddition(ctx, model, point, term.multiple.point, proof.additions[i]); append(ctx, factors, proof.additions[i]); point = proof.additions[i].sum;
  }
  demand(equalEllipticPoints(ctx, model, point, proof.point) && proof.factors.length === factors.length
    && factors.every((f, i) => f.exponent === proof.factors[i].exponent && owner.equal(ctx, f.value, proof.factors[i].value)), 'verification-failed', 'Miller factor/divisor correspondence');
  for (const f of proof.factors) {owner.assert(ctx, f.value); ctx.integer(f.exponent); demand(!owner.isZero(ctx, f.value), 'verification-failed', 'nonzero Miller factor');}
  verifyAlgebraicConditions(ctx, owner, sources(ctx, model, factors), proof.conditions, bounds);
}
export function reduceEllipticDivisorWithin<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): EllipticDivisorClass<E> {
  const curve = model.curve; verifyEllipticCurveModelWithin(ctx, curve, model, bounds); assertAlgebraicDivisor(ctx, curve, divisor);
  demand(divisor.degree === 0n && divisor.entries.every(e => isEllipticRationalPlace(ctx, model, e.place)), 'invalid-input', 'rational-place degree-zero elliptic divisor');
  const terms: {transport: EllipticPlaceTransport<E>; multiple: EllipticMultiple<E>}[] = [], additions: EllipticAddition<E>[] = [], factors: AlgebraicFunctionFactor<E>[] = [];
  let point = ellipticInfinity(ctx, model);
  for (const entry of divisor.entries) {
    const transport = transportEllipticPlace(ctx, model, entry.place, bounds), multiple = multiplyEllipticPoint(ctx, model, transport.point, entry.coefficient);
    const termFactors = ellipticMultipleFactors(ctx, multiple); ctx.allocate(termFactors.length); factors.push(...termFactors);
    const addition = addEllipticPoints(ctx, model, point, multiple.point); append(ctx, factors, addition); point = addition.sum;
    ctx.allocate(5); terms.push(Object.freeze({transport, multiple})); additions.push(addition);
  }
  const conditions = algebraicConditions(ctx, curve.owner, sources(ctx, model, factors), bounds);
  ctx.allocate(7); const proof = Object.freeze({model, divisor, terms: Object.freeze(terms), additions: Object.freeze(additions), point, factors: Object.freeze(factors), conditions});
  verifyEllipticDivisorClassWithin(ctx, model, divisor, proof, bounds); return proof;
}
export function verifyEllipticDivisorClass<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, divisor: AlgebraicDivisor<E>, proof: EllipticDivisorClass<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyEllipticDivisorClassWithin(ctx, model, divisor, proof, bounds));
}
export function reduceEllipticDivisor<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => reduceEllipticDivisorWithin(ctx, model, divisor, bounds));
}
/** Expansion is separately bounded, never required to verify the factored
 * witness or establish its complete divisor equality. */
export function expandEllipticFactors<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, factors: readonly AlgebraicFunctionFactor<E>[]): E {
  assertEllipticArithmeticModel(ctx, model);
  const f = model.curve.owner; let value = f.fromInteger(ctx, 1n);
  for (const factor of factors) {
    f.assert(ctx, factor.value); ctx.integer(factor.exponent); demand(!f.isZero(ctx, factor.value), 'division-by-zero', 'Miller factor');
    value = f.multiply(ctx, value, algebraicFunctionPower(ctx, f, factor.exponent < 0n ? f.inverse(ctx, factor.value) : factor.value, factor.exponent < 0n ? -factor.exponent : factor.exponent));
  } return value;
}
