import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing } from './polynomial';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import type { FormalPrimitive } from './formal-primitive';
import { encodePrimitive, decodePrimitiveInDomain } from './primitive-wire';
import { rationalPrimitiveDerivativeCodec } from './rational-primitive-evidence-codecs';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicCoefficientCodec, algebraicConditionsCodec, algebraicFactorizationCodec } from './algebraic-wire';
import { auxiliaryAlgebraicCodec } from './algebraic-module-wire';
import { numberFieldPresentationCodec } from './number-field-wire';
import { algebraicConstantQuotientCodec, algebraicPrimitiveCodec, algebraicPrimitiveDerivativeCodec } from './algebraic-primitive-wire';
import { verifyAlgebraicRationalPrimitiveEmbeddingWithin, type AlgebraicRationalPrimitiveEmbedding, type AlgebraicRationalRoot } from './algebraic-rational-primitive';
import { withAlgebraicPrimitiveArithmeticWithin } from './algebraic-primitive';
import { encodeAlgebraicArithmeticArtifact, decodeAlgebraicArithmeticArtifact } from './algebraic-arithmetic-wire';
import * as w from './decision-wire-algebra';

function sourceCodec(ctx: ExecutionContext, expected: FormalPrimitive): w.EvidenceCodec<FormalPrimitive> {
  const d = expected.owner, x = w.polynomial(ctx, d.x, w.scalar(ctx)), norm = w.prsEvidence(ctx, w.polynomial(ctx, d.elimination, x), x);
  return {encode(p) { d.assert(ctx, p); return Object.freeze({primitive: encodePrimitive(ctx, p), norms: w.list(ctx, norm).encode(p.terms.map(t => t.normEvidence))}); }, decode(v) {
    const raw = w.record(ctx, v, ['primitive', 'norms']), p = decodePrimitiveInDomain(ctx, d, raw.primitive, w.list(ctx, norm).decode(raw.norms));
    demand(d.fractions.equal(ctx, expected.rationalPart, p.rationalPart) && expected.terms.length === p.terms.length && p.terms.every((t, i) => d.z.equal(ctx, t.modulus, expected.terms[i].modulus)
      && d.z.equal(ctx, t.weight, expected.terms[i].weight) && d.arguments.equal(ctx, t.argument, expected.terms[i].argument) && d.x.equal(ctx, t.norm, expected.terms[i].norm)), 'domain-mismatch', 'rational embedding complete expected primitive'); return expected;
  }};
}
export function algebraicRationalPrimitiveEmbeddingCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive): w.EvidenceCodec<AlgebraicRationalPrimitiveEmbedding<E>> {
  const {ctx, bounds} = s, constant = curve.coordinates.constantOwner, quotient = algebraicConstantQuotientCodec(s, curve), native = algebraicCoefficientCodec(ctx, curve.owner, bounds);
  const roots: w.EvidenceCodec<AlgebraicRationalRoot<E>> = {encode(p) {
    demand((p.extension === null) === (p.presentation === null), 'verification-failed', 'rational embedding root presentation coverage');
    return Object.freeze({quotient: quotient.encode(p.quotient), root: algebraicCoefficientCodec(ctx, p.quotient.relative.target, bounds).encode(p.root),
      extension: p.extension === null ? null : auxiliaryAlgebraicCodec(ctx, constant, bounds).encode(p.extension), presentation: p.presentation === null ? null : numberFieldPresentationCodec(ctx, p.extension!, bounds).encode(p.presentation)});
  }, decode(v) {
    const raw = w.record(ctx, v, ['quotient', 'root', 'extension', 'presentation']), q = quotient.decode(raw.quotient), root = algebraicCoefficientCodec(ctx, q.relative.target, bounds).decode(raw.root);
    if (raw.extension === null) { demand(raw.presentation === null, 'invalid-input', 'linear root presentation'); return Object.freeze({quotient: q, root, extension: null, presentation: null}); }
    const extension = auxiliaryAlgebraicCodec(ctx, constant, bounds).decode(raw.extension), presentation = numberFieldPresentationCodec(ctx, extension, bounds, q.relative.target).decode(raw.presentation);
    return Object.freeze({quotient: q, root, extension, presentation});
  }};
  const components: w.EvidenceCodec<AlgebraicRationalPrimitiveEmbedding<E>['components']> = {encode(entries) {
    demand(entries.length === source.terms.length, 'verification-failed', 'rational embedding codec component coverage');
    return Object.freeze(entries.map((p, i) => { const ring = p.factorization.input.ring; demand(ring.domain === constant && ring.variable === source.terms[i].modulus.ring.variable, 'domain-mismatch', 'rational embedding factor coefficient binding');
      return w.structure(ctx, {factorization: algebraicFactorizationCodec(ctx, ring, bounds), roots: w.list(ctx, roots)}).encode(p); }));
  }, decode(v) {
    const entries = w.array(ctx, v); demand(entries.length === source.terms.length, 'verification-failed', 'rational embedding codec component coverage');
    return Object.freeze(entries.map((p, i) => { const ring = new PolynomialRing(constant, source.terms[i].modulus.ring.variable); return w.structure(ctx, {factorization: algebraicFactorizationCodec(ctx, ring, bounds), roots: w.list(ctx, roots)}).decode(p); }));
  }};
  const base = w.structure(ctx, {source: sourceCodec(ctx, source), sourceDerivative: rationalPrimitiveDerivativeCodec(ctx, source.owner, source), target: native, components, conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)}), primitive = algebraicPrimitiveCodec(s, curve);
  return {encode(p) { return Object.freeze({evidence: base.encode(p), primitive: primitive.encode(p.primitive), derivative: algebraicPrimitiveDerivativeCodec(s, p.primitive).encode(p.derivative)}); }, decode(v) {
    const raw = w.record(ctx, v, ['evidence', 'primitive', 'derivative']), p = primitive.decode(raw.primitive), evidence = base.decode(raw.evidence), derivative = algebraicPrimitiveDerivativeCodec(s, p).decode(raw.derivative), result = Object.freeze({...evidence, primitive: p, derivative});
    verifyAlgebraicRationalPrimitiveEmbeddingWithin(ctx, curve, source, result, bounds); return result;
  }};
}
export function encodeAlgebraicRationalPrimitiveEmbedding<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, proof: AlgebraicRationalPrimitiveEmbedding<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'rational embedding artifact arithmetic coverage');
    return encodeAlgebraicArithmeticArtifact(ctx, curve, proof, 'algebraic-primitive', bounds, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicRationalPrimitiveEmbeddingWithin(ctx, curve, source, proof, bounds); }, s => algebraicRationalPrimitiveEmbeddingCodec(s, curve, source)); });
}
export function decodeAlgebraicRationalPrimitiveEmbedding<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, data: unknown, bounds: DifferentialBounds): AlgebraicRationalPrimitiveEmbedding<E> {
  return ctx.operation(() => { const d = decodeAlgebraicArithmeticArtifact(ctx, curve, data, 'algebraic-primitive', bounds, s => algebraicRationalPrimitiveEmbeddingCodec(s, curve, source));
    return Object.freeze({...d.value, primitive: withAlgebraicPrimitiveArithmeticWithin(ctx, d.value.primitive, d.arithmetic), arithmetic: d.arithmetic}); });
}
