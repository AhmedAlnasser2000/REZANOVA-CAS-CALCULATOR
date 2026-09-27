import { demand, type ExecutionContext } from './execution';
import type { Polynomial } from './polynomial';
import { polynomialDivide } from './polynomial-division';
import { SquareFreeQuotientAlgebra, type QuotientElement } from './quotient-algebra';

export interface TraceCertificate<E> {
  readonly columns: readonly Polynomial<E>[];
  readonly trace: E;
}
export function quotientTrace<E>(ctx: ExecutionContext, algebra: SquareFreeQuotientAlgebra<E>, value: QuotientElement<E>): TraceCertificate<E> {
  algebra.assert(ctx, value); const r = algebra.ring, d = r.domain, n = r.degree(ctx, algebra.modulus);
  ctx.allocate(n * n + n + 2);
  const columns: Polynomial<E>[] = [];
  let column = value, trace = d.fromInteger(ctx, 0n);
  const z = algebra.make(ctx, r.make(ctx, [d.fromInteger(ctx, 0n), d.fromInteger(ctx, 1n)]));
  for (let i = 0; i < n; i++) {
    ctx.tick(); columns.push(column.representative);
    trace = d.add(ctx, trace, column.representative.coefficients[i] ?? d.fromInteger(ctx, 0n));
    if (i + 1 < n) column = algebra.multiply(ctx, column, z);
  }
  const result = Object.freeze({ columns: Object.freeze(columns), trace });
  verifyQuotientTrace(ctx, algebra, value, result); return result;
}

/** Checks multiplication columns by quotient identities and the trace independently
 * by Newton sums, without repeating the multiplication-matrix construction. */
export function verifyQuotientTrace<E>(ctx: ExecutionContext, algebra: SquareFreeQuotientAlgebra<E>,
  value: QuotientElement<E>, proof: TraceCertificate<E>): void {
  algebra.assert(ctx, value); const r = algebra.ring, d = r.domain, q = algebra.modulus, n = r.degree(ctx, q);
  demand(proof.columns.length === n, 'verification-failed', 'trace matrix dimension'); ctx.allocate(n * n + n);
  let diagonal = d.fromInteger(ctx, 0n);
  for (let i = 0; i < n; i++) {
    ctx.tick(); const column = proof.columns[i];
    demand(r.degree(ctx, column) < n, 'verification-failed', 'unreduced trace column');
    ctx.degree(value.representative.coefficients.length - 1 + i); ctx.allocate(value.representative.coefficients.length + i);
    const shifted = r.make(ctx, [...Array<E>(i).fill(d.fromInteger(ctx, 0n)), ...value.representative.coefficients]);
    demand(r.isZero(ctx, polynomialDivide(ctx, r, r.subtract(ctx, shifted, column), q).remainder), 'verification-failed', 'trace column identity');
    diagonal = d.add(ctx, diagonal, column.coefficients[i] ?? d.fromInteger(ctx, 0n));
  }
  const sums: E[] = [d.fromInteger(ctx, BigInt(n))];
  for (let k = 1; k < n; k++) {
    let sum = d.multiply(ctx, d.fromInteger(ctx, BigInt(k)), q.coefficients[n - k]);
    for (let j = 1; j < k; j++) { ctx.tick(); sum = d.add(ctx, sum, d.multiply(ctx, q.coefficients[n - j], sums[k - j])); }
    sums.push(d.negate(ctx, sum));
  }
  let newton = d.fromInteger(ctx, 0n);
  for (let i = 0; i < value.representative.coefficients.length; i++) newton = d.add(ctx, newton, d.multiply(ctx, value.representative.coefficients[i], sums[i]));
  demand(d.equal(ctx, proof.trace, diagonal) && d.equal(ctx, proof.trace, newton), 'verification-failed', 'trace Newton identity');
}
