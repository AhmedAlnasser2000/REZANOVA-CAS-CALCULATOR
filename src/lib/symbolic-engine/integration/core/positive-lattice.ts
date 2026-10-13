import { demand, type ExecutionContext } from './execution';
import { PositiveFractionField, type PositiveFraction } from './positive-fraction';
import type { PositivePolynomial } from './positive-polynomial';
import { positiveBezout, verifyPositiveBezout, type PositiveBezout } from './positive-polynomial';
import { positiveModuleHermite, verifyPositiveModule, type PositiveModule } from './positive-module';
import { freezeExactMatrix, transposeExactMatrix, invertArithmeticMatrix, verifyArithmeticMatrixInverse, equalExactMatrices, type ExactMatrix, type MatrixInverse } from './arithmetic-matrix';
export interface PositiveDenominators<E> { readonly input: readonly PositivePolynomial<E>[]; readonly steps: readonly Readonly<{gcd: PositiveBezout<E>; left: PositivePolynomial<E>; right: PositivePolynomial<E>; next: PositivePolynomial<E>}>[]; readonly common: PositivePolynomial<E> }
export function positiveDenominators<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, input: readonly PositivePolynomial<E>[]): PositiveDenominators<E> {
  const r = f.ring, steps: PositiveDenominators<E>['steps'][number][] = []; let common = r.one(ctx); ctx.allocate(input.length);
  for (const p of input) { const gcd = positiveBezout(ctx, r, common, p), left = r.exactDivide(ctx, common, gcd.gcd), right = r.exactDivide(ctx, p, gcd.gcd); common = r.multiply(ctx, left, p); steps.push(Object.freeze({gcd, left, right, next: common})); }
  const proof = Object.freeze({input: Object.freeze([...input]), steps: Object.freeze(steps), common}); verifyPositiveDenominators(ctx, f, input, proof); return proof;
}
export function verifyPositiveDenominators<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, input: readonly PositivePolynomial<E>[], proof: PositiveDenominators<E>): void {
  const r = f.ring; demand(proof.input.length === input.length && proof.steps.length === input.length, 'verification-failed', 'positive denominator coverage'); let common = r.one(ctx);
  for (let i = 0; i < input.length; i++) { const p = input[i], s = proof.steps[i]; demand(r.equal(ctx, p, proof.input[i]) && !r.isZero(ctx, p) && r.field.equal(ctx, r.leading(ctx, p), r.field.fromInteger(ctx, 1n)), 'verification-failed', 'positive monic denominator');
    verifyPositiveBezout(ctx, r, common, p, s.gcd); demand(r.equal(ctx, r.multiply(ctx, s.gcd.gcd, s.left), common) && r.equal(ctx, r.multiply(ctx, s.gcd.gcd, s.right), p) && r.equal(ctx, r.multiply(ctx, s.left, p), s.next), 'verification-failed', 'positive LCM reconstruction'); common = s.next; }
  demand(r.equal(ctx, common, proof.common), 'verification-failed', 'positive complete denominator');
}
export interface PositiveLattice<E> { readonly field: PositiveFractionField<E>; readonly dimension: number; readonly input: ExactMatrix<PositiveFraction<E>>;
  readonly denominators: PositiveDenominators<E>; readonly hermite: PositiveModule<E>; readonly basis: ExactMatrix<PositiveFraction<E>>; readonly inverse: MatrixInverse<PositiveFraction<E>> }
function cleared<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, rows: ExactMatrix<PositiveFraction<E>>, n: number, d: PositivePolynomial<E>) {
  demand(Number.isSafeInteger(n) && n > 0 && Number.isSafeInteger(rows.length * n), 'invalid-input', 'positive lattice dimensions'); ctx.allocate(rows.length * n);
  return Object.freeze(rows.map(row => { demand(row.length === n, 'invalid-input', 'positive lattice row'); return Object.freeze(row.map(v => { f.assert(ctx, v); return f.ring.multiply(ctx, v.numerator, f.ring.exactDivide(ctx, d, v.denominator)); })); }));
}
export function positiveLattice<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, input: ExactMatrix<PositiveFraction<E>>, n: number): PositiveLattice<E> {
  const denominators = positiveDenominators(ctx, f, input.flatMap(row => row.map(v => v.denominator))), hermite = positiveModuleHermite(ctx, f.ring, cleared(ctx, f, input, n, denominators.common), n);
  demand(hermite.pivots.length === n, 'invalid-input', 'positive full lattice rank'); const basis = freezeExactMatrix(ctx, hermite.reduced.slice(0, n).map(row => row.map(p => f.make(ctx, p, denominators.common))));
  const inverse = invertArithmeticMatrix(ctx, f, transposeExactMatrix(ctx, basis, n)); demand(inverse !== null, 'verification-failed', 'positive lattice independence');
  const proof = Object.freeze({field: f, dimension: n, input: freezeExactMatrix(ctx, input.map(row => [...row])), denominators, hermite, basis, inverse}); verifyPositiveLattice(ctx, f, input, n, proof); return proof;
}
export function verifyPositiveLattice<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, input: ExactMatrix<PositiveFraction<E>>, n: number, proof: PositiveLattice<E>): void {
  demand(proof.field === f && proof.dimension === n && equalExactMatrices(ctx, f, input, proof.input), 'domain-mismatch', 'positive lattice expected coordinates');
  verifyPositiveDenominators(ctx, f, input.flatMap(row => row.map(v => v.denominator)), proof.denominators); verifyPositiveModule(ctx, f.ring, cleared(ctx, f, input, n, proof.denominators.common), n, proof.hermite);
  demand(proof.hermite.pivots.length === n && proof.basis.length === n && equalExactMatrices(ctx, f, proof.basis, proof.hermite.reduced.slice(0, n).map(row => row.map(p => f.make(ctx, p, proof.denominators.common)))), 'verification-failed', 'positive lattice complete basis');
  verifyArithmeticMatrixInverse(ctx, f, transposeExactMatrix(ctx, proof.basis, n), proof.inverse);
}
export function positiveLatticeCoordinates<E>(ctx: ExecutionContext, lattice: PositiveLattice<E>, vector: readonly PositiveFraction<E>[]): readonly PositiveFraction<E>[] {
  const f = lattice.field, n = lattice.dimension; demand(vector.length === n, 'invalid-input', 'positive lattice coordinate dimensions'); ctx.allocate(n);
  return Object.freeze(lattice.inverse.inverse.map(row => { let out = f.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) out = f.add(ctx, out, f.multiply(ctx, row[i], vector[i])); return out; }));
}
export interface PositivePreimage<E> { readonly rows: PositiveLattice<E>; readonly result: PositiveLattice<E> }
export function positivePreimage<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, matrix: ExactMatrix<PositiveFraction<E>>, n: number): PositivePreimage<E> {
  const rows = positiveLattice(ctx, f, matrix, n), result = positiveLattice(ctx, f, rows.inverse.inverse, n); return Object.freeze({rows, result});
}
export function verifyPositivePreimage<E>(ctx: ExecutionContext, f: PositiveFractionField<E>, matrix: ExactMatrix<PositiveFraction<E>>, n: number, proof: PositivePreimage<E>) {
  verifyPositiveLattice(ctx, f, matrix, n, proof.rows); verifyPositiveLattice(ctx, f, proof.rows.inverse.inverse, n, proof.result);
}
