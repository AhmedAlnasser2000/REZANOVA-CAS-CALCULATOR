import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';

export interface LinearSystem<E> {
  readonly rows: number;
  readonly columns: number;
  readonly matrix: readonly (readonly E[])[];
  readonly rhs: readonly E[];
}
export type RowOperation<E> =
  | { readonly kind: 'swap'; readonly target: number; readonly source: number }
  | { readonly kind: 'scale'; readonly target: number; readonly factor: E }
  | { readonly kind: 'add'; readonly target: number; readonly source: number; readonly factor: E };
interface EliminationEvidence<E> {
  readonly operations: readonly RowOperation<E>[];
  readonly reduced: readonly (readonly E[])[];
  readonly rank: number;
  readonly pivots: readonly number[];
}
export type LinearSolution<E> = EliminationEvidence<E> & (
  | { readonly kind: 'consistent'; readonly particular: readonly E[]; readonly nullspace: readonly (readonly E[])[] }
  | { readonly kind: 'inconsistent'; readonly witness: readonly E[] }
);

function augmented<E>(ctx: ExecutionContext, field: ExactField<E>, system: LinearSystem<E>): E[][] {
  const { rows, columns, matrix, rhs } = system;
  demand(Number.isSafeInteger(rows) && rows >= 0 && Number.isSafeInteger(columns) && columns >= 0,
    'invalid-input', 'matrix dimensions');
  demand(Array.isArray(matrix) && Array.isArray(rhs) && matrix.length === rows && rhs.length === rows,
    'invalid-input', 'matrix row count');
  ctx.allocate(rows * (columns + 1) + rows + columns);
  const out: E[][] = [];
  for (let i = 0; i < rows; i++) {
    ctx.tick();
    demand(Array.isArray(matrix[i]) && matrix[i].length === columns, 'invalid-input', 'matrix column count');
    for (const c of matrix[i]) field.assert(ctx, c);
    field.assert(ctx, rhs[i]); out.push([...matrix[i], rhs[i]]);
  }
  return out;
}
function apply<E>(ctx: ExecutionContext, field: ExactField<E>, rows: E[][], op: RowOperation<E>): void {
  ctx.tick();
  demand(Number.isSafeInteger(op.target) && op.target >= 0 && op.target < rows.length, 'verification-failed', 'row target');
  if (op.kind === 'swap' || op.kind === 'add') demand(Number.isSafeInteger(op.source) && op.source >= 0 && op.source < rows.length && op.source !== op.target,
    'verification-failed', 'row source');
  if (op.kind === 'swap') { [rows[op.target], rows[op.source]] = [rows[op.source], rows[op.target]]; return; }
  demand(op.kind === 'scale' || op.kind === 'add', 'verification-failed', 'row operation kind');
  field.assert(ctx, op.factor);
  if (op.kind === 'scale') demand(!field.isZero(ctx, op.factor), 'verification-failed', 'noninvertible row scaling');
  for (let j = 0; j < rows[op.target].length; j++) {
    ctx.tick();
    rows[op.target][j] = op.kind === 'scale' ? field.multiply(ctx, rows[op.target][j], op.factor)
      : field.add(ctx, rows[op.target][j], field.multiply(ctx, rows[op.source][j], op.factor));
  }
}
function freezeRows<E>(rows: E[][]): readonly (readonly E[])[] { return Object.freeze(rows.map(row => Object.freeze(row))); }
function dot<E>(ctx: ExecutionContext, field: ExactField<E>, a: readonly E[], b: readonly E[]): E {
  demand(a.length === b.length, 'verification-failed', 'dot dimensions');
  let sum = field.fromInteger(ctx, 0n);
  for (let i = 0; i < a.length; i++) sum = field.add(ctx, sum, field.multiply(ctx, a[i], b[i]));
  return sum;
}

