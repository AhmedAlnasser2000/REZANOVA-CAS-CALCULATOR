/** Complete structure-theorem admission for certified tagged Q(x) exp/log towers. */
import {demand, type ExecutionContext} from './execution';
import {assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E, type DifferentialBounds} from './differential-field';
import {differentiateWithin, verifyDerivativeWithin, type DerivativeEvidence} from './differential-derivative';
import {verifyAdmission} from './differential-admission';
import {CertifiedTowerView, verifyCertifiedTowerWithin} from './recursive-certified-tower';
import {requireExpLogTowerWithin} from './transcendental-domain';
import {descendCoefficientSystemWithin, verifyCoefficientSystemWithin, matrixCapacity, type RationalCoefficientSystem} from './recursive-coefficient-system';
import {solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution} from './linear-system';
import {rationalField as Q} from './field';
import type {Rational} from './rational';
import {nativeCombination} from './recursive-rde-family';
import {solveRecursiveLogarithmicMembershipWithin, verifyRecursiveLogarithmicMembershipWithin, type RecursiveLogarithmicMembership} from './recursive-logarithmic-membership';
import {recursiveConditions, verifyRecursiveConditions, certifiedTowerConditionSources, type RecursiveCondition} from './recursive-conditions';
import type {RecursiveAdmissionInvariant} from './recursive-differential-admission';
import {ScopedProof} from './scoped-proof';

const admissionProofs = new ScopedProof(), expKey = Object.freeze({}), logKey = Object.freeze({});

export type TaggedConstruction = Readonly<{kind: 'exponential' | 'logarithm'; argument: E}>;
export interface StructuredAdmissionEvidence {
  readonly rule: 'rational-exp-log-structure-admission-v1';
  readonly parent: CertifiedTowerView;
  readonly owner: DifferentialField;
  readonly construction: TaggedConstruction;
  readonly derivative: DerivativeEvidence;
  readonly rate: E;
  readonly comparison: RationalCoefficientSystem;
  readonly linear: LinearSolution<Rational>;
  readonly additive: DerivativeEvidence | null;
  /** Complete valuations are retained only to recover a dependent exponential's least index. */
  readonly membership: RecursiveLogarithmicMembership | null;
  readonly outcome: 'admitted' | 'dependent';
  readonly conditions: readonly RecursiveCondition[];
}
export type StructuredDifferentialAdmission = Readonly<
  | {kind: 'admitted'; evidence: StructuredAdmissionEvidence; view: CertifiedTowerView; invariant: null}
  | {kind: 'dependent'; evidence: StructuredAdmissionEvidence; view: null; invariant: RecursiveAdmissionInvariant}
>;

