/** Separate finite balanced-multiple replay with full finite construction. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PositiveWireContext} from './positive-wire';
import {encodeFiniteFieldSnapshot, verifyFiniteFieldSnapshot} from './positive-field-wire';
import {reconstructPositiveBalancedDomainWithin, verifyPositiveBalancedDomainWithin, verifyPositiveBalancedMultipleWithin,
  type PositiveBalancedDomain, type PositiveBalancedDivisor, type PositiveBalancedMultiple} from './positive-balanced-cantor';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import {balancedArithmeticEvidenceCodecs} from './balanced-cantor-wire-algebra';
import * as w from './decision-wire-algebra';

export function positiveBalancedMultipleCodec<E>(s: PositiveWireContext, domain: PositiveBalancedDomain<E>): w.EvidenceCodec<PositiveBalancedMultiple<E>> {
  const p = s.polynomial(domain.ring, s.coefficient(domain.field)); return balancedArithmeticEvidenceCodecs(s.ctx, p, s.integer(), (name, codec) => s.memo(name, domain, codec)).multiple;
}
export function encodePositiveBalancedMultiple<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, coefficient: bigint, proof: PositiveBalancedMultiple<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyPositiveBalancedMultipleWithin(ctx, domain, input, coefficient, proof, bounds); const s = new PositiveWireContext(ctx, bounds), p = s.polynomial(domain.ring, s.coefficient(domain.field));
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeFiniteFieldSnapshot(s, domain.field), polynomial: p.encode(domain.polynomial), squareFree: s.bezout(p).encode(domain.squareFree),
      plus: p.encode(domain.plus), minus: p.encode(domain.minus), infinityRemainder: p.encode(domain.infinityRemainder), evidence: positiveBalancedMultipleCodec(s, domain).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'finite-balanced-cantor-multiple', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodePositiveBalancedMultiple<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, coefficient: bigint, data: unknown, bounds: DifferentialBounds): PositiveBalancedMultiple<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'finite-balanced-cantor-multiple' && raw.version === 1, 'invalid-input', 'finite balanced tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'polynomial', 'squareFree', 'plus', 'minus', 'infinityRemainder', 'evidence']);
    verifyPositiveBalancedDomainWithin(ctx, domain, bounds); const s = new PositiveWireContext(ctx, bounds); verifyFiniteFieldSnapshot(s, domain.field, body.construction);
    const p = s.polynomial(domain.ring, s.coefficient(domain.field)), h = p.decode(body.polynomial), plus = p.decode(body.plus);
    demand(domain.ring.equal(ctx, h, domain.polynomial) && domain.ring.equal(ctx, plus, domain.plus), 'verification-failed', 'finite balanced exact model and labels');
    const fresh = reconstructPositiveBalancedDomainWithin(ctx, domain.field, domain.ring, h, s.bezout(p).decode(body.squareFree), Object.freeze({plus, minus: p.decode(body.minus), infinityRemainder: p.decode(body.infinityRemainder)}), bounds);
    const proof = positiveBalancedMultipleCodec(s, fresh).decode(body.evidence); verifyPositiveBalancedMultipleWithin(ctx, fresh, input, coefficient, proof, bounds); return proof;
  });
}
