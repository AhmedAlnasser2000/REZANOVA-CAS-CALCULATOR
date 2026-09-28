import { demand, type ExecutionContext } from './execution';
import type { Polynomial } from './polynomial';
import type { FormalPrimitiveDomain, QRationalFunction } from './formal-primitive';
import type { SquareFreeQuotientAlgebra, QuotientElement, UnitAnalysis } from './quotient-algebra';
import type { TraceCertificate } from './quotient-trace';
import { SharedDenominator } from './shared-denominator';

/** Complete unit proof for the derivative path, over a checked constant monic modulus.
 * gcd=1 gives divisibility immediately; Bezout and the reduced inverse are still checked. */
export function verifyRationalUnit(ctx: ExecutionContext, arithmetic: SharedDenominator,
  algebra: SquareFreeQuotientAlgebra<QRationalFunction>, argument: QuotientElement<QRationalFunction>, proof: UnitAnalysis<QRationalFunction>): void {
  algebra.assert(ctx, argument);
  demand(proof.kind === 'unit', 'verification-failed', 'log derivative requires unit argument');
  algebra.assert(ctx, proof.inverse);
  const a = arithmetic.view(argument.representative), q = arithmetic.view(algebra.modulus), modulus = arithmetic.modulus(algebra.modulus);
  const one = arithmetic.integer(1n), s = arithmetic.view(proof.bezout.s), t = arithmetic.view(proof.bezout.t);
  demand(arithmetic.equal(arithmetic.view(proof.bezout.gcd), one), 'verification-failed', 'inverse gcd');
  demand(arithmetic.equal(arithmetic.add(arithmetic.multiply(s, a), arithmetic.multiply(t, q)), one), 'verification-failed', 'Bezout identity');
  const inverse = arithmetic.view(proof.inverse.representative);
  demand(arithmetic.zeroModulo(arithmetic.subtract(s, inverse), modulus)
    && arithmetic.zeroModulo(arithmetic.subtract(arithmetic.multiply(a, inverse), one), modulus), 'verification-failed', 'inverse identity');
}

/** Same multiplication-basis and independent Newton-sum obligations, cleared in Q[x][z]. */
export function verifyRationalTrace(ctx: ExecutionContext, arithmetic: SharedDenominator,
  algebra: SquareFreeQuotientAlgebra<QRationalFunction>, value: QuotientElement<QRationalFunction>, proof: TraceCertificate<QRationalFunction>): void {
  algebra.assert(ctx, value); const r = algebra.ring, q = algebra.modulus, n = r.degree(ctx, q);
  demand(proof.columns.length === n, 'verification-failed', 'trace matrix dimension'); ctx.allocate(n * n + n);
  const modulus = arithmetic.modulus(q), v = arithmetic.view(value.representative), zero = arithmetic.integer(0n);
  let diagonal = zero;
  for (let i = 0; i < n; i++) {
    ctx.tick(); const column = proof.columns[i];
    demand(r.degree(ctx, column) < n, 'verification-failed', 'unreduced trace column');
    demand(arithmetic.zeroModulo(arithmetic.subtract(arithmetic.shifted(v, i), arithmetic.view(column)), modulus), 'verification-failed', 'trace column identity');
    if (column.coefficients[i]) diagonal = arithmetic.add(diagonal, arithmetic.scalar(column.coefficients[i]));
  }
  const sums = arithmetic.newtonSums(q);
  let newton = zero;
  for (let i = 0; i < value.representative.coefficients.length; i++) {
    ctx.tick(); newton = arithmetic.add(newton, arithmetic.multiply(arithmetic.scalar(value.representative.coefficients[i]), sums[i]));
  }
  const trace = arithmetic.scalar(proof.trace);
  demand(arithmetic.equal(trace, diagonal) && arithmetic.equal(trace, newton), 'verification-failed', 'trace Newton identity');
}

export function verifyRationalLogIdentity(ctx: ExecutionContext, owner: FormalPrimitiveDomain, arithmetic: SharedDenominator,
  algebra: SquareFreeQuotientAlgebra<QRationalFunction>, h: QuotientElement<QRationalFunction>,
  argument: Polynomial<QRationalFunction>, weight: Polynomial<QRationalFunction>, derivative: Polynomial<QRationalFunction>): void {
  demand(arithmetic.source === owner.residues, 'domain-mismatch', 'log proof arithmetic'); algebra.assert(ctx, h);
  const difference = arithmetic.subtract(arithmetic.multiply(arithmetic.view(h.representative), arithmetic.view(argument)),
    arithmetic.multiply(arithmetic.view(weight), arithmetic.view(derivative)));
  demand(arithmetic.zeroModulo(difference, arithmetic.modulus(algebra.modulus)), 'verification-failed', 'weighted logarithmic derivative identity');
}
