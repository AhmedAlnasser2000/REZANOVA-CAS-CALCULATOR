/** Complete possible pole support, deliberately separate from complete zero
 * support and from the legacy principal-divisor/differential certificates. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, curveOrderCoordinates, type AlgebraicCurveView} from './algebraic-curve';
import {constructAlgebraicCanonicalGeometryWithin, verifyAlgebraicCanonicalGeometryWithin, type AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';
import {curveDenominators, verifyCurveDenominators, type CurveDenominators} from './algebraic-curve-lattice';
import {factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization} from './algebraic-factorization';
import {decomposeAlgebraicPlacesWithin, verifyAlgebraicPlaceDecompositionWithin, equalAlgebraicPlaces, type AlgebraicPlaceDecomposition, type AlgebraicPlace} from './algebraic-place';
import {algebraicValuationWithin, verifyAlgebraicValuationWithin, type AlgebraicValuation} from './algebraic-valuation';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {algebraicIntegrationConditionSources} from './algebraic-differential';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
import {ScopedProof} from './scoped-proof';
const produced = new WeakSet<object>(), checks = new ScopedProof();
/** Eligibility only: every fresh operation still checks the entire proof. */
export function isImmutableProducedPoleCoverage(ctx: ExecutionContext, proof: unknown): boolean {
  ctx.tick(); return proof !== null && typeof proof === 'object' && produced.has(proof);
}

