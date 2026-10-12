import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { Polynomial } from './polynomial';
import { verifyAlgebraicCurveWithin, curveOrderCoordinates, type AlgebraicCurveView } from './algebraic-curve';
import { assertAlgebraicPlace, equalAlgebraicPlaces, decomposeAlgebraicPlacesWithin, verifyAlgebraicPlaceDecompositionWithin,
  type AlgebraicPlace, type AlgebraicPlaceDecomposition } from './algebraic-place';
import { algebraicValuationWithin, verifyAlgebraicValuationWithin, type AlgebraicValuation } from './algebraic-valuation';
import type { CurveConstant, CurveScalar } from './algebraic-curve-coordinates';
import { curveDenominators, verifyCurveDenominators, type CurveDenominators } from './algebraic-curve-lattice';
import { multiplyCurveOrderVectors } from './algebraic-fractional-ideal';
import { freezeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, determinantFromInverse, type MatrixInverse } from './algebraic-matrix';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';
import { algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition } from './algebraic-conditions';

export interface AlgebraicDivisorEntry<E> { readonly place: AlgebraicPlace<E>; readonly coefficient: bigint }
export interface AlgebraicDivisor<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly input: readonly AlgebraicDivisorEntry<E>[];
  readonly entries: readonly AlgebraicDivisorEntry<E>[];
  readonly degree: bigint;
}
const divisors = new WeakSet<object>();
export function assertAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>): void {
  ctx.tick(); demand(divisor !== null && typeof divisor === 'object' && divisors.has(divisor) && divisor.curve === curve, 'domain-mismatch', 'owned algebraic divisor');
  for (const entry of divisor.entries) { assertAlgebraicPlace(ctx, curve, entry.place); ctx.integer(entry.coefficient); }
}
function combineEntries<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[]) {
  ctx.allocate(input.length * 2); const entries: {place: AlgebraicPlace<E>; coefficient: bigint}[] = [];
  for (const entry of input) {
    assertAlgebraicPlace(ctx, curve, entry.place); ctx.integer(entry.coefficient);
    const i = entries.findIndex(v => equalAlgebraicPlaces(ctx, curve, v.place, entry.place));
    if (i < 0) entries.push({place: entry.place, coefficient: entry.coefficient}); else entries[i].coefficient = ctx.add(entries[i].coefficient, entry.coefficient);
  }
  return Object.freeze(entries.filter(e => e.coefficient !== 0n).map(e => Object.freeze(e)));
}
export function constructAlgebraicDivisorWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[]): AlgebraicDivisor<E> {
  const entries = combineEntries(ctx, curve, input); let degree = 0n;
  for (const e of entries) degree = ctx.add(degree, ctx.multiply(e.coefficient, e.place.degree));
  ctx.allocate(input.length + 4); const proof = Object.freeze({curve, input: Object.freeze(input.map(e => Object.freeze({...e}))), entries, degree}); divisors.add(proof); return proof;
}
export function verifyAlgebraicDivisorWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[], proof: AlgebraicDivisor<E>): void {
  assertAlgebraicDivisor(ctx, curve, proof);
  demand(proof.input.length === input.length && input.every((e, i) => equalAlgebraicPlaces(ctx, curve, proof.input[i].place, e.place) && proof.input[i].coefficient === e.coefficient),
    'verification-failed', 'divisor original ordered input');
  const expected = combineEntries(ctx, curve, input); let degree = 0n;
  demand(expected.length === proof.entries.length && expected.every((e, i) => equalAlgebraicPlaces(ctx, curve, e.place, proof.entries[i].place) && e.coefficient === proof.entries[i].coefficient),
    'verification-failed', 'divisor complete normalized support');
  for (const e of expected) degree = ctx.add(degree, ctx.multiply(e.coefficient, e.place.degree));
  demand(degree === proof.degree, 'verification-failed', 'divisor residue-weighted degree');
}
export function equalAlgebraicDivisors<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: AlgebraicDivisor<E>, b: AlgebraicDivisor<E>): boolean {
  assertAlgebraicDivisor(ctx, curve, a); assertAlgebraicDivisor(ctx, curve, b);
  if (a.degree !== b.degree || a.entries.length !== b.entries.length) return false;
  return a.entries.every(e => b.entries.some(v => e.coefficient === v.coefficient && equalAlgebraicPlaces(ctx, curve, e.place, v.place)));
}
export function addAlgebraicDivisorsWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: AlgebraicDivisor<E>, b: AlgebraicDivisor<E>): AlgebraicDivisor<E> {
  assertAlgebraicDivisor(ctx, curve, a); assertAlgebraicDivisor(ctx, curve, b); ctx.allocate(a.entries.length + b.entries.length);
  return constructAlgebraicDivisorWithin(ctx, curve, [...a.entries, ...b.entries]);
}
export function scaleAlgebraicDivisorWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: AlgebraicDivisor<E>, coefficient: bigint): AlgebraicDivisor<E> {
  assertAlgebraicDivisor(ctx, curve, input); ctx.integer(coefficient); ctx.allocate(input.entries.length);
  return constructAlgebraicDivisorWithin(ctx, curve, input.entries.map(e => ({place: e.place, coefficient: ctx.multiply(e.coefficient, coefficient)})));
}

