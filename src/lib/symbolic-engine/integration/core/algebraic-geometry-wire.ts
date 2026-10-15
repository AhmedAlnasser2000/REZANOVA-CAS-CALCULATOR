import { type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicCoefficientCodec, algebraicFactorizationCodec } from './algebraic-wire';
import { matrixInverseCodec } from './algebraic-module-wire';
import { linearEvidenceCodec } from './linear-wire';
import { algebraicDivisorCodec, algebraicPrincipalDivisorCodec, algebraicRiemannRochCodec, encodeAlgebraicDivisorArtifact, decodeAlgebraicDivisorArtifact } from './algebraic-divisor-wire';
import { algebraicPlaceCodec, algebraicPlaceDecompositionCodec, algebraicValuationCodec, curveIdealPowerCodec, bindExpectedAlgebraicPlace } from './algebraic-place-wire';
import { verifyAlgebraicCurveGeometryWithin, type AlgebraicCurveGeometry } from './algebraic-curve-geometry';
import { verifyAlgebraicLocalExpansionWithin, type AlgebraicLocalExpansion } from './algebraic-local';
import type { AlgebraicPlace } from './algebraic-place';
import { verifyAlgebraicFactoredFunctionWithin, type AlgebraicFactoredFunction, type AlgebraicFunctionFactor } from './algebraic-factored-function';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { verifyAlgebraicValuationWithin, type AlgebraicValuation } from './algebraic-valuation';
import * as w from './decision-wire-algebra';
import {verifyAlgebraicCanonicalGeometryWithin, type AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';

function canonicalParts<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>) {
  const {ctx, bounds} = state, place = algebraicPlaceDecompositionCodec(state, curve);
  return {finiteFactors: algebraicFactorizationCodec(ctx, curve.finite.lattice.scalar.ring, bounds), finite: w.list(ctx, place), infinity: place,
    canonical: algebraicDivisorCodec(state, curve), genus: state.integer()};
}
export function algebraicCanonicalGeometryCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicCanonicalGeometry<E>> {
  const parts = w.structure(state.ctx, canonicalParts(state, curve));
  return state.memo('canonical-geometry', curve, {encode: parts.encode, decode(data) {
    const proof = parts.decode(data); verifyAlgebraicCanonicalGeometryWithin(state.ctx, curve, proof, state.bounds); return proof;
  }});
}

