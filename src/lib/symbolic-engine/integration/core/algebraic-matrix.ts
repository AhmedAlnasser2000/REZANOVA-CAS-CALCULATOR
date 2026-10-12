import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution } from './linear-system';

export type ExactMatrix<E> = readonly (readonly E[])[];
export interface MatrixInverse<E> {
  readonly matrix: ExactMatrix<E>;
  readonly inverse: ExactMatrix<E>;
  readonly columns: readonly LinearSolution<E>[];
}
export function matrixAllocation(ctx: ExecutionContext, rows: number, columns: number) {
  demand(Number.isSafeInteger(rows) && rows >= 0 && Number.isSafeInteger(columns) && columns >= 0
    && Number.isSafeInteger(rows * columns), 'invalid-input', 'algebraic matrix dimensions');
  ctx.allocate(rows * columns + rows + columns);
}
export function freezeExactMatrix<E>(ctx: ExecutionContext, rows: E[][]): ExactMatrix<E> {
  ctx.allocate(rows.length); return Object.freeze(rows.map(r => Object.freeze(r)));
}
export function transposeExactMatrix<E>(ctx: ExecutionContext, rows: ExactMatrix<E>, columns: number): ExactMatrix<E> {
  matrixAllocation(ctx, rows.length, columns);
  for (const row of rows) demand(row.length === columns, 'verification-failed', 'matrix transpose dimensions');
  return freezeExactMatrix(ctx, Array.from({length: columns}, (_, j) => rows.map(row => row[j])));
}
export function multiplyExactMatrices<E>(ctx: ExecutionContext, f: ExactField<E>, a: ExactMatrix<E>, b: ExactMatrix<E>, columns: number): ExactMatrix<E> {
  matrixAllocation(ctx, a.length, columns);
  for (const row of a) demand(row.length === b.length, 'verification-failed', 'matrix product dimensions');
  for (const row of b) demand(row.length === columns, 'verification-failed', 'matrix product row');
  return freezeExactMatrix(ctx, a.map(row => Array.from({length: columns}, (_, j) => {
    let sum = f.fromInteger(ctx, 0n);
    for (let k = 0; k < row.length; k++) sum = f.add(ctx, sum, f.multiply(ctx, row[k], b[k][j])); return sum;
  })));
}
export function equalExactMatrices<E>(ctx: ExecutionContext, f: Pick<ExactField<E>, 'equal'>, a: ExactMatrix<E>, b: ExactMatrix<E>): boolean {
  return a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((v, j) => f.equal(ctx, v, b[i][j])));
}
function inverseSystem<E>(ctx: ExecutionContext, f: ExactField<E>, matrix: ExactMatrix<E>, column: number) {
  const n = matrix.length; matrixAllocation(ctx, n, n);
  for (const row of matrix) { demand(row.length === n, 'invalid-input', 'inverse square matrix'); for (const a of row) f.assert(ctx, a); }
  return Object.freeze({rows: n, columns: n, matrix, rhs: Object.freeze(Array.from({length: n}, (_, i) => f.fromInteger(ctx, i === column ? 1n : 0n)))});
}
export function invertExactMatrix<E>(ctx: ExecutionContext, f: ExactField<E>, matrix: ExactMatrix<E>): MatrixInverse<E> | null {
  ctx.allocate(matrix.length); const columns: LinearSolution<E>[] = [];
  for (let j = 0; j < matrix.length; j++) {
    const result = solveLinearSystem(ctx, f, inverseSystem(ctx, f, matrix, j));
    if (result.kind !== 'consistent' || result.rank !== matrix.length) return null;
    columns.push(result);
  }
  const inverse = transposeExactMatrix(ctx, columns.map(c => c.kind === 'consistent' ? c.particular : []), matrix.length);
  const proof = Object.freeze({matrix, inverse, columns: Object.freeze(columns)}); verifyExactMatrixInverse(ctx, f, matrix, proof); return proof;
}
export function verifyExactMatrixInverse<E>(ctx: ExecutionContext, f: ExactField<E>, matrix: ExactMatrix<E>, proof: MatrixInverse<E>): void {
  const n = matrix.length;
  demand(equalExactMatrices(ctx, f, matrix, proof.matrix) && proof.columns.length === n && proof.inverse.length === n,
    'verification-failed', 'matrix inverse coverage');
  for (let j = 0; j < n; j++) {
    verifyLinearSolution(ctx, f, inverseSystem(ctx, f, matrix, j), proof.columns[j]); const c = proof.columns[j];
    demand(c.kind === 'consistent' && c.rank === n && c.nullspace.length === 0, 'verification-failed', 'inverse rank');
    for (let i = 0; i < n; i++) demand(proof.inverse[i].length === n && f.equal(ctx, proof.inverse[i][j], c.particular[i]), 'verification-failed', 'inverse column');
  }
}
export function determinantFromInverse<E>(ctx: ExecutionContext, f: ExactField<E>, proof: MatrixInverse<E>): E {
  if (proof.matrix.length === 0) return f.fromInteger(ctx, 1n);
  let value = f.fromInteger(ctx, 1n);
  for (const op of proof.columns[0].operations) {
    if (op.kind === 'swap') value = f.negate(ctx, value);
    else if (op.kind === 'scale') value = f.exactDivide(ctx, value, op.factor);
  }
  return value;
}
