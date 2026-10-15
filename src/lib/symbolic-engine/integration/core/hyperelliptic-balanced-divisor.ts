/** Complete native degree-zero transport and unique balanced class evidence. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {hyperellipticNativePolynomial} from './hyperelliptic-curve-model';
import {verifyBalancedCurveModelWithin, transportBalancedPlaceWithin, verifyBalancedPlaceTransportWithin, neutralBalancedCurveDivisor, type BalancedCurveModel, type BalancedPlaceTransport} from './hyperelliptic-balanced-place';
import {multiplyBalancedMumfordWithin, verifyBalancedMumfordMultipleWithin, addBalancedMumfordWithin, verifyBalancedMumfordAdditionWithin,
  type BalancedMumfordDivisor, type BalancedMumfordAddition, type BalancedMumfordMultiple} from './hyperelliptic-balanced';
import {balancedNormalizationFunctions, balancedAdditionFunctions, balancedMultipleFunctions, equalBalancedDivisors} from './balanced-cantor-arithmetic';
import {cantorPolynomialArithmetic} from './hyperelliptic-cantor';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {CantorFunctionFactor} from './cantor-arithmetic';
import type {Polynomial} from './polynomial';
import type {AlgebraicFunctionFactor} from './algebraic-factored-function';
import {algebraicConditions, algebraicConstructionSources, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import type {ExactField} from './field';

export interface BalancedDivisorClass<E> {
  readonly source: BalancedCurveModel<E>; readonly divisor: AlgebraicDivisor<E>;
  readonly terms: readonly Readonly<{transport: BalancedPlaceTransport<E>; multiple: BalancedMumfordMultiple<CurveConstant>}>[];
  readonly additions: readonly BalancedMumfordAddition<CurveConstant>[]; readonly result: BalancedMumfordDivisor<CurveConstant>;
  readonly factors: readonly AlgebraicFunctionFactor<E>[]; readonly conditions: readonly AlgebraicCondition<E>[];
}
function append<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, factors: AlgebraicFunctionFactor<E>[], value: E, exponent: bigint): void {
  const owner = source.model.curve.owner; owner.assert(ctx, value); ctx.integer(exponent); demand(!owner.isZero(ctx, value), 'verification-failed', 'nonzero balanced witness factor');
  if (exponent !== 0n && !owner.equal(ctx, value, owner.fromInteger(ctx, 1n))) {ctx.allocate(3); factors.push(Object.freeze({value, exponent}));}
}
function appendFormal<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, factors: AlgebraicFunctionFactor<E>[], formal: readonly CantorFunctionFactor<Polynomial<CurveConstant>>[], coefficient = 1n): void {
  const model = source.model, owner = model.curve.owner;
  for (const f of formal) {
    const p = hyperellipticNativePolynomial(ctx, model, f.polynomial), value = f.kind === 'polynomial' ? p : owner.subtract(ctx, model.y, p);
    append(ctx, source, factors, value, ctx.multiply(f.exponent, coefficient));
  }
}
function sources<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, factors: readonly AlgebraicFunctionFactor<E>[]) {
  const construction = algebraicConstructionSources(ctx, source.model.curve.owner); ctx.allocate(construction.length + factors.length);
  return [...construction, ...factors.map((f, i) => ({field: source.model.curve.owner as ExactField<unknown>, value: f.value, nonzero: f.exponent < 0n, path: `balanced.witness.factor.${i}`}))];
}
export function verifyBalancedDivisorClassWithin<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>, proof: BalancedDivisorClass<E>, bounds: DifferentialBounds): void {
  const curve = source.model.curve, domain = source.domain; verifyBalancedCurveModelWithin(ctx, source.model, source, bounds); assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.source === source && proof.divisor === divisor && divisor.degree === 0n && proof.terms.length === divisor.entries.length && proof.additions.length === divisor.entries.length, 'verification-failed', 'complete ordered balanced divisor request');
  let result = neutralBalancedCurveDivisor(ctx, source); const factors: AlgebraicFunctionFactor<E>[] = [];
  for (let i = 0; i < divisor.entries.length; i++) {
    const entry = divisor.entries[i], term = proof.terms[i]; verifyBalancedPlaceTransportWithin(ctx, source, entry.place, term.transport, bounds);
    if (term.transport.principalFactor !== null) append(ctx, source, factors, term.transport.principalFactor, entry.coefficient);
    appendFormal(ctx, source, factors, balancedNormalizationFunctions(ctx, term.transport.normalization), entry.coefficient);
    verifyBalancedMumfordMultipleWithin(ctx, domain, term.transport.result, entry.coefficient, term.multiple, bounds); appendFormal(ctx, source, factors, balancedMultipleFunctions(ctx, term.multiple));
    const addition = proof.additions[i]; verifyBalancedMumfordAdditionWithin(ctx, domain, result, term.multiple.result, addition, bounds); appendFormal(ctx, source, factors, balancedAdditionFunctions(ctx, addition)); result = addition.result;
  }
  ctx.allocate(14); demand(equalBalancedDivisors(ctx, cantorPolynomialArithmetic(domain.ring), result, proof.result)
    && factors.length === proof.factors.length && factors.every((f, i) => {ctx.integer(proof.factors[i].exponent); return f.exponent === proof.factors[i].exponent && curve.owner.equal(ctx, f.value, proof.factors[i].value);}), 'verification-failed', 'complete balanced native witness and class');
  verifyAlgebraicConditions(ctx, curve.owner, sources(ctx, source, factors), proof.conditions, bounds);
}
export function reduceBalancedDivisorWithin<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): BalancedDivisorClass<E> {
  const curve = source.model.curve, domain = source.domain; verifyBalancedCurveModelWithin(ctx, source.model, source, bounds); assertAlgebraicDivisor(ctx, curve, divisor);
  demand(divisor.degree === 0n, 'invalid-input', 'degree-zero balanced divisor request');
  const terms: {transport: BalancedPlaceTransport<E>; multiple: BalancedMumfordMultiple<CurveConstant>}[] = [], additions: BalancedMumfordAddition<CurveConstant>[] = [], factors: AlgebraicFunctionFactor<E>[] = [];
  let result = neutralBalancedCurveDivisor(ctx, source);
  for (const entry of divisor.entries) {
    const transport = transportBalancedPlaceWithin(ctx, source, entry.place, bounds); if (transport.principalFactor !== null) append(ctx, source, factors, transport.principalFactor, entry.coefficient);
    appendFormal(ctx, source, factors, balancedNormalizationFunctions(ctx, transport.normalization), entry.coefficient);
    const multiple = multiplyBalancedMumfordWithin(ctx, domain, transport.result, entry.coefficient, bounds); appendFormal(ctx, source, factors, balancedMultipleFunctions(ctx, multiple));
    const addition = addBalancedMumfordWithin(ctx, domain, result, multiple.result, bounds); appendFormal(ctx, source, factors, balancedAdditionFunctions(ctx, addition)); result = addition.result;
    ctx.allocate(4); terms.push(Object.freeze({transport, multiple})); additions.push(addition);
  }
  const conditions = algebraicConditions(ctx, curve.owner, sources(ctx, source, factors), bounds); ctx.allocate(7);
  const proof = Object.freeze({source, divisor, terms: Object.freeze(terms), additions: Object.freeze(additions), result, factors: Object.freeze(factors), conditions}); verifyBalancedDivisorClassWithin(ctx, source, divisor, proof, bounds); return proof;
}
export const balancedPrincipalityRule = 'hyperelliptic-balanced-principality-v1' as const;
export interface BalancedPrincipality<E> {readonly rule: typeof balancedPrincipalityRule; readonly source: BalancedCurveModel<E>; readonly divisor: AlgebraicDivisor<E>; readonly kind: 'principal' | 'not-principal'; readonly reduction: BalancedDivisorClass<E> | null}
export function verifyBalancedPrincipalityWithin<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>, proof: BalancedPrincipality<E>, bounds: DifferentialBounds): void {
  verifyBalancedCurveModelWithin(ctx, source.model, source, bounds); verifyAlgebraicDivisorWithin(ctx, source.model.curve, divisor.input, divisor);
  demand(proof.rule === balancedPrincipalityRule && proof.source === source && proof.divisor === divisor, 'verification-failed', 'balanced principality explicit rule and request');
  if (divisor.degree !== 0n) {demand(proof.kind === 'not-principal' && proof.reduction === null, 'verification-failed', 'nonzero balanced degree obstruction'); return;}
  demand(proof.reduction !== null, 'verification-failed', 'complete balanced class required'); verifyBalancedDivisorClassWithin(ctx, source, divisor, proof.reduction, bounds);
  ctx.allocate(14); const principal = equalBalancedDivisors(ctx, cantorPolynomialArithmetic(source.domain.ring), proof.reduction.result, neutralBalancedCurveDivisor(ctx, source));
  demand(proof.kind === (principal ? 'principal' : 'not-principal'), 'verification-failed', 'unique balanced class principality');
}
export function decideBalancedPrincipalityWithin<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): BalancedPrincipality<E> {
  verifyBalancedCurveModelWithin(ctx, source.model, source, bounds); verifyAlgebraicDivisorWithin(ctx, source.model.curve, divisor.input, divisor);
  const reduction = divisor.degree === 0n ? reduceBalancedDivisorWithin(ctx, source, divisor, bounds) : null; ctx.allocate(19);
  const principal = reduction !== null && equalBalancedDivisors(ctx, cantorPolynomialArithmetic(source.domain.ring), reduction.result, neutralBalancedCurveDivisor(ctx, source));
  const proof = Object.freeze({rule: balancedPrincipalityRule, source, divisor, kind: principal ? 'principal' as const : 'not-principal' as const, reduction}); verifyBalancedPrincipalityWithin(ctx, source, divisor, proof, bounds); return proof;
}
export function decideBalancedPrincipality<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {return ctx.operation(() => decideBalancedPrincipalityWithin(ctx, source, divisor, bounds));}
export function verifyBalancedPrincipality<E>(ctx: ExecutionContext, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>, proof: BalancedPrincipality<E>, bounds: DifferentialBounds) {ctx.operation(() => verifyBalancedPrincipalityWithin(ctx, source, divisor, proof, bounds));}
