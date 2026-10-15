import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {FiniteField} from './positive-field';
import {encodeFiniteFieldSnapshot, verifyFiniteFieldSnapshot} from './positive-field-wire';
import type {PositivePolynomial, PositivePolynomialRing} from './positive-polynomial';
import {PositiveWireContext} from './positive-wire';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {verifyPositivePellWithin, type PositivePellDecision} from './positive-pell';
import * as w from './decision-wire-algebra';

export function positivePellEvidenceCodec<E>(s: PositiveWireContext, field: FiniteField<E>, r: PositivePolynomialRing<E>): w.EvidenceCodec<PositivePellDecision<E>> {
  const ctx = s.ctx, c = s.coefficient(field), p = s.polynomial(r, c), optional = w.optional(p);
  return w.structure(ctx, {rule: w.literal(ctx, 'polynomial-pell-bounded-cf-v1'), input: p, maximumDegree: s.integer(), squareFree: s.bezout(p), polynomialPart: p,
    steps: w.list(ctx, w.structure(ctx, {offset: p, denominator: p, division: w.division(ctx, p), nextOffset: p, nextDenominator: p, numerator: optional, convergentDenominator: optional, norm: optional})),
    kind: w.literal(ctx, 'unit', 'bounded-empty'), numerator: optional, denominator: optional, norm: w.optional(c), leastDegree: w.optional(s.integer())});
}
export function encodePositivePell<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, input: PositivePolynomial<E>, bound: bigint, proof: PositivePellDecision<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyPositivePellWithin(ctx, field, r, input, bound, proof, bounds); const s = new PositiveWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeFiniteFieldSnapshot(s, field), evidence: positivePellEvidenceCodec(s, field, r).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'finite-polynomial-pell-decision', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodePositivePell<E>(ctx: ExecutionContext, field: FiniteField<E>, r: PositivePolynomialRing<E>, input: PositivePolynomial<E>, bound: bigint, data: unknown, bounds: DifferentialBounds): PositivePellDecision<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'finite-polynomial-pell-decision' && raw.version === 1, 'invalid-input', 'finite Pell tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'evidence']), s = new PositiveWireContext(ctx, bounds);
    verifyFiniteFieldSnapshot(s, field, body.construction); const proof = positivePellEvidenceCodec(s, field, r).decode(body.evidence); verifyPositivePellWithin(ctx, field, r, input, bound, proof, bounds); return proof;
  });
}
