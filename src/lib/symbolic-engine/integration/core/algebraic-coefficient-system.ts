import { demand, type ExecutionContext } from './execution';
import type { AlgebraicCurveView } from './algebraic-curve';
import type { CurveConstant, CurveScalar } from './algebraic-curve-coordinates';
import { curveDenominators, verifyCurveDenominators, type CurveDenominators } from './algebraic-curve-lattice';
import { exactDivide } from './polynomial-division';
import { freezeExactMatrix } from './algebraic-matrix';
import type { LinearSystem } from './linear-system';

export interface AlgebraicCoefficientSystem {
  readonly denominators: CurveDenominators;
  readonly degree: number;
  readonly system: LinearSystem<CurveConstant>;
}
function coordinates<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, values: readonly E[]) {
  ctx.allocate(values.length); return values.map(value => curve.coordinates.coordinates(ctx, value));
}
function cleared(ctx: ExecutionContext, scalar: AlgebraicCurveView<unknown>['coordinates']['scalar'], vectors: readonly (readonly CurveScalar[])[], denominators: CurveDenominators) {
  const r = scalar.ring; ctx.allocate(vectors.length); return vectors.map(row => row.map(v => r.multiply(ctx, v.numerator, exactDivide(ctx, r, denominators.common, v.denominator))));
}
function system<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, vectors: ReturnType<typeof cleared>, degree: number): LinearSystem<CurveConstant> {
  const n = curve.coordinates.basis.length, columns = vectors.length - 1, rows = n * (degree + 1), c = curve.coordinates.constantOwner;
  demand(Number.isSafeInteger(rows) && Number.isSafeInteger(rows * columns), 'invalid-input', 'complete algebraic coefficient dimensions');
  ctx.allocate(rows * (columns + 1) + columns + rows);
  const zero = c.fromInteger(ctx, 0n), matrix = Array.from({length: rows}, (_, k) => vectors.slice(1).map(vector => vector[Math.floor(k / (degree + 1))].coefficients[k % (degree + 1)] ?? zero));
  const rhs = Array.from({length: rows}, (_, k) => vectors[0][Math.floor(k / (degree + 1))].coefficients[k % (degree + 1)] ?? zero);
  return Object.freeze({rows, columns, matrix: freezeExactMatrix(ctx, matrix), rhs: Object.freeze(rhs)});
}
export function constructAlgebraicCoefficientSystem<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, target: E, columns: readonly E[]): AlgebraicCoefficientSystem {
  const vectors = coordinates(ctx, curve, [target, ...columns]), f = curve.coordinates.scalar, denominators = curveDenominators(ctx, f.ring, vectors.flatMap(v => v.map(s => s.denominator)));
  const polynomials = cleared(ctx, f, vectors, denominators); let degree = -1;
  for (const row of polynomials) for (const p of row) degree = Math.max(degree, f.ring.degree(ctx, p));
  const result = Object.freeze({denominators, degree, system: system(ctx, curve, polynomials, degree)});
  verifyAlgebraicCoefficientSystem(ctx, curve, target, columns, result); return result;
}
export function verifyAlgebraicCoefficientSystem<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, target: E, columns: readonly E[], proof: AlgebraicCoefficientSystem): void {
  const vectors = coordinates(ctx, curve, [target, ...columns]), f = curve.coordinates.scalar;
  verifyCurveDenominators(ctx, f.ring, vectors.flatMap(v => v.map(s => s.denominator)), proof.denominators);
  const polynomials = cleared(ctx, f, vectors, proof.denominators); let degree = -1;
  for (const row of polynomials) for (const p of row) degree = Math.max(degree, f.ring.degree(ctx, p));
  demand(degree === proof.degree, 'verification-failed', 'algebraic coefficient complete degree coverage');
  const expected = system(ctx, curve, polynomials, degree), actual = proof.system, c = curve.coordinates.constantOwner;
  demand(actual.rows === expected.rows && actual.columns === expected.columns && actual.matrix.length === expected.rows && actual.rhs.length === expected.rows,
    'verification-failed', 'algebraic coefficient matrix dimensions');
  for (let i = 0; i < expected.rows; i++) demand(actual.matrix[i].length === expected.columns && actual.matrix[i].every((v, j) => c.equal(ctx, v, expected.matrix[i][j]))
    && c.equal(ctx, actual.rhs[i], expected.rhs[i]), 'verification-failed', 'algebraic coefficient exact matrix mapping');
}
export function combineAlgebraicConstantColumns<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, coefficients: readonly CurveConstant[], columns: readonly E[]): E {
  demand(coefficients.length === columns.length, 'verification-failed', 'algebraic constant family mapping dimensions'); let value = curve.owner.fromInteger(ctx, 0n);
  for (let i = 0; i < columns.length; i++) value = curve.owner.add(ctx, value, curve.owner.multiply(ctx, columns[i], curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, coefficients[i]))));
  return value;
}
