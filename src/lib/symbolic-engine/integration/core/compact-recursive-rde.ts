/** Complete differential reductions with distinct compact paired-rank evidence. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import {verifyCertifiedTowerWithin, type CertifiedTowerView} from './recursive-certified-tower';
import {solveCompactRationalLinearSystemWithin, verifyCompactRationalLinearSystemWithin, type CompactRationalLinearSolution} from './compact-rational-linear';
import {solveRecursiveHomogeneousReductionWithin, verifyRecursiveHomogeneousReductionWithin, recursiveRdeSliceSystemWithin,
  recursiveRdeAffinePairWithin, recursiveRdeConditionSources, verifyRecursiveAffineFamilyMappingWithin} from './recursive-rde';
import type {RecursiveHomogeneousReduction} from './recursive-rde-types';
import type {RecursiveRdeFamily} from './recursive-rde-family';
import {recursiveConditions, verifyRecursiveConditions, type RecursiveCondition} from './recursive-conditions';

export type CompactRecursiveHomogeneousRde = RecursiveHomogeneousReduction & Readonly<{independent: CompactRationalLinearSolution}>;
export interface CompactRecursiveParametricRde {
  readonly rule: 'recursive-parametric-rde-rank-family-v2'; readonly view: CertifiedTowerView;
  readonly a: E; readonly b: E; readonly forcing: readonly E[];
  readonly homogeneous: CompactRecursiveHomogeneousRde; readonly slice: CompactRationalLinearSolution;
  readonly kind: 'solutions' | 'no-field-solution'; readonly family: RecursiveRdeFamily | null;
  readonly conditions: readonly RecursiveCondition[];
}
export function verifyCompactRecursiveHomogeneousRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], proof: CompactRecursiveHomogeneousRde, bounds: DifferentialBounds): void {
  verifyRecursiveHomogeneousReductionWithin(ctx, view, a, forcing, proof, bounds);
  verifyCompactRationalLinearSystemWithin(ctx, proof.independence.system, proof.independent);
  demand(proof.independent.kind === 'consistent' && proof.independent.nullspace.length === 0, 'verification-failed', 'compact paired differential/coefficient independence');
}
export function solveCompactRecursiveHomogeneousRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], bounds: DifferentialBounds): CompactRecursiveHomogeneousRde {
  const core = solveRecursiveHomogeneousReductionWithin(ctx, view, a, forcing, bounds), independent = solveCompactRationalLinearSystemWithin(ctx, core.independence.system); ctx.allocate(core.route === 'rational' ? 8 : 12);
  const proof = Object.freeze({...core, independent}); verifyCompactRecursiveHomogeneousRdeWithin(ctx, view, a, forcing, proof, bounds); return proof;
}
export function solveCompactRecursiveParametricRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], bounds: DifferentialBounds): CompactRecursiveParametricRde {
  verifyCertifiedTowerWithin(ctx, view, bounds); view.owner.assert(ctx, a); view.owner.assert(ctx, b);
  demand(Array.isArray(forcing), 'invalid-input', 'compact RDE forcing list'); for (const value of forcing) view.owner.assert(ctx, value); ctx.allocate(forcing.length + 1);
  const reduction = solveRecursiveHomogeneousReductionWithin(ctx, view, a, [b, ...forcing], bounds);
  return completeCompactRecursiveParametricRdeWithin(ctx, view, a, b, forcing, reduction, bounds);
}
/** Compose already retained complete differential reduction; no RDE search. */
export function completeCompactRecursiveParametricRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], reduction: RecursiveHomogeneousReduction, bounds: DifferentialBounds): CompactRecursiveParametricRde {
  ctx.allocate(forcing.length + 1); verifyRecursiveHomogeneousReductionWithin(ctx, view, a, [b, ...forcing], reduction, bounds);
  const independent = solveCompactRationalLinearSystemWithin(ctx, reduction.independence.system); ctx.allocate(reduction.route === 'rational' ? 8 : 12);
  const homogeneous = Object.freeze({...reduction, independent}), slice = solveCompactRationalLinearSystemWithin(ctx, recursiveRdeSliceSystemWithin(ctx, homogeneous.basis));
  let family: RecursiveRdeFamily | null = null;
  if (slice.kind === 'consistent') {
    ctx.allocate(slice.nullspace.length + 2); family = Object.freeze({particular: recursiveRdeAffinePairWithin(ctx, view, homogeneous.basis, slice.particular, forcing.length),
      directions: Object.freeze(slice.nullspace.map(vector => recursiveRdeAffinePairWithin(ctx, view, homogeneous.basis, vector, forcing.length)))});
  }
  const conditions = recursiveConditions(ctx, view.owner, recursiveRdeConditionSources(ctx, view, a, b, forcing, family)); ctx.allocate(forcing.length + 10);
  const proof = Object.freeze({rule: 'recursive-parametric-rde-rank-family-v2' as const, view, a, b, forcing: Object.freeze([...forcing]), homogeneous, slice,
    kind: family === null ? 'no-field-solution' as const : 'solutions' as const, family, conditions});
  verifyCompactRecursiveParametricRdeWithin(ctx, view, a, b, forcing, proof, bounds); return proof;
}
export function verifyCompactRecursiveParametricRdeWithin(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], proof: CompactRecursiveParametricRde, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); const owner = view.owner; owner.assert(ctx, a); owner.assert(ctx, b);
  demand(Array.isArray(forcing), 'invalid-input', 'compact RDE forcing list'); for (const value of forcing) owner.assert(ctx, value);
  demand(proof.rule === 'recursive-parametric-rde-rank-family-v2' && proof.view === view && owner.equal(ctx, a, proof.a) && owner.equal(ctx, b, proof.b) && proof.forcing.length === forcing.length,
    'verification-failed', 'compact RDE complete explicit request');
  for (let i = 0; i < forcing.length; i++) demand(owner.equal(ctx, forcing[i], proof.forcing[i]), 'verification-failed', 'compact RDE ordered forcing');
  ctx.allocate(forcing.length + 1); verifyCompactRecursiveHomogeneousRdeWithin(ctx, view, a, [b, ...forcing], proof.homogeneous, bounds);
  verifyCompactRationalLinearSystemWithin(ctx, recursiveRdeSliceSystemWithin(ctx, proof.homogeneous.basis), proof.slice);
  verifyRecursiveConditions(ctx, owner, recursiveRdeConditionSources(ctx, view, a, b, forcing, proof.family), proof.conditions);
  verifyRecursiveAffineFamilyMappingWithin(ctx, view, a, b, forcing, proof.homogeneous.basis, proof.slice, proof.kind, proof.family);
}
export function solveCompactRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], bounds: DifferentialBounds): CompactRecursiveParametricRde {
  return ctx.operation(() => solveCompactRecursiveParametricRdeWithin(ctx, view, a, b, forcing, bounds));
}
export function verifyCompactRecursiveParametricRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, b: E, forcing: readonly E[], proof: CompactRecursiveParametricRde, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCompactRecursiveParametricRdeWithin(ctx, view, a, b, forcing, proof, bounds));
}
