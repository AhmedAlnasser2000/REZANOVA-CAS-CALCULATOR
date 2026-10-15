import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing} from './polynomial';
import {normalizationInteger} from './exponential-normalization-wire-values';
import {algebraicNormalizedValueCodec} from './algebraic-normalized-wire';
import {encodeAlgebraicSnapshot, verifyAlgebraicSnapshot} from './algebraic-wire';
import {numberFieldResultantCodec} from './number-field-resultant-wire';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {requireNumberFieldBivariateRing, verifyNumberFieldPolynomialResultantWithin, type NumberFieldBivariateRing, type NumberFieldBivariate, type NumberFieldPolynomialResultant} from './number-field-polynomial-resultant';
import * as w from './decision-wire-algebra';

export function numberFieldPolynomialResultantCodec<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, scalar: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<NumberFieldPolynomialResultant<E>> {
  const coefficient = algebraicNormalizedValueCodec(ctx, ring.domain.ring.domain, bounds), inner = w.polynomial(ctx, ring.domain.ring, coefficient), outer = w.polynomial(ctx, ring, inner), integer = normalizationInteger(ctx);
  const common = {inputA: outer, inputB: outer, resultant: inner}, boundary = w.structure(ctx, {...common, method: w.literal(ctx, 'boundary')}), evaluated = w.structure(ctx, {...common, method: w.literal(ctx, 'complete-specialization'), bound: integer,
    points: w.list(ctx, w.structure(ctx, {point: integer, proof: numberFieldResultantCodec(ctx, scalar, bounds)}))});
  return {encode(proof) {return proof.method === 'boundary' ? boundary.encode(proof) : evaluated.encode(proof);}, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'polynomial resultant method'); const method = Object.getOwnPropertyDescriptor(data, 'method'); demand(method !== undefined && 'value' in method, 'invalid-input', 'polynomial resultant discriminator');
    if (method.value === 'boundary') return boundary.decode(data); demand(method.value === 'complete-specialization', 'invalid-input', 'polynomial resultant method'); const proof = evaluated.decode(data); ctx.allocate(1); return Object.freeze({...proof, scalarRing: scalar});
  }};
}
export function encodeNumberFieldPolynomialResultant<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>, proof: NumberFieldPolynomialResultant<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyNumberFieldPolynomialResultantWithin(ctx, ring, a, b, proof, bounds); const scalar = proof.method === 'complete-specialization' ? proof.scalarRing : new PolynomialRing(ring.domain.ring.domain, ring.variable); ctx.allocate(4);
    const data = Object.freeze({tag: 'number-field-polynomial-resultant', version: 1, construction: encodeAlgebraicSnapshot(ctx, ring.domain.ring.domain, bounds), evidence: numberFieldPolynomialResultantCodec(ctx, ring, scalar, bounds).encode(proof)}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeNumberFieldPolynomialResultant<E>(ctx: ExecutionContext, ring: NumberFieldBivariateRing<E>, a: NumberFieldBivariate<E>, b: NumberFieldBivariate<E>, data: unknown, bounds: DifferentialBounds): NumberFieldPolynomialResultant<E> {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'evidence']); demand(raw.tag === 'number-field-polynomial-resultant' && raw.version === 1, 'invalid-input', 'polynomial resultant tag/version');
    requireNumberFieldBivariateRing(ctx, ring, bounds); verifyAlgebraicSnapshot(ctx, ring.domain.ring.domain, raw.construction, bounds);
    ring.assert(ctx, a); ring.assert(ctx, b);
    const scalar = new PolynomialRing(ring.domain.ring.domain, ring.variable), proof = numberFieldPolynomialResultantCodec(ctx, ring, scalar, bounds).decode(raw.evidence); verifyNumberFieldPolynomialResultantWithin(ctx, ring, a, b, proof, bounds); return proof;
  });
}
