/** Sidecar proof ownership. Native differential fields and generator order are preserved. */
import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialField, type DifferentialElement as E, type DifferentialBounds } from './differential-field';
import { copyAdmission, verifyAdmission, type FunctionAdmission } from './differential-admission';
import { verifyRecursiveAdmissionEvidenceWithin, recursiveConstructionIsHyper, type RecursiveAdmissionEvidence } from './recursive-differential-admission';
import { recursiveAdmissionEvidenceCodec } from './recursive-differential-admission-wire';
import { ScopedProof } from './scoped-proof';

const key = Symbol('certified tower view'), views = new WeakSet<object>();
const towerProofs = new ScopedProof();
export class CertifiedTowerView {
  readonly owner: DifferentialField;
  readonly parent: CertifiedTowerView | null;
  readonly monomial: 'variable' | 'primitive' | 'hyperexponential';
  readonly rate: E | null;
  readonly proof: Readonly<{kind: 'base'} | {kind: 'first-level'; admission: FunctionAdmission} | {kind: 'recursive'; admission: RecursiveAdmissionEvidence}>;
  private constructor(token: symbol, owner: DifferentialField, parent: CertifiedTowerView | null,
    monomial: CertifiedTowerView['monomial'], rate: E | null, proof: CertifiedTowerView['proof']) {
    demand(token === key, 'domain-mismatch', 'private certified tower constructor');
    this.owner = owner; this.parent = parent; this.monomial = monomial; this.rate = rate; this.proof = proof;
    views.add(this); Object.freeze(this);
  }
  static rationalFunctions(ctx: ExecutionContext, owner: DifferentialField, bounds: DifferentialBounds): CertifiedTowerView {
    return ctx.operation(() => {
      base(ctx, owner, bounds); ctx.allocate(6);
      return new CertifiedTowerView(key, owner, null, 'variable', null, Object.freeze({kind: 'base'}));
    });
  }
  /** Complete immutable evidence is rechecked; a caller-supplied flag has no authority. */
  static recursive(ctx: ExecutionContext, evidence: RecursiveAdmissionEvidence, bounds: DifferentialBounds): CertifiedTowerView {
    verifyRecursiveAdmissionEvidenceWithin(ctx, evidence.parent, evidence.owner, evidence.construction, evidence, bounds);
    demand(evidence.outcome === 'admitted', 'verification-failed', 'dependent extension cannot be admitted');
    const codec = recursiveAdmissionEvidenceCodec(ctx, evidence.parent, evidence.owner, bounds), retained = codec.decode(codec.encode(evidence));
    verifyRecursiveAdmissionEvidenceWithin(ctx, evidence.parent, evidence.owner, evidence.construction, retained, bounds); ctx.allocate(7);
    return new CertifiedTowerView(key, evidence.owner, evidence.parent, recursiveConstructionIsHyper(evidence.construction) ? 'hyperexponential' : 'primitive', retained.rate,
      Object.freeze({kind: 'recursive', admission: retained}));
  }
  /** Wrap existing admission evidence while retaining the supplied native owner. */
  static firstLevel(ctx: ExecutionContext, parent: CertifiedTowerView, owner: DifferentialField, admission: FunctionAdmission, bounds: DifferentialBounds): CertifiedTowerView {
    return ctx.operation(() => {
      verifyCertifiedTowerWithin(ctx, parent, bounds); assertDifferentialFieldOwner(ctx, owner);
      demand(parent.monomial === 'variable' && owner.parent === parent.owner, 'domain-mismatch', 'first-level view parent');
      const evidence = copyAdmission(ctx, admission); verifyAdmission(ctx, owner, evidence);
      if (owner.admission) {
        demand(owner.admission.kind === evidence.kind && parent.owner.equal(ctx, owner.admission.argument, evidence.argument),
          'verification-failed', 'supplied owner original construction');
        verifyAdmission(ctx, owner, owner.admission);
      }
      const hyper = evidence.kind === 'exponential', rate = hyper ? evidence.derivative.derivative
        : parent.owner.exactDivide(ctx, evidence.derivative.derivative, evidence.argument);
      ctx.allocate(7); return new CertifiedTowerView(key, owner, parent, hyper ? 'hyperexponential' : 'primitive', rate,
        Object.freeze({kind: 'first-level', admission: evidence}));
    });
  }
}
function base(ctx: ExecutionContext, owner: DifferentialField, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); assertDifferentialFieldOwner(ctx, owner);
  demand(owner.kind === 'variable' && owner.parent?.kind === 'rational' && owner.height === 1 && owner.rule !== undefined,
    'domain-mismatch', 'certified tower base Q(x)');
  assertDifferentialFieldOwner(ctx, owner.parent);
  demand(owner.fractions!.ring.equal(ctx, owner.rule, owner.fractions!.ring.constant(ctx, owner.parent.fromInteger(ctx, 1n))),
    'verification-failed', 'certified base D(x)=1');
  if (owner.height > bounds.towerHeight) ctx.exhaust('tower-height');
}
export function assertCertifiedTower(ctx: ExecutionContext, view: unknown): asserts view is CertifiedTowerView {
  ctx.tick(); demand(view instanceof CertifiedTowerView && views.has(view), 'domain-mismatch', 'owned certified tower view');
}
export function verifyCertifiedTowerWithin(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): void {
  assertCertifiedTower(ctx, view);
  // Registered sidecars retain only copied immutable evidence. The exact view
  // identity covers its complete construction, owners and proof; bounds remain
  // part of the key. Success is scoped to this operation, including stricter calls.
  towerProofs.check(ctx, [view, bounds], () => verifyTowerEvidence(ctx, view, bounds), [view]);
}
function verifyTowerEvidence(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): void {
  assertCertifiedTower(ctx, view); checkDifferentialBounds(ctx, bounds); assertDifferentialFieldOwner(ctx, view.owner);
  if (view.owner.height > bounds.towerHeight) ctx.exhaust('tower-height');
  if (view.proof.kind === 'base') {
    demand(view.parent === null && view.rate === null && view.monomial === 'variable', 'verification-failed', 'certified base view'); base(ctx, view.owner, bounds); return;
  }
  if (view.proof.kind === 'recursive') {
    const e = view.proof.admission;
    demand(view.parent !== null && e.outcome === 'admitted' && e.owner === view.owner && e.parent === view.parent && view.rate !== null,
      'verification-failed', 'recursive certified view coverage');
    verifyRecursiveAdmissionEvidenceWithin(ctx, view.parent, view.owner, e.construction, e, bounds);
    demand(view.monomial === (recursiveConstructionIsHyper(e.construction) ? 'hyperexponential' : 'primitive') && view.parent.owner.equal(ctx, view.rate, e.rate),
      'verification-failed', 'recursive certified monomial rate'); return;
  }
  demand(view.parent !== null && view.owner.parent === view.parent.owner && view.parent.monomial === 'variable', 'verification-failed', 'certified first-level view coverage');
  verifyCertifiedTowerWithin(ctx, view.parent, bounds); verifyAdmission(ctx, view.owner, view.proof.admission);
  const a = view.proof.admission, hyper = a.kind === 'exponential';
  demand(view.monomial === (hyper ? 'hyperexponential' : 'primitive') && view.rate !== null && view.parent.owner.equal(ctx, view.rate,
    hyper ? a.derivative.derivative : view.parent.owner.exactDivide(ctx, a.derivative.derivative, a.argument)), 'verification-failed', 'certified monomial rate');
  if (view.owner.admission) {
    demand(view.owner.admission.kind === a.kind && view.parent.owner.equal(ctx, view.owner.admission.argument, a.argument), 'verification-failed', 'certified original construction');
    verifyAdmission(ctx, view.owner, view.owner.admission);
  }
}
export function verifyCertifiedTower(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCertifiedTowerWithin(ctx, view, bounds));
}
