/** Distinct compact simple-pole negatives. Original version-1/2/3 decoders
 * retain their own evidence types and mathematical checks. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicCoveredResiduesCodec, algebraicCoveredRelationsCodec, algebraicCoveredLogarithmsCodec} from './algebraic-covered-wire';
import {algebraicPoleCoverageCodec} from './algebraic-pole-coverage-wire';
import {algebraicGlobalFunctionSpaceCodec} from './algebraic-global-functions-wire';
import {verifyLazyAlgebraicNegativeWithin, type LazyAlgebraicNegative} from './algebraic-lazy-decision';
import {recordRationalGcdEvidence, replayRationalGcdEvidence} from './rational-gcd-evidence';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import {usesGeneralGenusOneLogarithms, type GeometricEvidenceFormat} from './algebraic-geometric-wire';
import * as w from './decision-wire-algebra';

function negativeCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, format: GeometricEvidenceFormat): w.EvidenceCodec<LazyAlgebraicNegative<E>> {
  const {ctx} = s, native = s.native(curve.owner), common = w.structure(ctx, {method: w.literal(ctx, 'integral-simple-poles'), rule: w.literal(ctx, 'algebraic-liouville-trager-v1'),
    kind: w.literal(ctx, 'non-elementary'), input: native, residues: algebraicCoveredResiduesCodec(s, curve), conditions: s.conditions(curve.owner)});
  return {encode(p) {
    const rest = {reason: p.reason, later: p.later, common: common.encode(p), relations: algebraicCoveredRelationsCodec(s, curve, p.residues).encode(p.relations), logarithms: algebraicCoveredLogarithmsCodec(s, curve, p.relations, format).encode(p.logarithms)};
    if (p.reason === 'non-torsion-residue-divisor') return Object.freeze(rest);
    return Object.freeze({...rest, remainder: native.encode(p.remainder), holomorphic: algebraicPoleCoverageCodec(s, curve).encode(p.holomorphic), globalFunctions: algebraicGlobalFunctionSpaceCodec(s, curve).encode(p.globalFunctions)});
  }, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'lazy negative discriminator'); const reason = Object.getOwnPropertyDescriptor(data, 'reason');
    demand(reason !== undefined && 'value' in reason, 'invalid-input', 'lazy negative reason'); const holo = reason.value === 'nonzero-holomorphic-remainder';
    demand(holo || reason.value === 'non-torsion-residue-divisor', 'invalid-input', 'lazy obstruction');
    const raw = w.record(ctx, data, holo ? ['reason', 'later', 'common', 'relations', 'logarithms', 'remainder', 'holomorphic', 'globalFunctions'] : ['reason', 'later', 'common', 'relations', 'logarithms']);
    const prefix = common.decode(raw.common), relations = algebraicCoveredRelationsCodec(s, curve, prefix.residues).decode(raw.relations), logarithms = algebraicCoveredLogarithmsCodec(s, curve, relations, format).decode(raw.logarithms);
    const p: LazyAlgebraicNegative<E> = holo ? Object.freeze({...prefix, relations, logarithms, reason: 'nonzero-holomorphic-remainder', later: w.literal(ctx, 'complete').decode(raw.later), remainder: native.decode(raw.remainder), holomorphic: algebraicPoleCoverageCodec(s, curve).decode(raw.holomorphic), globalFunctions: algebraicGlobalFunctionSpaceCodec(s, curve).decode(raw.globalFunctions)})
      : Object.freeze({...prefix, relations, logarithms, reason: 'non-torsion-residue-divisor', later: w.literal(ctx, 'unperformed').decode(raw.later)});
    verifyLazyAlgebraicNegativeWithin(ctx, curve, p.input, p, s.bounds); return p;
  }};
}
export function encodeLazyAlgebraicNegative<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: LazyAlgebraicNegative<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => verifyGoodReductionClaim(() => {
    demand(proof.arithmetic !== undefined, 'verification-failed', 'lazy negative arithmetic coverage');
    const widened = usesGeneralGenusOneLogarithms(proof.logarithms);
    const p = recordRationalGcdEvidence(ctx, () => {verifyLazyAlgebraicNegativeWithin(ctx, curve, input, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
      return Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: negativeCodec(s, curve, widened ? 'rr-miller' : 'original').encode(proof)});}, proof.arithmetic);
    const arithmetic = w.structure(ctx, {primes: w.list(ctx, new NormalizedAlgebraicWireContext(ctx, bounds).integer())}).encode(p.evidence);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({...p.value, arithmetic}), bounds), data = Object.freeze({tag: 'algebraic-integration-decision', version: widened ? 5 : 4, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  }));
}
export function decodeLazyAlgebraicNegative<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): LazyAlgebraicNegative<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-integration-decision' && (raw.version === 4 || raw.version === 5), 'invalid-input', 'lazy negative tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence', 'arithmetic']), s = new NormalizedAlgebraicWireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).decode(body.arithmetic);
    return replayRationalGcdEvidence(ctx, arithmetic, () => {algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const proof = Object.freeze({...negativeCodec(s, curve, raw.version === 5 ? 'rr-miller' : 'original').decode(body.evidence), arithmetic});
      verifyLazyAlgebraicNegativeWithin(ctx, curve, input, proof, bounds); return proof;});
  }));
}
