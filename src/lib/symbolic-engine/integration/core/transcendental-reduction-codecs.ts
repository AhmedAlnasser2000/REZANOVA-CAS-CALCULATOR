/** Identical reduction wiring with separately typed subsidiary proof codecs. */
import type {ExecutionContext} from './execution';
import type {TranscendentalDomain} from './transcendental-domain';
import {firstLevelReductionCodecs} from './first-level-rational-reduction-codecs';
import {differentialValueCodec} from './first-level-rational-primitive-codecs';
import {normalizationInteger} from './exponential-normalization-wire-values';
import * as w from './decision-wire-algebra';

export function transcendentalFamilyReductionCodecs<L, R>(ctx: ExecutionContext, d: TranscendentalDomain, limited: w.EvidenceCodec<L>, rde: w.EvidenceCodec<R>) {
  const c = firstLevelReductionCodecs(ctx, d), base = differentialValueCodec(ctx, d.base), integer = normalizationInteger(ctx);
  const polynomial = w.structure(ctx, {input: c.e, steps: w.list(ctx, w.structure(ctx, {degree: integer, input: c.e, leading: base,
    limited, correction: w.optional(c.e), derivative: w.optional(c.derivative), next: w.optional(c.e)})),
    fieldPart: c.e, remainder: w.optional(base), failure: w.optional(w.integer(ctx))});
  const laurent = w.structure(ctx, {input: c.e, powers: w.list(ctx, integer), steps: w.list(ctx, w.structure(ctx, {power: integer, coefficient: base,
    rde, correction: w.optional(c.e), derivative: w.optional(c.derivative)})), fieldPart: c.e, remainder: base, failure: w.optional(w.integer(ctx))});
  return {polynomial, laurent};
}
