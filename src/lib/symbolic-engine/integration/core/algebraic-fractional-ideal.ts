import { demand, type ExecutionContext } from './execution';
import type { Polynomial } from './polynomial';
import { assertAlgebraicCurveOwner, verifyAlgebraicCurveWithin, type AlgebraicCurveView, type AlgebraicCurveOrder } from './algebraic-curve';
import type { DifferentialBounds } from './differential-field';
import type { CurveScalar } from './algebraic-curve-coordinates';
import { constructCurveLattice, verifyCurveLattice, curveLatticeCoordinates, intersectCurveLattices, verifyCurveLatticeIntersection,
  preimageCurveLattice, verifyCurveLatticePreimage, type CurveLattice, type CurveLatticeIntersection, type CurveLatticePreimage } from './algebraic-curve-lattice';
import { freezeExactMatrix, type ExactMatrix } from './algebraic-matrix';

/** Coordinates are in the certified integral-order basis. These are ideals
 * over its polynomial chart; infinity conditions later localize at u=0. */
export interface CurveFractionalIdeal<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly order: AlgebraicCurveOrder;
  readonly lattice: CurveLattice;
}
const ideals = new WeakSet<object>();
export function assertCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, ideal: CurveFractionalIdeal<E>): void {
  assertAlgebraicCurveOwner(ctx, curve);
  demand(ideal !== null && typeof ideal === 'object' && ideals.has(ideal) && ideal.curve === curve
    && (ideal.order === curve.finite || ideal.order === curve.infinity), 'domain-mismatch', 'fractional ideal owner/chart');
}
export function multiplyCurveOrderVectors(ctx: ExecutionContext, order: AlgebraicCurveOrder, a: readonly CurveScalar[], b: readonly CurveScalar[]): readonly CurveScalar[] {
  const f = order.lattice.scalar, n = order.lattice.dimension;
  demand(a.length === n && b.length === n, 'invalid-input', 'order product coordinate coverage'); ctx.allocate(n);
  for (const v of [...a, ...b]) f.assert(ctx, v);
  return Object.freeze(Array.from({length: n}, (_, k) => {
    let out = f.fromInteger(ctx, 0n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out = f.add(ctx, out, f.multiply(ctx,
      f.multiply(ctx, a[i], b[j]), f.make(ctx, order.multiplication[i][k][j], f.ring.one(ctx))));
    return out;
  }));
}
export function curveIdealContainsVector<E>(ctx: ExecutionContext, ideal: Pick<CurveFractionalIdeal<E>, 'lattice' | 'order'>, value: readonly CurveScalar[]): boolean {
  const coordinates = curveLatticeCoordinates(ctx, ideal.lattice, value), r = ideal.order.lattice.scalar.ring;
  return coordinates.every(v => r.degree(ctx, v.denominator) === 0);
}
function vectorUnit(ctx: ExecutionContext, order: AlgebraicCurveOrder, j: number): readonly CurveScalar[] {
  const f = order.lattice.scalar, n = order.lattice.dimension; ctx.allocate(n);
  return Object.freeze(Array.from({length: n}, (_, i) => f.fromInteger(ctx, i === j ? 1n : 0n)));
}
export function reconstructCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, infinity: boolean, input: ExactMatrix<CurveScalar>, proof: CurveLattice): CurveFractionalIdeal<E> {
  assertAlgebraicCurveOwner(ctx, curve); const order = infinity ? curve.infinity : curve.finite, n = order.lattice.dimension, f = order.lattice.scalar;
  verifyCurveLattice(ctx, f, input, n, proof);
  const partial = {curve, order, lattice: proof};
  for (const row of proof.basis) for (let j = 0; j < n; j++) demand(curveIdealContainsVector(ctx, partial,
    multiplyCurveOrderVectors(ctx, order, row, vectorUnit(ctx, order, j))), 'invalid-input', 'fractional lattice is not an order ideal');
  ctx.allocate(4); const result = Object.freeze(partial); ideals.add(result); return result;
}
export function constructCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, infinity: boolean, vectors: ExactMatrix<CurveScalar>): CurveFractionalIdeal<E> {
  const order = infinity ? curve.infinity : curve.finite;
  return reconstructCurveIdeal(ctx, curve, infinity, vectors, constructCurveLattice(ctx, order.lattice.scalar, vectors, order.lattice.dimension));
}
export function unitCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, infinity: boolean): CurveFractionalIdeal<E> {
  const order = infinity ? curve.infinity : curve.finite;
  return constructCurveIdeal(ctx, curve, infinity, freezeExactMatrix(ctx, Array.from({length: order.lattice.dimension}, (_, j) => [...vectorUnit(ctx, order, j)])));
}
export function verifyCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, ideal: CurveFractionalIdeal<E>): void {
  assertCurveIdeal(ctx, curve, ideal); reconstructCurveIdeal(ctx, curve, ideal.order.infinity, ideal.lattice.input, ideal.lattice);
}
export function equalCurveIdeals<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: CurveFractionalIdeal<E>, b: CurveFractionalIdeal<E>): boolean {
  assertCurveIdeal(ctx, curve, a); assertCurveIdeal(ctx, curve, b); demand(a.order === b.order, 'domain-mismatch', 'ideal equality chart');
  return a.lattice.basis.every(row => curveIdealContainsVector(ctx, b, row))
    && b.lattice.basis.every(row => curveIdealContainsVector(ctx, a, row));
}
function productVectors<E>(ctx: ExecutionContext, a: CurveFractionalIdeal<E>, b: CurveFractionalIdeal<E>): ExactMatrix<CurveScalar> {
  demand(a.curve === b.curve && a.order === b.order, 'domain-mismatch', 'ideal product construction/chart');
  ctx.allocate(a.lattice.dimension * b.lattice.dimension);
  return freezeExactMatrix(ctx, a.lattice.basis.flatMap(x => b.lattice.basis.map(y => [...multiplyCurveOrderVectors(ctx, a.order, x, y)])));
}
export interface CurveIdealProduct<E> {
  readonly left: CurveFractionalIdeal<E>;
  readonly right: CurveFractionalIdeal<E>;
  readonly result: CurveFractionalIdeal<E>;
}
export function multiplyCurveIdeals<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: CurveFractionalIdeal<E>, b: CurveFractionalIdeal<E>): CurveIdealProduct<E> {
  assertCurveIdeal(ctx, curve, a); assertCurveIdeal(ctx, curve, b);
  const result = constructCurveIdeal(ctx, curve, a.order.infinity, productVectors(ctx, a, b));
  const proof = Object.freeze({left: a, right: b, result}); verifyCurveIdealProduct(ctx, curve, a, b, proof); return proof;
}
export function verifyCurveIdealProduct<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: CurveFractionalIdeal<E>, b: CurveFractionalIdeal<E>, proof: CurveIdealProduct<E>): void {
  assertCurveIdeal(ctx, curve, a); assertCurveIdeal(ctx, curve, b); assertCurveIdeal(ctx, curve, proof.result);
  demand(equalCurveIdeals(ctx, curve, proof.left, a) && equalCurveIdeals(ctx, curve, proof.right, b) && proof.result.order === a.order,
    'domain-mismatch', 'ideal product checked expected operands');
  reconstructCurveIdeal(ctx, curve, a.order.infinity, productVectors(ctx, a, b), proof.result.lattice);
}

