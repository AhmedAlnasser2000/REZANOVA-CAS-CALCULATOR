import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { Polynomial } from './polynomial';
import { polynomialDivide, exactDivide } from './polynomial-division';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution } from './linear-system';
import type { AlgebraicElement } from './algebraic-field';
import { modelBase, type AlgebraicOrder } from './algebraic-order';
import { polynomialDenominators, verifyPolynomialDenominators, reciprocalScalar, type PolynomialDenominatorEvidence, type AlgebraicIntegralModel } from './algebraic-integral-model';
import { freezeExactMatrix, multiplyExactMatrices, invertExactMatrix, verifyExactMatrixInverse, equalExactMatrices, type MatrixInverse, type ExactMatrix } from './algebraic-matrix';
import type { FunctionScalar } from './algebraic-presentation';
import type { AlgebraicField } from './algebraic-field';

export interface AlgebraicConstantSpace {
  readonly finiteInverse: MatrixInverse<FunctionScalar>;
  readonly transition: MatrixInverse<FunctionScalar>;
  readonly degrees: readonly number[];
  readonly denominators: readonly PolynomialDenominatorEvidence[];
  readonly elimination: LinearSolution<Rational>;
  readonly vectors: readonly (readonly Polynomial<Rational>[])[];
  readonly basis: readonly AlgebraicElement<FunctionScalar>[];
}
/** Both order bases in the unchanged theta presentation. Scaling and reciprocal
 * substitution are checked field operations, not new source restrictions. */
