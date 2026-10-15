/** Version-2 structure admission and tower snapshots; legacy version-1 checks remain separate. */
import {demand, type ExecutionContext} from './execution';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import type {DifferentialField, DifferentialBounds} from './differential-field';
import {factorCoefficientDomain} from './factorization-domain';
import {normalizationText} from './exponential-normalization-wire-values';
import {coefficientSystemCodec} from './recursive-coefficient-system-wire';
import {linearEvidenceCodec} from './linear-wire';
import {recursiveMembershipEvidenceCodec} from './recursive-rde-wire-algebra';
import {recursiveAdmissionInvariantCodec} from './recursive-differential-admission-wire';
import {CertifiedTowerView, verifyCertifiedTowerWithin} from './recursive-certified-tower';
import {certifiedTowerLevelsWithin, encodeCertifiedTowerLevelWithin, replayCertifiedTowerLevelWithin} from './recursive-tower-wire';
import {packRecursiveArtifactGraph, unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
import {verifyStructuredAdmissionEvidenceWithin, verifyStructuredDifferentialAdmissionWithin,
  type TaggedConstruction, type StructuredAdmissionEvidence, type StructuredDifferentialAdmission} from './structured-differential-admission';
import * as w from './decision-wire-algebra';

export function structuredAdmissionEvidenceCodec(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  bounds: DifferentialBounds): w.EvidenceCodec<StructuredAdmissionEvidence> {
  const value = factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx), outer = factorCoefficientDomain(ctx, owner, bounds.towerHeight).codec(ctx);
  const derivative = w.structure(ctx, {input: value, derivative: value});
  const codec = w.structure(ctx, {rule: w.literal(ctx, 'rational-exp-log-structure-admission-v1'),
    construction: w.structure(ctx, {kind: w.literal(ctx, 'exponential', 'logarithm'), argument: value}), derivative, rate: value,
    comparison: coefficientSystemCodec(ctx, parent.owner, bounds), linear: linearEvidenceCodec(ctx, w.scalar(ctx)),
    additive: w.optional(derivative), membership: w.optional(recursiveMembershipEvidenceCodec(ctx, parent, bounds)),
    outcome: w.literal(ctx, 'admitted', 'dependent'),
    conditions: w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'logarithm-argument'), path: normalizationText(ctx), value: outer}))});
  return {encode: codec.encode, decode(data) {const e = codec.decode(data); ctx.allocate(2); return Object.freeze({...e, parent, owner});}};
}
/** Private composition snapshot. All full artifacts bound it before nested processing. */
export function encodeStructuredTowerSnapshotWithin(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): unknown {
  verifyCertifiedTowerWithin(ctx, view, bounds); const vs = certifiedTowerLevelsWithin(ctx, view); ctx.allocate(vs.length + 3);
  const levels = Object.freeze(vs.map(v => {
    if (v.proof.kind !== 'structured') return encodeCertifiedTowerLevelWithin(ctx, v, bounds);
    const owner = v.owner, coefficient = factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx); ctx.allocate(4);
    return Object.freeze({kind: 'structured', variable: owner.fractions!.ring.variable,
      rule: w.polynomial(ctx, owner.fractions!.ring, coefficient).encode(owner.rule!),
      admission: structuredAdmissionEvidenceCodec(ctx, v.parent!, owner, bounds).encode(v.proof.admission)});
  }));
  return Object.freeze({tag: 'certified-exp-log-tower', version: 2, levels});
}
export function replayStructuredTowerSnapshotWithin(ctx: ExecutionContext, view: CertifiedTowerView, data: unknown, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); const raw = w.record(ctx, data, ['tag', 'version', 'levels']);
  demand(raw.tag === 'certified-exp-log-tower' && raw.version === 2, 'invalid-input', 'structured tower tag/version');
  const expected = certifiedTowerLevelsWithin(ctx, view), levels = w.array(ctx, raw.levels);
  demand(levels.length === expected.length, 'verification-failed', 'stored structured tower coverage');
  for (let i = 0; i < expected.length; i++) {
    const v = expected[i];
    if (v.proof.kind !== 'structured') {replayCertifiedTowerLevelWithin(ctx, v, levels[i], bounds); continue;}
    const owner = v.owner, stored = w.record(ctx, levels[i], ['kind', 'variable', 'rule', 'admission']);
    demand(stored.kind === 'structured' && stored.variable === owner.fractions!.ring.variable, 'domain-mismatch', 'stored structured owner');
    const rule = w.polynomial(ctx, owner.fractions!.ring, factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx)).decode(stored.rule);
    demand(owner.fractions!.ring.equal(ctx, rule, owner.rule!), 'verification-failed', 'stored structured derivation');
    const admission = structuredAdmissionEvidenceCodec(ctx, v.parent!, owner, bounds).decode(stored.admission);
    verifyStructuredAdmissionEvidenceWithin(ctx, v.parent!, owner, v.proof.admission.construction, admission, bounds);
    demand(admission.outcome === 'admitted', 'verification-failed', 'stored structured admitted chain');
  }
}
function decisionCodec(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, bounds: DifferentialBounds) {
  return w.structure(ctx, {kind: w.literal(ctx, 'admitted', 'dependent'), evidence: structuredAdmissionEvidenceCodec(ctx, parent, owner, bounds),
    invariant: w.optional(recursiveAdmissionInvariantCodec(ctx, parent, bounds))});
}
export function encodeStructuredDifferentialAdmission(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, decision: StructuredDifferentialAdmission, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyStructuredDifferentialAdmissionWithin(ctx, parent, owner, c, decision, bounds);
    const rule = w.polynomial(ctx, owner.fractions!.ring, factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx)); ctx.allocate(6);
    const payload = packRecursiveArtifactGraph(ctx, {parent: encodeStructuredTowerSnapshotWithin(ctx, parent, bounds),
      variable: owner.fractions!.ring.variable, rule: rule.encode(owner.rule!), decision: decisionCodec(ctx, parent, owner, bounds).encode(decision)}, bounds);
    const data = Object.freeze({tag: 'recursive-differential-admission', version: 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeStructuredDifferentialAdmission(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, data: unknown, bounds: DifferentialBounds): StructuredDifferentialAdmission {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'recursive-differential-admission' && raw.version === 2, 'invalid-input', 'structured admission tag/version');
    const expanded = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['parent', 'variable', 'rule', 'decision']);
    demand(expanded.variable === owner.fractions!.ring.variable, 'domain-mismatch', 'stored structured variable');
    replayStructuredTowerSnapshotWithin(ctx, parent, expanded.parent, bounds);
    const rule = w.polynomial(ctx, owner.fractions!.ring, factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx)).decode(expanded.rule);
    demand(owner.fractions!.ring.equal(ctx, rule, owner.rule!), 'verification-failed', 'stored structured native rule');
    const decoded = decisionCodec(ctx, parent, owner, bounds).decode(expanded.decision);
    verifyStructuredAdmissionEvidenceWithin(ctx, parent, owner, c, decoded.evidence, bounds); ctx.allocate(4);
    let decision: StructuredDifferentialAdmission;
    if (decoded.kind === 'admitted') {
      demand(decoded.invariant === null, 'verification-failed', 'extraneous structured admission invariant');
      decision = Object.freeze({kind: 'admitted', evidence: decoded.evidence, view: CertifiedTowerView.structuredWithin(ctx, decoded.evidence, bounds), invariant: null});
    } else {
      demand(decoded.invariant !== null, 'verification-failed', 'missing structured dependency invariant');
      decision = Object.freeze({kind: 'dependent', evidence: decoded.evidence, view: null, invariant: decoded.invariant});
    }
    verifyStructuredDifferentialAdmissionWithin(ctx, parent, owner, c, decision, bounds); return decision;
  });
}