export interface CurveIdealInverse<E> {
  readonly input: CurveFractionalIdeal<E>;
  readonly preimage: CurveLatticePreimage;
  readonly result: CurveFractionalIdeal<E>;
  readonly product: CurveIdealProduct<E>;
}
function inverseConstraints<E>(ctx: ExecutionContext, ideal: CurveFractionalIdeal<E>): ExactMatrix<CurveScalar> {
  const order = ideal.order, n = order.lattice.dimension; ctx.allocate(n * n * n);
  return freezeExactMatrix(ctx, ideal.lattice.basis.flatMap(row => {
    const columns = Array.from({length: n}, (_, j) => multiplyCurveOrderVectors(ctx, order, row, vectorUnit(ctx, order, j)));
    return Array.from({length: n}, (_, i) => columns.map(column => column[i]));
  }));
}
export function invertCurveIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, ideal: CurveFractionalIdeal<E>): CurveIdealInverse<E> {
  assertCurveIdeal(ctx, curve, ideal); const f = ideal.order.lattice.scalar, n = ideal.lattice.dimension;
  const preimage = preimageCurveLattice(ctx, f, inverseConstraints(ctx, ideal), n);
  const result = reconstructCurveIdeal(ctx, curve, ideal.order.infinity, preimage.result.input, preimage.result), product = multiplyCurveIdeals(ctx, curve, ideal, result);
  const proof = Object.freeze({input: ideal, preimage, result, product}); verifyCurveIdealInverse(ctx, curve, ideal, proof); return proof;
}
export function verifyCurveIdealInverse<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, ideal: CurveFractionalIdeal<E>, proof: CurveIdealInverse<E>): void {
  assertCurveIdeal(ctx, curve, ideal); assertCurveIdeal(ctx, curve, proof.result);
  demand(equalCurveIdeals(ctx, curve, proof.input, ideal) && proof.result.lattice === proof.preimage.result, 'domain-mismatch', 'ideal inverse input/mapping');
  verifyCurveLatticePreimage(ctx, ideal.order.lattice.scalar, inverseConstraints(ctx, ideal), ideal.lattice.dimension, proof.preimage);
  verifyCurveIdealProduct(ctx, curve, ideal, proof.result, proof.product);
  const f = ideal.order.lattice.scalar, n = ideal.lattice.dimension;
  demand(proof.product.result.lattice.basis.every(row => row.every(v => f.ring.degree(ctx, v.denominator) === 0)), 'verification-failed', 'ideal inverse product integrality');
  for (let j = 0; j < n; j++) demand(curveIdealContainsVector(ctx, proof.product.result, vectorUnit(ctx, ideal.order, j)),
    'verification-failed', 'ideal inverse product is the complete unit order');
}
export interface CurveIdealIntersection<E> {
  readonly left: CurveFractionalIdeal<E>;
  readonly right: CurveFractionalIdeal<E>;
  readonly lattice: CurveLatticeIntersection;
  readonly result: CurveFractionalIdeal<E>;
}
export function intersectCurveIdeals<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: CurveFractionalIdeal<E>, b: CurveFractionalIdeal<E>): CurveIdealIntersection<E> {
  assertCurveIdeal(ctx, curve, a); assertCurveIdeal(ctx, curve, b); demand(a.order === b.order, 'domain-mismatch', 'ideal intersection chart');
  const lattice = intersectCurveLattices(ctx, a.lattice, b.lattice), result = reconstructCurveIdeal(ctx, curve, a.order.infinity, lattice.result.input, lattice.result);
  return Object.freeze({left: a, right: b, lattice, result});
}
export function verifyCurveIdealIntersection<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: CurveFractionalIdeal<E>, b: CurveFractionalIdeal<E>, proof: CurveIdealIntersection<E>): void {
  assertCurveIdeal(ctx, curve, a); assertCurveIdeal(ctx, curve, b); assertCurveIdeal(ctx, curve, proof.result);
  demand(proof.left === a && proof.right === b && a.order === b.order && proof.result.lattice === proof.lattice.result, 'domain-mismatch', 'ideal intersection operands');
  verifyCurveLatticeIntersection(ctx, a.lattice, b.lattice, proof.lattice);
}

