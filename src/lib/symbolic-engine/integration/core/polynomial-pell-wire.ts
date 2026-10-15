/** Bounded, explicit-request replay of the polynomial Pell subsidiary problem. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {PolynomialRing, Polynomial} from './polynomial';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {encodeAlgebraicSnapshot, verifyAlgebraicSnapshot} from './algebraic-wire';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {verifyPolynomialPellWithin, type PolynomialPellDecision} from './polynomial-pell';
import * as w from './decision-wire-algebra';

export function polynomialPellEvidenceCodec<E>(s: NormalizedAlgebraicWireContext, r: PolynomialRing<E>): w.EvidenceCodec<PolynomialPellDecision<E>> {
  const ctx = s.ctx, c = s.native(r.domain), p = w.polynomial(ctx, r, c), optional = w.optional(p);
  return w.structure(ctx, {
    rule: w.literal(ctx, 'polynomial-pell-bounded-cf-v1'), input: p, maximumDegree: s.integer(), squareFree: w.bezout(ctx, p), polynomialPart: p,
    steps: w.list(ctx, w.structure(ctx, {offset: p, denominator: p, division: w.division(ctx, p), nextOffset: p, nextDenominator: p,
      numerator: optional, convergentDenominator: optional, norm: optional})),
    kind: w.literal(ctx, 'unit', 'bounded-empty'), numerator: optional, denominator: optional, norm: w.optional(c), leastDegree: w.optional(s.integer())
  });
}
export function encodePolynomialPell<E>(ctx: ExecutionContext, r: PolynomialRing<E>, input: Polynomial<E>, maximumDegree: bigint, proof: PolynomialPellDecision<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyPolynomialPellWithin(ctx, r, input, maximumDegree, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({construction: encodeAlgebraicSnapshot(ctx, r.domain, bounds), evidence: polynomialPellEvidenceCodec(s, r).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'polynomial-pell-decision', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodePolynomialPell<E>(ctx: ExecutionContext, r: PolynomialRing<E>, input: Polynomial<E>, maximumDegree: bigint, data: unknown, bounds: DifferentialBounds): PolynomialPellDecision<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'polynomial-pell-decision' && raw.version === 1, 'invalid-input', 'bounded Pell tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['construction', 'evidence']);
    verifyAlgebraicSnapshot(ctx, r.domain, body.construction, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds), proof = polynomialPellEvidenceCodec(s, r).decode(body.evidence);
    verifyPolynomialPellWithin(ctx, r, input, maximumDegree, proof, bounds); return proof;
  });
}
