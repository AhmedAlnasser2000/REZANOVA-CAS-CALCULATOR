import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import type { DifferentialField, DifferentialBounds } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { normalizationInteger, normalizationKind, normalizationText } from './exponential-normalization-wire-values';
import { recursiveLimitedIntegrationEvidenceCodec } from './recursive-rde-wire';
import { recursiveMembershipEvidenceCodec } from './recursive-rde-wire-algebra';
import { CertifiedTowerView } from './recursive-certified-tower';
import { encodeCertifiedTowerSnapshot, replayCertifiedTowerSnapshot } from './recursive-tower-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { verifyRecursiveAdmissionEvidenceWithin, verifyRecursiveDifferentialAdmissionWithin,
  type RecursiveConstruction, type RecursiveAdmissionEvidence, type RecursiveAdmissionInvariant, type RecursiveDifferentialAdmission } from './recursive-differential-admission';
import * as w from './decision-wire-algebra';

function constructionCodec(ctx: ExecutionContext, parent: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveConstruction> {
  const value = factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx);
  const general = w.structure(ctx, {kind: w.literal(ctx, 'primitive', 'hyperexponential'), integrand: value}), tagged = w.structure(ctx, {kind: w.literal(ctx, 'logarithm', 'exponential'), argument: value});
  return {encode(c) { return c.kind === 'primitive' || c.kind === 'hyperexponential' ? general.encode(c) : tagged.encode(c); }, decode(data) {
    const k = normalizationKind(data); return k === 'primitive' || k === 'hyperexponential' ? general.decode(data) : tagged.decode(data);
  }};
}
export function recursiveAdmissionEvidenceCodec(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveAdmissionEvidence> {
  const value = factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx), outer = factorCoefficientDomain(ctx, owner, bounds.towerHeight).codec(ctx);
  const c = w.structure(ctx, {rule: w.literal(ctx, 'recursive-primitive-hyperexponential-admission-v1'), construction: constructionCodec(ctx, parent, bounds),
    derivative: w.optional(w.structure(ctx, {input: value, derivative: value})), rate: value,
    primitive: w.optional(recursiveLimitedIntegrationEvidenceCodec(ctx, parent, bounds)), hyperexponential: w.optional(recursiveMembershipEvidenceCodec(ctx, parent, bounds)),
    outcome: w.literal(ctx, 'admitted', 'dependent'), conditions: w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'logarithm-argument'), path: normalizationText(ctx), value: outer}))});
  return {encode: c.encode, decode(data) { const e = c.decode(data); ctx.allocate(2); return Object.freeze({...e, parent, owner}); }};
}
function invariantCodec(ctx: ExecutionContext, parent: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveAdmissionInvariant> {
  const value = factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx), integer = normalizationInteger(ctx);
  const additive = w.structure(ctx, {kind: w.literal(ctx, 'additive'), representative: value, derivative: w.structure(ctx, {input: value, derivative: value})});
  const multiplicative = w.structure(ctx, {kind: w.literal(ctx, 'multiplicative'), index: integer, factors: w.list(ctx, value), powers: w.list(ctx, integer)});
  return {encode(e) { return e.kind === 'additive' ? additive.encode(e) : multiplicative.encode(e); }, decode(data) {
    const k = normalizationKind(data); demand(k === 'additive' || k === 'multiplicative', 'invalid-input', 'recursive invariant kind');
    return k === 'additive' ? additive.decode(data) : multiplicative.decode(data);
  }};
}
function decisionCodec(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, bounds: DifferentialBounds) {
  return w.structure(ctx, {kind: w.literal(ctx, 'admitted', 'dependent'), evidence: recursiveAdmissionEvidenceCodec(ctx, parent, owner, bounds), invariant: w.optional(invariantCodec(ctx, parent, bounds))});
}
export function encodeRecursiveDifferentialAdmission(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, construction: RecursiveConstruction, e: RecursiveDifferentialAdmission, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRecursiveDifferentialAdmissionWithin(ctx, parent, owner, construction, e, bounds);
    const rule = w.polynomial(ctx, owner.fractions!.ring, factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx)); ctx.allocate(6);
    const payload = packRecursiveArtifactGraph(ctx, {parent: encodeCertifiedTowerSnapshot(ctx, parent, bounds),
      variable: owner.fractions!.ring.variable, rule: rule.encode(owner.rule!), decision: decisionCodec(ctx, parent, owner, bounds).encode(e)}, bounds);
    const data = Object.freeze({tag: 'recursive-differential-admission', version: 1, payload});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeRecursiveDifferentialAdmission(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, construction: RecursiveConstruction, data: unknown, bounds: DifferentialBounds): RecursiveDifferentialAdmission {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'recursive-differential-admission' && raw.version === 1, 'invalid-input', 'recursive admission tag/version');
    const expanded = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['parent', 'variable', 'rule', 'decision']);
    demand(expanded.variable === owner.fractions!.ring.variable, 'domain-mismatch', 'recursive admission variable');
    replayCertifiedTowerSnapshot(ctx, parent, expanded.parent, bounds);
    const rule = w.polynomial(ctx, owner.fractions!.ring, factorCoefficientDomain(ctx, parent.owner, bounds.towerHeight).codec(ctx)).decode(expanded.rule);
    demand(owner.fractions!.ring.equal(ctx, rule, owner.rule!), 'verification-failed', 'stored complete extension derivation');
    const decoded = decisionCodec(ctx, parent, owner, bounds).decode(expanded.decision);
    verifyRecursiveAdmissionEvidenceWithin(ctx, parent, owner, construction, decoded.evidence, bounds); ctx.allocate(4);
    let e: RecursiveDifferentialAdmission;
    if (decoded.kind === 'admitted') {
      demand(decoded.invariant === null, 'verification-failed', 'extraneous admitted invariant');
      const view = CertifiedTowerView.recursive(ctx, decoded.evidence, bounds); demand(view.proof.kind === 'recursive', 'verification-failed', 'retained replay view');
      e = Object.freeze({kind: 'admitted', evidence: view.proof.admission, invariant: null, view});
    } else {
      demand(decoded.invariant !== null, 'verification-failed', 'missing dependent invariant');
      e = Object.freeze({kind: 'dependent', evidence: decoded.evidence, invariant: decoded.invariant, view: null});
    }
    verifyRecursiveDifferentialAdmissionWithin(ctx, parent, owner, construction, e, bounds); return e;
  });
}
