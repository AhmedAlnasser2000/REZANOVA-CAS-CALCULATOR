/** General Weierstrass construction from complete spaces at an owned origin. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, assertPolynomialRingOwner, type Polynomial} from './polynomial';
import {extendedGcd, verifyBezout, type Bezout} from './polynomial-division';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicPlaceWithin, equalAlgebraicPlaces, type AlgebraicPlace} from './algebraic-place';
import {constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin} from './algebraic-divisor';
import {solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch} from './algebraic-riemann-roch';
import {constructAlgebraicCanonicalGeometryWithin, verifyAlgebraicCanonicalGeometryWithin, type AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';
import {constructAlgebraicCoefficientSystem, verifyAlgebraicCoefficientSystem, combineAlgebraicConstantColumns, type AlgebraicCoefficientSystem} from './algebraic-coefficient-system';
import {solveLinearSystem, verifyLinearSolution, type LinearSolution} from './linear-system';
import {algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition} from './algebraic-conditions';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {ExactField} from './field';
import {requireImmutableExactEvidence} from './owned-validation';
import {algebraicValuationWithin, verifyAlgebraicValuationWithin, type AlgebraicValuation} from './algebraic-valuation';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export interface GenusOnePresentation<E> {
  readonly curve: AlgebraicCurveView<E>; readonly origin: AlgebraicPlace<E>; readonly geometry: AlgebraicCanonicalGeometry<E>;
  readonly spaces: readonly AlgebraicRiemannRoch<E>[]; readonly indices: readonly number[];
  readonly poles: readonly AlgebraicValuation<E>[]; readonly u: E; readonly v: E;
  readonly matrix: AlgebraicCoefficientSystem; readonly elimination: LinearSolution<CurveConstant>;
  readonly polynomial: Polynomial<CurveConstant>; readonly squareFree: Bezout<CurveConstant>; readonly scale: CurveConstant;
  readonly x: E; readonly y: E; readonly conditions: readonly AlgebraicCondition<E>[];
}
const presentations = new WeakSet<object>();
export function assertGenusOnePresentation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: GenusOnePresentation<E>): void {
  ctx.tick(); demand(presentations.has(proof) && proof.curve === curve, 'domain-mismatch', 'registered genus-one presentation');
}
function columns<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, u: E, v: E): readonly E[] {
  const f = curve.owner, u2 = f.multiply(ctx, u, u); ctx.allocate(7);
  return [f.fromInteger(ctx, 1n), u, u2, f.multiply(ctx, u2, u), v, f.multiply(ctx, u, v), f.multiply(ctx, v, v)];
}
function nativeConstant<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, value: CurveConstant): E {
  return curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, value));
}
function equation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, u: E, v: E, solved: LinearSolution<CurveConstant>, ring: PolynomialRing<CurveConstant>) {
  const c = curve.coordinates.constantOwner, f = curve.owner;
  demand(solved.kind === 'consistent' && solved.nullspace.length === 1 && solved.nullspace[0].length === 7, 'verification-failed', 'complete unique genus-one relation kernel');
  const vector = solved.nullspace[0]; demand(!c.isZero(ctx, vector[6]) && !c.isZero(ctx, vector[3]), 'verification-failed', 'nonzero square/cube relation coefficients');
  ctx.allocate(7); const q = vector.map(a => c.exactDivide(ctx, a, vector[6])), two = c.fromInteger(ctx, 2n), four = c.fromInteger(ctx, 4n), scale = c.negate(ctx, q[3]);
  const h0 = c.subtract(ctx, c.exactDivide(ctx, c.multiply(ctx, q[4], q[4]), four), q[0]), h1 = c.subtract(ctx, c.exactDivide(ctx, c.multiply(ctx, q[5], q[4]), two), q[1]), h2 = c.subtract(ctx, c.exactDivide(ctx, c.multiply(ctx, q[5], q[5]), four), q[2]);
  const polynomial = ring.make(ctx, [c.multiply(ctx, c.multiply(ctx, scale, scale), h0), c.multiply(ctx, scale, h1), h2, c.fromInteger(ctx, 1n)]);
  const shifted = f.add(ctx, v, f.exactDivide(ctx, f.add(ctx, f.multiply(ctx, nativeConstant(ctx, curve, q[5]), u), nativeConstant(ctx, curve, q[4])), f.fromInteger(ctx, 2n)));
  return {polynomial, scale, x: f.multiply(ctx, nativeConstant(ctx, curve, scale), u), y: f.multiply(ctx, nativeConstant(ctx, curve, scale), shifted)};
}
function sources<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: Pick<GenusOnePresentation<E>, 'u'|'v'|'x'|'y'>) {
  const original = algebraicConstructionSources(ctx, curve.owner); ctx.allocate(original.length + 4);
  return [...original, ...[proof.u, proof.v, proof.x, proof.y].map((value, i) => ({field: curve.owner as ExactField<unknown>, value, path: `genus-one.coordinate.${i}`}))];
}
function verifyPresentation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, proof: GenusOnePresentation<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPlaceWithin(ctx, curve, origin, bounds);
  demand(proof.curve === curve && proof.origin === origin && origin.degree === 1n, 'domain-mismatch', 'genus-one exact curve/origin');
  verifyAlgebraicCanonicalGeometryWithin(ctx, curve, proof.geometry, bounds); demand(proof.geometry.genus === 1n, 'verification-failed', 'complete genus-one geometry');
  demand(proof.spaces.length === 2 && proof.indices.length === 2 && proof.poles.length === 2, 'verification-failed', 'complete genus-one section/pole coverage');
  const f = curve.owner, c = curve.coordinates.constantOwner;
  for (let i = 0; i < 2; i++) {
    const order = BigInt(i + 2), space = proof.spaces[i], index = proof.indices[i], value = i === 0 ? proof.u : proof.v;
    verifyAlgebraicDivisorWithin(ctx, curve, [{place: origin, coefficient: order}], space.divisor); verifyAlgebraicRiemannRochWithin(ctx, curve, space.divisor, space, bounds);
    demand(space.dimension === i + 2 && Number.isSafeInteger(index) && index >= 0 && index < space.dimension && f.equal(ctx, space.basis[index], value), 'verification-failed', 'complete genus-one section selection');
    const pole = proof.poles[i]; demand(equalAlgebraicPlaces(ctx, curve, origin, pole.place), 'verification-failed', 'genus-one exact pole place');
    verifyAlgebraicValuationWithin(ctx, curve, pole.place, value, pole); demand(pole.value === -order, 'verification-failed', 'genus-one exact origin pole order');
    // Complete L(order*O) membership excludes every other pole. Its verified
    // origin valuation supplies exactness, without factoring unrelated zeros.
  }
  const values = columns(ctx, curve, proof.u, proof.v); verifyAlgebraicCoefficientSystem(ctx, curve, f.fromInteger(ctx, 0n), values, proof.matrix); verifyLinearSolution(ctx, c, proof.matrix.system, proof.elimination);
  assertPolynomialRingOwner(ctx, proof.polynomial.ring); demand(proof.polynomial.ring.domain === c, 'domain-mismatch', 'Weierstrass actual constants');
  const expected = equation(ctx, curve, proof.u, proof.v, proof.elimination, proof.polynomial.ring);
  demand(c.equal(ctx, expected.scale, proof.scale) && proof.polynomial.ring.equal(ctx, expected.polynomial, proof.polynomial) && f.equal(ctx, expected.x, proof.x) && f.equal(ctx, expected.y, proof.y), 'verification-failed', 'native square completion and monic scaling');
  demand(f.isZero(ctx, combineAlgebraicConstantColumns(ctx, curve, proof.elimination.kind === 'consistent' ? proof.elimination.nullspace[0] : [], values)), 'verification-failed', 'native Weierstrass relation');
  verifyBezout(ctx, proof.polynomial.ring, proof.polynomial, proof.polynomial.ring.derivative(ctx, proof.polynomial), proof.squareFree);
  demand(proof.polynomial.ring.equal(ctx, proof.squareFree.gcd, proof.polynomial.ring.one(ctx)), 'verification-failed', 'smooth Weierstrass cubic');
  let value = f.fromInteger(ctx, 0n); for (let i = 3; i >= 0; i--) value = f.add(ctx, f.multiply(ctx, value, proof.x), nativeConstant(ctx, curve, proof.polynomial.coefficients[i] ?? c.fromInteger(ctx, 0n)));
  demand(f.equal(ctx, f.multiply(ctx, proof.y, proof.y), value), 'verification-failed', 'independent native cubic identity');
  verifyAlgebraicConditions(ctx, f, sources(ctx, curve, proof), proof.conditions, bounds);
}
export function verifyGenusOnePresentationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, proof: GenusOnePresentation<E>, bounds: DifferentialBounds): void {
  demand(proof.curve === curve && proof.origin === origin, 'domain-mismatch', 'genus-one exact expected curve/origin');
  reuseAlgebraicVerification(ctx, 'genus-one-presentation', curve, proof, bounds, () => verifyPresentation(ctx, curve, origin, proof, bounds));
}
export function constructGenusOnePresentationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, bounds: DifferentialBounds): GenusOnePresentation<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPlaceWithin(ctx, curve, origin, bounds); demand(origin.degree === 1n, 'invalid-input', 'genus-one construction requires a degree-one origin');
  const geometry = constructAlgebraicCanonicalGeometryWithin(ctx, curve, bounds); demand(geometry.genus === 1n, 'invalid-input', 'genus-one curve required');
  const spaces: AlgebraicRiemannRoch<E>[] = [], indices: number[] = [], poles: AlgebraicValuation<E>[] = [], selected: E[] = [];
  for (let i = 0; i < 2; i++) {
    const order = BigInt(i + 2), divisor = constructAlgebraicDivisorWithin(ctx, curve, [{place: origin, coefficient: order}]), space = solveAlgebraicRiemannRochWithin(ctx, curve, divisor, bounds);
    demand(space.dimension === i + 2, 'verification-failed', 'genus-one Riemann–Roch section dimension'); let index = -1, pole: AlgebraicValuation<E>|undefined;
    for (let j = 0; j < space.basis.length; j++) {
      if (curve.owner.isZero(ctx, space.basis[j])) continue;
      const candidate = algebraicValuationWithin(ctx, curve, origin, space.basis[j]); if (candidate.value === -order) {index = j; pole = candidate; break;}
    }
    demand(index >= 0 && pole !== undefined, 'verification-failed', 'complete genus-one space missing section'); ctx.allocate(4); spaces.push(space); indices.push(index); poles.push(pole); selected.push(space.basis[index]);
  }
  const [u, v] = selected, matrix = constructAlgebraicCoefficientSystem(ctx, curve, curve.owner.fromInteger(ctx, 0n), columns(ctx, curve, u, v)), elimination = solveLinearSystem(ctx, curve.coordinates.constantOwner, matrix.system);
  const ring = new PolynomialRing(curve.coordinates.constantOwner, 'X'), data = equation(ctx, curve, u, v, elimination, ring), squareFree = extendedGcd(ctx, ring, data.polynomial, ring.derivative(ctx, data.polynomial));
  const core = {curve, origin, geometry, spaces: Object.freeze(spaces), indices: Object.freeze(indices), poles: Object.freeze(poles), u, v, matrix, elimination, ...data, squareFree};
  const conditions = algebraicConditions(ctx, curve.owner, sources(ctx, curve, core), bounds); ctx.allocate(17); const proof = Object.freeze({...core, conditions});
  verifyGenusOnePresentationWithin(ctx, curve, origin, proof, bounds); requireImmutableExactEvidence(ctx, proof, [curve]); presentations.add(proof); return proof;
}
export function constructGenusOnePresentation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, bounds: DifferentialBounds): GenusOnePresentation<E> {
  return ctx.operation(() => constructGenusOnePresentationWithin(ctx, curve, origin, bounds));
}
/** Replay-only registration; complete stored geometry/identities are checked. */
export function reconstructGenusOnePresentationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, evidence: Omit<GenusOnePresentation<E>, 'curve'|'origin'>, bounds: DifferentialBounds): GenusOnePresentation<E> {
  ctx.allocate(17); const proof = Object.freeze({...evidence, curve, origin}); verifyGenusOnePresentationWithin(ctx, curve, origin, proof, bounds); requireImmutableExactEvidence(ctx, proof, [curve]); presentations.add(proof); return proof;
}
export function verifyGenusOnePresentation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, origin: AlgebraicPlace<E>, proof: GenusOnePresentation<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGenusOnePresentationWithin(ctx, curve, origin, proof, bounds));
}
