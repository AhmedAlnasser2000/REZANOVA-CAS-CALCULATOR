/** Registered arithmetic over certified exp/log towers; legacy admission remains separate. */
import { AlgebraError, demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialField, type DifferentialElement as E, type DifferentialBounds } from './differential-field';
import { requireRationalVariable, verifyAdmission } from './differential-admission';
import { CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import { rationalField } from './field';
import type { Rational } from './rational';

export class UnsupportedTranscendentalTower extends AlgebraError {
  constructor() { super('domain-mismatch', 'unsupported general differential-rule construction in exp/log integration'); this.name = 'UnsupportedTranscendentalTower'; }
}
export function requireFirstLevelField(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); assertDifferentialFieldOwner(ctx, field);
  demand(field.kind === 'formal' && field.parent !== undefined && (field.admission?.kind === 'exponential' || field.admission?.kind === 'logarithmic')
    && field.constantField === 'Q', 'domain-mismatch', 'certified first-level transcendental field required');
  requireRationalVariable(ctx, field.parent);
  if (field.height > bounds.towerHeight) ctx.exhaust('tower-height');
  verifyAdmission(ctx, field, field.admission);
}
export function requireExpLogTowerWithin(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds);
  for (let v: CertifiedTowerView | null = view; v; v = v.parent) {
    ctx.tick();
    if (v.proof.kind === 'recursive' && v.proof.admission.construction.kind !== 'logarithm' && v.proof.admission.construction.kind !== 'exponential')
      throw new UnsupportedTranscendentalTower();
  }
}
const domains = new WeakSet<object>();
export function assertArithmeticDomain(ctx: ExecutionContext, d: ArithmeticRationalDomain): void {
  ctx.tick(); demand(typeof d === 'object' && d !== null && domains.has(d), 'domain-mismatch', 'registered transcendental arithmetic domain');
}
export function requireArithmeticDomain(ctx: ExecutionContext, d: ArithmeticRationalDomain, bounds: DifferentialBounds): void {
  assertArithmeticDomain(ctx, d);
  if (d.view) { requireExpLogTowerWithin(ctx, d.view, bounds); demand(d.field === d.view.owner, 'domain-mismatch', 'complete tower owner'); }
  else requireFirstLevelField(ctx, d.field, bounds);
}
export class ArithmeticRationalDomain {
  readonly field: DifferentialField;
  readonly base: DifferentialField;
  readonly t: PolynomialRing<E>;
  readonly z: PolynomialRing<Rational>;
  readonly kz: PolynomialRing<E>;
  readonly fz: PolynomialRing<E>;
  readonly elimination: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>;
  readonly view: CertifiedTowerView | null;
  readonly monomial: CertifiedTowerView['monomial'];
  protected constructor(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds, view: CertifiedTowerView | null = null) {
    if (view) { requireExpLogTowerWithin(ctx, view, bounds); demand(view.owner === field, 'domain-mismatch', 'arithmetic certified owner'); }
    else requireFirstLevelField(ctx, field, bounds);
    ctx.allocate(26); this.field = field; this.base = field.parent!; this.t = field.fractions!.ring; this.view = view;
    this.monomial = view?.monomial ?? (field.admission!.kind === 'exponential' ? 'hyperexponential' : 'primitive');
    const names = new Set<string>();
    for (let f: DifferentialField | undefined = field; f; f = f.parent) { ctx.tick(); if (f.fractions) { ctx.allocate(1); names.add(f.fractions.ring.variable); } }
    let variable = 'z'; while (names.has(variable)) { ctx.tick(); ctx.allocate(1); variable += '1'; }
    this.z = new PolynomialRing(rationalField, variable); this.kz = new PolynomialRing(this.base, variable);
    this.fz = new PolynomialRing(field, variable); this.elimination = new PolynomialRing(new PolynomialDomain(this.kz), this.t.variable);
    domains.add(this); Object.freeze(this);
  }
  lift(ctx: ExecutionContext, p: Polynomial<Rational>, ring = this.fz): Polynomial<E> {
    this.z.assert(ctx, p); ctx.allocate(p.coefficients.length);
    demand(ring === this.fz || ring === this.kz, 'domain-mismatch', 'transcendental residue ring owner');
    const owner = ring === this.fz ? this.field : this.base; let q = owner; while (q.parent) { ctx.tick(); q = q.parent; }
    return ring.make(ctx, p.coefficients.map(c => owner.embed(ctx, q.scalar(ctx, c))));
  }
}
export class TranscendentalDomain extends ArithmeticRationalDomain {
  declare readonly view: CertifiedTowerView;
  constructor(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds) { super(ctx, view.owner, bounds, view); }
}