function constructionShape(ctx: ExecutionContext, c: TaggedConstruction): void {
  ctx.tick();
  demand(c !== null && typeof c === 'object' && (Object.getPrototypeOf(c) === Object.prototype || Object.getPrototypeOf(c) === null),
    'invalid-input', 'tagged construction record');
  const keys = Reflect.ownKeys(c); ctx.allocate(keys.length);
  demand(keys.length === 2, 'invalid-input', 'tagged construction keys');
  for (const key of ['kind', 'argument']) {
    const d = Object.getOwnPropertyDescriptor(c, key);
    demand(d !== undefined && 'value' in d && d.enumerable === true, 'invalid-input', 'tagged construction accessor/coverage');
  }
  demand(c.kind === 'exponential' || c.kind === 'logarithm', 'invalid-input', 'tagged construction descriptor');
}
function validate(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, c: TaggedConstruction, bounds: DifferentialBounds): void {
  constructionShape(ctx, c);
  requireExpLogTowerWithin(ctx, parent, bounds); assertDifferentialFieldOwner(ctx, owner);
  demand(owner.parent === parent.owner && owner.kind === 'formal', 'domain-mismatch', 'supplied tagged extension owner');
  parent.owner.assert(ctx, c.argument);
  if (owner.height > bounds.towerHeight) ctx.exhaust('tower-height');
  if (c.kind === 'logarithm') demand(!parent.owner.isZero(ctx, c.argument), 'division-by-zero', 'zero logarithm argument');
  if (owner.admission) {
    verifyAdmission(ctx, owner, owner.admission);
    demand(owner.admission.kind === (c.kind === 'logarithm' ? 'logarithmic' : 'exponential')
      && parent.owner.equal(ctx, owner.admission.argument, c.argument), 'verification-failed', 'tagged native original construction');
  }
}
function levels(ctx: ExecutionContext, parent: CertifiedTowerView): readonly CertifiedTowerView[] {
  const result: CertifiedTowerView[] = [];
  for (let v: CertifiedTowerView | null = parent; v?.parent; v = v.parent) {ctx.tick(); ctx.allocate(1); result.push(v);}
  return result.reverse();
}
function previousArgument(ctx: ExecutionContext, view: CertifiedTowerView): E {
  ctx.tick();
  if (view.proof.kind === 'first-level') return view.proof.admission.argument;
  if (view.proof.kind === 'structured') return view.proof.admission.construction.argument;
  demand(view.proof.kind === 'recursive' && (view.proof.admission.construction.kind === 'logarithm'
    || view.proof.admission.construction.kind === 'exponential'), 'domain-mismatch', 'structure theorem requires tagged parent chain');
  return view.proof.admission.construction.argument;
}
/** The columns are in supplied generator order; the exponential constant is first. */
export function structuredAdmissionSystem(ctx: ExecutionContext, parent: CertifiedTowerView, c: TaggedConstruction, eta: E): LinearSystem<E> {
  const owner = parent.owner, columns: E[] = [];
  if (c.kind === 'exponential') {ctx.allocate(1); columns.push(owner.fromInteger(ctx, 1n));}
  for (const v of levels(ctx, parent)) {
    ctx.allocate(1);
    columns.push(owner.embed(ctx, c.kind === 'logarithm' ? v.rate!
      : v.monomial === 'hyperexponential' ? previousArgument(ctx, v) : v.owner.generator(ctx)));
  }
  matrixCapacity(ctx, 1, columns.length); ctx.allocate(4);
  return Object.freeze({rows: 1, columns: columns.length, matrix: Object.freeze([Object.freeze(columns)]),
    rhs: Object.freeze([c.kind === 'exponential' ? c.argument : eta])});
}
function additiveValue(ctx: ExecutionContext, parent: CertifiedTowerView, coefficients: readonly Rational[]): E {
  const values = levels(ctx, parent).map(v => parent.owner.embed(ctx,
    v.monomial === 'hyperexponential' ? previousArgument(ctx, v) : v.owner.generator(ctx)));
  ctx.allocate(values.length); return nativeCombination(ctx, parent.owner, values, coefficients);
}
function sources(ctx: ExecutionContext, parent: CertifiedTowerView, c: TaggedConstruction, eta: E) {
  const result = [...certifiedTowerConditionSources(ctx, parent),
    {path: 'construction.argument', value: c.argument, nonzero: c.kind === 'logarithm'}, {path: 'construction.rate', value: eta}];
  ctx.allocate(result.length); return result;
}
export function verifyStructuredAdmissionEvidenceWithin(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, e: StructuredAdmissionEvidence, bounds: DifferentialBounds): void {
  ctx.tick();
  constructionShape(ctx, c);
  demand(e !== null && typeof e === 'object' && e.comparison !== null && typeof e.comparison === 'object',
    'invalid-input', 'structure admission evidence');
  ctx.allocate(3); const owners: object[] = [parent, e.comparison.auxiliary];
  for (let f: DifferentialField | undefined = owner; f; f = f.parent) {
    ctx.tick(); ctx.allocate(3); owners.push(f); if (f.fractions) owners.push(f.fractions, f.fractions.ring);
  }
  admissionProofs.check(ctx, [parent, owner, c.argument, c.kind === 'exponential' ? expKey : logKey, e, bounds],
    () => checkEvidence(ctx, parent, owner, c, e, bounds), owners);
}
function checkEvidence(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, e: StructuredAdmissionEvidence, bounds: DifferentialBounds): void {
  validate(ctx, parent, owner, c, bounds); const base = parent.owner, ring = owner.fractions!.ring;
  demand(e.rule === 'rational-exp-log-structure-admission-v1' && e.parent === parent && e.owner === owner
    && e.construction.kind === c.kind && base.equal(ctx, e.construction.argument, c.argument), 'verification-failed', 'complete tagged construction binding');
  verifyDerivativeWithin(ctx, base, c.argument, e.derivative);
  const eta = c.kind === 'logarithm' ? base.exactDivide(ctx, e.derivative.derivative, c.argument) : e.derivative.derivative;
  demand(base.equal(ctx, e.rate, eta) && ring.equal(ctx, owner.rule!, c.kind === 'logarithm' ? ring.constant(ctx, eta)
    : ring.make(ctx, [base.fromInteger(ctx, 0n), eta])), 'verification-failed', 'tagged exact native derivation');
  const system = structuredAdmissionSystem(ctx, parent, c, eta);
  verifyCoefficientSystemWithin(ctx, base, system, e.comparison, bounds);
  verifyLinearSolution(ctx, Q, e.comparison.system, e.linear);
  const admitted = e.linear.kind === 'inconsistent';
  demand(e.outcome === (admitted ? 'admitted' : 'dependent'), 'verification-failed', 'complete structure-admission outcome');
  if (admitted) demand(e.additive === null && e.membership === null, 'verification-failed', 'extraneous admitted dependency witness');
  else if (c.kind === 'logarithm') {
    demand(e.linear.kind === 'consistent' && e.additive !== null && e.membership === null, 'verification-failed', 'additive structure witness coverage');
    const expected = additiveValue(ctx, parent, e.linear.particular);
    verifyDerivativeWithin(ctx, base, expected, e.additive);
    demand(base.equal(ctx, e.additive.derivative, eta), 'verification-failed', 'independent additive dependence identity');
  } else {
    demand(e.additive === null && e.membership !== null, 'verification-failed', 'least radical index witness coverage');
    verifyRecursiveLogarithmicMembershipWithin(ctx, parent, eta, e.membership, bounds);
    demand(e.membership.radical && e.membership.witness !== null, 'verification-failed', 'structure relation and complete valuations disagree');
  }
  verifyRecursiveConditions(ctx, owner, sources(ctx, parent, c, eta), e.conditions);
}
function invariant(ctx: ExecutionContext, e: StructuredAdmissionEvidence): RecursiveAdmissionInvariant {
  ctx.allocate(4);
  if (e.additive) return Object.freeze({kind: 'additive', representative: e.additive.input, derivative: e.additive});
  demand(e.membership?.witness !== null && e.membership?.witness !== undefined, 'verification-failed', 'missing least-index witness');
  ctx.allocate(e.membership.relations.factors.length);
  return Object.freeze({kind: 'multiplicative', index: e.membership.witness.index,
    factors: Object.freeze(e.membership.relations.factors.map(f => f.value)), powers: e.membership.witness.powers});
}
/** A registered view may retain this new evidence directly only after full immutable-graph validation.
 * Native owners/values keep their own registries; this walk grants no mathematical authority. */
