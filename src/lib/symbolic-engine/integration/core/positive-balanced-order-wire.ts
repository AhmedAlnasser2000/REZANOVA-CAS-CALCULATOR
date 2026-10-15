/** Finite balanced least-order replay with no BSGS or factorization search. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PositiveWireContext} from './positive-wire';
import {encodeFiniteFieldSnapshot, verifyFiniteFieldSnapshot} from './positive-field-wire';
import {balancedArithmeticEvidenceCodecs} from './balanced-cantor-wire-algebra';
import {reconstructPositiveBalancedDomainWithin, verifyPositiveBalancedDomainWithin, type PositiveBalancedDomain, type PositiveBalancedDivisor} from './positive-balanced-cantor';
import {verifyPositiveBalancedOrderWithin, type PositiveBalancedOrder} from './positive-balanced-order';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import * as w from './decision-wire-algebra';

export function positiveBalancedOrderCodec<E>(s: PositiveWireContext, domain: PositiveBalancedDomain<E>): w.EvidenceCodec<PositiveBalancedOrder<E>> {
  const ctx = s.ctx, p = s.polynomial(domain.ring, s.coefficient(domain.field)), integer = s.integer(), {divisor, multiple} = balancedArithmeticEvidenceCodecs(ctx, p, integer, (name, codec) => s.memo(name, domain, codec));
  return w.structure(ctx, {rule: w.literal(ctx, 'finite-balanced-class-order-v1'), input: divisor,
    bound: w.structure(ctx, {size: integer, genus: integer, root: integer, upper: integer, step: integer}), order: integer, multiple,
    functions: w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'polynomial', 'y-minus-polynomial'), polynomial: p, exponent: integer})),
    factors: w.list(ctx, w.structure(ctx, {prime: integer, multiplicity: integer})), exclusions: w.list(ctx, w.structure(ctx, {prime: integer, multiple}))});
}
export function encodePositiveBalancedOrder<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, proof: PositiveBalancedOrder<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyPositiveBalancedOrderWithin(ctx, domain, input, proof, bounds); const s = new PositiveWireContext(ctx, bounds), p = s.polynomial(domain.ring, s.coefficient(domain.field));
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeFiniteFieldSnapshot(s, domain.field), polynomial: p.encode(domain.polynomial), squareFree: s.bezout(p).encode(domain.squareFree),
      plus: p.encode(domain.plus), minus: p.encode(domain.minus), infinityRemainder: p.encode(domain.infinityRemainder), evidence: positiveBalancedOrderCodec(s, domain).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'finite-balanced-class-order', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodePositiveBalancedOrder<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, data: unknown, bounds: DifferentialBounds): PositiveBalancedOrder<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'finite-balanced-class-order' && raw.version === 1, 'invalid-input', 'finite balanced order tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'polynomial', 'squareFree', 'plus', 'minus', 'infinityRemainder', 'evidence']); verifyPositiveBalancedDomainWithin(ctx, domain, bounds);
    const s = new PositiveWireContext(ctx, bounds); verifyFiniteFieldSnapshot(s, domain.field, body.construction); const p = s.polynomial(domain.ring, s.coefficient(domain.field)), h = p.decode(body.polynomial), plus = p.decode(body.plus);
    demand(domain.ring.equal(ctx, h, domain.polynomial) && domain.ring.equal(ctx, plus, domain.plus), 'verification-failed', 'finite balanced order exact model and infinity labels');
    const fresh = reconstructPositiveBalancedDomainWithin(ctx, domain.field, domain.ring, h, s.bezout(p).decode(body.squareFree), Object.freeze({plus, minus: p.decode(body.minus), infinityRemainder: p.decode(body.infinityRemainder)}), bounds);
    const proof = positiveBalancedOrderCodec(s, fresh).decode(body.evidence); verifyPositiveBalancedOrderWithin(ctx, fresh, input, proof, bounds); return proof;
  });
}
