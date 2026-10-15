/** Deterministic Dixon inversion of a certified nonsingular rational block.
 * Authority is the exact inverse identity; no modular search flag is trusted. */
import {demand, type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {integerGcd, type Rational} from './rational';
import {matrixAllocation, freezeExactMatrix, type ExactMatrix} from './arithmetic-matrix';
import {rationalGcdPrimeFields} from './rational-gcd-evidence';
import type {FactorPrimeField} from './factorization-modular';
import {modularRationalReconstruction} from './modular-rational-reconstruction';

function integerRows(ctx: ExecutionContext, matrix: ExactMatrix<Rational>): {matrix: readonly (readonly bigint[])[]; scales: readonly bigint[]} {
  const n = matrix.length; matrixAllocation(ctx, n, n); ctx.allocate(n);
  const scales: bigint[] = [], rows: (readonly bigint[])[] = [];
  for (const row of matrix) {
    demand(row.length === n, 'invalid-input', 'p-adic square block'); let scale = 1n;
    for (const q of row) {Q.assert(ctx, q); scale = ctx.multiply(ctx.quotient(scale, integerGcd(ctx, scale, q.denominator)), q.denominator);}
    scales.push(scale); ctx.allocate(n);
    rows.push(Object.freeze(row.map(q => ctx.multiply(q.numerator, ctx.quotient(scale, q.denominator)))));
  }
  return {matrix: Object.freeze(rows), scales: Object.freeze(scales)};
}
function modularInverse(ctx: ExecutionContext, field: FactorPrimeField, input: readonly (readonly bigint[])[]): readonly (readonly bigint[])[] | null {
  const n = input.length; matrixAllocation(ctx, n, 2 * n);
  const a = input.map((row, i) => [...row.map(v => field.residue(ctx, v)), ...Array.from({length: n}, (_, j) => i === j ? 1n : 0n)]);
  for (let j = 0; j < n; j++) {
    let pivot = j; while (pivot < n && a[pivot][j] === 0n) {ctx.tick(); pivot++;}
    if (pivot === n) return null;
    if (pivot !== j) [a[j], a[pivot]] = [a[pivot], a[j]];
    const inverse = field.inverse(ctx, a[j][j]);
    for (let k = 0; k < 2 * n; k++) a[j][k] = field.times(ctx, a[j][k], inverse);
    for (let i = 0; i < n; i++) if (i !== j) {
      const factor = a[i][j];
      for (let k = 0; k < 2 * n; k++) a[i][k] = field.plus(ctx, a[i][k], field.residue(ctx, -field.times(ctx, factor, a[j][k])));
    }
  }
  matrixAllocation(ctx, n, n); const inverse = Object.freeze(a.map(row => Object.freeze(row.slice(n))));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let sum = 0n; for (let k = 0; k < n; k++) sum = field.plus(ctx, sum, field.times(ctx, field.residue(ctx, input[i][k]), inverse[k][j]));
    demand(sum === (i === j ? 1n : 0n), 'verification-failed', 'independent modular block inverse identity');
  }
  return inverse;
}
function isInverse(ctx: ExecutionContext, matrix: readonly (readonly bigint[])[], inverse: ExactMatrix<Rational>): boolean {
  const n = matrix.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let sum = Q.fromInteger(ctx, 0n);
    for (let k = 0; k < n; k++) sum = Q.add(ctx, sum, Q.multiply(ctx, Q.fromInteger(ctx, matrix[i][k]), inverse[k][j]));
    if (!Q.equal(ctx, sum, Q.fromInteger(ctx, i === j ? 1n : 0n))) return false;
  }
  return true;
}
/** Nonsingularity is supplied by the rank-selection obligation. Only bad
 * modular determinants are rejected; resource or arithmetic failures propagate. */
export function invertRationalBlockPadicWithin(ctx: ExecutionContext, input: ExactMatrix<Rational>): ExactMatrix<Rational> {
  const n = input.length, converted = integerRows(ctx, input), a = converted.matrix;
  if (n === 0) return Object.freeze([]);
  let prime: FactorPrimeField | undefined, inverse: readonly (readonly bigint[])[] | null = null;
  for (const field of rationalGcdPrimeFields(ctx)) {const candidate = modularInverse(ctx, field, a); if (candidate !== null) {prime = field; inverse = candidate; break;}}
  demand(prime !== undefined && inverse !== null, 'verification-failed', 'nonsingular block modular inverse');
  matrixAllocation(ctx, n, 2 * n);
  let residual: bigint[][] = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 1n : 0n));
  const image: bigint[][] = Array.from({length: n}, () => Array<bigint>(n).fill(0n)); let modulus = 1n;
  for (;;) {
    matrixAllocation(ctx, n, 2 * n);
    const digits = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
      let sum = 0n; for (let k = 0; k < n; k++) sum = prime.plus(ctx, sum, prime.times(ctx, inverse[i][k], prime.residue(ctx, residual[k][j]))); return sum;
    }));
    const next = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
      let error = residual[i][j]; for (let k = 0; k < n; k++) error = ctx.add(error, -ctx.multiply(a[i][k], digits[k][j]));
      demand(ctx.remainder(error, prime.modulus) === 0n, 'verification-failed', 'exact p-adic residual division'); return ctx.quotient(error, prime.modulus);
    }));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) image[i][j] = ctx.add(image[i][j], ctx.multiply(modulus, digits[i][j]));
    modulus = ctx.multiply(modulus, prime.modulus); residual = next;
    matrixAllocation(ctx, n, n); const reconstructed: Rational[][] = []; let complete = true;
    for (let i = 0; i < n && complete; i++) {
      const row: Rational[] = []; ctx.allocate(n);
      for (let j = 0; j < n; j++) {const value = modularRationalReconstruction(ctx, image[i][j], modulus); if (value === null) {complete = false; break;} row.push(value);}
      reconstructed.push(row);
    }
    if (!complete || !isInverse(ctx, a, reconstructed)) continue;
    // A_integer=S*A; consequently A^{-1}=A_integer^{-1}*S.
    matrixAllocation(ctx, n, n);
    return freezeExactMatrix(ctx, reconstructed.map(row => row.map((q, j) => Q.multiply(ctx, q, Q.fromInteger(ctx, converted.scales[j])))));
  }
}
