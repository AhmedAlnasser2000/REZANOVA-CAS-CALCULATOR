import type { ExecutionContext } from './execution';
import type { FormalPrimitiveDomain } from './formal-primitive';
import type { HermiteCertificate } from './hermite-reduction';
import * as w from './decision-wire-algebra';

/** Shared exact schema; preserves the rational-decision version-1 wire format. */
export function hermiteEvidenceCodec(ctx: ExecutionContext, owner: FormalPrimitiveDomain): w.EvidenceCodec<HermiteCertificate> {
  const q = w.scalar(ctx), x = w.polynomial(ctx, owner.x, q), f = w.fraction(ctx, owner.fractions, q);
  return w.structure(ctx, {
    division: w.division(ctx, x), polynomialPrimitive: x, decomposition: w.squareFreeEvidence(ctx, x, q),
    blocks: w.list(ctx, w.structure(ctx, { separation: w.bezout(ctx, x), numeratorDivision: w.division(ctx, x), derivativeBezout: w.bezout(ctx, x),
      steps: w.list(ctx, w.structure(ctx, { exponent: w.integer(ctx, 2), primitiveNumerator: x, nextNumerator: x })) })),
    rationalPart: f, residual: f,
  });
}
