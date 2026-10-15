/** Native good-reduction correspondence for odd-degree Cantor class orders. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyReducedCurveModel, type ReducedCurveModel} from './reduced-model';
import {isReducedCurveField, type ReducedCurveView, type ReducedCurveValue} from './reduced-curve';
import {verifyReducedDivisor, type ReducedDivisor} from './reduced-divisor';
import {verifyReducedPlace, evaluateReducedPlaceIntegral, type ReducedPlace} from './reduced-place';
import type {FiniteExtensionValue} from './positive-extension';
import {positiveBezout, type PositivePolynomial, type PositiveBezout} from './positive-polynomial';
import type {PositiveFraction} from './positive-fraction';
import {reconstructPositiveCantorDomainWithin, verifyPositiveCantorDomainWithin, positiveCantorArithmetic,
  constructPositiveMumfordPairWithin, verifyPositiveMumfordPairWithin, multiplyPositiveMumfordPairWithin, verifyPositiveMumfordMultipleWithin,
  addPositiveMumfordPairsWithin, verifyPositiveMumfordAdditionWithin, type PositiveCantorDomain, type PositiveMumfordPair,
  type PositiveMumfordMultiple, type PositiveMumfordAddition} from './positive-cantor';
import {reduceCantorPair, verifyCantorReduction, cantorAdditionFunctions, cantorMultipleFunctions, type CantorReduction, type CantorFunctionFactor} from './cantor-arithmetic';
import {decidePositiveCantorOrderWithin, verifyPositiveCantorOrderWithin, type PositiveCantorOrder} from './positive-cantor-order';
import {ScopedProof} from './scoped-proof';

export interface ReducedCantorModel<E> {
  readonly curve: ReducedCurveView<E>;
  readonly original: ReducedCurveModel<E>;
  readonly b: PositiveFraction<E>;
  readonly c: PositiveFraction<E>;
  readonly polynomial: PositivePolynomial<E>;
  readonly squareFree: PositiveBezout<E>;
  readonly y: ReducedCurveValue<E>;
  readonly domain: PositiveCantorDomain<E>;
}
const models = new WeakSet<object>(), checks = new ScopedProof();
function equation<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>) {
  verifyReducedCurveModel(ctx, curve.algebra, original); const a = curve.algebra, f = a.scalar;
  demand(isReducedCurveField(curve.field) && curve.field.algebra === a && curve.finite === original.finite && curve.infinity === original.infinity && curve.genus === original.genus,
    'verification-failed', 'complete reduced proper-curve correspondence');
  demand(a.dimension === 2 && a.relation.coefficients.length === 3 && f.equal(ctx, a.relation.coefficients[2], f.fromInteger(ctx, 1n)), 'domain-mismatch', 'reduced quadratic original basis');
  const b = a.relation.coefficients[1], c = a.relation.coefficients[0], square = f.subtract(ctx, f.exactDivide(ctx, f.multiply(ctx, b, b), f.fromInteger(ctx, 4n)), c), r = f.ring, degree = r.degree(ctx, square.numerator);
  demand(r.degree(ctx, square.denominator) === 0 && degree >= 1 && degree % 2 === 1 && curve.genus === BigInt((degree - 1) / 2), 'verification-failed', 'complete reduced odd-degree model/genus');
  const y = a.add(ctx, a.generator(ctx), a.fromScalar(ctx, f.exactDivide(ctx, b, f.fromInteger(ctx, 2n))));
  demand(a.equal(ctx, a.multiply(ctx, y, y), a.fromScalar(ctx, square)), 'verification-failed', 'reduced native root correspondence'); ctx.allocate(4); return {b, c, polynomial: square.numerator, y};
}
function verifyModel<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, bounds: DifferentialBounds): void {
  const p = equation(ctx, model.curve, model.original), a = model.curve.algebra, f = a.scalar;
  verifyPositiveCantorDomainWithin(ctx, model.domain, bounds);
  demand(f.equal(ctx, p.b, model.b) && f.equal(ctx, p.c, model.c) && f.ring.equal(ctx, p.polynomial, model.polynomial) && a.equal(ctx, p.y, model.y)
    && model.domain.ring === f.ring && model.domain.field === a.constants && f.ring.equal(ctx, model.domain.polynomial, model.polynomial), 'verification-failed', 'exact reduced Cantor presentation binding');
}
export function verifyReducedCantorModelWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, model: ReducedCantorModel<E>, bounds: DifferentialBounds): void {
  ctx.tick(); demand(model !== null && typeof model === 'object' && models.has(model) && model.curve === curve && model.original === original, 'domain-mismatch', 'owned reduced Cantor model');
  checks.check(ctx, [model, bounds], () => verifyModel(ctx, model, bounds), [model, curve]);
}
export function reconstructReducedCantorModelWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, evidence: Omit<ReducedCantorModel<E>, 'curve' | 'original' | 'domain'>, bounds: DifferentialBounds): ReducedCantorModel<E> {
  const domain = reconstructPositiveCantorDomainWithin(ctx, curve.algebra.constants, curve.algebra.scalar.ring, evidence.polynomial, evidence.squareFree, bounds);
  ctx.allocate(8); const model = Object.freeze({curve, original, ...evidence, domain}); verifyModel(ctx, model, bounds); models.add(model); return model;
}
function constructModel<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, bounds: DifferentialBounds): ReducedCantorModel<E> {
  const p = equation(ctx, curve, original), r = curve.algebra.scalar.ring, squareFree = positiveBezout(ctx, r, p.polynomial, r.derivative(ctx, p.polynomial));
  return reconstructReducedCantorModelWithin(ctx, curve, original, {...p, squareFree}, bounds);
}
export interface ReducedCantorTransport<E> {
  readonly place: ReducedPlace<E>;
  readonly kind: 'infinity' | 'inert' | 'split';
  readonly yResidue: FiniteExtensionValue<FiniteExtensionValue<E>> | null;
  readonly initial: PositiveMumfordPair<E>;
  readonly reductions: readonly CantorReduction<PositivePolynomial<E>>[];
  readonly pair: PositiveMumfordPair<E>;
}
function neutral<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>): PositiveMumfordPair<E> {
  const r = model.domain.ring; ctx.allocate(3); return Object.freeze({u: r.one(ctx), v: r.zero(ctx), normQuotient: model.polynomial});
}
function equal<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, a: PositiveMumfordPair<E>, b: PositiveMumfordPair<E>): boolean {
  const r = model.domain.ring; return r.equal(ctx, a.u, b.u) && r.equal(ctx, a.v, b.v) && r.equal(ctx, a.normQuotient, b.normQuotient);
}
function residuePolynomial<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, place: ReducedPlace<E>, value: FiniteExtensionValue<FiniteExtensionValue<E>>): PositivePolynomial<E> {
  const b = place.algebra.base, field = place.residue, r = model.domain.ring;
  demand(b.parent === model.domain.field && field.parent === b && field.ring.degree(ctx, field.modulus) === 1, 'verification-failed', 'reduced residue degree-one field chain'); field.assert(ctx, value);
  demand(value.polynomial.coefficients.length <= 1, 'verification-failed', 'reduced residue coefficient coverage'); const coefficient = value.polynomial.coefficients[0] ?? b.fromInteger(ctx, 0n);
  demand(field.equal(ctx, value, field.embed(ctx, coefficient)), 'verification-failed', 'reduced residue inverse reconstruction');
  return r.make(ctx, coefficient.polynomial.coefficients);
}
function verifyTransport<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, place: ReducedPlace<E>, proof: ReducedCantorTransport<E>, bounds: DifferentialBounds): void {
  const curve = model.curve, r = model.domain.ring; verifyReducedPlace(ctx, curve, place); demand(proof.place === place, 'verification-failed', 'reduced Cantor exact owned place');
  const unit = neutral(ctx, model);
  if (place.order.infinity) {
    demand(proof.kind === 'infinity' && proof.yResidue === null && proof.reductions.length === 0 && place.ramification === 2n && place.residueDegree === 1n && place.degree === 1n
      && place.prime.ring.equal(ctx, place.prime, place.prime.ring.x(ctx)) && equal(ctx, model, unit, proof.initial) && equal(ctx, model, unit, proof.pair), 'verification-failed', 'complete reduced unique infinity'); return;
  }
  demand(place.prime.ring === r, 'domain-mismatch', 'reduced Cantor original x chart');
  if (place.residueDegree === 2n) {
    demand(proof.kind === 'inert' && place.ramification === 1n && place.degree === BigInt(2 * r.degree(ctx, place.prime)) && proof.yResidue === null && proof.reductions.length === 0
      && equal(ctx, model, unit, proof.initial) && equal(ctx, model, unit, proof.pair), 'verification-failed', 'complete reduced inert place'); return;
  }
  const y = evaluateReducedPlaceIntegral(ctx, curve, place, model.y);
  demand(place.residueDegree === 1n && (place.ramification === 1n || place.ramification === 2n) && proof.kind === 'split' && proof.yResidue !== null
    && place.residue.equal(ctx, y, proof.yResidue), 'verification-failed', 'reduced complete split/ramified residue'); verifyPositiveMumfordPairWithin(ctx, model.domain, proof.initial, bounds);
  demand(r.equal(ctx, proof.initial.u, place.prime) && r.equal(ctx, proof.initial.v, residuePolynomial(ctx, model, place, y)), 'verification-failed', 'reduced closed-place ideal equality');
  let previous = proof.initial; const arithmetic = positiveCantorArithmetic(r); ctx.allocate(14);
  for (const step of proof.reductions) {verifyCantorReduction(ctx, arithmetic, model.polynomial, model.domain.genus, previous, step); previous = step.result;}
  demand(r.degree(ctx, previous.u) <= model.domain.genus && equal(ctx, model, previous, proof.pair), 'verification-failed', 'reduced closed-place full reduction');
}
function transport<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, place: ReducedPlace<E>, bounds: DifferentialBounds): ReducedCantorTransport<E> {
  verifyReducedPlace(ctx, model.curve, place); const unit = neutral(ctx, model); let proof: ReducedCantorTransport<E>;
  if (place.order.infinity || place.residueDegree === 2n) proof = Object.freeze({place, kind: place.order.infinity ? 'infinity' as const : 'inert' as const, yResidue: null, initial: unit, reductions: Object.freeze([]), pair: unit});
  else {
    const yResidue = evaluateReducedPlaceIntegral(ctx, model.curve, place, model.y), initial = constructPositiveMumfordPairWithin(ctx, model.domain, place.prime, residuePolynomial(ctx, model, place, yResidue), bounds);
    const reductions: CantorReduction<PositivePolynomial<E>>[] = [], arithmetic = positiveCantorArithmetic(model.domain.ring); let pair = initial; ctx.allocate(14);
    while (model.domain.ring.degree(ctx, pair.u) > model.domain.genus) {const step = reduceCantorPair(ctx, arithmetic, model.polynomial, model.domain.genus, pair); ctx.allocate(1); reductions.push(step); pair = step.result;}
    proof = Object.freeze({place, kind: 'split' as const, yResidue, initial, reductions: Object.freeze(reductions), pair});
  }
  ctx.allocate(6); verifyTransport(ctx, model, place, proof, bounds); return proof;
}
export interface ReducedCantorFactor<E> {readonly value: ReducedCurveValue<E>; readonly exponent: bigint}
function nativePolynomial<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, p: PositivePolynomial<E>): ReducedCurveValue<E> {
  const a = model.curve.algebra, r = model.domain.ring; demand(p.ring === r, 'domain-mismatch', 'reduced Cantor function polynomial'); return a.fromScalar(ctx, a.scalar.make(ctx, p, r.one(ctx)));
}
function append<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, factors: ReducedCantorFactor<E>[], value: ReducedCurveValue<E>, exponent: bigint) {
  const field = model.curve.field; field.assert(ctx, value); ctx.integer(exponent); demand(!field.isZero(ctx, value), 'verification-failed', 'nonzero reduced Cantor function');
  if (exponent !== 0n && !field.equal(ctx, value, field.fromInteger(ctx, 1n))) {ctx.allocate(3); factors.push(Object.freeze({value, exponent}));}
}
function appendFunctions<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, factors: ReducedCantorFactor<E>[], functions: readonly CantorFunctionFactor<PositivePolynomial<E>>[]) {
  for (const f of functions) {const p = nativePolynomial(ctx, model, f.polynomial); append(ctx, model, factors, f.kind === 'polynomial' ? p : model.curve.field.subtract(ctx, model.y, p), f.exponent);}
}
function appendTransport<E>(ctx: ExecutionContext, model: ReducedCantorModel<E>, factors: ReducedCantorFactor<E>[], proof: ReducedCantorTransport<E>, coefficient: bigint) {
  if (proof.kind === 'inert') append(ctx, model, factors, nativePolynomial(ctx, model, proof.place.prime), coefficient);
  for (const step of proof.reductions) {
    append(ctx, model, factors, model.curve.field.subtract(ctx, model.y, nativePolynomial(ctx, model, step.input.v)), coefficient);
    append(ctx, model, factors, nativePolynomial(ctx, model, step.result.u), -coefficient);
  }
}
export interface ReducedCantorOrder<E> {
  readonly rule: 'finite-ramified-cantor-order-v1';
  readonly model: ReducedCantorModel<E>;
  readonly divisor: ReducedDivisor<E>;
  readonly terms: readonly Readonly<{transport: ReducedCantorTransport<E>; multiple: PositiveMumfordMultiple<E>}>[];
  readonly additions: readonly PositiveMumfordAddition<E>[];
  readonly pair: PositiveMumfordPair<E>;
  readonly functions: readonly ReducedCantorFactor<E>[];
  readonly orderEvidence: PositiveCantorOrder<E>;
  readonly order: bigint;
  readonly witness: readonly ReducedCantorFactor<E>[];
}
export function verifyReducedCantorOrderWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, proof: ReducedCantorOrder<E>, bounds: DifferentialBounds): void {
  verifyReducedCantorModelWithin(ctx, curve, original, proof.model, bounds); verifyReducedDivisor(ctx, curve, divisor.input, divisor); const model = proof.model, domain = model.domain;
  demand(proof.rule === 'finite-ramified-cantor-order-v1' && proof.divisor === divisor && divisor.degree === 0n && proof.terms.length === divisor.entries.length && proof.additions.length === divisor.entries.length, 'verification-failed', 'complete native reduced Cantor order request');
  let pair = neutral(ctx, model); const factors: ReducedCantorFactor<E>[] = [];
  for (let i = 0; i < divisor.entries.length; i++) {
    const entry = divisor.entries[i], term = proof.terms[i]; verifyTransport(ctx, model, entry.place, term.transport, bounds); appendTransport(ctx, model, factors, term.transport, entry.coefficient);
    verifyPositiveMumfordMultipleWithin(ctx, domain, term.transport.pair, entry.coefficient, term.multiple, bounds); appendFunctions(ctx, model, factors, cantorMultipleFunctions(ctx, term.multiple));
    verifyPositiveMumfordAdditionWithin(ctx, domain, pair, term.multiple.result, proof.additions[i], bounds); appendFunctions(ctx, model, factors, cantorAdditionFunctions(ctx, proof.additions[i])); pair = proof.additions[i].result;
  }
  demand(equal(ctx, model, pair, proof.pair) && factors.length === proof.functions.length && factors.every((f, i) => {ctx.integer(proof.functions[i].exponent);
    return f.exponent === proof.functions[i].exponent && curve.field.equal(ctx, f.value, proof.functions[i].value);}), 'verification-failed', 'reduced divisor/class exact function correspondence');
  ctx.integer(proof.order);
  verifyPositiveCantorOrderWithin(ctx, domain, pair, proof.orderEvidence, bounds); demand(proof.order === proof.orderEvidence.order, 'verification-failed', 'reduced complete least class order');
  ctx.allocate(factors.length * 3); const witness = factors.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(f.exponent, proof.order)})); appendFunctions(ctx, model, witness, proof.orderEvidence.functions);
  demand(witness.length === proof.witness.length && witness.every((f, i) => {ctx.integer(proof.witness[i].exponent);
    return f.exponent === proof.witness[i].exponent && curve.field.equal(ctx, f.value, proof.witness[i].value);}), 'verification-failed', 'native reduced principal-multiple witness');
}
export function decideReducedCantorOrderWithin<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, bounds: DifferentialBounds): ReducedCantorOrder<E> {
  verifyReducedDivisor(ctx, curve, divisor.input, divisor); demand(divisor.degree === 0n, 'invalid-input', 'reduced degree-zero Cantor order request'); const model = constructModel(ctx, curve, original, bounds), domain = model.domain;
  const terms: {transport: ReducedCantorTransport<E>; multiple: PositiveMumfordMultiple<E>}[] = [], additions: PositiveMumfordAddition<E>[] = [], functions: ReducedCantorFactor<E>[] = []; let pair = neutral(ctx, model);
  for (const entry of divisor.entries) {
    const p = transport(ctx, model, entry.place, bounds); appendTransport(ctx, model, functions, p, entry.coefficient); const multiple = multiplyPositiveMumfordPairWithin(ctx, domain, p.pair, entry.coefficient, bounds);
    appendFunctions(ctx, model, functions, cantorMultipleFunctions(ctx, multiple)); const addition = addPositiveMumfordPairsWithin(ctx, domain, pair, multiple.result, bounds);
    appendFunctions(ctx, model, functions, cantorAdditionFunctions(ctx, addition)); pair = addition.result; ctx.allocate(4); terms.push(Object.freeze({transport: p, multiple})); additions.push(addition);
  }
  const orderEvidence = decidePositiveCantorOrderWithin(ctx, domain, pair, bounds); ctx.allocate(functions.length * 3);
  const witness = functions.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(f.exponent, orderEvidence.order)})); appendFunctions(ctx, model, witness, orderEvidence.functions);
  ctx.allocate(10); const proof = Object.freeze({rule: 'finite-ramified-cantor-order-v1' as const, model, divisor, terms: Object.freeze(terms), additions: Object.freeze(additions), pair,
    functions: Object.freeze(functions), orderEvidence, order: orderEvidence.order, witness: Object.freeze(witness)}); verifyReducedCantorOrderWithin(ctx, curve, original, divisor, proof, bounds); return proof;
}
export function decideReducedCantorOrder<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => decideReducedCantorOrderWithin(ctx, curve, original, divisor, bounds));
}
export function verifyReducedCantorOrder<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, divisor: ReducedDivisor<E>, proof: ReducedCantorOrder<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyReducedCantorOrderWithin(ctx, curve, original, divisor, proof, bounds));
}