export const algebraicPoleCoverageRule = 'algebraic-integral-coordinates-pole-coverage-v1' as const;
export interface AlgebraicPoleCoordinates {
  readonly coordinates: readonly CurveScalar[];
  readonly denominators: CurveDenominators;
  readonly integral: readonly CurveScalar[];
}
export interface AlgebraicPoleEntry<E> {
  readonly place: AlgebraicPlace<E>;
  readonly valuation: AlgebraicValuation<E> | null;
  readonly order: bigint | null;
}
export interface AlgebraicPoleCoverage<E> {
  readonly rule: typeof algebraicPoleCoverageRule;
  readonly arithmetic?: RationalGcdEvidence;
  readonly input: E;
  readonly geometry: AlgebraicCanonicalGeometry<E>;
  readonly normalization: AlgebraicPoleCoordinates;
  readonly denominatorFactors: AlgebraicFactorization<CurveConstant>;
  readonly finite: readonly AlgebraicPlaceDecomposition<E>[];
  readonly entries: readonly AlgebraicPoleEntry<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function normalize<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E): AlgebraicPoleCoordinates {
  const f = curve.finite.lattice.scalar, coordinates = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, input);
  ctx.allocate(coordinates.length * 2 + 3);
  const denominators = curveDenominators(ctx, f.ring, coordinates.map(v => v.denominator)), scale = f.make(ctx, denominators.common, f.ring.one(ctx));
  return Object.freeze({coordinates, denominators, integral: Object.freeze(coordinates.map(v => f.multiply(ctx, scale, v)))});
}
function verifyNormalization<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPoleCoordinates): void {
  const f = curve.finite.lattice.scalar, coordinates = curveOrderCoordinates(ctx, curve.coordinates, curve.finite, input);
  demand(coordinates.length === proof.coordinates.length && coordinates.every((v, i) => f.equal(ctx, v, proof.coordinates[i])), 'verification-failed', 'pole complete integral-basis coordinate coverage');
  ctx.allocate(coordinates.length); verifyCurveDenominators(ctx, f.ring, coordinates.map(v => v.denominator), proof.denominators);
  const scale = f.make(ctx, proof.denominators.common, f.ring.one(ctx));
  demand(proof.integral.length === coordinates.length && coordinates.every((v, i) => f.equal(ctx, f.multiply(ctx, v, scale), proof.integral[i])
    && f.ring.degree(ctx, proof.integral[i].denominator) === 0), 'verification-failed', 'pole exact polynomial numerator reconstruction');
}
function candidates<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, finite: readonly AlgebraicPlaceDecomposition<E>[], geometry: AlgebraicCanonicalGeometry<E>): readonly AlgebraicPlace<E>[] {
  const size = [...finite, ...geometry.finite].reduce((n, d) => n + d.places.length, geometry.infinity.places.length); ctx.allocate(size * 2);
  const out: AlgebraicPlace<E>[] = [];
  for (const decomposition of [...finite, ...geometry.finite, geometry.infinity]) for (const place of decomposition.places) {
    ctx.tick(); if (!out.some(p => equalAlgebraicPlaces(ctx, curve, p, place))) out.push(place);
  }
  return Object.freeze(out);
}
function canonicalOrder<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, geometry: AlgebraicCanonicalGeometry<E>, place: AlgebraicPlace<E>): bigint {
  return geometry.canonical.entries.find(e => equalAlgebraicPlaces(ctx, curve, e.place, place))?.coefficient ?? 0n;
}
export function verifyAlgebraicPoleCoverageWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPoleCoverage<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  if (produced.has(proof)) checks.check(ctx, [input as object, proof, bounds], () => verifyCoverage(ctx, curve, input, proof, bounds), [curve, proof, input as object]);
  else verifyCoverage(ctx, curve, input, proof, bounds);
}
function verifyCoverage<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPoleCoverage<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner, r = curve.finite.lattice.scalar.ring;
  f.assert(ctx, input); demand(proof.rule === algebraicPoleCoverageRule && f.equal(ctx, input, proof.input), 'verification-failed', 'pole explicit rule/input binding');
  verifyAlgebraicCanonicalGeometryWithin(ctx, curve, proof.geometry, bounds); verifyNormalization(ctx, curve, input, proof.normalization);
  verifyAlgebraicFactorizationWithin(ctx, r, proof.normalization.denominators.common, proof.denominatorFactors, bounds);
  demand(proof.denominatorFactors.kind === 'factorization' && proof.finite.length === proof.denominatorFactors.factors.length, 'verification-failed', 'pole complete denominator factor/place coverage');
  for (let i = 0; i < proof.finite.length; i++) verifyAlgebraicPlaceDecompositionWithin(ctx, curve, proof.denominatorFactors.factors[i].polynomial, false, proof.finite[i], bounds);
  const all = candidates(ctx, curve, proof.finite, proof.geometry), zero = f.isZero(ctx, input);
  demand(proof.entries.length === all.length, 'verification-failed', 'pole complete finite/infinity entry coverage');
  for (let i = 0; i < all.length; i++) {
    const entry = proof.entries[i]; demand(equalAlgebraicPlaces(ctx, curve, entry.place, all[i]), 'verification-failed', 'pole ordered place correspondence');
    if (zero) demand(entry.valuation === null && entry.order === null, 'verification-failed', 'pole explicit zero differential');
    else {
      demand(entry.valuation !== null && entry.order !== null, 'verification-failed', 'pole nonzero valuation coverage');
      verifyAlgebraicValuationWithin(ctx, curve, entry.place, input, entry.valuation); ctx.integer(entry.order);
      demand(entry.order === ctx.add(entry.valuation.value, canonicalOrder(ctx, curve, proof.geometry, entry.place)), 'verification-failed', 'pole exact differential order');
    }
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input), proof.conditions, bounds);
}
export function certifyAlgebraicPoleCoverageWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicPoleCoverage<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); curve.owner.assert(ctx, input);
  const geometry = constructAlgebraicCanonicalGeometryWithin(ctx, curve, bounds), normalization = normalize(ctx, curve, input), r = curve.finite.lattice.scalar.ring;
  const denominatorFactors = factorAlgebraicPolynomialWithin(ctx, r, normalization.denominators.common, bounds);
  demand(denominatorFactors.kind === 'factorization', 'verification-failed', 'pole nonzero common denominator'); ctx.allocate(denominatorFactors.factors.length);
  const finite = Object.freeze(denominatorFactors.factors.map(p => decomposeAlgebraicPlacesWithin(ctx, curve, p.polynomial, false, bounds))), zero = curve.owner.isZero(ctx, input);
  const entries = Object.freeze(candidates(ctx, curve, finite, geometry).map(place => {
    ctx.allocate(3); if (zero) return Object.freeze({place, valuation: null, order: null});
    const valuation = algebraicValuationWithin(ctx, curve, place, input); return Object.freeze({place, valuation, order: ctx.add(valuation.value, canonicalOrder(ctx, curve, geometry, place))});
  }));
  const conditions = algebraicConditions(ctx, curve.owner, algebraicIntegrationConditionSources(ctx, curve, input), bounds);
  ctx.allocate(9); const proof = Object.freeze({rule: algebraicPoleCoverageRule, input, geometry, normalization, denominatorFactors, finite, entries, conditions});
  ctx.allocate(1); produced.add(proof);
  verifyAlgebraicPoleCoverageWithin(ctx, curve, input, proof, bounds); return proof;
}
export function certifyAlgebraicPoleCoverage<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicPoleCoverage<E> {
  return ctx.operation(() => {const p = recordRationalGcdEvidence(ctx, () => certifyAlgebraicPoleCoverageWithin(ctx, curve, input, bounds)); return Object.freeze({...p.value, arithmetic: p.evidence});});
}
export function verifyAlgebraicPoleCoverage<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPoleCoverage<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => {demand(proof.arithmetic !== undefined, 'verification-failed', 'pole arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => verifyAlgebraicPoleCoverageWithin(ctx, curve, input, proof, bounds));});
}
