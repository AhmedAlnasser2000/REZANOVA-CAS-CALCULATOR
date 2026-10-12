import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { algebraicCoefficientCodec, algebraicConditionsCodec, algebraicFactorizationCodec } from './algebraic-wire';
import { matrixInverseCodec } from './algebraic-module-wire';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { algebraicCurveEvidenceCodec } from './algebraic-curve-wire';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicPlaceCodec, algebraicPlaceDecompositionCodec, algebraicValuationCodec, curveIdealCodec, curveIdealPowerCodec, curveIdealProductCodec } from './algebraic-place-wire';
import { constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, verifyAlgebraicPrincipalDivisorWithin,
  type AlgebraicDivisor, type AlgebraicDivisorEntry, type AlgebraicPrincipalDivisor } from './algebraic-divisor';
import { verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';
import type { HessLatticeSpace } from './algebraic-hess-lattice';
import { algebraicPrincipalityRule, verifyAlgebraicPrincipalityWithin, type AlgebraicPrincipality } from './algebraic-principality';
import { verifyAlgebraicPlaceDecompositionWithin, type AlgebraicPlaceDecomposition } from './algebraic-place';
import type { Polynomial } from './polynomial';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { equalAlgebraicPlaces } from './algebraic-place';
import * as w from './decision-wire-algebra';

export function algebraicDivisorCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicDivisor<E>> {
  const {ctx} = state, entry = w.structure(ctx, {place: algebraicPlaceCodec(state, curve), coefficient: state.integer()});
  const parts = w.structure(ctx, {input: w.list(ctx, entry), entries: w.list(ctx, entry), degree: state.integer()});
  return state.memo<AlgebraicDivisor<E>>('divisor', curve, {encode: parts.encode, decode(v) {
    const decoded = parts.decode(v), proof = constructAlgebraicDivisorWithin(ctx, curve, decoded.input);
    // Registration follows complete reconstruction; the serialized support and
    // degree are checked as well, so neither can be silently repaired.
    demand(decoded.degree === proof.degree && decoded.entries.length === proof.entries.length && decoded.entries.every((e, i) => e.coefficient === proof.entries[i].coefficient
      && equalAlgebraicPlaces(ctx, curve, e.place, proof.entries[i].place)), 'verification-failed', 'serialized divisor support/degree');
    return proof;
  }});
}
function hessCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<HessLatticeSpace> {
  const {ctx} = state, f = curve.finite.lattice.scalar, c = state.coefficient(f), p = w.polynomial(ctx, f.ring, c), s = state.scalar(f);
  return w.structure(ctx, {steps: w.list(ctx, w.structure(ctx, {target: w.integer(ctx), relation: w.list(ctx, c), factors: w.list(ctx, p)})),
    reduced: w.list(ctx, w.list(ctx, s)), transformation: w.list(ctx, w.list(ctx, p)), weights: w.list(ctx, w.integer(ctx, -Number.MAX_SAFE_INTEGER)),
    leadingInverse: matrixInverseCodec(ctx, c), indices: w.list(ctx, w.structure(ctx, {row: w.integer(ctx), power: w.integer(ctx)})), basis: w.list(ctx, w.list(ctx, s))});
}
export function algebraicRiemannRochCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicRiemannRoch<E>> {
  const {ctx, bounds} = state, ideal = curveIdealCodec(state, curve);
  const lattice = (infinity: boolean) => w.structure(ctx, {infinity: w.literal(ctx, infinity), unit: ideal,
    components: w.list(ctx, w.structure(ctx, {index: w.integer(ctx), power: curveIdealPowerCodec(state, curve), product: curveIdealProductCodec(state, curve)})),
    ideal, lattice: state.lattice((infinity ? curve.infinity : curve.finite).lattice.scalar)});
  const parts = w.structure(ctx, {divisor: algebraicDivisorCodec(state, curve), finite: lattice(false), infinity: lattice(true), hess: hessCodec(state, curve),
    inverse: matrixInverseCodec(ctx, state.scalar(curve.coordinates.scalar)), basis: w.list(ctx, algebraicCoefficientCodec(ctx, curve.owner, bounds)),
    dimension: w.integer(ctx), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)});
  return state.memo('riemann-roch', curve, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyAlgebraicRiemannRochWithin(ctx, curve, proof.divisor, proof, bounds); return proof; }});
}
export function algebraicPrincipalDivisorCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicPrincipalDivisor<E>> {
  const {ctx, bounds} = state, f = curve.finite.lattice.scalar, s = state.scalar(f), place = algebraicPlaceDecompositionCodec(state, curve);
  const parts = w.structure(ctx, {input: algebraicCoefficientCodec(ctx, curve.owner, bounds), normalization: w.structure(ctx, {coordinates: w.list(ctx, s),
    denominators: state.denominators(f), integral: w.list(ctx, s), norm: matrixInverseCodec(ctx, s)}), denominatorFactors: algebraicFactorizationCodec(ctx, f.ring, bounds),
    normFactors: algebraicFactorizationCodec(ctx, f.ring, bounds), finite: w.list(ctx, place), infinity: place, valuations: w.list(ctx, algebraicValuationCodec(state, curve)),
    divisor: algebraicDivisorCodec(state, curve), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)});
  return state.memo('principal-divisor', curve, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyAlgebraicPrincipalDivisorWithin(ctx, curve, proof.input, proof, bounds); return proof; }});
}
export function algebraicPrincipalityCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicPrincipality<E>> {
  const {ctx, bounds} = state, d = algebraicDivisorCodec(state, curve), common = {rule: w.literal(ctx, algebraicPrincipalityRule), divisor: d};
  const degree = w.structure(ctx, {...common, kind: w.literal(ctx, 'not-principal'), reason: w.literal(ctx, 'nonzero-degree')});
  const space = {negative: d, space: algebraicRiemannRochCodec(state, curve)};
  const zero = w.structure(ctx, {...common, ...space, kind: w.literal(ctx, 'not-principal'), reason: w.literal(ctx, 'zero-space')});
  const positive = w.structure(ctx, {...common, ...space, kind: w.literal(ctx, 'principal'), witness: algebraicCoefficientCodec(ctx, curve.owner, bounds), principal: algebraicPrincipalDivisorCodec(state, curve)});
  return state.memo('principality', curve, {
    encode(v) { return v.kind === 'principal' ? positive.encode(v) : v.reason === 'nonzero-degree' ? degree.encode(v) : zero.encode(v); },
    decode(v) {
      demand(v !== null && typeof v === 'object', 'invalid-input', 'principality evidence');
      const kind = Object.getOwnPropertyDescriptor(v, 'kind'), reason = Object.getOwnPropertyDescriptor(v, 'reason');
      demand(kind !== undefined && 'value' in kind, 'invalid-input', 'principality kind');
      const proof = kind.value === 'principal' ? positive.decode(v) : reason && 'value' in reason && reason.value === 'nonzero-degree' ? degree.decode(v) : zero.decode(v);
      verifyAlgebraicPrincipalityWithin(ctx, curve, proof.divisor, proof, bounds); return proof;
    },
  });
}
/** The entire shared graph is bounded first. Its references provide identity
 * sharing only; every reconstructed object still receives native verification. */
