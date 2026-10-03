import { demand, type ExecutionContext } from '../execution';
import { iexact, igcd, imul, isub } from './integer';
import {
  assertRational, rAdd, rDivide, rEqual, rFromInteger, rIsZero, rMultiply, rNegate, rational, type Rational,
} from './rational';

export type RationalMatrix = readonly (readonly Rational[])[];

export type LinearSolution =
  | { readonly kind: 'consistent'; readonly rank: number; readonly pivots: readonly number[]; readonly particular: readonly Rational[]; readonly nullspace: readonly (readonly Rational[])[] }
  | { readonly kind: 'inconsistent'; readonly rank: number; readonly witness: readonly Rational[] };

function shape(ctx: ExecutionContext, a: RationalMatrix, columns?: number): { rows: number; cols: number } {
  demand(Array.isArray(a), 'invalid-input', 'matrix rows');
  demand(columns === undefined || (Number.isSafeInteger(columns) && columns >= 0), 'invalid-input', 'column count');
  const rows = a.length, cols = rows ? a[0].length : columns ?? 0;
  demand(columns === undefined || columns === cols, 'invalid-input', 'column count mismatch');
  for (const row of a) {
    demand(Array.isArray(row) && row.length === cols, 'invalid-input', 'ragged matrix');
    for (const v of row) assertRational(ctx, v);
  }
  ctx.allocate(rows * cols);
  return { rows, cols };
}

/** Scale a rational row to integers by its denominators' lcm; returns the integers and the factor. */
function integerRow(ctx: ExecutionContext, row: readonly Rational[]): { values: bigint[]; factor: bigint } {
  let lcm = 1n;
  for (const v of row) lcm = iexact(ctx, imul(ctx, lcm, v.denominator), igcd(ctx, lcm, v.denominator));
  return { values: row.map(v => imul(ctx, v.numerator, iexact(ctx, lcm, v.denominator))), factor: lcm };
}

/**
 * Fraction-free (Bareiss) row echelon form of an integer matrix, in place.
 * Every division is exact; a non-exact division is a verification failure.
 */
function bareiss(ctx: ExecutionContext, m: bigint[][], cols: number, pivotColumns: number): { pivots: number[]; sign: bigint } {
  const rows = m.length, pivots: number[] = [];
  let prev = 1n, sign = 1n, r = 0;
  for (let c = 0; c < pivotColumns && r < rows; c++) {
    let i = r;
    while (i < rows && m[i][c] === 0n) { ctx.tick(); i++; }
    if (i === rows) continue;
    if (i !== r) { [m[i], m[r]] = [m[r], m[i]]; sign = -sign; }
    for (let k = r + 1; k < rows; k++) {
      for (let j = c + 1; j < cols; j++) m[k][j] = iexact(ctx, isub(ctx, imul(ctx, m[r][c], m[k][j]), imul(ctx, m[k][c], m[r][j])), prev);
      m[k][c] = 0n;
    }
    prev = m[r][c]; pivots.push(c); r++;
  }
  return { pivots, sign };
}

function multiply(ctx: ExecutionContext, a: RationalMatrix, x: readonly Rational[]): Rational[] {
  return a.map(row => row.reduce((acc, v, j) => rAdd(ctx, acc, rMultiply(ctx, v, x[j])), rational(ctx, 0n)));
}

/**
 * Solve A·x = b over ℚ. `columns` is required only for a matrix with no rows.
 * Every returned object is checked against A and b.
 */
