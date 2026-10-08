import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { rdeDomain } from './rde-algebra';
import { rationalParametricRdeEvidenceCodec } from './rational-parametric-rde-wire';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { linearEvidenceCodec } from './linear-wire';
import { normalizationKind } from './exponential-normalization-wire-values';
import { recursiveRdeValueCodecs, recursiveMembershipEvidenceCodec, hyperResonanceCodec, recursiveNormalizationCodec, recursiveDenominatorCodec, recursiveConstraintCodec } from './recursive-rde-wire-algebra';
import { encodeCertifiedTowerSnapshot, replayCertifiedTowerSnapshot } from './recursive-tower-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import type { CertifiedTowerView } from './recursive-certified-tower';
import type { RecursiveHomogeneousRde, RecursiveParametricRdeDecision } from './recursive-rde-types';
import type { PolynomialCoefficientStep, RecursivePolynomialSolution } from './recursive-rde-polynomial';
import type { RecursiveConstantExtraction } from './recursive-constant-extraction';
import { verifyRecursiveParametricRdeWithin } from './recursive-rde';
import { verifyRecursiveLimitedIntegrationWithin, type RecursiveLimitedIntegrationDecision } from './recursive-limited-integration';
import * as w from './decision-wire-algebra';

function polynomialSolutionCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursivePolynomialSolution> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds), constraint = recursiveConstraintCodec(ctx, view, bounds);
  const spde = w.structure(ctx, {gcd: w.bezout(ctx, v.p), A: w.division(ctx, v.p), B: w.division(ctx, v.p), forcing: w.list(ctx, w.division(ctx, v.p)), constraint,
    inverse: w.optional(w.bezout(ctx, v.p)), residues: w.list(ctx, w.division(ctx, v.p)), quotients: w.list(ctx, w.division(ctx, v.p)), derivatives: w.list(ctx, v.derivative), derivativeA: w.optional(v.derivative)});
  const truncate = w.structure(ctx, {kind: w.literal(ctx, 'truncate'), degree: w.integer(ctx), constraint});
  const dominant = w.structure(ctx, {kind: w.literal(ctx, 'dominant'), degree: w.integer(ctx), corrections: w.list(ctx, v.value), derivatives: w.list(ctx, v.derivative)});
  const parent = w.structure(ctx, {kind: w.literal(ctx, 'parent'), degree: v.integer, parent: recursiveHomogeneousRdeEvidenceCodec(ctx, view.parent!, bounds), derivatives: w.list(ctx, v.derivative)});
  const step: w.EvidenceCodec<PolynomialCoefficientStep> = {
    encode(e) { return e.kind === 'truncate' ? truncate.encode(e) : e.kind === 'dominant' ? dominant.encode(e) : parent.encode(e); },
    decode(data) { const kind = normalizationKind(data); if (kind === 'truncate') return truncate.decode(data); if (kind === 'dominant') return dominant.decode(data);
      demand(kind === 'parent', 'invalid-input', 'polynomial coefficient evidence kind'); return parent.decode(data); },
  };
  return w.structure(ctx, {spde: w.list(ctx, spde), coefficients: w.list(ctx, step), terminal: constraint,
    basis: w.list(ctx, w.structure(ctx, {coefficients: w.list(ctx, w.scalar(ctx)), value: v.value}))});
}
export function recursiveHomogeneousRdeEvidenceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveHomogeneousRde> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds), common = {a: v.value, forcing: w.list(ctx, v.value), basis: w.list(ctx, v.pair),
    independence: coefficientSystemCodec(ctx, view.owner, bounds), independent: linearEvidenceCodec(ctx, w.scalar(ctx))};
  if (view.monomial === 'variable') {
    function codec(d: ReturnType<typeof rdeDomain>) { return w.structure(ctx, {...common, route: w.literal(ctx, 'rational'), rational: rationalParametricRdeEvidenceCodec(ctx, d)}); }
    return {encode(e) { demand(e.route === 'rational', 'verification-failed', 'RDE wire base route'); return codec(e.rational.domain).encode(e); },
      decode(data) { const d = rdeDomain(ctx, view.owner), e = codec(d).decode(data); ctx.allocate(2); return Object.freeze({...e, view, rational: Object.freeze({...e.rational, domain: d})}); }};
  }
  const c = w.structure(ctx, {...common, route: w.literal(ctx, 'recursive'), normalization: recursiveNormalizationCodec(ctx, view, bounds), denominator: recursiveDenominatorCodec(ctx, view, bounds),
    equation: w.structure(ctx, {common: v.p, quotients: w.list(ctx, w.division(ctx, v.p)), derivative: v.derivative, A: v.p, B: v.p, C: w.list(ctx, v.p)}),
    degree: w.structure(ctx, {baseline: v.integer, bound: v.integer, membership: w.optional(recursiveMembershipEvidenceCodec(ctx, view.parent!, bounds)),
      limited: w.optional(recursiveLimitedIntegrationEvidenceCodec(ctx, view.parent!, bounds)), hyper: w.optional(hyperResonanceCodec(ctx, view, bounds))}),
    polynomial: polynomialSolutionCodec(ctx, view, bounds)});
  return {encode(e) { demand(e.route === 'recursive', 'verification-failed', 'RDE wire inductive route'); return c.encode(e); },
    decode(data) { const e = c.decode(data); ctx.allocate(1); return Object.freeze({...e, view}); }};
}
export function recursiveParametricRdeEvidenceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveParametricRdeDecision> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds), c = w.structure(ctx, {rule: w.literal(ctx, 'recursive-parametric-rde-completeness-v1'), a: v.value, b: v.value, forcing: w.list(ctx, v.value),
    homogeneous: recursiveHomogeneousRdeEvidenceCodec(ctx, view, bounds), slice: linearEvidenceCodec(ctx, w.scalar(ctx)), kind: w.literal(ctx, 'solutions', 'no-field-solution'),
    family: w.optional(w.structure(ctx, {particular: v.pair, directions: w.list(ctx, v.pair)})), conditions: v.conditions});
  return {encode: c.encode, decode(data) { const e = c.decode(data); ctx.allocate(1); return Object.freeze({...e, view}); }};
}
function constantExtractionCodec(ctx: ExecutionContext, owner: DifferentialField, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveConstantExtraction> {
  const value = factorCoefficientDomain(ctx, owner, bounds.towerHeight).codec(ctx), q = w.scalar(ctx);
  const absent: w.EvidenceCodec<null> = {encode(data) { demand(data === null, 'verification-failed', 'scalar constant leaf'); return null; },
    decode(data) { demand(data === null, 'invalid-input', 'scalar constant leaf'); return null; }};
  if (owner.kind === 'rational') return w.structure(ctx, {input: value, division: absent, parent: absent, constant: q});
  const p = w.polynomial(ctx, owner.fractions!.ring, factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx));
  return w.structure(ctx, {input: value, division: w.optional(w.division(ctx, p)), parent: w.optional(constantExtractionCodec(ctx, owner.parent!, bounds)), constant: q});
}
export function recursiveLimitedIntegrationEvidenceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveLimitedIntegrationDecision> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds), c = w.structure(ctx, {rule: w.literal(ctx, 'recursive-limited-integration-rde-v1'), f: v.value, generators: w.list(ctx, v.value),
    rde: recursiveParametricRdeEvidenceCodec(ctx, view, bounds), kind: w.literal(ctx, 'solutions', 'no-field-solution'),
    normalized: w.list(ctx, w.structure(ctx, {extraction: constantExtractionCodec(ctx, view.owner, bounds), pair: v.pair})), projection: w.optional(linearEvidenceCodec(ctx, w.scalar(ctx))),
    family: w.optional(w.structure(ctx, {particular: v.pair, directions: w.list(ctx, v.pair), additiveConstant: w.literal(ctx, 'arbitrary-rational')})), conditions: v.conditions});
  return {encode: c.encode, decode(data) { const e = c.decode(data); ctx.allocate(1); return Object.freeze({...e, view}); }};
}
function envelope(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, decision: unknown, bounds: DifferentialBounds): unknown {
  ctx.allocate(4); const payload = packRecursiveArtifactGraph(ctx, {construction: encodeCertifiedTowerSnapshot(ctx, view, bounds), decision}, bounds);
  const data = Object.freeze({tag, version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
}
function body(ctx: ExecutionContext, view: CertifiedTowerView, tag: string, data: unknown, bounds: DifferentialBounds): unknown {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
  demand(raw.tag === tag && raw.version === 1, 'invalid-input', 'recursive decision artifact tag/version');
  const expanded = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['construction', 'decision']);
  replayCertifiedTowerSnapshot(ctx, view, expanded.construction, bounds); return expanded.decision;
}
export function encodeRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], e: RecursiveParametricRdeDecision, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => { checkArtifactBounds(ctx, bounds); verifyRecursiveParametricRdeWithin(ctx, view, a, b, forcing, e, bounds);
    return envelope(ctx, view, 'recursive-parametric-rde-decision', recursiveParametricRdeEvidenceCodec(ctx, view, bounds).encode(e), bounds); });
}
export function decodeRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], data: unknown, bounds: DifferentialBounds): RecursiveParametricRdeDecision {
  return ctx.operation(() => { const raw = body(ctx, view, 'recursive-parametric-rde-decision', data, bounds), e = recursiveParametricRdeEvidenceCodec(ctx, view, bounds).decode(raw);
    verifyRecursiveParametricRdeWithin(ctx, view, a, b, forcing, e, bounds); return e; });
}
export function encodeRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], e: RecursiveLimitedIntegrationDecision, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => { checkArtifactBounds(ctx, bounds); verifyRecursiveLimitedIntegrationWithin(ctx, view, f, generators, e, bounds);
    return envelope(ctx, view, 'recursive-limited-integration-decision', recursiveLimitedIntegrationEvidenceCodec(ctx, view, bounds).encode(e), bounds); });
}
export function decodeRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], data: unknown, bounds: DifferentialBounds): RecursiveLimitedIntegrationDecision {
  return ctx.operation(() => { const raw = body(ctx, view, 'recursive-limited-integration-decision', data, bounds), e = recursiveLimitedIntegrationEvidenceCodec(ctx, view, bounds).decode(raw);
    verifyRecursiveLimitedIntegrationWithin(ctx, view, f, generators, e, bounds); return e; });
}