export function algebraicCurveGeometryCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicCurveGeometry<E>> {
  const {ctx, bounds} = state, divisor = algebraicDivisorCodec(state, curve);
  const parts = w.structure(ctx, {...canonicalParts(state, curve), zero: divisor, globalFunctions: algebraicRiemannRochCodec(state, curve)});
  return state.memo('curve-geometry', curve, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyAlgebraicCurveGeometryWithin(ctx, curve, proof, bounds); return proof; }});
}
export function algebraicLocalExpansionCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicLocalExpansion<E>> {
  const {ctx, bounds} = state, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), c = algebraicCoefficientCodec(ctx, curve.coordinates.constantOwner, bounds);
  const valuation = algebraicValuationCodec(state, curve), slot = w.structure(ctx, {row: w.integer(ctx), power: w.integer(ctx)});
  const parts = (place: AlgebraicPlace<E>) => { const f = place.order.lattice.scalar, p = w.polynomial(ctx, f.ring, state.coefficient(f));
    return w.structure(ctx, {input: native, precision: state.integer(), regular: w.optional(valuation), parameter: w.structure(ctx, {index: w.integer(ctx), value: native, valuation}),
      power: curveIdealPowerCodec(state, curve), slots: w.list(ctx, slot), lifts: w.list(ctx, native), digitInverse: matrixInverseCodec(ctx, c), denominators: state.denominators(f),
      denominatorOrder: w.structure(ctx, {input: p, prime: p, quotients: w.list(ctx, p), final: p, coprime: w.bezout(ctx, p)}), extended: curveIdealPowerCodec(state, curve),
      extendedSlots: w.list(ctx, slot), elimination: linearEvidenceCodec(ctx, c), coefficients: w.list(ctx, c), digits: w.list(ctx, algebraicCoefficientCodec(ctx, place.residue, bounds)), lift: native, error: w.optional(valuation)}); };
  const at = algebraicPlaceCodec(state, curve);
  return state.memo('local-expansion', curve, {encode(v) { return Object.freeze({place: at.encode(v.place), evidence: parts(v.place).encode(v)}); },
    decode(v) { const raw = w.record(ctx, v, ['place', 'evidence']), place = at.decode(raw.place), proof = Object.freeze({place, ...parts(place).decode(raw.evidence)});
      verifyAlgebraicLocalExpansionWithin(ctx, curve, place, proof.input, proof.precision, proof); return proof; }});
}
export function algebraicFactoredFunctionCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicFactoredFunction<E>> {
  const {ctx, bounds} = state, parts = w.structure(ctx, {unit: algebraicCoefficientCodec(ctx, curve.coordinates.constantOwner, bounds),
    factors: w.list(ctx, w.structure(ctx, {value: algebraicCoefficientCodec(ctx, curve.owner, bounds), exponent: state.integer(), principal: algebraicPrincipalDivisorCodec(state, curve)})), divisor: algebraicDivisorCodec(state, curve)});
  return state.memo('factored-function', curve, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyAlgebraicFactoredFunctionWithin(ctx, curve, proof.unit, proof.factors, proof, bounds); return proof; }});
}
export function encodeAlgebraicCurveGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCurveGeometry<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicCurveGeometryWithin(ctx, curve, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-curve-geometry', bounds, s => algebraicCurveGeometryCodec(s, curve)); });
}
export function decodeAlgebraicCurveGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    return decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-curve-geometry', bounds, s => algebraicCurveGeometryCodec(s, curve)); });
}
export function encodeAlgebraicLocalExpansion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, precision: bigint, proof: AlgebraicLocalExpansion<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicLocalExpansionWithin(ctx, curve, place, input, precision, proof);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-local-expansion', bounds, s => algebraicLocalExpansionCodec(s, curve)); });
}
export function decodeAlgebraicLocalExpansion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, precision: bigint, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-local-expansion', bounds, s => algebraicLocalExpansionCodec(s, curve));
    bindExpectedAlgebraicPlace(new AlgebraicDivisorWireContext(ctx, bounds), curve, place, proof.place);
    verifyAlgebraicLocalExpansionWithin(ctx, curve, proof.place, input, precision, proof); return proof; });
}
export function encodeAlgebraicFactoredFunction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, unit: CurveConstant, input: readonly AlgebraicFunctionFactor<E>[], proof: AlgebraicFactoredFunction<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicFactoredFunctionWithin(ctx, curve, unit, input, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-factored-function', bounds, s => algebraicFactoredFunctionCodec(s, curve)); });
}
export function decodeAlgebraicFactoredFunction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, unit: CurveConstant, input: readonly AlgebraicFunctionFactor<E>[], data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-factored-function', bounds, s => algebraicFactoredFunctionCodec(s, curve));
    verifyAlgebraicFactoredFunctionWithin(ctx, curve, unit, input, proof, bounds); return proof; });
}
export function encodeAlgebraicValuation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, proof: AlgebraicValuation<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicValuationWithin(ctx, curve, place, input, proof);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-valuation', bounds, s => algebraicValuationCodec(s, curve)); });
}
export function decodeAlgebraicValuation<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-valuation', bounds, s => algebraicValuationCodec(s, curve));
    bindExpectedAlgebraicPlace(new AlgebraicDivisorWireContext(ctx, bounds), curve, place, proof.place);
    verifyAlgebraicValuationWithin(ctx, curve, proof.place, input, proof); return proof; });
}
