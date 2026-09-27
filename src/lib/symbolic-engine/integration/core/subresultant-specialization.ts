import { demand, type ExecutionContext } from './execution';
import type { Polynomial, PolynomialRing } from './polynomial';
import type { PolynomialDomain } from './polynomial-domain';
import { verifySubresultants, type SubresultantCertificate } from './subresultant';

/** Coefficient evaluation, retaining the source indices even when degree is lost.
 * These values are specialized subresultants, never a claim about a specialized GCD. */
export function specializeSubresultants<E>(ctx: ExecutionContext,
  source: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>,
  a: Polynomial<Polynomial<E>, PolynomialDomain<E>>, b: Polynomial<Polynomial<E>, PolynomialDomain<E>>,
  proof: SubresultantCertificate<Polynomial<E>, PolynomialDomain<E>>, at: E,
  target: PolynomialRing<E>) {
  verifySubresultants(ctx, source, a, b, proof);
  const field = source.domain.ring.domain;
  // Target identity is explicit; no compatibility inferred from a printed name.
  demand(target.domain === field && target.variable === source.variable, 'domain-mismatch', 'specialization target domain/variable');
  field.assert(ctx, at);
  const evaluate = (p: Polynomial<E>): E => {
    source.domain.ring.assert(ctx, p);
    let value = field.fromInteger(ctx, 0n);
    for (let i = p.coefficients.length - 1; i >= 0; i--) {
      ctx.tick(); value = field.add(ctx, field.multiply(ctx, value, at), p.coefficients[i]);
    }
    target.domain.assert(ctx, value); return value;
  };
  const specialize = (p: Polynomial<Polynomial<E>, PolynomialDomain<E>>) => {
    ctx.allocate(p.coefficients.length + 4);
    const polynomial = target.make(ctx, p.coefficients.map(evaluate));
    const originalDegree = source.degree(ctx, p), degree = target.degree(ctx, polynomial);
    return Object.freeze({ polynomial, originalDegree, degree, degreeLost: degree < originalDegree });
  };
  ctx.allocate(proof.indexed.length + 3);
  return Object.freeze({ inputDegrees: proof.inputDegrees,
    inputs: Object.freeze([specialize(a), specialize(b)]), resultant: evaluate(proof.resultant),
    indexed: Object.freeze(proof.indexed.map(entry => Object.freeze({ index: entry.index, kind: entry.kind,
      ...specialize(entry.polynomial), principal: evaluate(entry.principal) }))) });
}
