import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import { constructCurveLattice, verifyCurveLattice, type CurveLattice } from './algebraic-curve-lattice';
import { reciprocalCurveScalar, type CurveConstant } from './algebraic-curve-coordinates';
import { solveHessLatticeSpace, verifyHessLatticeSpace, type HessLatticeSpace } from './algebraic-hess-lattice';
import { unitCurveIdeal, multiplyCurveIdeals, verifyCurveIdealProduct, curveIdealPowerBasis, type CurveFractionalIdeal, type CurveIdealProduct } from './algebraic-fractional-ideal';
import { powerCurveIdeal, verifyCurveIdealPower, type CurveIdealPower } from './algebraic-ideal-power';
import { verifyUnitCurveIdeal } from './algebraic-valuation';
import { invertExactMatrix, verifyExactMatrixInverse, transposeExactMatrix, type MatrixInverse } from './algebraic-matrix';
import { algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition } from './algebraic-conditions';

export interface AlgebraicDivisorLattice<E> {
  readonly infinity: boolean;
  readonly unit: CurveFractionalIdeal<E>;
  readonly components: readonly Readonly<{index: number; power: CurveIdealPower<E>; product: CurveIdealProduct<E>}>[];
  readonly ideal: CurveFractionalIdeal<E>;
  readonly lattice: CurveLattice;
}
export interface AlgebraicRiemannRoch<E> {
  readonly divisor: AlgebraicDivisor<E>;
  readonly finite: AlgebraicDivisorLattice<E>;
  readonly infinity: AlgebraicDivisorLattice<E>;
  readonly hess: HessLatticeSpace;
  readonly inverse: MatrixInverse<import('./algebraic-curve-coordinates').CurveScalar>;
  readonly basis: readonly E[];
  readonly dimension: number;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function divisorLattice<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, infinity: boolean): AlgebraicDivisorLattice<E> {
  const unit = unitCurveIdeal(ctx, curve, infinity), components: AlgebraicDivisorLattice<E>['components'][number][] = []; let ideal = unit;
  for (let i = 0; i < divisor.entries.length; i++) {
    const e = divisor.entries[i]; if (e.place.order.infinity !== infinity) continue;
    const power = powerCurveIdeal(ctx, curve, e.place.ideal, -e.coefficient), product = multiplyCurveIdeals(ctx, curve, ideal, power.result);
    ctx.allocate(4); components.push(Object.freeze({index: i, power, product})); ideal = product.result;
  }
  const scalar = (infinity ? curve.infinity : curve.finite).lattice.scalar;
  const lattice = constructCurveLattice(ctx, scalar, curveIdealPowerBasis(ctx, curve, ideal), curve.coordinates.basis.length);
  return Object.freeze({infinity, unit, components: Object.freeze(components), ideal, lattice});
}
function verifyDivisorLattice<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, infinity: boolean, proof: AlgebraicDivisorLattice<E>): void {
  demand(proof.infinity === infinity && proof.unit.order.infinity === infinity, 'verification-failed', 'divisor lattice chart');
  verifyUnitCurveIdeal(ctx, curve, proof.unit); let ideal = proof.unit, index = 0;
  for (let i = 0; i < divisor.entries.length; i++) {
    const e = divisor.entries[i]; if (e.place.order.infinity !== infinity) continue;
    demand(index < proof.components.length && proof.components[index].index === i, 'verification-failed', 'divisor lattice full place coverage');
    const component = proof.components[index++]; verifyCurveIdealPower(ctx, curve, e.place.ideal, -e.coefficient, component.power);
    verifyCurveIdealProduct(ctx, curve, ideal, component.power.result, component.product); ideal = component.product.result;
  }
  demand(index === proof.components.length && proof.ideal === ideal, 'verification-failed', 'divisor lattice complete product');
  const scalar = (infinity ? curve.infinity : curve.finite).lattice.scalar;
  verifyCurveLattice(ctx, scalar, curveIdealPowerBasis(ctx, curve, ideal), curve.coordinates.basis.length, proof.lattice);
}
function conditions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, basis: readonly E[]) {
  ctx.allocate(basis.length); return [...algebraicConstructionSources(ctx, curve.owner), ...basis.map((value, i) => ({
    field: curve.owner as import('./field').ExactField<unknown>, value, path: `riemann-roch.basis.${i}`}))];
}
export function solveAlgebraicRiemannRochWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): AlgebraicRiemannRoch<E> {
  assertAlgebraicDivisor(ctx, curve, divisor);
  const finite = divisorLattice(ctx, curve, divisor, false), infinity = divisorLattice(ctx, curve, divisor, true), hess = solveHessLatticeSpace(ctx, finite.lattice, infinity.lattice);
  const inverse = invertExactMatrix(ctx, curve.coordinates.scalar, transposeExactMatrix(ctx, hess.reduced, curve.coordinates.basis.length));
  demand(inverse !== null, 'verification-failed', 'Riemann–Roch reduced field basis');
  const basis = Object.freeze(hess.basis.map(vector => curve.coordinates.native(ctx, vector))), retained = algebraicConditions(ctx, curve.owner, conditions(ctx, curve, basis), bounds);
  const proof = Object.freeze({divisor, finite, infinity, hess, inverse, basis, dimension: basis.length, conditions: retained});
  verifyAlgebraicRiemannRochWithin(ctx, curve, divisor, proof, bounds); return proof;
}
export function verifyAlgebraicRiemannRochWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: AlgebraicRiemannRoch<E>, bounds: DifferentialBounds): void {
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.divisor === divisor, 'domain-mismatch', 'Riemann–Roch exact divisor');
  verifyDivisorLattice(ctx, curve, divisor, false, proof.finite); verifyDivisorLattice(ctx, curve, divisor, true, proof.infinity);
  verifyHessLatticeSpace(ctx, proof.finite.lattice, proof.infinity.lattice, proof.hess);
  verifyExactMatrixInverse(ctx, curve.coordinates.scalar, transposeExactMatrix(ctx, proof.hess.reduced, curve.coordinates.basis.length), proof.inverse);
  demand(proof.dimension === proof.hess.basis.length && proof.basis.length === proof.dimension, 'verification-failed', 'Riemann–Roch complete dimension');
  for (let i = 0; i < proof.dimension; i++) demand(curve.owner.equal(ctx, proof.basis[i], curve.coordinates.native(ctx, proof.hess.basis[i])),
    'verification-failed', 'Riemann–Roch native basis conversion');
  verifyAlgebraicConditions(ctx, curve.owner, conditions(ctx, curve, proof.basis), proof.conditions, bounds);
}
export function algebraicRiemannRochCoordinatesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicRiemannRoch<E>, value: E): readonly CurveConstant[] {
  const f = curve.coordinates.scalar, r = f.ring, vector = curve.coordinates.coordinates(ctx, value); ctx.allocate(vector.length + proof.dimension);
  const polynomials = proof.inverse.inverse.map((row, i) => {
    let out = f.fromInteger(ctx, 0n); for (let j = 0; j < row.length; j++) out = f.add(ctx, out, f.multiply(ctx, row[j], vector[j]));
    demand(r.degree(ctx, out.denominator) === 0 && (r.isZero(ctx, out.numerator) || r.degree(ctx, out.numerator) <= -proof.hess.weights[i]), 'invalid-input', 'value outside complete Riemann–Roch space');
    return out.numerator;
  });
  const c = curve.coordinates.constantOwner, result = Object.freeze(proof.hess.indices.map(({row, power}) => polynomials[row].coefficients[power] ?? c.fromInteger(ctx, 0n)));
  let reconstructed = curve.owner.fromInteger(ctx, 0n);
  for (let i = 0; i < result.length; i++) reconstructed = curve.owner.add(ctx, reconstructed, curve.owner.multiply(ctx,
    curve.coordinates.scalarNative(ctx, f.fromCoefficient(ctx, result[i])), proof.basis[i]));
  demand(curve.owner.equal(ctx, value, reconstructed), 'verification-failed', 'Riemann–Roch exact coordinate reconstruction'); return result;
}
export function solveAlgebraicRiemannRoch<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return solveAlgebraicRiemannRochWithin(ctx, curve, divisor, bounds); });
}
export function verifyAlgebraicRiemannRoch<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: AlgebraicRiemannRoch<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicRiemannRochWithin(ctx, curve, divisor, proof, bounds); });
}
export function algebraicRiemannRochCoordinates<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicRiemannRoch<E>, value: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicRiemannRochWithin(ctx, curve, proof.divisor, proof, bounds);
    return algebraicRiemannRochCoordinatesWithin(ctx, curve, proof, value); });
}
// Infinity uses reciprocal chart coordinates in the Hess engine. Keep that
// conversion explicit for callers constructing independently checked lattices.
export { reciprocalCurveScalar };
