import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicCoefficientCodec, algebraicConditionsCodec } from './algebraic-wire';
import { algebraicDifferentialReductionCodec } from './algebraic-reduction-wire';
import { algebraicResidueRelationsCodec } from './algebraic-residue-wire';
import { algebraicLogarithmicConstructionCodec } from './algebraic-logarithmic-wire';
import { algebraicExactDifferentialCodec } from './algebraic-differential-wire';
import { algebraicPrimitiveCodec, algebraicPrimitiveDerivativeCodec } from './algebraic-primitive-wire';
import { withAlgebraicPrimitiveArithmeticWithin } from './algebraic-primitive';
import { encodeAlgebraicArithmeticArtifact, decodeAlgebraicArithmeticArtifact } from './algebraic-arithmetic-wire';
import { algebraicIntegrationRule, verifyAlgebraicDecisionWithin, type AlgebraicDecision } from './algebraic-decision';
import { verifyGoodReductionClaim } from './algebraic-reduction-errors';
import * as w from './decision-wire-algebra';

export function algebraicDecisionCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicDecision<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), common = w.structure(ctx, {rule: w.literal(ctx, algebraicIntegrationRule), input: native, reduction: algebraicDifferentialReductionCodec(s, curve), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)});
  return s.memo('algebraic-integration-decision', curve, {encode(p) {
    const base = {kind: p.kind, common: common.encode(p)};
    if (p.kind === 'non-elementary' && p.reason === 'infinity-principal-part-obstruction') return Object.freeze({...base, reason: p.reason, later: p.later});
    demand(p.reduction.kind === 'simple-poles', 'verification-failed', 'decision codec complete simple-pole prefix');
    const log = {relations: algebraicResidueRelationsCodec(s, curve, p.reduction.residues).encode(p.relations), logarithms: algebraicLogarithmicConstructionCodec(s, curve, p.relations).encode(p.logarithms)};
    if (p.kind === 'non-elementary' && p.reason === 'non-torsion-residue-divisor') return Object.freeze({...base, ...log, reason: p.reason, later: p.later});
    const tail = {remainder: native.encode(p.remainder), exact: algebraicExactDifferentialCodec(s, curve).encode(p.exact)};
    if (p.kind === 'non-elementary') return Object.freeze({...base, ...log, ...tail, reason: p.reason, later: p.later});
    return Object.freeze({...base, ...log, ...tail, primitive: algebraicPrimitiveCodec(s, curve, p.relations.splitting.splitting.target).encode(p.primitive), derivative: algebraicPrimitiveDerivativeCodec(s, p.primitive).encode(p.derivative)});
  }, decode(v) {
    demand(v !== null && typeof v === 'object', 'invalid-input', 'algebraic decision discriminator'); const kind = Object.getOwnPropertyDescriptor(v, 'kind'), reason = Object.getOwnPropertyDescriptor(v, 'reason');
    demand(kind !== undefined && 'value' in kind && (kind.value === 'elementary' || kind.value === 'non-elementary'), 'invalid-input', 'algebraic decision outcome');
    const negative = kind.value === 'non-elementary'; if (negative) demand(reason !== undefined && 'value' in reason, 'invalid-input', 'algebraic negative reason');
    const why = negative ? reason!.value : null, baseKeys = ['kind', 'common'], logKeys = ['relations', 'logarithms'], tailKeys = ['remainder', 'exact'];
    const raw = w.record(ctx, v, negative ? why === 'infinity-principal-part-obstruction' ? [...baseKeys, 'reason', 'later'] : why === 'non-torsion-residue-divisor' ? [...baseKeys, ...logKeys, 'reason', 'later'] : [...baseKeys, ...logKeys, ...tailKeys, 'reason', 'later'] : [...baseKeys, ...logKeys, ...tailKeys, 'primitive', 'derivative']), base = common.decode(raw.common); let proof: AlgebraicDecision<E>;
    if (negative && why === 'infinity-principal-part-obstruction') proof = Object.freeze({...base, kind: 'non-elementary', reason: 'infinity-principal-part-obstruction', later: w.literal(ctx, 'unperformed').decode(raw.later)});
    else {
      demand(base.reduction.kind === 'simple-poles', 'verification-failed', 'decision stored simple-pole prefix'); const relations = algebraicResidueRelationsCodec(s, curve, base.reduction.residues).decode(raw.relations), logarithms = algebraicLogarithmicConstructionCodec(s, curve, relations).decode(raw.logarithms);
      if (negative && why === 'non-torsion-residue-divisor') proof = Object.freeze({...base, relations, logarithms, kind: 'non-elementary', reason: 'non-torsion-residue-divisor', later: w.literal(ctx, 'unperformed').decode(raw.later)});
      else {
        const remainder = native.decode(raw.remainder), exact = algebraicExactDifferentialCodec(s, curve).decode(raw.exact);
        if (negative) { demand(why === 'nonzero-holomorphic-remainder', 'invalid-input', 'algebraic negative authority category'); proof = Object.freeze({...base, relations, logarithms, remainder, exact, kind: 'non-elementary', reason: 'nonzero-holomorphic-remainder', later: w.literal(ctx, 'complete').decode(raw.later)}); }
        else { const primitive = algebraicPrimitiveCodec(s, curve, relations.splitting.splitting.target).decode(raw.primitive), derivative = algebraicPrimitiveDerivativeCodec(s, primitive).decode(raw.derivative); proof = Object.freeze({...base, relations, logarithms, remainder, exact, kind: 'elementary', primitive, derivative}); }
      }
    }
    verifyAlgebraicDecisionWithin(ctx, curve, proof.input, proof, bounds); return proof;
  }});
}
export function encodeAlgebraicDecision<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDecision<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => verifyGoodReductionClaim(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'complete integration artifact arithmetic coverage');
    return encodeAlgebraicArithmeticArtifact(ctx, curve, proof, 'algebraic-integration-decision', bounds, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDecisionWithin(ctx, curve, input, proof, bounds); }, s => algebraicDecisionCodec(s, curve)); }));
}
export function decodeAlgebraicDecision<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): AlgebraicDecision<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => { const d = decodeAlgebraicArithmeticArtifact(ctx, curve, data, 'algebraic-integration-decision', bounds, s => algebraicDecisionCodec(s, curve));
    demand(curve.owner.equal(ctx, input, d.value.input), 'domain-mismatch', 'integration artifact complete expected input');
    return d.value.kind === 'elementary' ? Object.freeze({...d.value, primitive: withAlgebraicPrimitiveArithmeticWithin(ctx, d.value.primitive, d.arithmetic), derivative: Object.freeze({...d.value.derivative, arithmetic: d.arithmetic}), arithmetic: d.arithmetic}) : Object.freeze({...d.value, arithmetic: d.arithmetic}); }));
}
