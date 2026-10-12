import { demand, type ExecutionContext } from './execution';
import { PolynomialRing, type Polynomial } from './polynomial';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution } from './linear-system';
import { algebraicNormPolynomial, verifyAlgebraicNormPolynomial, type AlgebraicNorm } from './algebraic-factorization';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import type { AlgebraicElement, AlgebraicField } from './algebraic-field';
import type { DifferentialBounds } from './differential-field';

export interface AlgebraicInvariants<E> {
  readonly input: AlgebraicElement<E>;
  readonly columns: readonly Polynomial<E>[];
  readonly trace: E;
  readonly norm: AlgebraicNorm<E>;
  readonly determinant: LinearSolution<E>;
}
function matrix<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, columns: readonly Polynomial<E>[]) {
  const n = owner.ring.degree(ctx, owner.modulus); demand(columns.length === n, 'verification-failed', 'invariant matrix size');
  ctx.allocate(n * n + n * 2);
  return Object.freeze({rows: n, columns: n, matrix: Object.freeze(Array.from({length: n}, (_, i) => Object.freeze(columns.map(p => {
    owner.ring.assert(ctx, p); return p.coefficients[i] ?? owner.parent.fromInteger(ctx, 0n);
  })))), rhs: Object.freeze(Array(n).fill(owner.parent.fromInteger(ctx, 0n)) as E[])});
}
export function verifyAlgebraicInvariantsWithin<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: AlgebraicElement<E>, proof: AlgebraicInvariants<E>): void {
  const r = owner.ring, d = owner.parent, n = r.degree(ctx, owner.modulus);
  demand(owner.equal(ctx, proof.input, input) && proof.columns.length === n, 'verification-failed', 'invariant input/coverage');
  let diagonal = d.fromInteger(ctx, 0n), basis = owner.fromInteger(ctx, 1n);
  for (let i = 0; i < n; i++) {
    demand(r.degree(ctx, proof.columns[i]) < n && owner.equal(ctx, owner.make(ctx, proof.columns[i]), owner.multiply(ctx, input, basis)),
      'verification-failed', 'multiplication basis column');
    diagonal = d.add(ctx, diagonal, proof.columns[i].coefficients[i] ?? d.fromInteger(ctx, 0n)); basis = owner.multiply(ctx, basis, owner.generator(ctx));
  }
  ctx.allocate(n); const sums: E[] = [d.fromInteger(ctx, BigInt(n))];
  for (let k = 1; k < n; k++) {
    let sum = d.multiply(ctx, d.fromInteger(ctx, BigInt(k)), owner.modulus.coefficients[n - k]);
    for (let j = 1; j < k; j++) sum = d.add(ctx, sum, d.multiply(ctx, owner.modulus.coefficients[n - j], sums[k - j]));
    sums.push(d.negate(ctx, sum));
  }
  let newton = d.fromInteger(ctx, 0n);
  for (let i = 0; i < input.representative.coefficients.length; i++) newton = d.add(ctx, newton, d.multiply(ctx, input.representative.coefficients[i], sums[i]));
  demand(d.equal(ctx, proof.trace, diagonal) && d.equal(ctx, proof.trace, newton), 'verification-failed', 'independent Newton trace');
  const normInputRing = new PolynomialRing(owner, proof.norm.outer.variable), normInput = normInputRing.constant(ctx, input);
  verifyAlgebraicNormPolynomial(ctx, owner, normInput, proof.norm);
  demand(proof.norm.proof.resultant.coefficients.length <= 1, 'verification-failed', 'scalar norm');
  verifyLinearSolution(ctx, d, matrix(ctx, owner, proof.columns), proof.determinant);
  let det = d.fromInteger(ctx, proof.determinant.rank === n ? 1n : 0n);
  if (proof.determinant.rank === n) for (const op of proof.determinant.operations) {
    if (op.kind === 'swap') det = d.negate(ctx, det);
    else if (op.kind === 'scale') det = d.exactDivide(ctx, det, op.factor);
  }
  demand(d.equal(ctx, det, proof.norm.proof.resultant.coefficients[0] ?? d.fromInteger(ctx, 0n)), 'verification-failed', 'independent determinant norm');
}
export function algebraicInvariantsWithin<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: AlgebraicElement<E>): AlgebraicInvariants<E> {
  owner.assert(ctx, input); const n = owner.ring.degree(ctx, owner.modulus); ctx.allocate(n * 2 + 5);
  let column = input, trace = owner.parent.fromInteger(ctx, 0n); const columns: Polynomial<E>[] = [];
  for (let i = 0; i < n; i++) {
    columns.push(column.representative); trace = owner.parent.add(ctx, trace, column.representative.coefficients[i] ?? owner.parent.fromInteger(ctx, 0n));
    column = owner.multiply(ctx, column, owner.generator(ctx));
  }
  const p = new PolynomialRing(owner, 'norm'), norm = algebraicNormPolynomial(ctx, owner, p.constant(ctx, input));
  const result = Object.freeze({input, trace, columns: Object.freeze(columns), norm, determinant: solveLinearSystem(ctx, owner.parent, matrix(ctx, owner, columns))});
  verifyAlgebraicInvariantsWithin(ctx, owner, input, result); return result;
}
export function algebraicInvariants<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: AlgebraicElement<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, owner, bounds); return algebraicInvariantsWithin(ctx, owner, input); });
}
export function verifyAlgebraicInvariants<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: AlgebraicElement<E>, proof: AlgebraicInvariants<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicChainWithin(ctx, owner, bounds); verifyAlgebraicInvariantsWithin(ctx, owner, input, proof); });
}
