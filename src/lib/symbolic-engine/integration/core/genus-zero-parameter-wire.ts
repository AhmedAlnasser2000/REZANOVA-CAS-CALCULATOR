import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {reconstructConstantBaseChangedCurveWithin} from './algebraic-curve';
import {PolynomialRing} from './polynomial';
import {RationalFunctionField} from './rational-function';
import {AlgebraicDivisorWireContext} from './algebraic-divisor-wire-context';
import {algebraicCanonicalGeometryCodec} from './algebraic-geometry-wire';
import {algebraicPlaceDecompositionCodec} from './algebraic-place-wire';
import {algebraicRiemannRochCodec, algebraicPrincipalDivisorCodec, encodeAlgebraicDivisorArtifact, decodeAlgebraicDivisorArtifact} from './algebraic-divisor-wire';
import {algebraicConstantQuotientCodec} from './algebraic-primitive-wire';
import {numberFieldPresentationCodec} from './number-field-wire';
import {verifyGenusZeroParameterWithin, type GenusZeroParameter} from './genus-zero-parameter';
import {verifyGenusZeroConstantParameterWithin, type GenusZeroConstantParameter} from './genus-zero-constant-extension';
import * as w from './decision-wire-algebra';

export function genusZeroParameterCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<GenusZeroParameter<E>> {
  const {ctx, bounds} = s, field = new RationalFunctionField(new PolynomialRing(curve.coordinates.constantOwner, 'parameter')), rational = s.scalar(field);
  const common = w.structure(ctx, {geometry: algebraicCanonicalGeometryCodec(s, curve), points: algebraicPlaceDecompositionCodec(s, curve), point: w.integer(ctx),
    space: algebraicRiemannRochCodec(s, curve), index: w.integer(ctx), parameter: s.native(curve.owner), divisor: algebraicPrincipalDivisorCodec(s, curve), derivative: s.derivative(curve.owner)});
  return {encode(p) {
    verifyGenusZeroParameterWithin(ctx, curve, p, bounds); demand(p.field.ring.variable === 'parameter', 'domain-mismatch', 'genus-zero formal parameter variable');
    const convert = (v: typeof p.xImage) => field.make(ctx, field.ring.make(ctx, v.numerator.coefficients), field.ring.make(ctx, v.denominator.coefficients));
    ctx.allocate(p.basisImages.length + 3); return Object.freeze({evidence: common.encode(p), xImage: rational.encode(convert(p.xImage)), basisImages: w.list(ctx, rational).encode(p.basisImages.map(convert))});
  }, decode(data) {
    const raw = w.record(ctx, data, ['evidence', 'xImage', 'basisImages']), saved = common.decode(raw.evidence); ctx.allocate(12);
    const proof = Object.freeze({...saved, curve, field, xImage: rational.decode(raw.xImage), basisImages: w.list(ctx, rational).decode(raw.basisImages)});
    verifyGenusZeroParameterWithin(ctx, curve, proof, bounds); return proof;
  }};
}
function constantParameterCodec<E>(s: AlgebraicDivisorWireContext, source: AlgebraicCurveView<E>): w.EvidenceCodec<GenusZeroConstantParameter<E>> {
  const {ctx, bounds} = s, original = genusZeroParameterCodec(s, source), geometry = algebraicCanonicalGeometryCodec(s, source), quotient = algebraicConstantQuotientCodec(s, source);
  return {encode(p) {
    verifyGenusZeroConstantParameterWithin(ctx, source, p, bounds);
    if (p.kind === 'native') return Object.freeze({kind: 'native', parameter: original.encode(p.parameter)});
    return Object.freeze({kind: 'constant-extension', geometry: geometry.encode(p.geometry), point: w.integer(ctx).encode(p.point),
      presentation: numberFieldPresentationCodec(ctx, p.geometry.infinity.places[p.point].residue, bounds, p.quotient.relative.target).encode(p.presentation),
      quotient: quotient.encode(p.quotient), parameter: genusZeroParameterCodec(s, p.curve).encode(p.parameter)});
  }, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'genus-zero presentation'); const descriptor = Object.getOwnPropertyDescriptor(data, 'kind');
    demand(descriptor !== undefined && 'value' in descriptor, 'invalid-input', 'genus-zero presentation discriminator');
    if (descriptor.value === 'native') {const raw = w.record(ctx, data, ['kind', 'parameter']); ctx.allocate(3); return Object.freeze({kind: 'native', source, parameter: original.decode(raw.parameter)});}
    const raw = w.record(ctx, data, ['kind', 'geometry', 'point', 'presentation', 'quotient', 'parameter']); demand(raw.kind === 'constant-extension', 'invalid-input', 'genus-zero constant tag');
    const g = geometry.decode(raw.geometry), point = w.integer(ctx).decode(raw.point); demand(point < g.infinity.places.length, 'invalid-input', 'genus-zero residue place index');
    const q = quotient.decode(raw.quotient), presentation = numberFieldPresentationCodec(ctx, g.infinity.places[point].residue, bounds, q.relative.target).decode(raw.presentation), curve = reconstructConstantBaseChangedCurveWithin(ctx, q.change, bounds);
    const parameter = genusZeroParameterCodec(s, curve).decode(raw.parameter); ctx.allocate(8);
    const proof = Object.freeze({kind: 'constant-extension' as const, source, geometry: g, point, quotient: q, presentation, curve, parameter}); verifyGenusZeroConstantParameterWithin(ctx, source, proof, bounds); return proof;
  }};
}
export function encodeGenusZeroConstantParameter<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: GenusZeroConstantParameter<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {verifyGenusZeroConstantParameterWithin(ctx, curve, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'genus-zero-rational-presentation', bounds, s => constantParameterCodec(s, curve));});
}
export function decodeGenusZeroConstantParameter<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, data: unknown, bounds: DifferentialBounds): GenusZeroConstantParameter<E> {
  return ctx.operation(() => {const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'genus-zero-rational-presentation', bounds, s => constantParameterCodec(s, curve));
    verifyGenusZeroConstantParameterWithin(ctx, curve, proof, bounds); return proof;});
}