export function requireImmutableStructuredAdmission(ctx: ExecutionContext, e: StructuredAdmissionEvidence): void {
  ctx.allocate(4); const owned = new Set<object>([e.parent, e.comparison.auxiliary]), seen = new Set<object>();
  for (let owner: DifferentialField | undefined = e.owner; owner; owner = owner.parent) {
    ctx.tick(); ctx.allocate(3); owned.add(owner); if (owner.fractions) {owned.add(owner.fractions); owned.add(owner.fractions.ring);}
  }
  function visit(value: unknown): void {
    ctx.tick(); if (value === null || typeof value !== 'object') {demand(typeof value !== 'function', 'invalid-input', 'immutable evidence function'); return;}
    if (owned.has(value) || seen.has(value)) return;
    demand(Object.isFrozen(value), 'invalid-input', 'structured view requires immutable evidence');
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
    demand(array || prototype === Object.prototype || prototype === null, 'invalid-input', 'structured evidence foreign class');
    ctx.allocate(1); seen.add(value); const keys = Reflect.ownKeys(value); ctx.allocate(keys.length);
    for (const k of keys) {
      if (array && k === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(value, k);
      demand(typeof k === 'string' && d !== undefined && 'value' in d && d.enumerable === true, 'invalid-input', 'structured evidence accessor/hidden key');
      visit(d.value);
    }
  }
  visit(e);
}
export function certifyStructuredDifferentialExtensionWithin(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, bounds: DifferentialBounds): StructuredDifferentialAdmission {
  demand(ctx.operationToken !== undefined, 'invalid-input', 'structure admission requires operation scope');
  validate(ctx, parent, owner, c, bounds); ctx.allocate(2); const construction = Object.freeze({...c});
  const derivative = differentiateWithin(ctx, parent.owner, c.argument);
  const eta = c.kind === 'logarithm' ? parent.owner.exactDivide(ctx, derivative.derivative, c.argument) : derivative.derivative;
  const comparison = descendCoefficientSystemWithin(ctx, parent.owner, structuredAdmissionSystem(ctx, parent, c, eta), bounds);
  const linear = solveLinearSystem(ctx, Q, comparison.system), admitted = linear.kind === 'inconsistent';
  const additive = !admitted && c.kind === 'logarithm' && linear.kind === 'consistent'
    ? differentiateWithin(ctx, parent.owner, additiveValue(ctx, parent, linear.particular)) : null;
  const membership = !admitted && c.kind === 'exponential' ? solveRecursiveLogarithmicMembershipWithin(ctx, parent, eta, bounds) : null;
  ctx.allocate(12);
  const evidence: StructuredAdmissionEvidence = Object.freeze({rule: 'rational-exp-log-structure-admission-v1', parent, owner,
    construction, derivative, rate: eta, comparison, linear, additive, membership, outcome: admitted ? 'admitted' : 'dependent',
    conditions: recursiveConditions(ctx, owner, sources(ctx, parent, construction, eta))});
  verifyStructuredAdmissionEvidenceWithin(ctx, parent, owner, c, evidence, bounds); ctx.allocate(4);
  const decision: StructuredDifferentialAdmission = admitted
    ? Object.freeze({kind: 'admitted', evidence, view: CertifiedTowerView.structuredWithin(ctx, evidence, bounds), invariant: null})
    : Object.freeze({kind: 'dependent', evidence, view: null, invariant: invariant(ctx, evidence)});
  verifyStructuredDifferentialAdmissionWithin(ctx, parent, owner, c, decision, bounds); return decision;

}
export function certifyStructuredDifferentialExtension(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, bounds: DifferentialBounds): StructuredDifferentialAdmission {
  return ctx.operation(() => certifyStructuredDifferentialExtensionWithin(ctx, parent, owner, c, bounds));
}
export function verifyStructuredDifferentialAdmissionWithin(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, e: StructuredDifferentialAdmission, bounds: DifferentialBounds): void {
  verifyStructuredAdmissionEvidenceWithin(ctx, parent, owner, c, e.evidence, bounds);
  demand(e.kind === e.evidence.outcome, 'verification-failed', 'structured decision outcome');
  if (e.kind === 'admitted') {
    demand(e.invariant === null && e.view.owner === owner && e.view.parent === parent && e.view.proof.kind === 'structured'
      && e.view.proof.admission === e.evidence, 'verification-failed', 'structured certified view binding');
    verifyCertifiedTowerWithin(ctx, e.view, bounds); return;
  }
  demand(e.view === null, 'verification-failed', 'dependent extension cannot have certified view');
  const expected = invariant(ctx, e.evidence), actual = e.invariant;
  demand(actual.kind === expected.kind, 'verification-failed', 'structured invariant kind');
  if (actual.kind === 'additive' && expected.kind === 'additive') {
    demand(parent.owner.equal(ctx, actual.representative, expected.representative), 'verification-failed', 'structured additive mapping');
    verifyDerivativeWithin(ctx, parent.owner, actual.representative, actual.derivative);
    demand(parent.owner.equal(ctx, actual.derivative.derivative, e.evidence.rate), 'verification-failed', 'D(t-v)=0');
  } else if (actual.kind === 'multiplicative' && expected.kind === 'multiplicative') {
    demand(actual.index === expected.index && actual.powers.length === expected.powers.length && actual.factors.length === expected.factors.length,
      'verification-failed', 'complete least-index invariant coverage');
    for (let i = 0; i < expected.factors.length; i++) demand(actual.powers[i] === expected.powers[i]
      && parent.owner.equal(ctx, actual.factors[i], expected.factors[i]), 'verification-failed', 'structured multiplicative mapping');
  }
}
export function verifyStructuredDifferentialExtension(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField,
  c: TaggedConstruction, e: StructuredDifferentialAdmission, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyStructuredDifferentialAdmissionWithin(ctx, parent, owner, c, e, bounds));
}
