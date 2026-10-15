/** Complete negative evidence with geometric subsidiaries. Positive version-3
 * evidence lives in algebraic-native-wire; legacy replay remains separate. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {PositiveWireContext} from './positive-wire';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {algebraicRrPrincipalityCodec} from './algebraic-rr-principality-wire';
import {algebraicDivisorTorsionCodec} from './algebraic-divisor-torsion-wire';
import {ellipticPrincipalMultipleCodec} from './elliptic-wire';
import {genusOnePrincipalMultipleCodec} from './genus-one-torsion-wire';
import {hyperellipticInfinityTorsionCodec} from './hyperelliptic-torsion-wire';
import {ramifiedHyperellipticModelCodec} from './hyperelliptic-cantor-wire';
import {ramifiedDivisorTorsionCodec} from './ramified-torsion-wire';
import {balancedCurveModelCodec} from './hyperelliptic-balanced-principality-wire';
import {balancedDivisorTorsionCodec} from './balanced-torsion-wire';
import {verifyAlgebraicPrincipalMultipleWithin, type AlgebraicPrincipalMultiple} from './algebraic-principal-multiple-dispatch';
import {verifyGeometricAlgebraicLogarithmsWithin, type GeometricAlgebraicLogarithms} from './algebraic-geometric-logarithms';
import {nativeAlgebraicPrimitiveCodec} from './algebraic-native-wire';
import {algebraicConstantValueConversionCodec} from './algebraic-primitive-wire';
import type {AlgebraicConstantValueConversion} from './algebraic-constant-quotient';
import type {AlgebraicResidueRelations, AlgebraicResidueRelationsData} from './algebraic-residue-relations';
import {algebraicResidueRelationsCodec} from './algebraic-residue-wire';
import {algebraicDifferentialReductionCodec} from './algebraic-reduction-wire';
import {algebraicExactDifferentialCodec} from './algebraic-differential-wire';
import {verifyGeometricAlgebraicDecisionWithin, type GeometricAlgebraicNegative} from './algebraic-geometric-decision';
import {recordRationalGcdEvidence, replayRationalGcdEvidence} from './rational-gcd-evidence';
import {inspectExactArtifact} from './artifact-bounds';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import * as w from './decision-wire-algebra';

export type GeometricEvidenceFormat = 'original'|'rr-miller';
export function usesGeneralGenusOneLogarithms(proof: {readonly components: readonly {readonly multiple: AlgebraicPrincipalMultiple<unknown>}[]}): boolean {
  return proof.components.some(p => p.multiple.method === 'genus-one-rr-miller');
}
function principalMultipleCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, format: GeometricEvidenceFormat): w.EvidenceCodec<AlgebraicPrincipalMultiple<E>> {
  const ctx = s.ctx, elliptic = ellipticPrincipalMultipleCodec(s, curve, divisor), infinity = hyperellipticInfinityTorsionCodec(s, curve, divisor), model = ramifiedHyperellipticModelCodec(s, curve), generalPrincipal = algebraicRrPrincipalityCodec(s, curve), generalTorsion = algebraicDivisorTorsionCodec(new PositiveWireContext(ctx, s.bounds, s), curve, divisor);
  return {encode(p) {
    if (p.method === 'genus-one-rr-miller') {demand(format === 'rr-miller', 'invalid-input', 'original geometric format cannot encode RR/Miller evidence'); return Object.freeze({method: p.method, evidence: genusOnePrincipalMultipleCodec(s, curve, divisor).encode(p.evidence)});}
    if (p.method === 'elliptic-miller') return Object.freeze({method: p.method, evidence: elliptic.encode(p.evidence)});
    if (p.method === 'infinity-pell') return Object.freeze({method: p.method, evidence: infinity.encode(p.evidence)});
    if (p.method === 'ramified-cantor') return Object.freeze({method: p.method, evidence: Object.freeze({model: model.encode(p.evidence.model), proof: ramifiedDivisorTorsionCodec(s, curve, p.evidence.model, divisor).encode(p.evidence)})});
    if (p.method === 'balanced-cantor') return Object.freeze({method: p.method, evidence: Object.freeze({source: balancedCurveModelCodec(s, curve).encode(p.evidence.source), proof: balancedDivisorTorsionCodec(s, curve, p.evidence.source, divisor).encode(p.evidence)})});
    return Object.freeze({method: p.method, evidence: p.method === 'general-principal' ? generalPrincipal.encode(p.evidence) : generalTorsion.encode(p.evidence)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['method', 'evidence']); let p: AlgebraicPrincipalMultiple<E>;
    if (raw.method === 'genus-one-rr-miller') {demand(format === 'rr-miller', 'invalid-input', 'original geometric format rejects RR/Miller evidence'); p = Object.freeze({method: raw.method, evidence: genusOnePrincipalMultipleCodec(s, curve, divisor).decode(raw.evidence)});}
    else if (raw.method === 'elliptic-miller') p = Object.freeze({method: raw.method, evidence: elliptic.decode(raw.evidence)});
    else if (raw.method === 'infinity-pell') p = Object.freeze({method: raw.method, evidence: infinity.decode(raw.evidence)});
    else if (raw.method === 'ramified-cantor') {
      const body = w.record(ctx, raw.evidence, ['model', 'proof']), presentation = model.decode(body.model);
      p = Object.freeze({method: raw.method, evidence: ramifiedDivisorTorsionCodec(s, curve, presentation, divisor).decode(body.proof)});
    } else if (raw.method === 'balanced-cantor') {
      const body = w.record(ctx, raw.evidence, ['source', 'proof']), source = balancedCurveModelCodec(s, curve).decode(body.source);
      p = Object.freeze({method: raw.method, evidence: balancedDivisorTorsionCodec(s, curve, source, divisor).decode(body.proof)});
    } else if (raw.method === 'general-principal') {
      const decoded = generalPrincipal.decode(raw.evidence); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, decoded.divisor);
      for (let i = 0; i < divisor.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, divisor.entries[i].place, decoded.divisor.entries[i].place);
      p = Object.freeze({method: raw.method, evidence: Object.freeze({...decoded, divisor})});
    } else {demand(raw.method === 'general-torsion', 'invalid-input', 'geometric principal-multiple method'); p = Object.freeze({method: raw.method, evidence: generalTorsion.decode(raw.evidence)});}
    verifyAlgebraicPrincipalMultipleWithin(ctx, curve, divisor, p, s.bounds); return p;
  }};
}
export function geometricLogarithmDataCodec<E, R extends AlgebraicResidueRelationsData<E>>(s: NormalizedAlgebraicWireContext, source: AlgebraicCurveView<E>, relations: R, verify: (proof: GeometricAlgebraicLogarithms<E, R>) => void, format: GeometricEvidenceFormat = 'original'): w.EvidenceCodec<GeometricAlgebraicLogarithms<E, R>> {
  const {ctx} = s, split = relations.splitting, curve = split.curve, f = curve.owner, native = s.native(f), constant = s.native(curve.coordinates.constantOwner);
  const component = (index: number) => w.structure(ctx, {index: w.literal(ctx, index), multiple: principalMultipleCodec(s, curve, relations.divisors[index], format), weight: w.optional(constant),
    factors: w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer(), inverse: native, derivative: s.derivative(f)})), value: w.optional(native), conditions: s.conditions(f)});
  const components: w.EvidenceCodec<GeometricAlgebraicLogarithms<E, R>['components']> = {
    encode(values) {demand(values.length <= relations.basis.length, 'verification-failed', 'geometric codec complete component prefix'); ctx.allocate(values.length); return Object.freeze(values.map((p, i) => component(i).encode(p)));},
    decode(data) {const values = w.array(ctx, data); demand(values.length <= relations.basis.length, 'verification-failed', 'geometric codec component prefix'); return Object.freeze(values.map((p, i) => component(i).decode(p)));}};
  const common = w.structure(ctx, {components, activeDerivative: native}), primitive = nativeAlgebraicPrimitiveCodec(s, source);
  const descent: w.EvidenceCodec<AlgebraicConstantValueConversion<E> | null> = split.quotient === null ? {
    encode(value) {demand(value === null, 'verification-failed', 'identity geometric descent'); return null;},
    decode(value) {demand(value === null, 'invalid-input', 'identity geometric descent'); return null;}
  } : w.optional(algebraicConstantValueConversionCodec(s, split.quotient));
  return {encode(p) {
    if (p.kind === 'non-torsion') return Object.freeze({kind: p.kind, evidence: common.encode(p), obstruction: p.obstruction, later: p.later});
    return Object.freeze({kind: p.kind, evidence: common.encode(p), descent: p.descent === null ? null : descent.encode(p.descent), nativeDerivative: s.native(source.owner).encode(p.nativeDerivative), primitive: primitive.encode(p.primitive)});
  }, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'geometric logarithm discriminator'); const kind = Object.getOwnPropertyDescriptor(data, 'kind'); demand(kind !== undefined && 'value' in kind, 'invalid-input', 'geometric logarithm kind'); let proof: GeometricAlgebraicLogarithms<E, R>;
    if (kind.value === 'non-torsion') {
      const raw = w.record(ctx, data, ['kind', 'evidence', 'obstruction', 'later']); proof = Object.freeze({relations, ...common.decode(raw.evidence), kind: 'non-torsion', obstruction: w.integer(ctx).decode(raw.obstruction), later: w.literal(ctx, 'unperformed').decode(raw.later)});
    } else {
      const raw = w.record(ctx, data, ['kind', 'evidence', 'descent', 'nativeDerivative', 'primitive']); demand(raw.kind === 'complete', 'invalid-input', 'geometric logarithm outcome');
      const conversion = raw.descent === null ? null : descent.decode(raw.descent); proof = Object.freeze({relations, ...common.decode(raw.evidence), kind: 'complete', descent: conversion, nativeDerivative: s.native(source.owner).decode(raw.nativeDerivative), primitive: primitive.decode(raw.primitive)});
    }
    verify(proof); return proof;
  }};
}
function geometricLogarithmsCodec<E>(s: NormalizedAlgebraicWireContext, source: AlgebraicCurveView<E>, relations: AlgebraicResidueRelations<E>, format: GeometricEvidenceFormat): w.EvidenceCodec<GeometricAlgebraicLogarithms<E>> {
  return geometricLogarithmDataCodec(s, source, relations, proof => verifyGeometricAlgebraicLogarithmsWithin(s.ctx, source, relations, proof, s.bounds), format);
}
function negativeCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, format: GeometricEvidenceFormat): w.EvidenceCodec<GeometricAlgebraicNegative<E>> {
  const {ctx} = s, native = s.native(curve.owner), common = w.structure(ctx, {rule: w.literal(ctx, 'algebraic-liouville-trager-v1'), input: native, reduction: algebraicDifferentialReductionCodec(s, curve), conditions: s.conditions(curve.owner)});
  return {encode(p) {
    const base = {kind: p.kind, reason: p.reason, later: p.later, common: common.encode(p)};
    if (p.reason === 'infinity-principal-part-obstruction') return Object.freeze(base);
    demand(p.reduction.kind === 'simple-poles', 'verification-failed', 'negative geometric codec complete simple-pole prefix');
    const logs = {relations: algebraicResidueRelationsCodec(s, curve, p.reduction.residues).encode(p.relations), logarithms: geometricLogarithmsCodec(s, curve, p.relations, format).encode(p.logarithms)};
    if (p.reason === 'non-torsion-residue-divisor') return Object.freeze({...base, ...logs});
    return Object.freeze({...base, ...logs, remainder: native.encode(p.remainder), exact: algebraicExactDifferentialCodec(s, curve).encode(p.exact)});
  }, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'negative geometric decision'); const reason = Object.getOwnPropertyDescriptor(data, 'reason'); demand(reason !== undefined && 'value' in reason, 'invalid-input', 'geometric negative reason'); let p: GeometricAlgebraicNegative<E>;
    if (reason.value === 'infinity-principal-part-obstruction') {
      const raw = w.record(ctx, data, ['kind', 'reason', 'later', 'common']); w.literal(ctx, 'non-elementary').decode(raw.kind);
      p = Object.freeze({...common.decode(raw.common), kind: 'non-elementary', reason: 'infinity-principal-part-obstruction', later: w.literal(ctx, 'unperformed').decode(raw.later)});
    } else {
      const holomorphic = reason.value === 'nonzero-holomorphic-remainder'; demand(holomorphic || reason.value === 'non-torsion-residue-divisor', 'invalid-input', 'negative geometric obstruction');
      const raw = w.record(ctx, data, holomorphic ? ['kind', 'reason', 'later', 'common', 'relations', 'logarithms', 'remainder', 'exact'] : ['kind', 'reason', 'later', 'common', 'relations', 'logarithms']); w.literal(ctx, 'non-elementary').decode(raw.kind);
      const prefix = common.decode(raw.common); demand(prefix.reduction.kind === 'simple-poles', 'verification-failed', 'negative geometric complete simple-pole prefix');
      const relations = algebraicResidueRelationsCodec(s, curve, prefix.reduction.residues).decode(raw.relations), logarithms = geometricLogarithmsCodec(s, curve, relations, format).decode(raw.logarithms);
      p = holomorphic ? Object.freeze({...prefix, relations, logarithms, kind: 'non-elementary', reason: 'nonzero-holomorphic-remainder', later: w.literal(ctx, 'complete').decode(raw.later), remainder: native.decode(raw.remainder), exact: algebraicExactDifferentialCodec(s, curve).decode(raw.exact)})
        : Object.freeze({...prefix, relations, logarithms, kind: 'non-elementary', reason: 'non-torsion-residue-divisor', later: w.literal(ctx, 'unperformed').decode(raw.later)});
    }
    verifyGeometricAlgebraicDecisionWithin(ctx, curve, p.input, p, s.bounds); return p;
  }};
}
export function encodeGeometricAlgebraicNegative<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: GeometricAlgebraicNegative<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => verifyGoodReductionClaim(() => {
    demand(proof.arithmetic !== undefined, 'verification-failed', 'geometric negative arithmetic coverage');
    const widened = proof.reason !== 'infinity-principal-part-obstruction' && usesGeneralGenusOneLogarithms(proof.logarithms);
    const recorded = recordRationalGcdEvidence(ctx, () => {
      verifyGeometricAlgebraicDecisionWithin(ctx, curve, input, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
      return Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), evidence: negativeCodec(s, curve, widened ? 'rr-miller' : 'original').encode(proof)});
    }, proof.arithmetic);
    const arithmetic = w.structure(ctx, {primes: w.list(ctx, new NormalizedAlgebraicWireContext(ctx, bounds).integer())}).encode(recorded.evidence);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({...recorded.value, arithmetic}), bounds), data = Object.freeze({tag: 'algebraic-integration-decision', version: widened ? 6 : 3, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  }));
}
export function decodeGeometricAlgebraicNegative<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): GeometricAlgebraicNegative<E> {
  return ctx.operation(() => verifyGoodReductionClaim(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-integration-decision' && (raw.version === 3 || raw.version === 6), 'invalid-input', 'geometric negative tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'evidence', 'arithmetic']), s = new NormalizedAlgebraicWireContext(ctx, bounds), arithmetic = w.structure(ctx, {primes: w.list(ctx, s.integer())}).decode(body.arithmetic);
    const proof = replayRationalGcdEvidence(ctx, arithmetic, () => {algebraicCurveEvidenceCodec(s, curve).decode(body.curve); return negativeCodec(s, curve, raw.version === 6 ? 'rr-miller' : 'original').decode(body.evidence);});
    demand(curve.owner.equal(ctx, input, proof.input), 'verification-failed', 'geometric negative explicit expected input'); ctx.allocate(2); return Object.freeze({...proof, arithmetic});
  }));
}
