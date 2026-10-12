import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { polynomialDivide } from './polynomial-division';

export type PolynomialMatrix<E> = readonly (readonly Polynomial<E>[])[];
export type PolynomialModuleOperation<E> = Readonly<
  {kind: 'swap'; target: number; source: number} |
  {kind: 'add'; target: number; source: number; factor: Polynomial<E>} |
  {kind: 'scale'; target: number; factor: E}>;
export interface PolynomialModuleEvidence<E> {
  readonly input: PolynomialMatrix<E>;
  readonly columns: number;
  readonly operations: readonly PolynomialModuleOperation<E>[];
  readonly reduced: PolynomialMatrix<E>;
  readonly transformation: PolynomialMatrix<E>;
  readonly pivots: readonly number[];
}
function dimensions(ctx: ExecutionContext, rows: number, columns: number): void {
  demand(Number.isSafeInteger(rows) && rows >= 0 && Number.isSafeInteger(columns) && columns >= 0
    && Number.isSafeInteger(rows * (rows + columns)), 'invalid-input', 'polynomial module dimensions');
  ctx.allocate(rows * (rows + columns) + rows * 2 + columns);
}
function copy<E>(ctx: ExecutionContext, r: PolynomialRing<E>, matrix: PolynomialMatrix<E>, columns: number) {
  dimensions(ctx, matrix.length, columns);
  return matrix.map(row => {
    demand(row.length === columns, 'invalid-input', 'polynomial module row');
    for (const p of row) r.assert(ctx, p); return [...row];
  });
}
export function freezePolynomialMatrix<E>(ctx: ExecutionContext, matrix: Polynomial<E>[][]): PolynomialMatrix<E> {
  ctx.allocate(matrix.length); return Object.freeze(matrix.map(row => Object.freeze(row)));
}
function identity<E>(ctx: ExecutionContext, r: PolynomialRing<E>, n: number) {
  return Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? r.one(ctx) : r.zero(ctx)));
}
function apply<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>[][], op: PolynomialModuleOperation<E>) {
  demand(Number.isSafeInteger(op.target) && op.target >= 0 && op.target < a.length,
    'verification-failed', 'module row target');
  if (op.kind === 'swap' || op.kind === 'add') demand(Number.isSafeInteger(op.source) && op.source >= 0
    && op.source < a.length && op.target !== op.source, 'verification-failed', 'module row source');
  if (op.kind === 'swap') { [a[op.target], a[op.source]] = [a[op.source], a[op.target]]; return; }
  if (op.kind === 'scale') {
    r.domain.assert(ctx, op.factor); demand(!r.domain.isZero(ctx, op.factor), 'verification-failed', 'module nonunit scaling');
  } else { demand(op.kind === 'add', 'verification-failed', 'module operation'); r.assert(ctx, op.factor); }
  for (let j = 0; j < a[op.target].length; j++) {
    ctx.tick(); a[op.target][j] = op.kind === 'scale' ? r.scale(ctx, a[op.target][j], op.factor)
      : r.add(ctx, a[op.target][j], r.multiply(ctx, op.factor, a[op.source][j]));
  }
}
/** Row Hermite form over the PID E[x]. Every operation is unimodular;
 * its zero rows therefore give the complete polynomial left kernel. */
