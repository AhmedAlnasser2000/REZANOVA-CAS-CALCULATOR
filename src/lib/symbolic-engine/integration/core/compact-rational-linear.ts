/** Exact rank-block/kernel certificates, separate from legacy Gauss–Jordan
 * transcripts. Solving uses fraction-free rank selection and Dixon inversion. */
import {demand, type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {integerGcd, type Rational} from './rational';
import type {LinearSystem} from './linear-system';
import {matrixAllocation, freezeExactMatrix, type ExactMatrix} from './arithmetic-matrix';
import {invertRationalBlockPadicWithin} from './rational-padic-matrix';

interface RankEvidence {
  readonly method: 'rank-block-kernel'; readonly input: LinearSystem<Rational>;
  readonly rank: number; readonly independentRows: readonly number[]; readonly pivots: readonly number[];
  readonly inverse: ExactMatrix<Rational>; readonly nullspace: ExactMatrix<Rational>;
}
export type CompactRationalLinearSolution = Readonly<RankEvidence & (
  {kind: 'consistent'; particular: readonly Rational[]} | {kind: 'inconsistent'; witness: readonly Rational[]}
)>;
function validate(ctx: ExecutionContext, input: LinearSystem<Rational>): void {
  matrixAllocation(ctx, input.rows, input.columns); ctx.allocate(input.rows);
  demand(Array.isArray(input.matrix) && input.matrix.length === input.rows && Array.isArray(input.rhs) && input.rhs.length === input.rows, 'invalid-input', 'compact linear row coverage');
  for (let i = 0; i < input.rows; i++) {
    demand(Array.isArray(input.matrix[i]) && input.matrix[i].length === input.columns, 'invalid-input', 'compact linear column coverage');
    for (const q of input.matrix[i]) Q.assert(ctx, q); Q.assert(ctx, input.rhs[i]);
  }
}
function dot(ctx: ExecutionContext, a: readonly Rational[], b: readonly Rational[]): Rational {
  demand(a.length === b.length, 'verification-failed', 'compact exact dot coverage'); let sum = Q.fromInteger(ctx, 0n);
  for (let i = 0; i < a.length; i++) sum = Q.add(ctx, sum, Q.multiply(ctx, a[i], b[i])); return sum;
}
function freeCoordinates(ctx: ExecutionContext, columns: number, pivots: readonly number[]): readonly number[] {
  ctx.allocate(columns); const free: number[] = []; let index = 0;
  for (let j = 0; j < columns; j++) {ctx.tick(); if (pivots[index] === j) index++; else free.push(j);}
  return Object.freeze(free);
}
function rankSelection(ctx: ExecutionContext, input: LinearSystem<Rational>): {rows: readonly number[]; pivots: readonly number[]} {
  const {rows: m, columns: n} = input; matrixAllocation(ctx, m, n); ctx.allocate(m + n);
  const a = input.matrix.map(row => {
    let denominator = 1n;
    for (const q of row) denominator = ctx.multiply(ctx.quotient(denominator, integerGcd(ctx, denominator, q.denominator)), q.denominator);
    return row.map(q => ctx.multiply(q.numerator, ctx.quotient(denominator, q.denominator)));
  });
  ctx.tick(m); const rows = Array.from({length: m}, (_, i) => i), pivots: number[] = []; let previous = 1n;
  for (let j = 0; j < n && pivots.length < m; j++) {
    const rank = pivots.length; let row = rank;
    while (row < m && a[row][j] === 0n) {ctx.tick(); row++;}
    if (row === m) continue;
    if (row !== rank) {[a[row], a[rank]] = [a[rank], a[row]]; [rows[row], rows[rank]] = [rows[rank], rows[row]];}
    const pivot = a[rank][j];
    for (let i = rank + 1; i < m; i++) {
      const factor = a[i][j];
      for (let k = j + 1; k < n; k++) {
        const value = ctx.add(ctx.multiply(pivot, a[i][k]), -ctx.multiply(factor, a[rank][k]));
        demand(ctx.remainder(value, previous) === 0n, 'verification-failed', 'Bareiss exact division'); a[i][k] = ctx.quotient(value, previous);
      }
      a[i][j] = 0n;
    }
    ctx.allocate(1); pivots.push(j); previous = pivot;
  }
  ctx.allocate(pivots.length); return {rows: Object.freeze(rows.slice(0, pivots.length)), pivots: Object.freeze(pivots)};
}
export function verifyCompactRationalLinearSystemWithin(ctx: ExecutionContext, input: LinearSystem<Rational>, proof: CompactRationalLinearSolution): void {
  validate(ctx, input); validate(ctx, proof.input); const {rows: m, columns: n} = input, r = proof.rank;
  demand(proof.method === 'rank-block-kernel' && proof.input.rows === m && proof.input.columns === n
    && input.matrix.every((row, i) => row.every((q, j) => Q.equal(ctx, q, proof.input.matrix[i][j]))) && input.rhs.every((q, i) => Q.equal(ctx, q, proof.input.rhs[i])), 'verification-failed', 'compact explicit original linear request');
  demand(Number.isSafeInteger(r) && r >= 0 && r <= Math.min(m, n) && proof.independentRows.length === r && proof.pivots.length === r && proof.inverse.length === r, 'verification-failed', 'compact rank block dimensions');
  ctx.allocate(r + n); const seen = new Set<number>();
  for (let i = 0; i < r; i++) {
    const row = proof.independentRows[i], column = proof.pivots[i];
    demand(Number.isSafeInteger(row) && row >= 0 && row < m && !seen.has(row) && Number.isSafeInteger(column) && column >= 0 && column < n && (i === 0 || column > proof.pivots[i - 1]), 'verification-failed', 'compact exact distinct rank indices'); seen.add(row);
    demand(proof.inverse[i].length === r, 'verification-failed', 'compact square inverse coverage'); for (const q of proof.inverse[i]) Q.assert(ctx, q);
  }
  for (let i = 0; i < r; i++) for (let j = 0; j < r; j++) {
    let sum = Q.fromInteger(ctx, 0n);
    for (let k = 0; k < r; k++) sum = Q.add(ctx, sum, Q.multiply(ctx, input.matrix[proof.independentRows[i]][proof.pivots[k]], proof.inverse[k][j]));
    demand(Q.equal(ctx, sum, Q.fromInteger(ctx, i === j ? 1n : 0n)), 'verification-failed', 'compact nonsingular rank block');
  }
  const free = freeCoordinates(ctx, n, proof.pivots);
  demand(proof.nullspace.length === n - r, 'verification-failed', 'compact complete nullspace count');
  for (let i = 0; i < free.length; i++) {
    const vector = proof.nullspace[i]; demand(vector.length === n, 'verification-failed', 'compact kernel vector dimensions'); for (const q of vector) Q.assert(ctx, q);
    for (let j = 0; j < free.length; j++) demand(Q.equal(ctx, vector[free[j]], Q.fromInteger(ctx, i === j ? 1n : 0n)), 'verification-failed', 'compact kernel independence');
    for (const row of input.matrix) demand(Q.isZero(ctx, dot(ctx, row, vector)), 'verification-failed', 'compact complete kernel annihilation');
  }
  if (proof.kind === 'consistent') {
    demand(proof.particular.length === n, 'verification-failed', 'compact particular coverage'); for (const q of proof.particular) Q.assert(ctx, q);
    for (const j of free) demand(Q.isZero(ctx, proof.particular[j]), 'verification-failed', 'compact canonical representative');
    for (let i = 0; i < m; i++) demand(Q.equal(ctx, dot(ctx, input.matrix[i], proof.particular), input.rhs[i]), 'verification-failed', 'compact exact particular identity');
  } else {
    demand(proof.kind === 'inconsistent' && proof.witness.length === m, 'verification-failed', 'compact inconsistency coverage'); for (const q of proof.witness) Q.assert(ctx, q);
    for (let j = 0; j < n; j++) {
      let sum = Q.fromInteger(ctx, 0n); for (let i = 0; i < m; i++) sum = Q.add(ctx, sum, Q.multiply(ctx, proof.witness[i], input.matrix[i][j]));
      demand(Q.isZero(ctx, sum), 'verification-failed', 'compact inconsistency annihilation');
    }
    demand(!Q.isZero(ctx, dot(ctx, proof.witness, input.rhs)), 'verification-failed', 'compact terminal rational inconsistency');
  }
}
export function solveCompactRationalLinearSystemWithin(ctx: ExecutionContext, input: LinearSystem<Rational>): CompactRationalLinearSolution {
  validate(ctx, input); const {rows, pivots} = rankSelection(ctx, input), r = pivots.length, n = input.columns, m = input.rows;
  matrixAllocation(ctx, r, r); const block = freezeExactMatrix(ctx, rows.map(i => pivots.map(j => input.matrix[i][j]))), inverse = invertRationalBlockPadicWithin(ctx, block);
  const free = freeCoordinates(ctx, n, pivots);
  matrixAllocation(ctx, free.length, n); const zero = Q.fromInteger(ctx, 0n), one = Q.fromInteger(ctx, 1n);
  const nullspace = freezeExactMatrix(ctx, free.map(j => {
    const vector = Array<Rational>(n).fill(zero); vector[j] = one; ctx.allocate(r); const column = rows.map(i => input.matrix[i][j]);
    for (let i = 0; i < r; i++) vector[pivots[i]] = Q.negate(ctx, dot(ctx, inverse[i], column)); return vector;
  }));
  ctx.allocate(n + r); const particular = Array<Rational>(n).fill(zero), rhs = rows.map(i => input.rhs[i]);
  for (let i = 0; i < r; i++) particular[pivots[i]] = dot(ctx, inverse[i], rhs);
  const bad = input.matrix.findIndex((row, i) => !Q.equal(ctx, dot(ctx, row, particular), input.rhs[i]));
  matrixAllocation(ctx, m, n); ctx.allocate(m + 9);
  const nativeInput = Object.freeze({rows: m, columns: n, matrix: freezeExactMatrix(ctx, input.matrix.map(row => [...row])), rhs: Object.freeze([...input.rhs])});
  const common = {method: 'rank-block-kernel' as const, input: nativeInput, rank: r, independentRows: rows, pivots, inverse, nullspace};
  let proof: CompactRationalLinearSolution;
  if (bad === -1) proof = Object.freeze({...common, kind: 'consistent', particular: Object.freeze(particular)});
  else {
    ctx.allocate(m); const witness = Array<Rational>(m).fill(zero); witness[bad] = one;
    for (let j = 0; j < r; j++) {
      let coefficient = zero; for (let k = 0; k < r; k++) coefficient = Q.add(ctx, coefficient, Q.multiply(ctx, input.matrix[bad][pivots[k]], inverse[k][j]));
      witness[rows[j]] = Q.subtract(ctx, witness[rows[j]], coefficient);
    }
    proof = Object.freeze({...common, kind: 'inconsistent', witness: Object.freeze(witness)});
  }
  verifyCompactRationalLinearSystemWithin(ctx, input, proof); return proof;
}
export function solveCompactRationalLinearSystem(ctx: ExecutionContext, input: LinearSystem<Rational>): CompactRationalLinearSolution {
  return ctx.operation(() => solveCompactRationalLinearSystemWithin(ctx, input));
}
export function verifyCompactRationalLinearSystem(ctx: ExecutionContext, input: LinearSystem<Rational>, proof: CompactRationalLinearSolution): void {
  ctx.operation(() => verifyCompactRationalLinearSystemWithin(ctx, input, proof));
}