export interface CurvePrincipalNormalization {
  readonly coordinates: readonly CurveScalar[];
  readonly denominators: CurveDenominators;
  readonly integral: readonly CurveScalar[];
  readonly norm: MatrixInverse<CurveScalar>;
}
function normalizationMatrix<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, integral: readonly CurveScalar[]) {
  const order = curve.finite, f = order.lattice.scalar, n = order.lattice.dimension; ctx.allocate(n * n);
  const columns = Array.from({length: n}, (_, j) => multiplyCurveOrderVectors(ctx, order, integral,
    Array.from({length: n}, (_, i) => f.fromInteger(ctx, i === j ? 1n : 0n))));
  return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => columns.map(column => column[i])));
}
function normalizePrincipal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E): CurvePrincipalNormalization {
  const f = curve.finite.lattice.scalar, coordinates = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, input);
  const denominators = curveDenominators(ctx, f.ring, coordinates.map(v => v.denominator)), scale = f.make(ctx, denominators.common, f.ring.one(ctx));
  ctx.allocate(coordinates.length); const integral = Object.freeze(coordinates.map(v => f.multiply(ctx, v, scale))), norm = invertExactMatrix(ctx, f, normalizationMatrix(ctx, curve, integral));
  demand(norm !== null, 'verification-failed', 'principal nonzero integral norm'); return Object.freeze({coordinates, denominators, integral, norm});
}
function verifyNormalization<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: CurvePrincipalNormalization): Polynomial<CurveConstant> {
  const f = curve.finite.lattice.scalar, coordinates = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, input);
  demand(coordinates.length === proof.coordinates.length && coordinates.every((v, i) => f.equal(ctx, v, proof.coordinates[i])), 'verification-failed', 'principal coordinate coverage');
  verifyCurveDenominators(ctx, f.ring, coordinates.map(v => v.denominator), proof.denominators);
  const scale = f.make(ctx, proof.denominators.common, f.ring.one(ctx)), integral = coordinates.map(v => f.multiply(ctx, v, scale));
  demand(integral.length === proof.integral.length && integral.every((v, i) => f.equal(ctx, v, proof.integral[i]) && f.ring.degree(ctx, v.denominator) === 0),
    'verification-failed', 'principal integral numerator');
  verifyExactMatrixInverse(ctx, f, normalizationMatrix(ctx, curve, integral), proof.norm);
  const norm = determinantFromInverse(ctx, f, proof.norm); demand(f.ring.degree(ctx, norm.denominator) === 0, 'verification-failed', 'principal integral polynomial norm');
  return norm.numerator;
}
export interface AlgebraicPrincipalDivisor<E> {
  readonly input: E;
  readonly normalization: CurvePrincipalNormalization;
  readonly denominatorFactors: AlgebraicFactorization<CurveConstant>;
  readonly normFactors: AlgebraicFactorization<CurveConstant>;
  readonly finite: readonly AlgebraicPlaceDecomposition<E>[];
  readonly infinity: AlgebraicPlaceDecomposition<E>;
  readonly valuations: readonly AlgebraicValuation<E>[];
  readonly divisor: AlgebraicDivisor<E>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function supportPrimes(ctx: ExecutionContext, denominator: AlgebraicFactorization<CurveConstant>, norm: AlgebraicFactorization<CurveConstant>) {
  demand(denominator.kind === 'factorization' && norm.kind === 'factorization', 'verification-failed', 'principal nonzero support polynomials');
  ctx.allocate(denominator.factors.length + norm.factors.length); const primes: Polynomial<CurveConstant>[] = [];
  for (const factor of [...denominator.factors, ...norm.factors]) if (!primes.some(p => p.ring.equal(ctx, p, factor.polynomial))) primes.push(factor.polynomial);
  return primes;
}
function conditionSources<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E) {
  return [...algebraicConstructionSources(ctx, curve.owner), {field: curve.owner as import('./field').ExactField<unknown>, value: input, path: 'principal.input'}];
}
export function principalAlgebraicDivisorWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicPrincipalDivisor<E> {
  curve.owner.assert(ctx, input); demand(!curve.owner.isZero(ctx, input), 'invalid-input', 'principal divisor of zero');
  const normalization = normalizePrincipal(ctx, curve, input), norm = verifyNormalization(ctx, curve, input, normalization), r = curve.finite.lattice.scalar.ring;
  const denominatorFactors = factorAlgebraicPolynomialWithin(ctx, r, normalization.denominators.common, bounds), normFactors = factorAlgebraicPolynomialWithin(ctx, r, norm, bounds);
  const finite = Object.freeze(supportPrimes(ctx, denominatorFactors, normFactors).map(prime => decomposeAlgebraicPlacesWithin(ctx, curve, prime, false, bounds)));
  const ur = curve.infinity.lattice.scalar.ring, u = ur.make(ctx, [ur.domain.fromInteger(ctx, 0n), ur.domain.fromInteger(ctx, 1n)]);
  const infinity = decomposeAlgebraicPlacesWithin(ctx, curve, u, true, bounds), all = [...finite.flatMap(d => d.places), ...infinity.places];
  ctx.allocate(all.length); const valuations = Object.freeze(all.map(place => algebraicValuationWithin(ctx, curve, place, input)));
  const divisor = constructAlgebraicDivisorWithin(ctx, curve, valuations.map(v => ({place: v.place, coefficient: v.value})));
  const conditions = algebraicConditions(ctx, curve.owner, conditionSources(ctx, curve, input), bounds);
  const proof = Object.freeze({input, normalization, denominatorFactors, normFactors, finite, infinity, valuations, divisor, conditions});
  verifyAlgebraicPrincipalDivisorWithin(ctx, curve, input, proof, bounds); return proof;
}
export function verifyAlgebraicPrincipalDivisorWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPrincipalDivisor<E>, bounds: DifferentialBounds): void {
  curve.owner.assert(ctx, input); demand(!curve.owner.isZero(ctx, input) && curve.owner.equal(ctx, input, proof.input), 'verification-failed', 'principal exact nonzero input');
  const norm = verifyNormalization(ctx, curve, input, proof.normalization), r = curve.finite.lattice.scalar.ring;
  verifyAlgebraicFactorizationWithin(ctx, r, proof.normalization.denominators.common, proof.denominatorFactors, bounds);
  verifyAlgebraicFactorizationWithin(ctx, r, norm, proof.normFactors, bounds);
  const primes = supportPrimes(ctx, proof.denominatorFactors, proof.normFactors);
  demand(primes.length === proof.finite.length, 'verification-failed', 'principal complete finite support');
  for (let i = 0; i < primes.length; i++) verifyAlgebraicPlaceDecompositionWithin(ctx, curve, primes[i], false, proof.finite[i], bounds);
  const ur = curve.infinity.lattice.scalar.ring, u = ur.make(ctx, [ur.domain.fromInteger(ctx, 0n), ur.domain.fromInteger(ctx, 1n)]);
  verifyAlgebraicPlaceDecompositionWithin(ctx, curve, u, true, proof.infinity, bounds);
  const all = [...proof.finite.flatMap(d => d.places), ...proof.infinity.places];
  demand(all.length === proof.valuations.length, 'verification-failed', 'principal complete valuation coverage');
  for (let i = 0; i < all.length; i++) verifyAlgebraicValuationWithin(ctx, curve, all[i], input, proof.valuations[i]);
  verifyAlgebraicDivisorWithin(ctx, curve, proof.valuations.map(v => ({place: v.place, coefficient: v.value})), proof.divisor);
  demand(proof.divisor.degree === 0n, 'verification-failed', 'principal divisor has degree zero');
  verifyAlgebraicConditions(ctx, curve.owner, conditionSources(ctx, curve, input), proof.conditions, bounds);
  // Clearing by delta makes all finite valuations nonnegative. A finite zero
  // must divide its polynomial norm; finite poles divide delta. Their union,
  // together with every infinity place, is therefore complete even when the
  // norm of the original function cancels zeroes and poles above one base prime.
}
export function principalAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return principalAlgebraicDivisorWithin(ctx, curve, input, bounds); });
}
export function verifyAlgebraicPrincipalDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPrincipalDivisor<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPrincipalDivisorWithin(ctx, curve, input, proof, bounds); });
}
export function constructAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[], bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return constructAlgebraicDivisorWithin(ctx, curve, input); });
}
export function addAlgebraicDivisors<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, left: AlgebraicDivisor<E>, right: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return addAlgebraicDivisorsWithin(ctx, curve, left, right); });
}
export function scaleAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: AlgebraicDivisor<E>, coefficient: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return scaleAlgebraicDivisorWithin(ctx, curve, input, coefficient); });
}
export function verifyAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[], proof: AlgebraicDivisor<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, input, proof); });
}