export function verifyLinearSolution<E>(ctx: ExecutionContext, field: ExactField<E>, system: LinearSystem<E>, result: LinearSolution<E>): void {
  const replay = augmented(ctx, field, system), { rows, columns } = system;
  ctx.allocate(result.operations.length + result.pivots.length);
  for (const op of result.operations) apply(ctx, field, replay, op);
  demand(result.reduced.length === rows, 'verification-failed', 'reduced row count');
  demand(Number.isSafeInteger(result.rank) && result.rank >= 0 && result.rank <= Math.min(rows, columns)
    && result.pivots.length === result.rank, 'verification-failed', 'rank');
  const pivots: number[] = [];
  let lastPivot = -1;
  for (let i = 0; i < rows; i++) {
    demand(result.reduced[i].length === columns + 1, 'verification-failed', 'reduced column count');
    for (let j = 0; j <= columns; j++) demand(field.equal(ctx, replay[i][j], result.reduced[i][j]), 'verification-failed', 'row replay');
    let pivot = 0;
    while (pivot < columns && field.isZero(ctx, replay[i][pivot])) pivot++;
    if (pivot === columns) continue;
    demand(i === pivots.length && pivot > lastPivot && field.equal(ctx, replay[i][pivot], field.fromInteger(ctx, 1n)),
      'verification-failed', 'echelon pivot');
    for (let k = 0; k < rows; k++) if (k !== i) demand(field.isZero(ctx, replay[k][pivot]), 'verification-failed', 'pivot column');
    ctx.allocate(1); pivots.push(pivot); lastPivot = pivot;
  }
  demand(pivots.length === result.rank && pivots.every((p, i) => p === result.pivots[i]), 'verification-failed', 'pivot list');
  const contradiction = replay.some((row, i) => i >= pivots.length && !field.isZero(ctx, row[columns]));
  if (result.kind === 'inconsistent') {
    demand(contradiction && result.witness.length === rows, 'verification-failed', 'inconsistency shape');
    for (const v of result.witness) field.assert(ctx, v);
    for (let j = 0; j < columns; j++) {
      let sum = field.fromInteger(ctx, 0n);
      for (let i = 0; i < rows; i++) sum = field.add(ctx, sum, field.multiply(ctx, result.witness[i], system.matrix[i][j]));
      demand(field.isZero(ctx, sum), 'verification-failed', 'witness does not annihilate A');
    }
    demand(!field.isZero(ctx, dot(ctx, field, result.witness, system.rhs)), 'verification-failed', 'witness does not contradict b');
    return;
  }
  demand(result.kind === 'consistent' && !contradiction, 'verification-failed', 'consistency');
  demand(result.particular.length === columns && result.nullspace.length === columns - pivots.length,
    'verification-failed', 'solution dimensions or incomplete nullspace');
  for (const v of result.particular) field.assert(ctx, v);
  ctx.allocate(columns); const free: number[] = [];
  let nextPivot = 0;
  for (let j = 0; j < columns; j++) {
    ctx.tick();
    if (pivots[nextPivot] === j) nextPivot++; else free.push(j);
  }
  // Canonical free-coordinate identity proves independence; rank proves spanning.
  for (let k = 0; k < result.nullspace.length; k++) {
    const vector = result.nullspace[k];
    demand(vector.length === columns, 'verification-failed', 'nullspace dimensions');
    for (const v of vector) field.assert(ctx, v);
    for (let j = 0; j < free.length; j++) demand(field.equal(ctx, vector[free[j]], field.fromInteger(ctx, j === k ? 1n : 0n)),
      'verification-failed', 'nullspace independence');
    for (let i = 0; i < rows; i++) demand(field.isZero(ctx, dot(ctx, field, system.matrix[i], vector)), 'verification-failed', 'nullspace residual');
  }
  for (let i = 0; i < rows; i++) demand(field.equal(ctx, dot(ctx, field, system.matrix[i], result.particular), system.rhs[i]),
    'verification-failed', 'particular residual');
}

export function solveLinearSystem<E>(ctx: ExecutionContext, field: ExactField<E>, system: LinearSystem<E>): LinearSolution<E> {
  const a = augmented(ctx, field, system), { rows, columns } = system;
  const operations: RowOperation<E>[] = [], pivots: number[] = [];
  function perform(op: RowOperation<E>) {
    ctx.allocate(4); apply(ctx, field, a, op); operations.push(Object.freeze(op));
  }
  for (let j = 0; j < columns && pivots.length < rows; j++) {
    ctx.tick(); const rank = pivots.length;
    let row = rank;
    while (row < rows && field.isZero(ctx, a[row][j])) row++;
    if (row === rows) continue;
    if (row !== rank) perform({ kind: 'swap', target: rank, source: row });
    perform({ kind: 'scale', target: rank, factor: field.inverse(ctx, a[rank][j]) });
    for (let i = 0; i < rows; i++) if (i !== rank && !field.isZero(ctx, a[i][j])) {
      perform({ kind: 'add', target: i, source: rank, factor: field.negate(ctx, a[i][j]) });
    }
    ctx.allocate(1); pivots.push(j);
  }
  let bad = -1;
  for (let i = pivots.length; i < rows; i++) if (!field.isZero(ctx, a[i][columns])) { bad = i; break; }
  ctx.allocate(rows + 5);
  const evidence = { operations: Object.freeze(operations), reduced: freezeRows(a), rank: pivots.length, pivots: Object.freeze(pivots) };
  let result: LinearSolution<E>;
  if (bad !== -1) {
    ctx.allocate(rows);
    const witness = Array<E>(rows).fill(field.fromInteger(ctx, 0n)); witness[bad] = field.fromInteger(ctx, 1n);
    // e_bad^T E_last ... E_first; replay the elementary transforms backwards.
    for (let k = operations.length - 1; k >= 0; k--) {
      ctx.tick(); const op = operations[k];
      if (op.kind === 'swap') [witness[op.target], witness[op.source]] = [witness[op.source], witness[op.target]];
      else if (op.kind === 'scale') witness[op.target] = field.multiply(ctx, witness[op.target], op.factor);
      else witness[op.source] = field.add(ctx, witness[op.source], field.multiply(ctx, witness[op.target], op.factor));
    }
    result = Object.freeze({ ...evidence, kind: 'inconsistent', witness: Object.freeze(witness) });
  } else {
    ctx.allocate(columns + (columns - pivots.length) * (columns + 1));
    const zero = field.fromInteger(ctx, 0n), one = field.fromInteger(ctx, 1n);
    const particular = Array<E>(columns).fill(zero), nullspace: E[][] = [];
    for (let i = 0; i < pivots.length; i++) particular[pivots[i]] = a[i][columns];
    let nextPivot = 0;
    for (let j = 0; j < columns; j++) {
      ctx.tick();
      if (pivots[nextPivot] === j) { nextPivot++; continue; }
      const vector = Array<E>(columns).fill(zero); vector[j] = one;
      for (let i = 0; i < pivots.length; i++) vector[pivots[i]] = field.negate(ctx, a[i][j]);
      nullspace.push(vector);
    }
    result = Object.freeze({ ...evidence, kind: 'consistent', particular: Object.freeze(particular), nullspace: freezeRows(nullspace) });
  }
  verifyLinearSolution(ctx, field, system, result); return result;
}
