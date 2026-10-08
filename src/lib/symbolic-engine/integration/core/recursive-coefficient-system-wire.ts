import type { ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import { factorCoefficientDomain } from './factorization-domain';
import type { DifferentialBounds } from './differential-field';
import { MultivariateRing } from './multivariate-polynomial';
import { normalizationPolynomialCodec } from './exponential-normalization-wire-values';
import { linearSystemCodec } from './linear-wire';
import type { RationalCoefficientSystem } from './recursive-coefficient-system';
import * as w from './decision-wire-algebra';

/** Fresh auxiliary domains on decode; exact native inverse conversion belongs to the verifier. */
export function coefficientSystemCodec<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds): w.EvidenceCodec<RationalCoefficientSystem> {
  const domain = factorCoefficientDomain(ctx, field, bounds.towerHeight);
  const parts = (ring: MultivariateRing<import('./rational').Rational>) => {
    const p = normalizationPolynomialCodec(ctx, ring, w.scalar(ctx));
    return w.structure(ctx, {rows: w.list(ctx, w.structure(ctx, {
      values: w.list(ctx, w.structure(ctx, {numerator: p, denominator: p})), denominator: p,
      quotients: w.list(ctx, p), cleared: w.list(ctx, p), support: w.list(ctx, w.list(ctx, w.integer(ctx))),
    })), system: linearSystemCodec(ctx, w.scalar(ctx))});
  };
  return {
    encode(value) { return parts(value.auxiliary).encode(value); },
    decode(value) {
      const auxiliary = MultivariateRing.create(ctx, Q, domain.height), result = parts(auxiliary).decode(value); ctx.allocate(3);
      return Object.freeze({...result, auxiliary});
    },
  };
}
