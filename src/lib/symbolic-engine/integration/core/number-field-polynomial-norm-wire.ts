import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, type Polynomial} from './polynomial';
import {PolynomialDomain} from './polynomial-domain';
import type {AlgebraicField, AlgebraicElement} from './algebraic-field';
import {algebraicNormalizedValueCodec} from './algebraic-normalized-wire';
import {encodeAlgebraicSnapshot, verifyAlgebraicSnapshot} from './algebraic-wire';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {numberFieldPolynomialResultantCodec} from './number-field-polynomial-resultant-wire';
import {requireNumberFieldPolynomialNormInputWithin, verifyNumberFieldPolynomialNormWithin, type NumberFieldPolynomialNorm} from './number-field-polynomial-norm';
import * as w from './decision-wire-algebra';

export function numberFieldPolynomialNormEvidenceCodec<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, inputRing: PolynomialRing<AlgebraicElement<E>>, ring: NumberFieldPolynomialNorm<E>['ring'], scalar: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<NumberFieldPolynomialNorm<E>> {
  const coefficient = algebraicNormalizedValueCodec(ctx, owner.parent, bounds), inner = w.polynomial(ctx, ring.domain.ring, coefficient), outer = w.polynomial(ctx, ring, inner), native = w.polynomial(ctx, inputRing, algebraicNormalizedValueCodec(ctx, owner, bounds));
  const codec = w.structure(ctx, {input: native, defining: outer, converted: outer, resultant: numberFieldPolynomialResultantCodec(ctx, ring, scalar, bounds), value: inner});
  return {encode: codec.encode, decode(data) {const proof = codec.decode(data); ctx.allocate(1); return Object.freeze({...proof, ring});}};
}
export function encodeNumberFieldPolynomialNorm<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, proof: NumberFieldPolynomialNorm<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyNumberFieldPolynomialNormWithin(ctx, owner, input, proof, bounds);
    const scalar = proof.resultant.method === 'complete-specialization' ? proof.resultant.scalarRing : new PolynomialRing(owner.parent, owner.ring.variable); ctx.allocate(4);
    const data = Object.freeze({tag: 'number-field-polynomial-norm', version: 1, construction: encodeAlgebraicSnapshot(ctx, owner, bounds), evidence: numberFieldPolynomialNormEvidenceCodec(ctx, owner, input.ring, proof.ring, scalar, bounds).encode(proof)});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeNumberFieldPolynomialNorm<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, data: unknown, bounds: DifferentialBounds): NumberFieldPolynomialNorm<E> {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'evidence']); demand(raw.tag === 'number-field-polynomial-norm' && raw.version === 1, 'invalid-input', 'polynomial norm tag/version');
    requireNumberFieldPolynomialNormInputWithin(ctx, owner, input, bounds); verifyAlgebraicSnapshot(ctx, owner, raw.construction, bounds);
    const inner = new PolynomialRing(owner.parent, input.ring.variable), ring = new PolynomialRing(new PolynomialDomain(inner), owner.ring.variable), scalar = new PolynomialRing(owner.parent, owner.ring.variable);
    const proof = numberFieldPolynomialNormEvidenceCodec(ctx, owner, input.ring, ring, scalar, bounds).decode(raw.evidence); verifyNumberFieldPolynomialNormWithin(ctx, owner, input, proof, bounds); return proof;
  });
}
