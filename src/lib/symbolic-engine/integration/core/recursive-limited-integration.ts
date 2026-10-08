/** Complete a=0 specialization, with the independent additive constant separated. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { matrixCapacity } from './recursive-coefficient-system';
import { rationalInOwner, nativeCombination, verifyRecursiveRdePair, type RecursiveRdePair, type RecursiveRdeFamily } from './recursive-rde-family';
import { extractRecursiveConstant, verifyRecursiveConstantExtraction, type RecursiveConstantExtraction } from './recursive-constant-extraction';
import type { RecursiveParametricRdeDecision } from './recursive-rde-types';
import { solveRecursiveParametricRdeWithin, verifyRecursiveParametricRdeWithin } from './recursive-rde';
import { recursiveConditions, verifyRecursiveConditions, certifiedTowerConditionSources, type RecursiveCondition } from './recursive-conditions';

interface NormalizedRepresentative {
  readonly extraction: RecursiveConstantExtraction;
  readonly pair: RecursiveRdePair;
}
export interface RecursiveLimitedIntegrationDecision {
  readonly rule: 'recursive-limited-integration-rde-v1';
  readonly view: CertifiedTowerView;
  readonly f: E;
  readonly generators: readonly E[];
  readonly rde: RecursiveParametricRdeDecision;
  readonly kind: 'solutions' | 'no-field-solution';
  readonly normalized: readonly NormalizedRepresentative[];
  readonly projection: LinearSolution<Rational> | null;
  readonly family: (RecursiveRdeFamily & {readonly additiveConstant: 'arbitrary-rational'}) | null;
  readonly conditions: readonly RecursiveCondition[];
}
function sources(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], family: RecursiveLimitedIntegrationDecision['family']) {
  const construction = certifiedTowerConditionSources(ctx, view); ctx.allocate(construction.length + generators.length * 2 + 2);
  const entries = [...construction, {path: 'input', value: f}, ...generators.map((value, i) => ({path: `generator.${i}`, value}))];
  if (family) {
    ctx.allocate(family.directions.length * 2 + 2);
    entries.push({path: 'primitive.particular', value: family.particular.value});
    for (let i = 0; i < family.directions.length; i++) entries.push({path: `primitive.direction.${i}`, value: family.directions[i].value});
  }
  return entries;
}
function projectionSystem(ctx: ExecutionContext, generators: number, directions: readonly RecursiveRdePair[]): LinearSystem<Rational> {
  const columns = directions.length, zero = Q.fromInteger(ctx, 0n); matrixCapacity(ctx, generators, columns);
  ctx.allocate(generators); const matrix = Object.freeze(Array.from({length: generators}, (_, i) => {
    ctx.allocate(columns); return Object.freeze(directions.map(p => p.coefficients[i]));
  }));
  ctx.allocate(generators + 4); return Object.freeze({rows: generators, columns, matrix, rhs: Object.freeze(Array<Rational>(generators).fill(zero))});
}
function normalize(ctx: ExecutionContext, view: CertifiedTowerView, pair: RecursiveRdePair): NormalizedRepresentative {
  const owner = view.owner, extraction = extractRecursiveConstant(ctx, owner, pair.value), value = owner.subtract(ctx, pair.value, rationalInOwner(ctx, owner, extraction.constant));
  ctx.allocate(5); return Object.freeze({extraction, pair: Object.freeze({coefficients: pair.coefficients, value,
    derivative: Object.freeze({input: value, derivative: pair.derivative.derivative})})});
}
export function solveRecursiveLimitedIntegrationWithin(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], bounds: DifferentialBounds): RecursiveLimitedIntegrationDecision {
  const rde = solveRecursiveParametricRdeWithin(ctx, view, view.owner.fromInteger(ctx, 0n), f, generators, bounds);
  let normalized: readonly NormalizedRepresentative[] = Object.freeze([]), projection: LinearSolution<Rational> | null = null,
    family: RecursiveLimitedIntegrationDecision['family'] = null;
  if (rde.family) {
    ctx.allocate(rde.family.directions.length + 1);
    normalized = Object.freeze([rde.family.particular, ...rde.family.directions].map(p => normalize(ctx, view, p)));
    projection = solveLinearSystem(ctx, Q, projectionSystem(ctx, generators.length, rde.family.directions));
    demand(projection.kind === 'consistent', 'verification-failed', 'homogeneous coefficient projection'); ctx.allocate(projection.pivots.length + 3);
    family = Object.freeze({particular: normalized[0].pair, directions: Object.freeze(projection.pivots.map(i => normalized[i + 1].pair)), additiveConstant: 'arbitrary-rational' as const});
  }
  ctx.allocate(generators.length + 9); const e = Object.freeze({rule: 'recursive-limited-integration-rde-v1' as const, view, f, generators: Object.freeze([...generators]),
    rde, kind: rde.kind, normalized, projection, family, conditions: recursiveConditions(ctx, view.owner, sources(ctx, view, f, generators, family))});
  verifyRecursiveLimitedIntegrationWithin(ctx, view, f, generators, e, bounds); return e;
}
export function verifyRecursiveLimitedIntegrationWithin(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], e: RecursiveLimitedIntegrationDecision, bounds: DifferentialBounds): void {
  const owner = view.owner, zero = owner.fromInteger(ctx, 0n);
  demand(e.rule === 'recursive-limited-integration-rde-v1' && e.view === view && owner.equal(ctx, f, e.f) && e.generators.length === generators.length, 'verification-failed', 'recursive limited expected request');
  for (let i = 0; i < generators.length; i++) demand(owner.equal(ctx, generators[i], e.generators[i]), 'verification-failed', 'recursive limited ordered generators');
  verifyRecursiveParametricRdeWithin(ctx, view, zero, f, generators, e.rde, bounds);
  demand(e.kind === e.rde.kind, 'verification-failed', 'recursive limited outcome');
  verifyRecursiveConditions(ctx, owner, sources(ctx, view, f, generators, e.family), e.conditions);
  if (!e.rde.family) { demand(e.family === null && e.projection === null && !e.normalized.length, 'verification-failed', 'recursive limited negative coverage'); return; }
  demand(e.projection !== null && e.family !== null && e.normalized.length === e.rde.family.directions.length + 1, 'verification-failed', 'recursive limited complete normalization');
  ctx.allocate(e.rde.family.directions.length + 1); const originals = [e.rde.family.particular, ...e.rde.family.directions];
  for (let i = 0; i < originals.length; i++) {
    const n = e.normalized[i], original = originals[i]; verifyRecursiveConstantExtraction(ctx, owner, original.value, n.extraction);
    demand(owner.equal(ctx, n.pair.value, owner.subtract(ctx, original.value, rationalInOwner(ctx, owner, n.extraction.constant)))
      && n.pair.coefficients.length === original.coefficients.length, 'verification-failed', 'recursive limited representative map');
    for (let j = 0; j < original.coefficients.length; j++) demand(Q.equal(ctx, original.coefficients[j], n.pair.coefficients[j]), 'verification-failed', 'limited coefficient preservation');
    verifyRecursiveRdePair(ctx, owner, zero, i ? zero : f, generators, n.pair);
  }
  verifyLinearSolution(ctx, Q, projectionSystem(ctx, generators.length, e.rde.family.directions), e.projection);
  demand(e.projection.kind === 'consistent' && e.family.additiveConstant === 'arbitrary-rational' && e.family.directions.length === e.projection.pivots.length,
    'verification-failed', 'limited projected family completeness');
  ctx.allocate(e.normalized.length * 2); const normalizedDirections = e.normalized.slice(1).map(p => p.pair.value);
  for (const v of e.projection.nullspace) demand(owner.isZero(ctx, nativeCombination(ctx, owner, normalizedDirections, v)), 'verification-failed', 'pure constant freedom after normalization');
  ctx.allocate(e.projection.pivots.length * 2 + e.family.directions.length + 2);
  const selected = [e.normalized[0].pair, ...e.projection.pivots.map(i => e.normalized[i + 1].pair)];
  const actual = [e.family.particular, ...e.family.directions];
  for (let i = 0; i < selected.length; i++) {
    demand(owner.equal(ctx, selected[i].value, actual[i].value) && selected[i].coefficients.length === actual[i].coefficients.length, 'verification-failed', 'limited paired family selection');
    for (let j = 0; j < selected[i].coefficients.length; j++) demand(Q.equal(ctx, selected[i].coefficients[j], actual[i].coefficients[j]), 'verification-failed', 'limited direction selection');
    verifyRecursiveRdePair(ctx, owner, zero, i ? zero : f, generators, actual[i]);
  }
}
export function solveRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], bounds: DifferentialBounds): RecursiveLimitedIntegrationDecision {
  return ctx.operation(() => solveRecursiveLimitedIntegrationWithin(ctx, view, f, generators, bounds));
}
export function verifyRecursiveLimitedIntegration(ctx: ExecutionContext, view: CertifiedTowerView, f: E, generators: readonly E[], e: RecursiveLimitedIntegrationDecision, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveLimitedIntegrationWithin(ctx, view, f, generators, e, bounds));
}