export function polynomialModuleHermite<E>(ctx: ExecutionContext, r: PolynomialRing<E, ExactField<E>>,
  input: PolynomialMatrix<E>, columns: number): PolynomialModuleEvidence<E> {
  const a = copy(ctx, r, input, columns), u = identity(ctx, r, a.length), operations: PolynomialModuleOperation<E>[] = [], pivots: number[] = [];
  const perform = (op: PolynomialModuleOperation<E>) => {
    ctx.allocate(4); apply(ctx, r, a, op); apply(ctx, r, u, op); operations.push(Object.freeze(op));
  };
  for (let j = 0; j < columns && pivots.length < a.length; j++) {
    const k = pivots.length; let i = k;
    while (i < a.length && r.isZero(ctx, a[i][j])) { ctx.tick(); i++; }
    if (i === a.length) continue;
    if (i !== k) perform({kind: 'swap', target: k, source: i});
    for (i = k + 1; i < a.length; i++) {
      while (!r.isZero(ctx, a[i][j])) {
        const oldDegree = r.degree(ctx, a[k][j]), division = polynomialDivide(ctx, r, a[i][j], a[k][j]);
        perform({kind: 'add', target: i, source: k, factor: r.negate(ctx, division.quotient)});
        if (!r.isZero(ctx, a[i][j])) {
          demand(r.degree(ctx, a[i][j]) < oldDegree, 'verification-failed', 'module Euclidean progress');
          perform({kind: 'swap', target: k, source: i});
        }
      }
    }
    perform({kind: 'scale', target: k, factor: r.domain.inverse(ctx, r.leading(ctx, a[k][j]))});
    for (i = 0; i < k; i++) {
      const q = polynomialDivide(ctx, r, a[i][j], a[k][j]).quotient;
      if (!r.isZero(ctx, q)) perform({kind: 'add', target: i, source: k, factor: r.negate(ctx, q)});
    }
    ctx.allocate(1); pivots.push(j);
  }
  const result = Object.freeze({input: freezePolynomialMatrix(ctx, copy(ctx, r, input, columns)), columns,
    operations: Object.freeze(operations), reduced: freezePolynomialMatrix(ctx, a), transformation: freezePolynomialMatrix(ctx, u), pivots: Object.freeze(pivots)});
  verifyPolynomialModuleHermite(ctx, r, input, columns, result); return result;
}
export function verifyPolynomialModuleHermite<E>(ctx: ExecutionContext, r: PolynomialRing<E, ExactField<E>>,
  input: PolynomialMatrix<E>, columns: number, proof: PolynomialModuleEvidence<E>): void {
  const a = copy(ctx, r, input, columns), u = identity(ctx, r, a.length);
  demand(proof.columns === columns && proof.input.length === input.length && proof.reduced.length === a.length
    && proof.transformation.length === a.length && proof.pivots.length <= Math.min(a.length, columns),
  'verification-failed', 'module evidence dimensions');
  for (const op of proof.operations) { ctx.tick(); apply(ctx, r, a, op); apply(ctx, r, u, op); }
  for (let i = 0; i < a.length; i++) {
    demand(proof.input[i].length === columns && proof.reduced[i].length === columns
      && proof.transformation[i].length === a.length, 'verification-failed', 'module evidence row');
    for (let j = 0; j < columns; j++) demand(r.equal(ctx, proof.input[i][j], input[i][j])
      && r.equal(ctx, proof.reduced[i][j], a[i][j]), 'verification-failed', 'module row replay');
    for (let j = 0; j < a.length; j++) demand(r.equal(ctx, u[i][j], proof.transformation[i][j]), 'verification-failed', 'module unimodular replay');
    let pivot = 0; while (pivot < columns && r.isZero(ctx, a[i][pivot])) pivot++;
    if (i >= proof.pivots.length) demand(pivot === columns, 'verification-failed', 'module missing pivot coverage');
    else {
      demand(pivot === proof.pivots[i] && (i === 0 || pivot > proof.pivots[i - 1])
        && r.domain.equal(ctx, r.leading(ctx, a[i][pivot]), r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'module Hermite pivot');
      for (let k = 0; k < i; k++) demand(r.degree(ctx, a[k][pivot]) < r.degree(ctx, a[i][pivot]), 'verification-failed', 'module pivot residue');
    }
  }
}
/** Membership is exact polynomial division in the complete Hermite basis. */
export function polynomialModuleCoordinates<E>(ctx: ExecutionContext, r: PolynomialRing<E, ExactField<E>>,
  proof: PolynomialModuleEvidence<E>, value: readonly Polynomial<E>[]): readonly Polynomial<E>[] | null {
  verifyPolynomialModuleHermite(ctx, r, proof.input, proof.columns, proof);
  demand(value.length === proof.columns, 'invalid-input', 'module membership dimensions');
  ctx.allocate(value.length + proof.pivots.length); const remainder = [...value], coefficients: Polynomial<E>[] = [];
  for (const p of value) r.assert(ctx, p);
  for (let i = 0; i < proof.pivots.length; i++) {
    const pivot = proof.pivots[i], d = polynomialDivide(ctx, r, remainder[pivot], proof.reduced[i][pivot]);
    if (!r.isZero(ctx, d.remainder)) return null;
    coefficients.push(d.quotient);
    for (let j = 0; j < value.length; j++) remainder[j] = r.subtract(ctx, remainder[j], r.multiply(ctx, d.quotient, proof.reduced[i][j]));
  }
  return remainder.every(p => r.isZero(ctx, p)) ? Object.freeze(coefficients) : null;
}
