import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PositiveWireContext} from './positive-wire';
import {encodeFiniteFieldSnapshot, verifyFiniteFieldSnapshot} from './positive-field-wire';
import {cantorArithmeticEvidenceCodecs} from './cantor-wire-algebra';
import {reconstructPositiveCantorDomainWithin, verifyPositiveCantorDomainWithin, type PositiveCantorDomain, type PositiveMumfordPair} from './positive-cantor';
import {verifyPositiveCantorOrderWithin, type PositiveCantorOrder} from './positive-cantor-order';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import * as w from './decision-wire-algebra';

export function positiveCantorOrderCodec<E>(s: PositiveWireContext, domain: PositiveCantorDomain<E>): w.EvidenceCodec<PositiveCantorOrder<E>> {
  const ctx = s.ctx, p = s.polynomial(domain.ring, s.coefficient(domain.field)), integer = s.integer(), {pair, multiple} = cantorArithmeticEvidenceCodecs(ctx, p, integer, (name, codec) => s.memo(name, domain, codec));
  return w.structure(ctx, {rule: w.literal(ctx, 'finite-cantor-class-order-v1'), input: pair,
    bound: w.structure(ctx, {size: integer, genus: integer, root: integer, upper: integer, step: integer}), order: integer, multiple,
    functions: w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'polynomial', 'y-minus-polynomial'), polynomial: p, exponent: integer})),
    factors: w.list(ctx, w.structure(ctx, {prime: integer, multiplicity: integer})), exclusions: w.list(ctx, w.structure(ctx, {prime: integer, multiple}))});
}
export function encodePositiveCantorOrder<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, proof: PositiveCantorOrder<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyPositiveCantorOrderWithin(ctx, domain, input, proof, bounds); const s = new PositiveWireContext(ctx, bounds), p = s.polynomial(domain.ring, s.coefficient(domain.field));
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeFiniteFieldSnapshot(s, domain.field), polynomial: p.encode(domain.polynomial),
      squareFree: s.bezout(p).encode(domain.squareFree), evidence: positiveCantorOrderCodec(s, domain).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'finite-cantor-class-order', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodePositiveCantorOrder<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, data: unknown, bounds: DifferentialBounds): PositiveCantorOrder<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'finite-cantor-class-order' && raw.version === 1, 'invalid-input', 'finite Cantor order tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'polynomial', 'squareFree', 'evidence']); verifyPositiveCantorDomainWithin(ctx, domain, bounds);
    const s = new PositiveWireContext(ctx, bounds); verifyFiniteFieldSnapshot(s, domain.field, body.construction); const p = s.polynomial(domain.ring, s.coefficient(domain.field)), h = p.decode(body.polynomial);
    demand(domain.ring.equal(ctx, h, domain.polynomial), 'verification-failed', 'finite Cantor order exact polynomial');
    const fresh = reconstructPositiveCantorDomainWithin(ctx, domain.field, domain.ring, h, s.bezout(p).decode(body.squareFree), bounds), proof = positiveCantorOrderCodec(s, fresh).decode(body.evidence);
    verifyPositiveCantorOrderWithin(ctx, fresh, input, proof, bounds); return proof;
  });
}
