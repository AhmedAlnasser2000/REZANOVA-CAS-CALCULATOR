/** Complete a=0 families with compact ranks and a separate arbitrary constant. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import {verifyCertifiedTowerWithin, type CertifiedTowerView} from './recursive-certified-tower';
import {solveCompactRecursiveParametricRdeWithin, verifyCompactRecursiveParametricRdeWithin, type CompactRecursiveParametricRde} from './compact-recursive-rde';
import {solveCompactRationalLinearSystemWithin, verifyCompactRationalLinearSystemWithin, type CompactRationalLinearSolution} from './compact-rational-linear';
import {normalizeRecursiveLimitedPair, recursiveLimitedProjectionSystem, recursiveLimitedConditionSources, verifyRecursiveLimitedFamilyMappingWithin,
  type NormalizedRepresentative, type RecursiveLimitedIntegrationDecision} from './recursive-limited-integration';
import {recursiveConditions, verifyRecursiveConditions, type RecursiveCondition} from './recursive-conditions';

export interface CompactRecursiveLimitedIntegration {
  readonly rule: 'recursive-limited-rank-family-v2'; readonly view: CertifiedTowerView; readonly f: E; readonly generators: readonly E[];
  readonly rde: CompactRecursiveParametricRde; readonly kind: 'solutions' | 'no-field-solution';
  readonly normalized: readonly NormalizedRepresentative[]; readonly projection: CompactRationalLinearSolution | null;
  readonly family: RecursiveLimitedIntegrationDecision['family']; readonly conditions: readonly RecursiveCondition[];
}
export function solveCompactRecursiveLimitedIntegrationWithin(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], bounds: DifferentialBounds): CompactRecursiveLimitedIntegration {
  verifyCertifiedTowerWithin(ctx, view, bounds); const owner = view.owner;
  const rde = solveCompactRecursiveParametricRdeWithin(ctx, view, owner.fromInteger(ctx, 0n), f, generators, bounds);
  return completeCompactRecursiveLimitedIntegrationWithin(ctx, view, f, generators, rde, bounds);
}
/** Compose a complete a=0 family, retaining all coefficient/additive freedom. */
export function completeCompactRecursiveLimitedIntegrationWithin(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], rde: CompactRecursiveParametricRde, bounds: DifferentialBounds): CompactRecursiveLimitedIntegration {
  const owner = view.owner;
  let normalized: readonly NormalizedRepresentative[] = Object.freeze([]), projection: CompactRationalLinearSolution | null = null, family: CompactRecursiveLimitedIntegration['family'] = null;
  if (rde.family !== null) {
    ctx.allocate(rde.family.directions.length + 1); normalized = Object.freeze([rde.family.particular, ...rde.family.directions].map(pair => normalizeRecursiveLimitedPair(ctx, view, pair)));
    projection = solveCompactRationalLinearSystemWithin(ctx, recursiveLimitedProjectionSystem(ctx, generators.length, rde.family.directions));
    demand(projection.kind === 'consistent', 'verification-failed', 'compact homogeneous coefficient projection'); ctx.allocate(projection.pivots.length + 3);
    family = Object.freeze({particular: normalized[0].pair, directions: Object.freeze(projection.pivots.map(i => normalized[i + 1].pair)), additiveConstant: 'arbitrary-rational' as const});
  }
  const conditions = recursiveConditions(ctx, owner, recursiveLimitedConditionSources(ctx, view, f, generators, family)); ctx.allocate(generators.length + 9);
  const proof = Object.freeze({rule: 'recursive-limited-rank-family-v2' as const, view, f, generators: Object.freeze([...generators]), rde, kind: rde.kind, normalized, projection, family, conditions});
  verifyCompactRecursiveLimitedIntegrationWithin(ctx, view, f, generators, proof, bounds); return proof;
}
export function verifyCompactRecursiveLimitedIntegrationWithin(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], proof: CompactRecursiveLimitedIntegration, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); const owner = view.owner; owner.assert(ctx, f);
  demand(Array.isArray(generators), 'invalid-input', 'compact limited ordered generators');
  demand(proof.rule === 'recursive-limited-rank-family-v2' && proof.view === view && owner.equal(ctx, proof.f, f) && proof.generators.length === generators.length, 'verification-failed', 'compact limited exact request');
  for (let i = 0; i < generators.length; i++) demand(owner.equal(ctx, generators[i], proof.generators[i]), 'verification-failed', 'compact limited generator order');
  verifyCompactRecursiveParametricRdeWithin(ctx, view, owner.fromInteger(ctx, 0n), f, generators, proof.rde, bounds);
  demand(proof.kind === proof.rde.kind, 'verification-failed', 'compact limited outcome');
  verifyRecursiveConditions(ctx, owner, recursiveLimitedConditionSources(ctx, view, f, generators, proof.family), proof.conditions);
  if (proof.rde.family === null) {demand(proof.family === null && proof.projection === null && proof.normalized.length === 0, 'verification-failed', 'compact limited negative coverage'); return;}
  demand(proof.family !== null && proof.projection !== null, 'verification-failed', 'compact limited complete family and projection');
  verifyCompactRationalLinearSystemWithin(ctx, recursiveLimitedProjectionSystem(ctx, generators.length, proof.rde.family.directions), proof.projection);
  verifyRecursiveLimitedFamilyMappingWithin(ctx, view, f, generators, proof.rde.family, proof.normalized, proof.projection, proof.family);
}
export function solveCompactRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], bounds: DifferentialBounds): CompactRecursiveLimitedIntegration {
  return ctx.operation(() => solveCompactRecursiveLimitedIntegrationWithin(ctx, view, f, generators, bounds));
}
export function verifyCompactRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], proof: CompactRecursiveLimitedIntegration, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCompactRecursiveLimitedIntegrationWithin(ctx, view, f, generators, proof, bounds));
}
