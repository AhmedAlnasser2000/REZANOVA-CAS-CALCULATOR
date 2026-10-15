/** Separate bounded characteristic-zero balanced-multiple artifacts. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {encodeAlgebraicSnapshot, verifyAlgebraicSnapshot} from './algebraic-wire';
import {algebraicNormalizedValueCodec} from './algebraic-normalized-wire';
import {reconstructBalancedDomainWithin, verifyBalancedDomainWithin, verifyBalancedMumfordMultipleWithin,
  type BalancedDomain, type BalancedMumfordDivisor, type BalancedMumfordMultiple} from './hyperelliptic-balanced';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import {balancedArithmeticEvidenceCodecs} from './balanced-cantor-wire-algebra';
import * as w from './decision-wire-algebra';

export function balancedMumfordMultipleCodec<E>(s: NormalizedAlgebraicWireContext, domain: BalancedDomain<E>): w.EvidenceCodec<BalancedMumfordMultiple<E>> {
  const p = w.polynomial(s.ctx, domain.ring, algebraicNormalizedValueCodec(s.ctx, domain.ring.domain, s.bounds));
  return balancedArithmeticEvidenceCodecs(s.ctx, p, s.integer(), (name, codec) => s.memo(name, domain, codec)).multiple;
}
export function encodeBalancedMumfordMultiple<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, input: BalancedMumfordDivisor<E>, coefficient: bigint, proof: BalancedMumfordMultiple<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyBalancedMumfordMultipleWithin(ctx, domain, input, coefficient, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds), p = w.polynomial(ctx, domain.ring, algebraicNormalizedValueCodec(ctx, domain.ring.domain, bounds));
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeAlgebraicSnapshot(ctx, domain.ring.domain, bounds), polynomial: p.encode(domain.polynomial),
      squareFree: w.bezout(ctx, p).encode(domain.squareFree), plus: p.encode(domain.plus), minus: p.encode(domain.minus), infinityRemainder: p.encode(domain.infinityRemainder),
      evidence: balancedMumfordMultipleCodec(s, domain).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'balanced-cantor-multiple', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeBalancedMumfordMultiple<E>(ctx: ExecutionContext, domain: BalancedDomain<E>, input: BalancedMumfordDivisor<E>, coefficient: bigint, data: unknown, bounds: DifferentialBounds): BalancedMumfordMultiple<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'balanced-cantor-multiple' && raw.version === 1, 'invalid-input', 'balanced multiple tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'polynomial', 'squareFree', 'plus', 'minus', 'infinityRemainder', 'evidence']);
    verifyBalancedDomainWithin(ctx, domain, bounds); verifyAlgebraicSnapshot(ctx, domain.ring.domain, body.construction, bounds);
    const s = new NormalizedAlgebraicWireContext(ctx, bounds), p = w.polynomial(ctx, domain.ring, algebraicNormalizedValueCodec(ctx, domain.ring.domain, bounds)), h = p.decode(body.polynomial), plus = p.decode(body.plus);
    demand(domain.ring.equal(ctx, h, domain.polynomial) && domain.ring.equal(ctx, plus, domain.plus), 'verification-failed', 'balanced exact model and infinity labels');
    const fresh = reconstructBalancedDomainWithin(ctx, domain.ring, h, w.bezout(ctx, p).decode(body.squareFree), Object.freeze({plus, minus: p.decode(body.minus), infinityRemainder: p.decode(body.infinityRemainder)}), bounds);
    const proof = balancedMumfordMultipleCodec(s, fresh).decode(body.evidence); verifyBalancedMumfordMultipleWithin(ctx, fresh, input, coefficient, proof, bounds); return proof;
  });
}
