import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { algebraicCurveGeometryCodec } from './algebraic-geometry-wire';
import { algebraicPrincipalDivisorCodec, algebraicDivisorCodec, algebraicRiemannRochCodec } from './algebraic-divisor-wire';
import { algebraicCoefficientCodec, algebraicConditionsCodec, algebraicDerivativeCodec } from './algebraic-wire';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { encodeAlgebraicArithmeticArtifact, decodeAlgebraicArithmeticArtifact } from './algebraic-arithmetic-wire';
import { linearSystemCodec, linearEvidenceCodec } from './linear-wire';
import { verifyAlgebraicDifferentialWithin, type AlgebraicDifferential } from './algebraic-differential';
import { verifyAlgebraicExactDifferentialWithin, algebraicExactDifferentialRule, type AlgebraicExactDifferential } from './algebraic-exact-differential';
import type { AlgebraicCoefficientSystem } from './algebraic-coefficient-system';
import * as w from './decision-wire-algebra';

export function algebraicDifferentialCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicDifferential<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds);
  const parts = w.structure(ctx, {input: native, geometry: algebraicCurveGeometryCodec(s, curve), principal: w.optional(algebraicPrincipalDivisorCodec(s, curve)),
    divisor: w.optional(algebraicDivisorCodec(s, curve)), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)});
  return s.memo('algebraic-differential', curve, {encode: parts.encode, decode(v) { const p = parts.decode(v); verifyAlgebraicDifferentialWithin(ctx, curve, p.input, p, bounds); return p; }});
}
export function algebraicCoefficientSystemCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicCoefficientSystem> {
  const c = algebraicCoefficientCodec(s.ctx, curve.coordinates.constantOwner, s.bounds);
  return w.structure(s.ctx, {denominators: s.denominators(curve.coordinates.scalar), degree: w.integer(s.ctx, -1), system: linearSystemCodec(s.ctx, c)});
}
export function algebraicExactDifferentialCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicExactDifferential<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), constant = algebraicCoefficientCodec(ctx, curve.coordinates.constantOwner, bounds);
  const derivative = algebraicDerivativeCodec(ctx, curve.owner, bounds), common = {rule: w.literal(ctx, algebraicExactDifferentialRule), input: native,
    differential: algebraicDifferentialCodec(s, curve), bound: algebraicDivisorCodec(s, curve), space: algebraicRiemannRochCodec(s, curve),
    derivatives: w.list(ctx, derivative), matrix: algebraicCoefficientSystemCodec(s, curve), elimination: linearEvidenceCodec(ctx, constant), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)};
  const no = w.structure(ctx, {...common, kind: w.literal(ctx, 'no-field-primitive')}), yes = w.structure(ctx, {...common, kind: w.literal(ctx, 'primitive'), primitive: native,
    coordinates: w.list(ctx, constant), constantCoordinates: w.list(ctx, constant), projectionIndex: w.integer(ctx), derivative});
  return s.memo('exact-differential', curve, {encode(v) { return v.kind === 'primitive' ? yes.encode(v) : no.encode(v); }, decode(v) {
    demand(v !== null && typeof v === 'object', 'invalid-input', 'exact differential discriminator'); const kind = Object.getOwnPropertyDescriptor(v, 'kind');
    demand(kind !== undefined && 'value' in kind && (kind.value === 'primitive' || kind.value === 'no-field-primitive'), 'invalid-input', 'exact differential outcome');
    const p = kind.value === 'primitive' ? yes.decode(v) : no.decode(v); verifyAlgebraicExactDifferentialWithin(ctx, curve, p.input, p, bounds); return p;
  }});
}
export function encodeAlgebraicExactDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicExactDifferential<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'exact differential arithmetic coverage');
    return encodeAlgebraicArithmeticArtifact(ctx, curve, proof, 'algebraic-exact-differential-decision', bounds, proof.arithmetic,
      () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicExactDifferentialWithin(ctx, curve, input, proof, bounds); }, s => algebraicExactDifferentialCodec(s, curve)); });
}
export function decodeAlgebraicExactDifferential<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): AlgebraicExactDifferential<E> {
  return ctx.operation(() => {
    const decoded = decodeAlgebraicArithmeticArtifact(ctx, curve, data, 'algebraic-exact-differential-decision', bounds, s => algebraicExactDifferentialCodec(s, curve));
    demand(curve.owner.equal(ctx, input, decoded.value.input), 'domain-mismatch', 'exact differential artifact expected input');
    return Object.freeze({...decoded.value, arithmetic: decoded.arithmetic});
  });
}