export function encodeAlgebraicDivisorArtifact<E, T>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: T, tag: string,
  bounds: DifferentialBounds, factory: (s: AlgebraicDivisorWireContext) => w.EvidenceCodec<T>): unknown {
  const state = new AlgebraicDivisorWireContext(ctx, bounds), payload = packRecursiveArtifactGraph(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(state, curve).encode(curve), evidence: factory(state).encode(proof)}), bounds);
  const data = Object.freeze({tag, version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
}
export function decodeAlgebraicDivisorArtifact<E, T>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, data: unknown, tag: string,
  bounds: DifferentialBounds, factory: (s: AlgebraicDivisorWireContext) => w.EvidenceCodec<T>): T {
  inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
  demand(raw.tag === tag && raw.version === 1, 'invalid-input', 'divisor artifact tag/version');
  const body = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['curve', 'evidence']), state = new AlgebraicDivisorWireContext(ctx, bounds);
  algebraicCurveEvidenceCodec(state, curve).decode(body.curve); return factory(state).decode(body.evidence);
}
export function encodeAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[], proof: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, input, proof);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-divisor', bounds, state => algebraicDivisorCodec(state, curve)); });
}
export function decodeAlgebraicDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: readonly AlgebraicDivisorEntry<E>[], data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-divisor', bounds, state => algebraicDivisorCodec(state, curve));
    verifyAlgebraicDivisorWithin(ctx, curve, input, proof); return proof; });
}
export function encodeAlgebraicRiemannRoch<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: AlgebraicRiemannRoch<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicRiemannRochWithin(ctx, curve, divisor, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-riemann-roch', bounds, state => algebraicRiemannRochCodec(state, curve)); });
}
export function decodeAlgebraicRiemannRoch<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const decoded = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-riemann-roch', bounds, state => algebraicRiemannRochCodec(state, curve));
    verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, decoded.divisor); const proof = Object.freeze({...decoded, divisor});
    verifyAlgebraicRiemannRochWithin(ctx, curve, divisor, proof, bounds); return proof; });
}
export function encodeAlgebraicPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: AlgebraicPrincipality<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPrincipalityWithin(ctx, curve, divisor, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-principality', bounds, state => algebraicPrincipalityCodec(state, curve)); });
}
export function decodeAlgebraicPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const decoded = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-principality', bounds, state => algebraicPrincipalityCodec(state, curve));
    verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, decoded.divisor); const proof = Object.freeze({...decoded, divisor});
    verifyAlgebraicPrincipalityWithin(ctx, curve, divisor, proof, bounds); return proof; });
}
export function encodeAlgebraicPlaceDecomposition<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: Polynomial<CurveConstant>, infinity: boolean, proof: AlgebraicPlaceDecomposition<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPlaceDecompositionWithin(ctx, curve, input, infinity, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-place-decomposition', bounds, state => algebraicPlaceDecompositionCodec(state, curve)); });
}
export function decodeAlgebraicPlaceDecomposition<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: Polynomial<CurveConstant>, infinity: boolean, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-place-decomposition', bounds, state => algebraicPlaceDecompositionCodec(state, curve));
    verifyAlgebraicPlaceDecompositionWithin(ctx, curve, input, infinity, proof, bounds); return proof; });
}
export function encodeAlgebraicPrincipalDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicPrincipalDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPrincipalDivisorWithin(ctx, curve, input, proof, bounds);
    return encodeAlgebraicDivisorArtifact(ctx, curve, proof, 'algebraic-principal-divisor', bounds, state => algebraicPrincipalDivisorCodec(state, curve)); });
}
export function decodeAlgebraicPrincipalDivisor<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
    const proof = decodeAlgebraicDivisorArtifact(ctx, curve, data, 'algebraic-principal-divisor', bounds, state => algebraicPrincipalDivisorCodec(state, curve));
    verifyAlgebraicPrincipalDivisorWithin(ctx, curve, input, proof, bounds); return proof; });
}
