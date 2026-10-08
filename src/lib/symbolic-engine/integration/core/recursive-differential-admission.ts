/** Constant-preserving admission is established by complete parent subsidiary decisions. */
import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E, type DifferentialBounds } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { verifyAdmission } from './differential-admission';
import { CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { solveRecursiveLimitedIntegrationWithin, verifyRecursiveLimitedIntegrationWithin, type RecursiveLimitedIntegrationDecision } from './recursive-limited-integration';
import { solveRecursiveLogarithmicMembershipWithin, verifyRecursiveLogarithmicMembershipWithin, type RecursiveLogarithmicMembership } from './recursive-logarithmic-membership';
import { recursiveConditions, verifyRecursiveConditions, certifiedTowerConditionSources, type RecursiveCondition } from './recursive-conditions';

export type RecursiveConstruction = Readonly<
  | {kind: 'primitive'; integrand: E}
  | {kind: 'hyperexponential'; integrand: E}
  | {kind: 'logarithm'; argument: E}
  | {kind: 'exponential'; argument: E}
>;
export interface RecursiveAdmissionEvidence {
  readonly rule: 'recursive-primitive-hyperexponential-admission-v1';
  readonly parent: CertifiedTowerView;
  readonly owner: DifferentialField;
  readonly construction: RecursiveConstruction;
  readonly derivative: DerivativeEvidence | null;
  readonly rate: E;
  readonly primitive: RecursiveLimitedIntegrationDecision | null;
  readonly hyperexponential: RecursiveLogarithmicMembership | null;
  readonly outcome: 'admitted' | 'dependent';
  readonly conditions: readonly RecursiveCondition[];
}
export type RecursiveAdmissionInvariant = Readonly<
  | {kind: 'additive'; representative: E; derivative: DerivativeEvidence}
  | {kind: 'multiplicative'; index: bigint; factors: readonly E[]; powers: readonly bigint[]}
>;
export type RecursiveDifferentialAdmission = Readonly<
  | {kind: 'admitted'; evidence: RecursiveAdmissionEvidence; view: CertifiedTowerView; invariant: null}
  | {kind: 'dependent'; evidence: RecursiveAdmissionEvidence; view: null; invariant: RecursiveAdmissionInvariant}
>;
export function recursiveConstructionArgument(c: RecursiveConstruction): E {
  return c.kind === 'primitive' || c.kind === 'hyperexponential' ? c.integrand : c.argument;
}
export function recursiveConstructionIsHyper(c: RecursiveConstruction): boolean { return c.kind === 'hyperexponential' || c.kind === 'exponential'; }
function validate(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, c: RecursiveConstruction, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, parent, bounds); assertDifferentialFieldOwner(ctx, owner);
  demand(owner.parent === parent.owner && owner.kind === 'formal', 'domain-mismatch', 'supplied recursive extension owner');
  demand(c !== null && typeof c === 'object' && ['primitive', 'hyperexponential', 'logarithm', 'exponential'].includes(c.kind), 'invalid-input', 'recursive construction descriptor');
  parent.owner.assert(ctx, recursiveConstructionArgument(c));
  if (owner.height > bounds.towerHeight) ctx.exhaust('tower-height');
  if (c.kind === 'logarithm') demand(!parent.owner.isZero(ctx, c.argument), 'division-by-zero', 'zero logarithm argument');
  if (owner.admission) {
    verifyAdmission(ctx, owner, owner.admission);
    demand((c.kind === 'logarithm' && owner.admission.kind === 'logarithmic' || c.kind === 'exponential' && owner.admission.kind === 'exponential')
      && parent.owner.equal(ctx, recursiveConstructionArgument(c), owner.admission.argument), 'verification-failed', 'native original construction descriptor');
  }
}
function sources(ctx: ExecutionContext, parent: CertifiedTowerView, c: RecursiveConstruction, rate: E) {
  const out = [...certifiedTowerConditionSources(ctx, parent), {path: 'construction.argument', value: recursiveConstructionArgument(c), nonzero: c.kind === 'logarithm'},
    {path: 'construction.rate', value: rate}]; ctx.allocate(out.length); return out;
}
function rate(ctx: ExecutionContext, parent: CertifiedTowerView, c: RecursiveConstruction, derivative: DerivativeEvidence | null): E {
  if (c.kind === 'primitive' || c.kind === 'hyperexponential') {
    demand(derivative === null, 'verification-failed', 'general monomial construction integrand'); return c.integrand;
  }
  demand(derivative !== null, 'verification-failed', 'construction derivative coverage'); verifyDerivative(ctx, parent.owner, c.argument, derivative);
  return c.kind === 'logarithm' ? parent.owner.exactDivide(ctx, derivative.derivative, c.argument) : derivative.derivative;
}
export function verifyRecursiveAdmissionEvidenceWithin(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, c: RecursiveConstruction, e: RecursiveAdmissionEvidence, bounds: DifferentialBounds): void {
  validate(ctx, parent, owner, c, bounds); const base = parent.owner, r = owner.fractions!.ring, hyper = recursiveConstructionIsHyper(c);
  demand(e.rule === 'recursive-primitive-hyperexponential-admission-v1' && e.parent === parent && e.owner === owner && e.construction.kind === c.kind
    && base.equal(ctx, recursiveConstructionArgument(c), recursiveConstructionArgument(e.construction)), 'verification-failed', 'admission complete expected construction');
  const eta = rate(ctx, parent, c, e.derivative);
  demand(base.equal(ctx, e.rate, eta) && r.equal(ctx, owner.rule!, hyper ? r.make(ctx, [base.fromInteger(ctx, 0n), eta]) : r.constant(ctx, eta)),
    'verification-failed', 'admission exact native derivation');
  let admitted: boolean;
  if (hyper) {
    demand(e.primitive === null && e.hyperexponential !== null, 'verification-failed', 'hyperexponential admission criterion coverage');
    verifyRecursiveLogarithmicMembershipWithin(ctx, parent, eta, e.hyperexponential, bounds); admitted = !e.hyperexponential.radical;
  } else {
    demand(e.primitive !== null && e.hyperexponential === null, 'verification-failed', 'primitive admission criterion coverage');
    verifyRecursiveLimitedIntegrationWithin(ctx, parent, eta, [], e.primitive, bounds); admitted = e.primitive.kind === 'no-field-solution';
  }
  demand(e.outcome === (admitted ? 'admitted' : 'dependent'), 'verification-failed', 'complete constant-preserving admission outcome');
  verifyRecursiveConditions(ctx, owner, sources(ctx, parent, c, eta), e.conditions);
}
function invariant(ctx: ExecutionContext, e: RecursiveAdmissionEvidence): RecursiveAdmissionInvariant {
  if (e.primitive?.family) {
    ctx.allocate(3); const p = e.primitive.family.particular; return Object.freeze({kind: 'additive', representative: p.value, derivative: p.derivative});
  }
  demand(e.hyperexponential?.witness !== null && e.hyperexponential?.witness !== undefined, 'verification-failed', 'dependent multiplicative witness');
  const m = e.hyperexponential; ctx.allocate(m.relations.factors.length + 4);
  return Object.freeze({kind: 'multiplicative', index: m.witness!.index, factors: Object.freeze(m.relations.factors.map(f => f.value)), powers: m.witness!.powers});
}
export function certifyRecursiveDifferentialExtension(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, c: RecursiveConstruction, bounds: DifferentialBounds): RecursiveDifferentialAdmission {
  return ctx.operation(() => {
    validate(ctx, parent, owner, c, bounds); const construction = Object.freeze({...c}), derivative = c.kind === 'logarithm' || c.kind === 'exponential'
      ? differentiate(ctx, parent.owner, c.argument) : null, eta = rate(ctx, parent, construction, derivative), hyper = recursiveConstructionIsHyper(construction);
    const primitive = hyper ? null : solveRecursiveLimitedIntegrationWithin(ctx, parent, eta, [], bounds);
    const hyperexponential = hyper ? solveRecursiveLogarithmicMembershipWithin(ctx, parent, eta, bounds) : null;
    const admitted = hyper ? !hyperexponential!.radical : primitive!.kind === 'no-field-solution'; ctx.allocate(12);
    const evidence = Object.freeze({rule: 'recursive-primitive-hyperexponential-admission-v1' as const, parent, owner, construction, derivative, rate: eta,
      primitive, hyperexponential, outcome: admitted ? 'admitted' as const : 'dependent' as const, conditions: recursiveConditions(ctx, owner, sources(ctx, parent, construction, eta))});
    verifyRecursiveAdmissionEvidenceWithin(ctx, parent, owner, construction, evidence, bounds);
    let decision: RecursiveDifferentialAdmission;
    if (admitted) {
      const view = CertifiedTowerView.recursive(ctx, evidence, bounds); demand(view.proof.kind === 'recursive', 'verification-failed', 'recursive retained view');
      decision = Object.freeze({kind: 'admitted', evidence: view.proof.admission, view, invariant: null});
    } else decision = Object.freeze({kind: 'dependent', evidence, view: null, invariant: invariant(ctx, evidence)});
    verifyRecursiveDifferentialAdmissionWithin(ctx, parent, owner, construction, decision, bounds); return decision;
  });
}
export function verifyRecursiveDifferentialAdmissionWithin(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, c: RecursiveConstruction, e: RecursiveDifferentialAdmission, bounds: DifferentialBounds): void {
  verifyRecursiveAdmissionEvidenceWithin(ctx, parent, owner, c, e.evidence, bounds);
  demand(e.kind === e.evidence.outcome, 'verification-failed', 'recursive admission decision outcome');
  if (e.kind === 'admitted') {
    demand(e.invariant === null && e.view.owner === owner && e.view.parent === parent && e.view.proof.kind === 'recursive' && e.view.proof.admission === e.evidence,
      'verification-failed', 'private admitted view evidence binding'); verifyCertifiedTowerWithin(ctx, e.view, bounds); return;
  }
  demand(e.view === null, 'verification-failed', 'dependent construction cannot create certified view'); const expected = invariant(ctx, e.evidence), actual = e.invariant;
  demand(expected.kind === actual.kind, 'verification-failed', 'dependency invariant kind');
  if (expected.kind === 'additive' && actual.kind === 'additive') {
    demand(parent.owner.equal(ctx, expected.representative, actual.representative), 'verification-failed', 'additive invariant representative');
    verifyDerivative(ctx, parent.owner, actual.representative, actual.derivative);
    demand(parent.owner.equal(ctx, actual.derivative.derivative, e.evidence.rate), 'verification-failed', 'D(t-v)=0');
  } else if (expected.kind === 'multiplicative' && actual.kind === 'multiplicative') {
    demand(actual.index === expected.index && actual.powers.length === expected.powers.length && actual.factors.length === expected.factors.length,
      'verification-failed', 'least-index multiplicative invariant coverage');
    for (let i = 0; i < expected.factors.length; i++) demand(actual.powers[i] === expected.powers[i] && parent.owner.equal(ctx, actual.factors[i], expected.factors[i]),
      'verification-failed', 'factored D(t^n/g)=0 witness');
  }
}
export function verifyRecursiveDifferentialExtension(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, c: RecursiveConstruction, e: RecursiveDifferentialAdmission, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveDifferentialAdmissionWithin(ctx, parent, owner, c, e, bounds));
}
