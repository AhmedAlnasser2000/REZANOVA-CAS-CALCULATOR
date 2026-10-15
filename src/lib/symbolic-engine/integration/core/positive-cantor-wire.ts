import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PositiveWireContext} from './positive-wire';
import {encodeFiniteFieldSnapshot, verifyFiniteFieldSnapshot} from './positive-field-wire';
import {reconstructPositiveCantorDomainWithin, verifyPositiveCantorDomainWithin, verifyPositiveMumfordMultipleWithin,
  type PositiveCantorDomain, type PositiveMumfordPair, type PositiveMumfordMultiple} from './positive-cantor';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import {cantorArithmeticEvidenceCodecs} from './cantor-wire-algebra';
import * as w from './decision-wire-algebra';

export function positiveCantorMultipleCodec<E>(s: PositiveWireContext, domain: PositiveCantorDomain<E>): w.EvidenceCodec<PositiveMumfordMultiple<E>> {
  const p = s.polynomial(domain.ring, s.coefficient(domain.field)); return cantorArithmeticEvidenceCodecs(s.ctx, p, s.integer(), (name, codec) => s.memo(name, domain, codec)).multiple;
}
export function encodePositiveCantorMultiple<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, coefficient: bigint, proof: PositiveMumfordMultiple<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyPositiveMumfordMultipleWithin(ctx, domain, input, coefficient, proof, bounds); const s = new PositiveWireContext(ctx, bounds), p = s.polynomial(domain.ring, s.coefficient(domain.field));
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeFiniteFieldSnapshot(s, domain.field), polynomial: p.encode(domain.polynomial),
      squareFree: s.bezout(p).encode(domain.squareFree), evidence: positiveCantorMultipleCodec(s, domain).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'finite-cantor-multiple', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodePositiveCantorMultiple<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, coefficient: bigint, data: unknown, bounds: DifferentialBounds): PositiveMumfordMultiple<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'finite-cantor-multiple' && raw.version === 1, 'invalid-input', 'finite Cantor tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'polynomial', 'squareFree', 'evidence']); verifyPositiveCantorDomainWithin(ctx, domain, bounds);
    const s = new PositiveWireContext(ctx, bounds); verifyFiniteFieldSnapshot(s, domain.field, body.construction); const p = s.polynomial(domain.ring, s.coefficient(domain.field)), h = p.decode(body.polynomial);
    demand(domain.ring.equal(ctx, h, domain.polynomial), 'verification-failed', 'finite Cantor exact polynomial request');
    const fresh = reconstructPositiveCantorDomainWithin(ctx, domain.field, domain.ring, h, s.bezout(p).decode(body.squareFree), bounds);
    const proof = positiveCantorMultipleCodec(s, fresh).decode(body.evidence); verifyPositiveMumfordMultipleWithin(ctx, fresh, input, coefficient, proof, bounds); return proof;
  });
}
