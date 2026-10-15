/** Complete class transport with native factored functions, including closed
 * places over the actual constant field. No torsion classification is assumed. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {verifyRamifiedHyperellipticModelWithin, ramifiedNativePolynomial, type RamifiedHyperellipticModel} from './ramified-hyperelliptic-model';
import {transportCantorPlaceWithin, verifyCantorPlaceTransportWithin, type CantorPlaceTransport} from './hyperelliptic-cantor-place';
import {multiplyMumfordPairWithin, verifyMumfordMultipleWithin, addMumfordPairsWithin, verifyMumfordAdditionWithin, equalMumfordPairs,
  type MumfordPair, type MumfordAddition, type MumfordMultiple} from './hyperelliptic-cantor';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {CantorReduction} from './cantor-arithmetic';
import type {Polynomial} from './polynomial';
import type {AlgebraicFunctionFactor} from './algebraic-factored-function';
import {algebraicFunctionPower} from './algebraic-function-power';
import {algebraicConditions, algebraicConstructionSources, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import type {ExactField} from './field';

export interface CantorDivisorClass<E> {
  readonly model: RamifiedHyperellipticModel<E>;
  readonly divisor: AlgebraicDivisor<E>;
  readonly terms: readonly Readonly<{transport: CantorPlaceTransport<E>; multiple: MumfordMultiple<CurveConstant>}>[];
  readonly additions: readonly MumfordAddition<CurveConstant>[];
  readonly pair: MumfordPair<CurveConstant>;
  /** div(product)=D-class(pair), with every function factor left unexpanded. */
  readonly factors: readonly AlgebraicFunctionFactor<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function neutral<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>): MumfordPair<CurveConstant> {
  const r = model.domain.ring; ctx.allocate(3); return Object.freeze({u: r.one(ctx), v: r.zero(ctx), normQuotient: model.polynomial});
}
function append<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, factors: AlgebraicFunctionFactor<E>[], value: E, exponent: bigint): void {
  const owner = model.curve.owner; owner.assert(ctx, value); ctx.integer(exponent); demand(!owner.isZero(ctx, value), 'verification-failed', 'nonzero Cantor function factor');
  if (exponent !== 0n && !owner.equal(ctx, value, owner.fromInteger(ctx, 1n))) {ctx.allocate(3); factors.push(Object.freeze({value, exponent}));}
}
function appendReduction<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, factors: AlgebraicFunctionFactor<E>[], step: CantorReduction<Polynomial<CurveConstant>>, coefficient = 1n): void {
  append(ctx, model, factors, model.curve.owner.subtract(ctx, model.y, ramifiedNativePolynomial(ctx, model, step.input.v)), coefficient);
  append(ctx, model, factors, ramifiedNativePolynomial(ctx, model, step.result.u), -coefficient);
}
function appendAddition<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, factors: AlgebraicFunctionFactor<E>[], proof: MumfordAddition<CurveConstant>): void {
  append(ctx, model, factors, ramifiedNativePolynomial(ctx, model, proof.composition.opposite.gcd), 1n);
  for (const step of proof.reductions) appendReduction(ctx, model, factors, step);
}
function multipleFactors<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, proof: MumfordMultiple<CurveConstant>): readonly AlgebraicFunctionFactor<E>[] {
  let factors: AlgebraicFunctionFactor<E>[] = [];
  for (const step of proof.steps) {
    ctx.allocate(3 * factors.length); factors = factors.map(f => Object.freeze({value: f.value, exponent: ctx.multiply(2n, f.exponent)}));
    appendAddition(ctx, model, factors, step.double); if (step.add !== null) appendAddition(ctx, model, factors, step.add);
  }
  if (proof.coefficient < 0n) append(ctx, model, factors, ramifiedNativePolynomial(ctx, model, proof.input.u), proof.coefficient);
  return Object.freeze(factors);
}
function transportFactors<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, proof: CantorPlaceTransport<E>, coefficient: bigint): readonly AlgebraicFunctionFactor<E>[] {
  const result: AlgebraicFunctionFactor<E>[] = [];
  if (proof.principalFactor !== null) append(ctx, model, result, proof.principalFactor, coefficient);
  for (const step of proof.reductions) appendReduction(ctx, model, result, step, coefficient); return Object.freeze(result);
}
function sources<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, factors: readonly AlgebraicFunctionFactor<E>[]) {
  const construction = algebraicConstructionSources(ctx, model.curve.owner); ctx.allocate(construction.length + factors.length);
  return [...construction, ...factors.map((f, i) => ({field: model.curve.owner as ExactField<unknown>, value: f.value, nonzero: f.exponent < 0n, path: `cantor.witness.factor.${i}`}))];
}
export function verifyCantorDivisorClassWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, proof: CantorDivisorClass<E>, bounds: DifferentialBounds): void {
  const curve = model.curve, domain = model.domain; verifyRamifiedHyperellipticModelWithin(ctx, curve, model, bounds);
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.model === model && proof.divisor === divisor && divisor.degree === 0n && proof.terms.length === divisor.entries.length
    && proof.additions.length === divisor.entries.length, 'verification-failed', 'complete ordered Cantor divisor request');
  let pair = neutral(ctx, model); const factors: AlgebraicFunctionFactor<E>[] = [];
  for (let i = 0; i < divisor.entries.length; i++) {
    const entry = divisor.entries[i], term = proof.terms[i]; verifyCantorPlaceTransportWithin(ctx, model, entry.place, term.transport, bounds);
    const transport = transportFactors(ctx, model, term.transport, entry.coefficient); ctx.allocate(transport.length); factors.push(...transport);
    verifyMumfordMultipleWithin(ctx, domain, term.transport.pair, entry.coefficient, term.multiple, bounds);
    const multiple = multipleFactors(ctx, model, term.multiple); ctx.allocate(multiple.length); factors.push(...multiple);
    const addition = proof.additions[i]; verifyMumfordAdditionWithin(ctx, domain, pair, term.multiple.result, addition, bounds);
    appendAddition(ctx, model, factors, addition); pair = addition.result;
  }
  demand(equalMumfordPairs(ctx, domain, pair, proof.pair) && factors.length === proof.factors.length && factors.every((f, i) => {
    ctx.integer(proof.factors[i].exponent); return f.exponent === proof.factors[i].exponent && curve.owner.equal(ctx, f.value, proof.factors[i].value);
  }), 'verification-failed', 'complete Cantor function/class reconstruction');
  verifyAlgebraicConditions(ctx, curve.owner, sources(ctx, model, factors), proof.conditions, bounds);
}
export function reduceCantorDivisorWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): CantorDivisorClass<E> {
  const curve = model.curve, domain = model.domain; verifyRamifiedHyperellipticModelWithin(ctx, curve, model, bounds); assertAlgebraicDivisor(ctx, curve, divisor);
  demand(divisor.degree === 0n, 'invalid-input', 'degree-zero Cantor divisor request');
  const terms: {transport: CantorPlaceTransport<E>; multiple: MumfordMultiple<CurveConstant>}[] = [], additions: MumfordAddition<CurveConstant>[] = [], factors: AlgebraicFunctionFactor<E>[] = [];
  let pair = neutral(ctx, model);
  for (const entry of divisor.entries) {
    const transport = transportCantorPlaceWithin(ctx, model, entry.place, bounds), transportWitness = transportFactors(ctx, model, transport, entry.coefficient);
    ctx.allocate(transportWitness.length); factors.push(...transportWitness);
    const multiple = multiplyMumfordPairWithin(ctx, domain, transport.pair, entry.coefficient, bounds), witness = multipleFactors(ctx, model, multiple);
    ctx.allocate(witness.length); factors.push(...witness);
    const addition = addMumfordPairsWithin(ctx, domain, pair, multiple.result, bounds); appendAddition(ctx, model, factors, addition); pair = addition.result;
    ctx.allocate(4); terms.push(Object.freeze({transport, multiple})); additions.push(addition);
  }
  const conditions = algebraicConditions(ctx, curve.owner, sources(ctx, model, factors), bounds); ctx.allocate(7);
  const proof = Object.freeze({model, divisor, terms: Object.freeze(terms), additions: Object.freeze(additions), pair, factors: Object.freeze(factors), conditions});
  verifyCantorDivisorClassWithin(ctx, model, divisor, proof, bounds); return proof;
}
export function reduceCantorDivisor<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => reduceCantorDivisorWithin(ctx, model, divisor, bounds));
}
export function verifyCantorDivisorClass<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, divisor: AlgebraicDivisor<E>, proof: CantorDivisorClass<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyCantorDivisorClassWithin(ctx, model, divisor, proof, bounds));
}
export function expandCantorFunctionWithin<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, factors: readonly AlgebraicFunctionFactor<E>[]): E {
  const owner = model.curve.owner; let value = owner.fromInteger(ctx, 1n);
  for (const factor of factors) {
    owner.assert(ctx, factor.value); ctx.integer(factor.exponent); demand(!owner.isZero(ctx, factor.value), 'division-by-zero', 'Cantor function factor');
    value = owner.multiply(ctx, value, algebraicFunctionPower(ctx, owner, factor.exponent < 0n ? owner.inverse(ctx, factor.value) : factor.value, factor.exponent < 0n ? -factor.exponent : factor.exponent));
  }
  return value;
}