export function curveIdealPowerBasis<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, ideal: CurveFractionalIdeal<E>): ExactMatrix<CurveScalar> {
  assertCurveIdeal(ctx, curve, ideal); const f = ideal.order.lattice.scalar, n = ideal.lattice.dimension; ctx.allocate(n * n);
  return freezeExactMatrix(ctx, ideal.lattice.basis.map(row => Array.from({length: n}, (_, j) => {
    let out = f.fromInteger(ctx, 0n);
    for (let i = 0; i < n; i++) out = f.add(ctx, out, f.multiply(ctx, row[i], ideal.order.lattice.basis[i][j]));
    return out;
  })));
}

/** Source denominators are retained by callers. Ideal arithmetic adds none. */
export function polynomialCurveIdealVector<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, infinity: boolean,
  vector: readonly Polynomial<import('./algebraic-curve-coordinates').CurveConstant>[]): readonly CurveScalar[] {
  const f = (infinity ? curve.infinity : curve.finite).lattice.scalar;
  return Object.freeze(vector.map(p => f.make(ctx, p, f.ring.one(ctx))));
}
export function constructAlgebraicFractionalIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, infinity: boolean, input: ExactMatrix<CurveScalar>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return constructCurveIdeal(ctx, curve, infinity, input); });
}
export function multiplyAlgebraicFractionalIdeals<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, left: CurveFractionalIdeal<E>, right: CurveFractionalIdeal<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return multiplyCurveIdeals(ctx, curve, left, right); });
}
export function invertAlgebraicFractionalIdeal<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: CurveFractionalIdeal<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return invertCurveIdeal(ctx, curve, input); });
}
export function intersectAlgebraicFractionalIdeals<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, left: CurveFractionalIdeal<E>, right: CurveFractionalIdeal<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return intersectCurveIdeals(ctx, curve, left, right); });
}