export function solveLinear(ctx: ExecutionContext, a: RationalMatrix, b: readonly Rational[], columns?: number): LinearSolution {
  const { rows, cols } = shape(ctx, a, columns);
  demand(Array.isArray(b) && b.length === rows, 'invalid-input', 'right-hand side length');
  for (const v of b) assertRational(ctx, v);
  const m = a.map((row, i) => integerRow(ctx, [...row, b[i]]).values);
  const { pivots } = bareiss(ctx, m, cols + 1, cols + 1);
  const rank = pivots.filter(c => c < cols).length;
  if (pivots.includes(cols)) {
    const witness = inconsistencyWitness(ctx, a, b, cols);
    const result = Object.freeze({ kind: 'inconsistent' as const, rank, witness: Object.freeze(witness) });
    verifyLinear(ctx, a, b, result, cols);
    return result;
  }
  const free = Array.from({ length: cols }, (_, j) => j).filter(j => !pivots.includes(j));
  const backSolve = (rhsColumn: (row: number) => Rational, freeValues: Map<number, Rational>): Rational[] => {
    const x: Rational[] = Array.from({ length: cols }, (_, j) => freeValues.get(j) ?? rational(ctx, 0n));
    for (let r = pivots.length - 1; r >= 0; r--) {
      const c = pivots[r];
      let acc = rhsColumn(r);
      for (let j = c + 1; j < cols; j++) if (m[r][j] !== 0n) acc = rAdd(ctx, acc, rNegate(ctx, rMultiply(ctx, rFromInteger(ctx, m[r][j]), x[j])));
      x[c] = rDivide(ctx, acc, rFromInteger(ctx, m[r][c]));
    }
    return x;
  };
  const particular = backSolve(r => rFromInteger(ctx, m[r][cols]), new Map());
  const nullspace = free.map(f => backSolve(() => rational(ctx, 0n), new Map([[f, rational(ctx, 1n)]])));
  const result = Object.freeze({ kind: 'consistent' as const, rank, pivots: Object.freeze([...pivots]), particular: Object.freeze(particular), nullspace: Object.freeze(nullspace.map(v => Object.freeze(v))) });
  verifyLinear(ctx, a, b, result, cols);
  return result;
}

function inconsistencyWitness(ctx: ExecutionContext, a: RationalMatrix, b: readonly Rational[], cols: number): Rational[] {
  const rows = a.length;
  const transpose = Array.from({ length: cols }, (_, j) => a.map(row => row[j]));
  const left = solveLinear(ctx, transpose, Array.from({ length: cols }, () => rational(ctx, 0n)), rows);
  demand(left.kind === 'consistent', 'verification-failed', 'homogeneous system must be consistent');
  const y = left.nullspace.find(v => !rIsZero(ctx, v.reduce((acc, yi, i) => rAdd(ctx, acc, rMultiply(ctx, yi, b[i])), rational(ctx, 0n))));
  demand(y !== undefined, 'verification-failed', 'no inconsistency witness');
  return [...y];
}

/** Check a solution object against the original system. */
export function verifyLinear(ctx: ExecutionContext, a: RationalMatrix, b: readonly Rational[], s: LinearSolution, columns?: number): void {
  const cols = a.length ? a[0].length : columns ?? 0;
  if (s.kind === 'inconsistent') {
    const ya = Array.from({ length: cols }, (_, j) => a.reduce((acc, row, i) => rAdd(ctx, acc, rMultiply(ctx, s.witness[i], row[j])), rational(ctx, 0n)));
    demand(ya.every(v => rIsZero(ctx, v)), 'verification-failed', 'witness does not annihilate A');
    const yb = b.reduce((acc, v, i) => rAdd(ctx, acc, rMultiply(ctx, s.witness[i], v)), rational(ctx, 0n));
    demand(!rIsZero(ctx, yb), 'verification-failed', 'witness does not separate b');
    return;
  }
  demand(multiply(ctx, a, s.particular).every((v, i) => rEqual(ctx, v, b[i])), 'verification-failed', 'particular residual');
  demand(s.nullspace.length === cols - s.rank, 'verification-failed', 'nullspace dimension');
  const free = Array.from({ length: cols }, (_, j) => j).filter(j => !s.pivots.includes(j));
  s.nullspace.forEach((v, k) => {
    demand(multiply(ctx, a, v).every(x => rIsZero(ctx, x)), 'verification-failed', 'nullspace residual');
    // Free-coordinate identity proves independence of the basis.
    free.forEach((f, l) => demand(rEqual(ctx, v[f], rational(ctx, l === k ? 1n : 0n)), 'verification-failed', 'nullspace basis shape'));
  });
}

/** Determinant over ℚ by Bareiss elimination after clearing row denominators. */
export function determinant(ctx: ExecutionContext, a: RationalMatrix): Rational {
  const { rows, cols } = shape(ctx, a);
  demand(rows === cols, 'invalid-input', 'determinant needs a square matrix');
  if (rows === 0) return rational(ctx, 1n);
  const scaled = a.map(row => integerRow(ctx, row));
  const m = scaled.map(r => r.values);
  const { pivots, sign } = bareiss(ctx, m, cols, cols);
  if (pivots.length < rows) return rational(ctx, 0n);
  const factor = scaled.reduce((acc, r) => imul(ctx, acc, r.factor), 1n);
  return rational(ctx, imul(ctx, sign, m[rows - 1][cols - 1]), factor);
}
