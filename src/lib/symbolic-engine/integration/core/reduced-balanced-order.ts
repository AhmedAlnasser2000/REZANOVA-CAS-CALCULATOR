/** Complete specialized divisor-to-class correspondence and finite least order. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {ReducedCurveModel} from './reduced-model';
import type {ReducedCurveView, ReducedCurveValue} from './reduced-curve';
import {verifyReducedDivisor, type ReducedDivisor} from './reduced-divisor';
import {constructReducedBalancedModelWithin, verifyReducedBalancedModelWithin, transportReducedBalancedPlaceWithin, verifyReducedBalancedTransportWithin, type ReducedBalancedModel, type ReducedBalancedTransport} from './reduced-balanced-model';
import {positiveCantorArithmetic} from './positive-cantor';
import {multiplyPositiveBalancedDivisorWithin, verifyPositiveBalancedMultipleWithin, addPositiveBalancedDivisorsWithin, verifyPositiveBalancedAdditionWithin,
  type PositiveBalancedDivisor, type PositiveBalancedMultiple, type PositiveBalancedAddition} from './positive-balanced-cantor';
import {neutralBalancedDivisor, equalBalancedDivisors, balancedNormalizationFunctions, balancedAdditionFunctions, balancedMultipleFunctions} from './balanced-cantor-arithmetic';
import type {CantorFunctionFactor} from './cantor-arithmetic';
import type {PositivePolynomial} from './positive-polynomial';
import {decidePositiveBalancedOrderWithin, verifyPositiveBalancedOrderWithin, type PositiveBalancedOrder} from './positive-balanced-order';

export interface ReducedBalancedFactor<E> {readonly value: ReducedCurveValue<E>; readonly exponent: bigint}
function neutral<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>): PositiveBalancedDivisor<E> {ctx.allocate(14); return neutralBalancedDivisor(ctx, positiveCantorArithmetic(model.domain.ring), model.domain);}
function equal<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, a: PositiveBalancedDivisor<E>, b: PositiveBalancedDivisor<E>) {ctx.allocate(14); return equalBalancedDivisors(ctx, positiveCantorArithmetic(model.domain.ring), a, b);}
function nativePolynomial<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, p: PositivePolynomial<E>): ReducedCurveValue<E> {
  const a = model.curve.algebra, r = model.domain.ring; r.assert(ctx, p); return a.fromScalar(ctx, a.scalar.make(ctx, p, r.one(ctx)));
}
function append<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, factors: ReducedBalancedFactor<E>[], value: ReducedCurveValue<E>, exponent: bigint) {
  const field = model.curve.field; field.assert(ctx, value); ctx.integer(exponent); demand(!field.isZero(ctx, value), 'verification-failed', 'nonzero reduced balanced function');
  if (exponent !== 0n && !field.equal(ctx, value, field.fromInteger(ctx, 1n))) {ctx.allocate(3); factors.push(Object.freeze({value, exponent}));}
}
function appendFunctions<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, factors: ReducedBalancedFactor<E>[], functions: readonly CantorFunctionFactor<PositivePolynomial<E>>[], coefficient = 1n) {
  for (const f of functions) {const p = nativePolynomial(ctx, model, f.polynomial); append(ctx, model, factors, f.kind === 'polynomial' ? p : model.curve.field.subtract(ctx, model.y, p), ctx.multiply(f.exponent, coefficient));}
}
function appendTransport<E>(ctx: ExecutionContext, model: ReducedBalancedModel<E>, factors: ReducedBalancedFactor<E>[], proof: ReducedBalancedTransport<E>, coefficient: bigint) {
  if (proof.kind === 'inert') append(ctx, model, factors, nativePolynomial(ctx, model, proof.place.prime), coefficient);
  appendFunctions(ctx, model, factors, balancedNormalizationFunctions(ctx, proof.normalization), coefficient);
}
export interface ReducedBalancedOrder<E> {
  readonly rule: 'finite-split-balanced-order-v1'; readonly model: ReducedBalancedModel<E>; readonly divisor: ReducedDivisor<E>;
  readonly terms: readonly Readonly<{transport: ReducedBalancedTransport<E>; multiple: PositiveBalancedMultiple<E>}>[];
  readonly additions: readonly PositiveBalancedAddition<E>[]; readonly result: PositiveBalancedDivisor<E>; readonly functions: readonly ReducedBalancedFactor<E>[];
  readonly orderEvidence: PositiveBalancedOrder<E>; readonly order: bigint; readonly witness: readonly ReducedBalancedFactor<E>[];
}
export function verifyReducedBalancedOrderWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, proof: ReducedBalancedOrder<E>, bounds: DifferentialBounds): void {
  verifyReducedBalancedModelWithin(ctx, curve, original, proof.model, bounds); verifyReducedDivisor(ctx, curve, divisor.input, divisor); const model = proof.model, domain = model.domain;
  demand(proof.rule === 'finite-split-balanced-order-v1' && proof.divisor === divisor && divisor.degree === 0n && proof.terms.length === divisor.entries.length && proof.additions.length === divisor.entries.length, 'verification-failed', 'complete reduced balanced order request');
  let result = neutral(ctx, model); const factors: ReducedBalancedFactor<E>[] = [];
  for (let i = 0; i < divisor.entries.length; i++) {
    const entry = divisor.entries[i], term = proof.terms[i]; verifyReducedBalancedTransportWithin(ctx, model, entry.place, term.transport, bounds); appendTransport(ctx, model, factors, term.transport, entry.coefficient);
    verifyPositiveBalancedMultipleWithin(ctx, domain, term.transport.result, entry.coefficient, term.multiple, bounds); appendFunctions(ctx, model, factors, balancedMultipleFunctions(ctx, term.multiple));
    verifyPositiveBalancedAdditionWithin(ctx, domain, result, term.multiple.result, proof.additions[i], bounds); appendFunctions(ctx, model, factors, balancedAdditionFunctions(ctx, proof.additions[i])); result = proof.additions[i].result;
  }
  demand(equal(ctx, model, result, proof.result) && factors.length === proof.functions.length && factors.every((f, i) => {ctx.integer(proof.functions[i].exponent);
    return f.exponent === proof.functions[i].exponent && curve.field.equal(ctx, f.value, proof.functions[i].value);}), 'verification-failed', 'reduced balanced divisor/class complete function correspondence');
  ctx.integer(proof.order); verifyPositiveBalancedOrderWithin(ctx, domain, result, proof.orderEvidence, bounds); demand(proof.order === proof.orderEvidence.order, 'verification-failed', 'reduced balanced exact least order');
  ctx.allocate(factors.length * 3); const witness = factors.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(f.exponent, proof.order)})); appendFunctions(ctx, model, witness, proof.orderEvidence.functions);
  demand(witness.length === proof.witness.length && witness.every((f, i) => {ctx.integer(proof.witness[i].exponent);
    return f.exponent === proof.witness[i].exponent && curve.field.equal(ctx, f.value, proof.witness[i].value);}), 'verification-failed', 'native reduced balanced principal-multiple witness');
}
export function decideReducedBalancedOrderWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, bounds: DifferentialBounds): ReducedBalancedOrder<E> {
  verifyReducedDivisor(ctx, curve, divisor.input, divisor); demand(divisor.degree === 0n, 'invalid-input', 'reduced degree-zero balanced request'); const model = constructReducedBalancedModelWithin(ctx, curve, original, bounds), domain = model.domain;
  const terms: {transport: ReducedBalancedTransport<E>; multiple: PositiveBalancedMultiple<E>}[] = [], additions: PositiveBalancedAddition<E>[] = [], functions: ReducedBalancedFactor<E>[] = []; let result = neutral(ctx, model);
  for (const entry of divisor.entries) {
    const transport = transportReducedBalancedPlaceWithin(ctx, model, entry.place, bounds); appendTransport(ctx, model, functions, transport, entry.coefficient);
    const multiple = multiplyPositiveBalancedDivisorWithin(ctx, domain, transport.result, entry.coefficient, bounds); appendFunctions(ctx, model, functions, balancedMultipleFunctions(ctx, multiple));
    const addition = addPositiveBalancedDivisorsWithin(ctx, domain, result, multiple.result, bounds); appendFunctions(ctx, model, functions, balancedAdditionFunctions(ctx, addition)); result = addition.result;
    ctx.allocate(4); terms.push(Object.freeze({transport, multiple})); additions.push(addition);
  }
  const orderEvidence = decidePositiveBalancedOrderWithin(ctx, domain, result, bounds); ctx.allocate(functions.length * 3);
  const witness = functions.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(f.exponent, orderEvidence.order)})); appendFunctions(ctx, model, witness, orderEvidence.functions);
  ctx.allocate(10); const proof = Object.freeze({rule: 'finite-split-balanced-order-v1' as const, model, divisor, terms: Object.freeze(terms), additions: Object.freeze(additions), result,
    functions: Object.freeze(functions), orderEvidence, order: orderEvidence.order, witness: Object.freeze(witness)}); verifyReducedBalancedOrderWithin(ctx, curve, original, divisor, proof, bounds); return proof;
}
export function decideReducedBalancedOrder<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => decideReducedBalancedOrderWithin(ctx, curve, original, divisor, bounds));
}
export function verifyReducedBalancedOrder<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, proof: ReducedBalancedOrder<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyReducedBalancedOrderWithin(ctx, curve, original, divisor, proof, bounds));
}
