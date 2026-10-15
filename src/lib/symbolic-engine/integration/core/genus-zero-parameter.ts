/** General genus-zero rational presentation from a complete degree-one space. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, type Polynomial} from './polynomial';
import {RationalFunctionField, assertRationalFunctionFieldOwner} from './rational-function';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import {verifyAlgebraicPlaceDecompositionWithin, equalAlgebraicPlaces, type AlgebraicPlaceDecomposition} from './algebraic-place';
import {constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, principalAlgebraicDivisorWithin, verifyAlgebraicPrincipalDivisorWithin, type AlgebraicPrincipalDivisor} from './algebraic-divisor';
import {solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch} from './algebraic-riemann-roch';
import {constructAlgebraicCanonicalGeometryWithin, verifyAlgebraicCanonicalGeometryWithin, type AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';
import {differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative} from './algebraic-derivative';
import {solveLinearSystem} from './linear-system';
import {exactDivide} from './polynomial-division';

export interface GenusZeroParameter<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly geometry: AlgebraicCanonicalGeometry<E>;
  readonly points: AlgebraicPlaceDecomposition<E>;
  readonly point: number;
  readonly space: AlgebraicRiemannRoch<E>;
  readonly index: number;
  readonly parameter: E;
  readonly divisor: AlgebraicPrincipalDivisor<E>;
  readonly derivative: AlgebraicDerivative<E>;
  readonly field: RationalFunctionField<CurveConstant>;
  readonly xImage: CurveScalar;
  readonly basisImages: readonly CurveScalar[];
}
function variable(ctx: ExecutionContext, field: RationalFunctionField<CurveConstant>): CurveScalar {
  return field.make(ctx, field.ring.make(ctx, [field.ring.domain.fromInteger(ctx, 0n), field.ring.domain.fromInteger(ctx, 1n)]), field.ring.one(ctx));
}
function xNative<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>): E {
  return curve.coordinates.scalarNative(ctx, variable(ctx, curve.coordinates.scalar));
}
function evaluate(ctx: ExecutionContext, field: RationalFunctionField<CurveConstant>, polynomial: Polynomial<CurveConstant>, at: CurveScalar): CurveScalar {
  polynomial.ring.assert(ctx, polynomial); field.assert(ctx, at); let result = field.fromInteger(ctx, 0n);
  for (let i = polynomial.coefficients.length - 1; i >= 0; i--) result = field.add(ctx, field.multiply(ctx, result, at), field.fromCoefficient(ctx, polynomial.coefficients[i]));
  return result;
}
export function genusZeroBackwardWithin<E>(ctx: ExecutionContext, p: GenusZeroParameter<E>, value: CurveScalar): E {
  p.field.assert(ctx, value); const c = p.curve.coordinates, owner = p.curve.owner;
  const polynomial = (v: Polynomial<CurveConstant>) => {
    let result = owner.fromInteger(ctx, 0n);
    for (let i = v.coefficients.length - 1; i >= 0; i--) result = owner.add(ctx, owner.multiply(ctx, result, p.parameter), c.scalarNative(ctx, c.scalar.fromCoefficient(ctx, v.coefficients[i])));
    return result;
  };
  const numerator = polynomial(value.numerator), denominator = polynomial(value.denominator);
  demand(!owner.isZero(ctx, denominator), 'verification-failed', 'genus-zero inverse denominator'); return owner.exactDivide(ctx, numerator, denominator);
}
export function genusZeroForwardWithin<E>(ctx: ExecutionContext, p: GenusZeroParameter<E>, value: E): CurveScalar {
  const c = p.curve.coordinates, coefficients = c.coordinates(ctx, value), f = p.field;
  demand(coefficients.length === p.basisImages.length, 'verification-failed', 'genus-zero native coordinate coverage'); let result = f.fromInteger(ctx, 0n);
  for (let i = 0; i < coefficients.length; i++) {
    const coefficient = coefficients[i], denominator = evaluate(ctx, f, coefficient.denominator, p.xImage);
    demand(!f.isZero(ctx, denominator), 'verification-failed', 'genus-zero coefficient denominator');
    result = f.add(ctx, result, f.multiply(ctx, p.basisImages[i], f.exactDivide(ctx, evaluate(ctx, f, coefficient.numerator, p.xImage), denominator)));
  }
  return result;
}
/** Degree is derived from the complete pole divisor, never a trial ceiling. */
function recover<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, parameter: E, f: RationalFunctionField<CurveConstant>, value: E, bounds: DifferentialBounds): CurveScalar {
  const owner = curve.owner, c = curve.coordinates, divisors = principalAlgebraicDivisorWithin(ctx, curve, value, bounds); let degree = 0n;
  for (const entry of divisors.divisor.entries) if (entry.coefficient < 0n) degree = ctx.add(degree, ctx.multiply(-entry.coefficient, entry.place.degree));
  ctx.integer(degree); if (degree > BigInt(Number.MAX_SAFE_INTEGER)) ctx.exhaust('allocation');
  const d = Number(degree), width = 2 * (d + 1); if (!Number.isSafeInteger(width)) ctx.exhaust('allocation');
  ctx.allocate(2 * width + d + 1); const powers: E[] = []; let power = owner.fromInteger(ctx, 1n);
  for (let i = 0; i <= d; i++) {powers.push(power); if (i < d) power = owner.multiply(ctx, power, parameter);}
  const columns = [...powers, ...powers.map(v => owner.negate(ctx, owner.multiply(ctx, value, v)))].map(v => c.coordinates(ctx, v));
  const matrix: CurveConstant[][] = [], scalar = c.scalar, r = scalar.ring, C = c.constantOwner;
  for (let coordinate = 0; coordinate < c.basis.length; coordinate++) {
    let denominator = r.one(ctx); for (const column of columns) denominator = r.multiply(ctx, denominator, column[coordinate].denominator);
    ctx.allocate(width); const polynomials = columns.map(column => r.multiply(ctx, column[coordinate].numerator, exactDivide(ctx, r, denominator, column[coordinate].denominator)));
    let maximum = -1; for (const p of polynomials) maximum = Math.max(maximum, r.degree(ctx, p)); ctx.allocate((maximum + 1) * width + maximum + 1);
    for (let i = 0; i <= maximum; i++) matrix.push(polynomials.map(p => p.coefficients[i] ?? C.fromInteger(ctx, 0n)));
  }
  ctx.allocate(matrix.length); const system = {rows: matrix.length, columns: width, matrix, rhs: matrix.map(() => C.fromInteger(ctx, 0n))}, solved = solveLinearSystem(ctx, C, system);
  demand(solved.kind === 'consistent', 'verification-failed', 'genus-zero homogeneous recovery');
  for (const vector of solved.nullspace) {
    const denominator = f.ring.make(ctx, vector.slice(d + 1)); if (f.ring.isZero(ctx, denominator)) continue;
    return f.make(ctx, f.ring.make(ctx, vector.slice(0, d + 1)), denominator);
  }
  demand(false, 'verification-failed', 'complete genus-zero recovery has no nonzero denominator');
}
export function verifyGenusZeroParameterWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, p: GenusZeroParameter<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); demand(p.curve === curve, 'domain-mismatch', 'genus-zero supplied curve'); const c = curve.coordinates, owner = curve.owner;
  verifyAlgebraicCanonicalGeometryWithin(ctx, curve, p.geometry, bounds); demand(p.geometry.genus === 0n, 'verification-failed', 'genus-zero complete geometry');
  verifyAlgebraicPlaceDecompositionWithin(ctx, curve, p.points.input, p.points.infinity, p.points, bounds);
  demand(Number.isSafeInteger(p.point) && p.point >= 0 && p.point < p.points.places.length && p.points.places[p.point].degree === 1n, 'verification-failed', 'degree-one owned parameter place');
  const point = p.points.places[p.point]; verifyAlgebraicDivisorWithin(ctx, curve, [{place: point, coefficient: 1n}], p.space.divisor);
  verifyAlgebraicRiemannRochWithin(ctx, curve, p.space.divisor, p.space, bounds);
  demand(p.space.dimension === 2 && Number.isSafeInteger(p.index) && p.index >= 0 && p.index < 2 && owner.equal(ctx, p.parameter, p.space.basis[p.index]), 'verification-failed', 'complete genus-zero parameter section');
  verifyAlgebraicPrincipalDivisorWithin(ctx, curve, p.parameter, p.divisor, bounds);
  ctx.allocate(p.divisor.divisor.entries.length); const poles = p.divisor.divisor.entries.filter(e => {ctx.tick(); return e.coefficient < 0n;});
  demand(poles.length === 1 && poles[0].coefficient === -1n && equalAlgebraicPlaces(ctx, curve, poles[0].place, point), 'verification-failed', 'parameter complete degree-one pole');
  verifyAlgebraicDerivativeWithin(ctx, owner, p.parameter, p.derivative, bounds); demand(!owner.isZero(ctx, p.derivative.derivative), 'verification-failed', 'nonconstant parameter derivative');
  assertRationalFunctionFieldOwner(ctx, p.field); demand(p.field.ring.domain === c.constantOwner, 'domain-mismatch', 'genus-zero actual-constant owner');
  demand(p.basisImages.length === c.basis.length, 'verification-failed', 'genus-zero complete basis coverage');
  const f = p.field; f.assert(ctx, p.xImage);
  demand(owner.equal(ctx, genusZeroBackwardWithin(ctx, p, p.xImage), xNative(ctx, curve)), 'verification-failed', 'base coordinate inverse correspondence');
  for (let i = 0; i < c.basis.length; i++) {
    f.assert(ctx, p.basisImages[i]); demand(owner.equal(ctx, genusZeroBackwardWithin(ctx, p, p.basisImages[i]), c.basis[i]), 'verification-failed', 'complete native basis inverse correspondence');
  }
  demand(f.equal(ctx, genusZeroForwardWithin(ctx, p, p.parameter), variable(ctx, f)), 'verification-failed', 'parameter forward correspondence');
  const derivative = f.derivative(ctx, p.xImage);
  demand(!f.isZero(ctx, derivative) && owner.equal(ctx, owner.multiply(ctx, p.derivative.derivative, genusZeroBackwardWithin(ctx, p, derivative)), owner.fromInteger(ctx, 1n)), 'verification-failed', 'selected derivation transport');
}
/** Absence of genus zero/rational place is applicability, never a failed-search fallback. */
export function tryGenusZeroParameterWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds, supplied?: AlgebraicCanonicalGeometry<E>): GenusZeroParameter<E> | null {
  const geometry = supplied ?? constructAlgebraicCanonicalGeometryWithin(ctx, curve, bounds); verifyAlgebraicCanonicalGeometryWithin(ctx, curve, geometry, bounds);
  if (geometry.genus !== 0n) return null;
  const points = geometry.infinity, point = points.places.findIndex(p => {ctx.tick(); return p.degree === 1n;}); if (point < 0) return null;
  const divisor = constructAlgebraicDivisorWithin(ctx, curve, [{place: points.places[point], coefficient: 1n}]), space = solveAlgebraicRiemannRochWithin(ctx, curve, divisor, bounds);
  demand(space.dimension === 2, 'verification-failed', 'genus-zero degree-one space dimension');
  const c = curve.coordinates, owner = curve.owner; let index = -1, derivative: AlgebraicDerivative<E> | undefined;
  for (let i = 0; i < space.basis.length; i++) {const proof = differentiateAlgebraicWithin(ctx, owner, space.basis[i], bounds); if (!owner.isZero(ctx, proof.derivative)) {index = i; derivative = proof; break;}}
  demand(index >= 0 && derivative !== undefined, 'verification-failed', 'degree-one space missing parameter');
  const parameter = space.basis[index], principal = principalAlgebraicDivisorWithin(ctx, curve, parameter, bounds), field = new RationalFunctionField(new PolynomialRing(c.constantOwner, 'parameter'));
  const xImage = recover(ctx, curve, parameter, field, xNative(ctx, curve), bounds); ctx.allocate(c.basis.length);
  const basisImages = Object.freeze(c.basis.map(b => recover(ctx, curve, parameter, field, b, bounds))); ctx.allocate(12);
  const proof = Object.freeze({curve, geometry, points, point, space, index, parameter, divisor: principal, derivative, field, xImage, basisImages});
  verifyGenusZeroParameterWithin(ctx, curve, proof, bounds); return proof;
}
export function tryGenusZeroParameter<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): GenusZeroParameter<E> | null {
  return ctx.operation(() => tryGenusZeroParameterWithin(ctx, curve, bounds));
}
export function verifyGenusZeroParameter<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: GenusZeroParameter<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGenusZeroParameterWithin(ctx, curve, proof, bounds));
}
