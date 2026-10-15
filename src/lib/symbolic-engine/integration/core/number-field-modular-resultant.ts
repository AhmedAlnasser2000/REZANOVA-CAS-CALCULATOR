/** Scalar resultants with exact Sylvester determinant evidence. Brown indexed
 * PRS entry points and scaling certificates remain separate and unchanged. */
import {demand, type ExecutionContext} from './execution';
import {ringPower} from './field';
import type {DifferentialBounds} from './differential-field';
import {checkDifferentialBounds} from './differential-field';
import {assertPolynomialRingOwner, type Polynomial, type PolynomialRing} from './polynomial';
import {verifyAlgebraicChainWithin} from './algebraic-derivative';
import {matrixAllocation, freezeExactMatrix, type ExactMatrix} from './arithmetic-matrix';
import {produceNumberFieldModularGcdWithin, verifyNumberFieldModularGcdWithin} from './number-field-modular-gcd';
import {numberFieldModularDescriptor, numberFieldModularImage} from './number-field-modular-image';
import {rationalGcdPrimeFields} from './rational-gcd-evidence';
import {modularRationalReconstruction} from './modular-rational-reconstruction';
import {modularCoefficientLuWithin} from './modular-coefficient-matrix';
import type {Rational} from './rational';

interface Common<E> {readonly inputA: Polynomial<E>; readonly inputB: Polynomial<E>; readonly resultant: E}
export type NumberFieldModularResultant<E> = Readonly<Common<E> & (
  {method: 'boundary'} |
  {method: 'common-factor'; factor: Polynomial<E>; quotientA: Polynomial<E>; quotientB: Polynomial<E>} |
  {method: 'modular-lu'; permutation: readonly number[]; lower: ExactMatrix<E>; upper: ExactMatrix<E>; inverses: readonly E[]}
)>;
function source<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, bounds: DifferentialBounds) {
  checkDifferentialBounds(ctx, bounds); assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, a); ring.assert(ctx, b);
  const descriptor = numberFieldModularDescriptor(ctx, ring.domain); verifyAlgebraicChainWithin(ctx, ring.domain, bounds); return descriptor;
}
function boundary<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): E | null {
  const m = r.degree(ctx, a), n = r.degree(ctx, b), f = r.domain;
  if (m < 0 || n < 0) return f.fromInteger(ctx, 0n);
  if (m === 0) return ringPower(ctx, f, r.leading(ctx, a), n);
  if (n === 0) return ringPower(ctx, f, r.leading(ctx, b), m);
  return null;
}
function sylvester<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>): ExactMatrix<E> {
  const m = r.degree(ctx, a), n = r.degree(ctx, b), size = m + n; demand(m > 0 && n > 0, 'invalid-input', 'positive Sylvester degrees'); matrixAllocation(ctx, size, size);
  const rows: E[][] = [];
  for (const [p, count] of [[a, n], [b, m]] as const) for (let shift = count - 1; shift >= 0; shift--) {
    rows.push(Array.from({length: size}, (_, column) => {ctx.tick(); return p.coefficients[size - 1 - column - shift] ?? r.domain.fromInteger(ctx, 0n);}));
  }
  return freezeExactMatrix(ctx, rows);
}
function reconstructs<E>(ctx: ExecutionContext, r: PolynomialRing<E>, input: ExactMatrix<E>, permutation: readonly number[], lower: ExactMatrix<E>, upper: ExactMatrix<E>): boolean {
  const f = r.domain, n = input.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (j > i && !f.isZero(ctx, lower[i][j]) || j < i && !f.isZero(ctx, upper[i][j]) || i === j && !f.equal(ctx, lower[i][j], f.fromInteger(ctx, 1n))) return false;
    let value = f.fromInteger(ctx, 0n); for (let k = 0; k < n; k++) value = f.add(ctx, value, f.multiply(ctx, lower[i][k], upper[k][j]));
    if (!f.equal(ctx, value, input[permutation[i]][j])) return false;
  }
  return true;
}
function determinant<E>(ctx: ExecutionContext, r: PolynomialRing<E>, permutation: readonly number[], upper: ExactMatrix<E>): E {
  const f = r.domain; let value = f.fromInteger(ctx, 1n), odd = false;
  for (let i = 0; i < permutation.length; i++) {
    value = f.multiply(ctx, value, upper[i][i]); for (let j = i + 1; j < permutation.length; j++) {ctx.tick(); if (permutation[i] > permutation[j]) odd = !odd;}
  }
  return odd ? f.negate(ctx, value) : value;
}
export function verifyNumberFieldModularResultantWithin<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, proof: NumberFieldModularResultant<E>, bounds: DifferentialBounds): void {
  source(ctx, r, a, b, bounds); demand(proof !== null && typeof proof === 'object' && r.equal(ctx, a, proof.inputA) && r.equal(ctx, b, proof.inputB), 'verification-failed', 'resultant explicit ordered inputs'); const f = r.domain;
  f.assert(ctx, proof.resultant);
  if (proof.method === 'boundary') {const expected = boundary(ctx, r, a, b); demand(expected !== null && f.equal(ctx, expected, proof.resultant), 'verification-failed', 'Brown resultant boundary'); return;}
  demand(boundary(ctx, r, a, b) === null, 'verification-failed', 'positive-degree resultant evidence');
  if (proof.method === 'common-factor') {
    demand(r.degree(ctx, proof.factor) > 0 && r.equal(ctx, r.multiply(ctx, proof.factor, proof.quotientA), a) && r.equal(ctx, r.multiply(ctx, proof.factor, proof.quotientB), b) && f.isZero(ctx, proof.resultant), 'verification-failed', 'complete common-factor resultant zero'); return;
  }
  demand(proof.method === 'modular-lu', 'verification-failed', 'resultant evidence method'); const matrix = sylvester(ctx, r, a, b), n = matrix.length;
  demand(proof.permutation.length === n && proof.lower.length === n && proof.upper.length === n && proof.inverses.length === n, 'verification-failed', 'resultant LU complete dimensions'); ctx.allocate(n); const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    const index = proof.permutation[i]; demand(Number.isSafeInteger(index) && index >= 0 && index < n && !seen.has(index), 'verification-failed', 'resultant complete permutation'); seen.add(index);
    demand(proof.lower[i].length === n && proof.upper[i].length === n, 'verification-failed', 'resultant matrix row coverage'); ctx.allocate(2 * n); for (const value of [...proof.lower[i], ...proof.upper[i]]) f.assert(ctx, value);
    demand(f.equal(ctx, f.multiply(ctx, proof.upper[i][i], proof.inverses[i]), f.fromInteger(ctx, 1n)), 'verification-failed', 'resultant checked diagonal units');
  }
  demand(reconstructs(ctx, r, matrix, proof.permutation, proof.lower, proof.upper) && f.equal(ctx, determinant(ctx, r, proof.permutation, proof.upper), proof.resultant), 'verification-failed', 'exact ordered Sylvester determinant');
}
export function produceNumberFieldModularResultantWithin<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, bounds: DifferentialBounds): NumberFieldModularResultant<E> {
  demand(ctx.operationToken !== undefined, 'invalid-input', 'modular resultant composition scope'); const descriptor = source(ctx, r, a, b, bounds), scalar = boundary(ctx, r, a, b);
  if (scalar !== null) {ctx.allocate(4); return Object.freeze({method: 'boundary', inputA: a, inputB: b, resultant: scalar});}
  const gcd = produceNumberFieldModularGcdWithin(ctx, r, a, b, bounds); verifyNumberFieldModularGcdWithin(ctx, r, a, b, gcd, bounds);
  if (r.degree(ctx, gcd.gcd) > 0) {ctx.allocate(7); return Object.freeze({method: 'common-factor', inputA: a, inputB: b, resultant: r.domain.fromInteger(ctx, 0n), factor: gcd.gcd, quotientA: gcd.quotientA, quotientB: gcd.quotientB});}
  const matrix = sylvester(ctx, r, a, b), n = matrix.length, count = 2 * n * n; matrixAllocation(ctx, count, descriptor.dimension);
  const coordinates = matrix.map(row => row.map(value => descriptor.coordinates(ctx, value))); let permutation: readonly number[] | undefined, modulus = 1n, residues: readonly (readonly bigint[])[] = [];
  for (const prime of rationalGcdPrimeFields(ctx)) {
    const image = numberFieldModularImage(ctx, descriptor, prime); if (image === null) continue; matrixAllocation(ctx, n, n); const reduced: unknown[][] = []; let complete = true;
    for (const row of coordinates) {
      ctx.allocate(n); const values: unknown[] = [];
      for (const coefficient of row) {const value = image.fromCoordinates(ctx, coefficient); if (value === null) {complete = false; break;} values.push(value);}
      if (!complete) break; reduced.push(values);
    }
    if (!complete) continue; const lu = modularCoefficientLuWithin(ctx, image, reduced, permutation); if (lu === null) continue; permutation ??= lu.permutation;
    matrixAllocation(ctx, count, descriptor.dimension); ctx.allocate(count);
    const flattened = [...lu.lower.flat(), ...lu.upper.flat()], inverse = prime.inverse(ctx, prime.residue(ctx, modulus));
    residues = flattened.map((value, i) => image.coordinates(ctx, value).map((coordinate, j) => {
      const previous = residues[i]?.[j] ?? 0n, difference = prime.plus(ctx, coordinate, -prime.residue(ctx, previous)); return ctx.add(previous, ctx.multiply(modulus, prime.times(ctx, difference, inverse)));
    })); modulus = ctx.multiply(modulus, prime.modulus);
    ctx.allocate(count); const values: E[] = []; let recovered = true;
    for (const row of residues) {
      ctx.allocate(row.length); const cs: Rational[] = [];
      for (const value of row) {const q = modularRationalReconstruction(ctx, value, modulus); if (q === null) {recovered = false; break;} cs.push(q);}
      if (!recovered) break; values.push(descriptor.native(ctx, cs));
    }
    if (!recovered) continue;
    matrixAllocation(ctx, n, 2 * n);
    const lower = freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => values.slice(i * n, (i + 1) * n))), upper = freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => values.slice(n * n + i * n, n * n + (i + 1) * n)));
    if (!reconstructs(ctx, r, matrix, permutation, lower, upper)) continue;
    ctx.allocate(n + 8); const inverses = Object.freeze(upper.map((row, i) => r.domain.inverse(ctx, row[i]))), resultant = determinant(ctx, r, permutation, upper);
    return Object.freeze({method: 'modular-lu', inputA: a, inputB: b, permutation, lower, upper, inverses, resultant});
  }
  demand(false, 'verification-failed', 'complete modular resultant prime coverage');
}
export function produceNumberFieldModularResultant<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, bounds: DifferentialBounds): NumberFieldModularResultant<E> {
  return ctx.operation(() => {const proof = produceNumberFieldModularResultantWithin(ctx, r, a, b, bounds); verifyNumberFieldModularResultantWithin(ctx, r, a, b, proof, bounds); return proof;});
}
export function verifyNumberFieldModularResultant<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, proof: NumberFieldModularResultant<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyNumberFieldModularResultantWithin(ctx, r, a, b, proof, bounds));
}
