/** Full source/specialization binding around distinct compact balanced data. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import type {BalancedCurveModel} from './hyperelliptic-balanced-place';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {PositiveWireContext} from './positive-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {algebraicGoodReductionCodec} from './algebraic-good-reduction-wire';
import {algebraicDivisorSpecializationCodec} from './algebraic-divisor-torsion-wire';
import {reducedBalancedOrderCodec} from './reduced-balanced-wire';
import {balancedCurveModelCodec, balancedPrincipalityCodec} from './hyperelliptic-balanced-principality-wire';
import {verifyBalancedDivisorTorsionWithin, type BalancedDivisorTorsion, type BalancedReducedOrder} from './balanced-divisor-torsion';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {recordRationalGcdEvidence, replayRationalGcdEvidence} from './rational-gcd-evidence';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import * as w from './decision-wire-algebra';

function reducedCodec<E>(s: PositiveWireContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>): w.EvidenceCodec<BalancedReducedOrder<E>> {
  const ctx = s.ctx, codec = algebraicGoodReductionCodec(s, curve);
  return {encode(p) {return Object.freeze({reduction: codec.encode(p.reduction), specialization: algebraicDivisorSpecializationCodec(s, p.reduction, divisor).encode(p.specialization),
    order: reducedBalancedOrderCodec(s, p.reduction.curve, p.reduction.model, p.specialization.divisor).encode(p.order)});},
    decode(data) {const raw = w.record(ctx, data, ['reduction', 'specialization', 'order']), reduction = codec.decode(raw.reduction), specialization = algebraicDivisorSpecializationCodec(s, reduction, divisor).decode(raw.specialization),
      order = reducedBalancedOrderCodec(s, reduction.curve, reduction.model, specialization.divisor).decode(raw.order); ctx.allocate(3); return Object.freeze({reduction, specialization, order});}};
}
export function balancedDivisorTorsionCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, source: BalancedCurveModel<E>, divisor: AlgebraicDivisor<E>): w.EvidenceCodec<BalancedDivisorTorsion<E>> {
  const ctx = s.ctx, positive = new PositiveWireContext(ctx, s.bounds, s), reduced = reducedCodec(positive, curve, divisor), direct = balancedPrincipalityCodec(s, source, divisor);
  const common = w.structure(ctx, {rule: w.literal(ctx, 'split-balanced-two-reduction-v1'), direct, reductions: w.list(ctx, reduced), third: w.optional(reduced), multiple: s.integer(),
    kind: w.literal(ctx, 'torsion', 'non-torsion'), reason: w.literal(ctx, 'degree', 'principal-divisor', 'third-reduction', 'native-principality'), order: w.optional(s.integer())}), target = algebraicDivisorCodec(s, curve);
  return {encode(proof) {return Object.freeze({evidence: common.encode(proof), principal: proof.principal === null ? null : Object.freeze({target: target.encode(proof.principal.divisor),
    evidence: balancedPrincipalityCodec(s, source, proof.principal.divisor).encode(proof.principal)})});}, decode(data) {
    const raw = w.record(ctx, data, ['evidence', 'principal']), body = common.decode(raw.evidence); let principal: BalancedDivisorTorsion<E>['principal'] = null;
    if (raw.principal !== null) {
      const p = w.record(ctx, raw.principal, ['target', 'evidence']), request = target.decode(p.target);
      verifyAlgebraicDivisorWithin(ctx, curve, divisor.entries.map(e => ({place: e.place, coefficient: ctx.multiply(e.coefficient, body.multiple)})), request);
      for (let i = 0; i < divisor.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, divisor.entries[i].place, request.entries[i].place);
      principal = balancedPrincipalityCodec(s, source, request).decode(p.evidence);
    }
    ctx.allocate(4); const proof = Object.freeze({source, divisor, ...body, principal}); verifyBalancedDivisorTorsionWithin(ctx, curve, divisor, proof, s.bounds); return proof;
  }};
}
export function encodeBalancedDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: BalancedDivisorTorsion<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    demand(proof.arithmetic !== undefined, 'verification-failed', 'balanced torsion explicit arithmetic coverage');
    const recorded = recordRationalGcdEvidence(ctx, () => {verifyBalancedDivisorTorsionWithin(ctx, curve, divisor, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
      return Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), request: algebraicDivisorCodec(s, curve).encode(divisor), source: balancedCurveModelCodec(s, curve).encode(proof.source),
        evidence: balancedDivisorTorsionCodec(s, curve, proof.source, divisor).encode(proof)});}, proof.arithmetic);
    const s = new NormalizedAlgebraicWireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).encode(recorded.evidence),
      payload = packAlgebraicArtifactData(ctx, Object.freeze({...recorded.value, arithmetic}), bounds), data = Object.freeze({tag: 'hyperelliptic-balanced-divisor-torsion', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeBalancedDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): BalancedDivisorTorsion<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'hyperelliptic-balanced-divisor-torsion' && raw.version === 1, 'invalid-input', 'balanced torsion tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'source', 'evidence', 'arithmetic']), s = new NormalizedAlgebraicWireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).decode(body.arithmetic);
    const proof = replayRationalGcdEvidence(ctx, arithmetic, () => {
      algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const request = algebraicDivisorCodec(s, curve).decode(body.request); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, request);
      for (let i = 0; i < divisor.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, divisor.entries[i].place, request.entries[i].place);
      const source = balancedCurveModelCodec(s, curve).decode(body.source); return balancedDivisorTorsionCodec(s, curve, source, divisor).decode(body.evidence);
    }); return Object.freeze({...proof, arithmetic});
  }));
}
