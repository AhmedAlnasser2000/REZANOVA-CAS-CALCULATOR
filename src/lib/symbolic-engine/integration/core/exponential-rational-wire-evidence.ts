import { demand, type ExecutionContext } from './execution';
import type { ExponentialRationalDomain } from './exponential-rational-domain';
import { differentialValueCodec } from './first-level-rational-primitive-codecs';
import { firstLevelReductionCodecs } from './first-level-rational-reduction-codecs';
import * as w from './decision-wire-algebra';
export function exponentialReductionCodecs(ctx: ExecutionContext, d: ExponentialRationalDomain) {
  const c = firstLevelReductionCodecs(ctx, d), base = differentialValueCodec(ctx, d.base), { hermite, residue } = c;
  const bigint: w.EvidenceCodec<bigint> = {
    encode(v) { const bits = ctx.integer(v); ctx.allocate(bits + 1); return v.toString(); },
    decode(v) { demand(typeof v === 'string', 'invalid-input', 'Laurent exponent string'); ctx.integerText(v);
      demand(/^(0|-?[1-9][0-9]*)$/.test(v), 'invalid-input', 'canonical Laurent exponent'); const out = BigInt(v); ctx.integer(out); return out; },
  };
  const request = w.structure(ctx, { rationalPart: base, terms: w.list(ctx, w.structure(ctx, { coefficient: base, argument: base })) });
  const remainder = w.structure(ctx, { logarithms: c.primitive, derivative: c.proof, remainder: c.e, powers: w.list(ctx, bigint), request });
  return { ...c, hermite, residue, remainder };
}
