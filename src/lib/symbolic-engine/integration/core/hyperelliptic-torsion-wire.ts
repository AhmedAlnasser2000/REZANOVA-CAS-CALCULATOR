import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {PositiveWireContext} from './positive-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {algebraicGoodReductionCodec} from './algebraic-good-reduction-wire';
import {algebraicDivisorSpecializationCodec} from './algebraic-divisor-torsion-wire';
import {reducedInfinityPellOrderCodec} from './reduced-infinity-pell-wire';
import {hyperellipticModelCodec, hyperellipticInfinityPrincipalityCodec} from './hyperelliptic-pell-wire';
import {verifyHyperellipticInfinityTorsionWithin, type HyperellipticInfinityTorsion, type HyperellipticPellReducedOrder} from './hyperelliptic-infinity-torsion';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {recordRationalGcdEvidence, replayRationalGcdEvidence} from './rational-gcd-evidence';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import * as w from './decision-wire-algebra';

function reducedCodec<E>(s: PositiveWireContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>): w.EvidenceCodec<HyperellipticPellReducedOrder<E>> {
  const ctx = s.ctx, codec = algebraicGoodReductionCodec(s, curve);
  return {encode(p) {return Object.freeze({reduction: codec.encode(p.reduction), specialization: algebraicDivisorSpecializationCodec(s, p.reduction, divisor).encode(p.specialization),
    order: reducedInfinityPellOrderCodec(s, p.reduction.curve, p.reduction.model, p.specialization.divisor).encode(p.order)});},
    decode(data) {const raw = w.record(ctx, data, ['reduction', 'specialization', 'order']), reduction = codec.decode(raw.reduction), specialization = algebraicDivisorSpecializationCodec(s, reduction, divisor).decode(raw.specialization);
      const order = reducedInfinityPellOrderCodec(s, reduction.curve, reduction.model, specialization.divisor).decode(raw.order); return Object.freeze({reduction, specialization, order});}};
}
function evidenceCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>): w.EvidenceCodec<HyperellipticInfinityTorsion<E>> {
  const ctx = s.ctx, positive = new PositiveWireContext(ctx, s.bounds, s), common = w.structure(ctx, {rule: w.literal(ctx, 'hyperelliptic-infinity-two-reduction-pell-v1'),
    reductions: w.list(ctx, reducedCodec(positive, curve, divisor)), third: reducedCodec(positive, curve, divisor), reason: w.literal(ctx, 'third-reduction', 'native-principality'), gcd: s.integer(), multiple: s.integer(), kind: w.literal(ctx, 'torsion', 'non-torsion'), order: w.optional(s.integer())}), target = algebraicDivisorCodec(s, curve), model = hyperellipticModelCodec(s, curve);
  return {encode(proof) {const p = proof.principal; return Object.freeze({evidence: common.encode(proof), principal: p === null ? null : Object.freeze({target: target.encode(p.divisor), model: model.encode(p.model), evidence: hyperellipticInfinityPrincipalityCodec(s, curve, p.divisor, p.model).encode(p)})});},
    decode(data) {
      const raw = w.record(ctx, data, ['evidence', 'principal']), commonValue = common.decode(raw.evidence);
      demand(commonValue.reductions.length === 2, 'verification-failed', 'two complete serialized infinity reductions');
      if (raw.principal === null) {
        const proof = Object.freeze({...commonValue, reductions: Object.freeze([commonValue.reductions[0], commonValue.reductions[1]] as const), divisor, principal: null});
        verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof, s.bounds); return proof;
      }
      const principal = w.record(ctx, raw.principal, ['target', 'model', 'evidence']), request = target.decode(principal.target);
      verifyAlgebraicDivisorWithin(ctx, curve, divisor.entries.map(e => ({place: e.place, coefficient: ctx.multiply(e.coefficient, commonValue.multiple)})), request);
      for (let i = 0; i < divisor.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, divisor.entries[i].place, request.entries[i].place);
      const presentation = model.decode(principal.model), checked = hyperellipticInfinityPrincipalityCodec(s, curve, request, presentation).decode(principal.evidence);
      const proof = Object.freeze({...commonValue, reductions: Object.freeze([commonValue.reductions[0], commonValue.reductions[1]] as const), divisor, principal: checked});
      verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof, s.bounds); return proof;
    }};
}
export function hyperellipticInfinityTorsionCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>): w.EvidenceCodec<HyperellipticInfinityTorsion<E>> {
  return evidenceCodec(s, curve, divisor);
}
export function encodeHyperellipticInfinityTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: HyperellipticInfinityTorsion<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    demand(proof.arithmetic !== undefined, 'verification-failed', 'infinity torsion explicit arithmetic coverage');
    const recorded = recordRationalGcdEvidence(ctx, () => {verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
      return Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), request: algebraicDivisorCodec(s, curve).encode(divisor), evidence: evidenceCodec(s, curve, divisor).encode(proof)});}, proof.arithmetic);
    const s = new NormalizedAlgebraicWireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).encode(recorded.evidence);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({...recorded.value, arithmetic}), bounds), data = Object.freeze({tag: 'algebraic-divisor-torsion', version: 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeHyperellipticInfinityTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): HyperellipticInfinityTorsion<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-divisor-torsion' && raw.version === 2, 'invalid-input', 'infinity Pell torsion tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'evidence', 'arithmetic']), s = new NormalizedAlgebraicWireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).decode(body.arithmetic);
    const proof = replayRationalGcdEvidence(ctx, arithmetic, () => {
      algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const request = algebraicDivisorCodec(s, curve).decode(body.request); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, request);
      for (let i = 0; i < divisor.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, divisor.entries[i].place, request.entries[i].place);
      return evidenceCodec(s, curve, divisor).decode(body.evidence);
    }); return Object.freeze({...proof, arithmetic});
  }));
}
