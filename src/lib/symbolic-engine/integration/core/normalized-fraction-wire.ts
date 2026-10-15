/** New explicit normalized-value format, separate from legacy fraction codecs. */
import {demand, type ExecutionContext} from './execution';
import type {RationalFunction, RationalFunctionField} from './rational-function';
import {assertRationalFunctionFieldOwner} from './rational-function';
import {extendedGcd} from './polynomial-division';
import * as w from './decision-wire-algebra';
export function normalizedFractionCodec<E>(ctx: ExecutionContext, field: RationalFunctionField<E>, coefficient: w.EvidenceCodec<E>): w.EvidenceCodec<RationalFunction<E>> {
  assertRationalFunctionFieldOwner(ctx, field); const r = field.ring, p = w.polynomial(ctx, r, coefficient);
  const codec = w.structure(ctx, {numerator: p, denominator: p, s: p, t: p});
  return {
    encode(value) {
      field.assert(ctx, value); const n = value.numerator, d = value.denominator;
      const proof = r.degree(ctx, d) === 0 ? {s: r.zero(ctx), t: r.one(ctx)}
        : r.degree(ctx, n) === 0 ? {s: r.constant(ctx, r.domain.inverse(ctx, n.coefficients[0])), t: r.zero(ctx)} : extendedGcd(ctx, r, n, d);
      const rebound = field.bindNormalized(ctx, n, d, proof);
      demand(field.equal(ctx, value, rebound), 'verification-failed', 'normalized fraction exact encoding');
      return codec.encode({numerator: n, denominator: d, s: proof.s, t: proof.t});
    },
    decode(data) {
      const value = codec.decode(data); return field.bindNormalized(ctx, value.numerator, value.denominator, value);
    }
  };
}