export function commonOrderMatrix(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, model: AlgebraicIntegralModel, order: AlgebraicOrder) {
  const f = presentation.parent as ReturnType<typeof modelBase>, local = modelBase(model), n = order.basis.length;
  const scaleLocal = local.make(ctx, model.denominators.common, local.ring.one(ctx));
  const scale = model.infinity ? reciprocalScalar(ctx, f, scaleLocal) : scaleLocal; let power = f.fromInteger(ctx, 1n); ctx.allocate(n * n);
  return freezeExactMatrix(ctx, order.basis.map((row, i) => {
    const result = row.map(value => f.multiply(ctx, model.infinity ? reciprocalScalar(ctx, f, value) : value, power));
    if (i < n - 1) power = f.multiply(ctx, power, scale); return result;
  }));
}
function degreeBounds(ctx: ExecutionContext, transition: ExactMatrix<FunctionScalar>): readonly number[] {
  ctx.allocate(transition.length);
  return Object.freeze(transition.map(row => {
    let bound = -1;
    for (const a of row) {
      a.field.assert(ctx, a); if (a.numerator.coefficients.length) bound = Math.max(bound, a.numerator.coefficients.length - a.denominator.coefficients.length);
    }
    ctx.degree(bound); return bound;
  }));
}
function infinityColumns(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, infinity: AlgebraicIntegralModel,
  inverse: ExactMatrix<FunctionScalar>, degrees: readonly number[]) {
  const f = presentation.parent as ReturnType<typeof modelBase>, u = modelBase(infinity), n = inverse.length;
  const count = degrees.reduce((sum, d) => sum + d + 1, 0); demand(Number.isSafeInteger(count), 'invalid-input', 'constant-space dimensions'); ctx.allocate(n * count);
  const rows: FunctionScalar[][] = Array.from({length: n}, () => []);
  for (let i = 0; i < n; i++) {
    let power = f.fromInteger(ctx, 1n); const x = f.make(ctx, f.ring.make(ctx, [Q.fromInteger(ctx, 0n), Q.fromInteger(ctx, 1n)]), f.ring.one(ctx));
    for (let k = 0; k <= degrees[i]; k++) {
      for (let j = 0; j < n; j++) rows[j].push(reciprocalScalar(ctx, u, f.multiply(ctx, inverse[j][i], power)));
      if (k < degrees[i]) power = f.multiply(ctx, power, x);
    }
  }
  return freezeExactMatrix(ctx, rows);
}
function intersectionSystem(ctx: ExecutionContext, infinity: AlgebraicIntegralModel, columns: ExactMatrix<FunctionScalar>, denominators: readonly PolynomialDenominatorEvidence[], count: number) {
  const r = modelBase(infinity).ring; ctx.allocate(columns.length * count); const rows: Rational[][] = [];
  demand(denominators.length === columns.length, 'verification-failed', 'intersection denominator coverage');
  for (let i = 0; i < columns.length; i++) {
    verifyPolynomialDenominators(ctx, r, columns[i].map(c => c.denominator), denominators[i]); const d = denominators[i].common;
    const remainders = columns[i].map(c => polynomialDivide(ctx, r, r.multiply(ctx, c.numerator, exactDivide(ctx, r, d, c.denominator)), d).remainder);
    ctx.allocate(Math.max(0, r.degree(ctx, d)) * count);
    for (let k = 0; k < r.degree(ctx, d); k++) rows.push(remainders.map(p => p.coefficients[k] ?? Q.fromInteger(ctx, 0n)));
  }
  return Object.freeze({rows: rows.length, columns: count, matrix: freezeExactMatrix(ctx, rows), rhs: Object.freeze(Array(rows.length).fill(Q.fromInteger(ctx, 0n)) as Rational[])});
}
function intersectionVectors(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, degrees: readonly number[], elimination: LinearSolution<Rational>) {
  demand(elimination.kind === 'consistent', 'verification-failed', 'homogeneous order intersection');
  const r = (presentation.parent as ReturnType<typeof modelBase>).ring; ctx.allocate(elimination.nullspace.length * degrees.length);
  return Object.freeze(elimination.nullspace.map(vector => {
    let offset = 0; return Object.freeze(degrees.map(d => { ctx.allocate(d + 1); const p = r.make(ctx, vector.slice(offset, offset + d + 1)); offset += d + 1; return p; }));
  }));
}
function intersectionBasis(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, matrix: ExactMatrix<FunctionScalar>, vectors: readonly (readonly Polynomial<Rational>[])[]) {
  const f = presentation.parent as ReturnType<typeof modelBase>, n = matrix.length; ctx.allocate(vectors.length * n);
  return Object.freeze(vectors.map(vector => presentation.make(ctx, presentation.ring.make(ctx, matrix.map(row => {
    let sum = f.fromInteger(ctx, 0n);
    for (let i = 0; i < n; i++) sum = f.add(ctx, sum, f.multiply(ctx, row[i], f.make(ctx, vector[i], f.ring.one(ctx)))); return sum;
  })))));
}
export function algebraicConstantSpaceWithin(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, finite: AlgebraicIntegralModel,
  finiteOrder: AlgebraicOrder, infinity: AlgebraicIntegralModel, infinityOrder: AlgebraicOrder): AlgebraicConstantSpace {
  const f = presentation.parent as ReturnType<typeof modelBase>, n = finiteOrder.basis.length;
  const finiteMatrix = commonOrderMatrix(ctx, presentation, finite, finiteOrder), infinityMatrix = commonOrderMatrix(ctx, presentation, infinity, infinityOrder);
  const finiteInverse = invertExactMatrix(ctx, f, finiteMatrix); demand(finiteInverse !== null, 'verification-failed', 'finite order correspondence');
  const matrix = multiplyExactMatrices(ctx, f, finiteInverse.inverse, infinityMatrix, n), transition = invertExactMatrix(ctx, f, matrix);
  demand(transition !== null, 'verification-failed', 'infinity order correspondence');
  const degrees = degreeBounds(ctx, matrix), columns = infinityColumns(ctx, presentation, infinity, transition.inverse, degrees);
  const denominators = Object.freeze(columns.map(row => polynomialDenominators(ctx, modelBase(infinity).ring, row.map(c => c.denominator))));
  const count = degrees.reduce((sum, d) => sum + d + 1, 0), elimination = solveLinearSystem(ctx, Q, intersectionSystem(ctx, infinity, columns, denominators, count));
  const vectors = intersectionVectors(ctx, presentation, degrees, elimination), basis = intersectionBasis(ctx, presentation, finiteMatrix, vectors);
  const proof = Object.freeze({finiteInverse, transition, degrees, denominators, elimination, vectors, basis});
  verifyAlgebraicConstantSpaceWithin(ctx, presentation, finite, finiteOrder, infinity, infinityOrder, proof); return proof;
}
export function verifyAlgebraicConstantSpaceWithin(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, finite: AlgebraicIntegralModel,
  finiteOrder: AlgebraicOrder, infinity: AlgebraicIntegralModel, infinityOrder: AlgebraicOrder, proof: AlgebraicConstantSpace): void {
  const f = presentation.parent as ReturnType<typeof modelBase>, n = finiteOrder.basis.length;
  const finiteMatrix = commonOrderMatrix(ctx, presentation, finite, finiteOrder), infinityMatrix = commonOrderMatrix(ctx, presentation, infinity, infinityOrder);
  verifyExactMatrixInverse(ctx, f, finiteMatrix, proof.finiteInverse);
  const matrix = multiplyExactMatrices(ctx, f, proof.finiteInverse.inverse, infinityMatrix, n); verifyExactMatrixInverse(ctx, f, matrix, proof.transition);
  const degrees = degreeBounds(ctx, matrix);
  demand(proof.degrees.length === n && proof.degrees.every((d, i) => d === degrees[i]), 'verification-failed', 'complete infinity coefficient bounds');
  const columns = infinityColumns(ctx, presentation, infinity, proof.transition.inverse, degrees), count = degrees.reduce((sum, d) => sum + d + 1, 0);
  verifyLinearSolution(ctx, Q, intersectionSystem(ctx, infinity, columns, proof.denominators, count), proof.elimination);
  const vectors = intersectionVectors(ctx, presentation, degrees, proof.elimination), basis = intersectionBasis(ctx, presentation, finiteMatrix, vectors);
  demand(equalExactMatrices(ctx, f.ring, proof.vectors, vectors) && proof.basis.length === basis.length, 'verification-failed', 'intersection kernel mapping');
  for (let i = 0; i < basis.length; i++) demand(presentation.equal(ctx, proof.basis[i], basis[i]), 'verification-failed', 'constant-space correspondence');
}
