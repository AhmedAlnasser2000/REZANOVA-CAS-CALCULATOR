import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialBounds, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { requireRationalVariable, verifyAdmission } from './differential-admission';
import { verifyDerivative, differentiate, type DerivativeEvidence } from './differential-derivative';
import { rationalField } from './field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import type { Rational } from './rational';

export type EP = Polynomial<E>;
export function requireExponentialField(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); assertDifferentialFieldOwner(ctx, field);
  demand(field.kind === 'formal' && field.parent !== undefined && field.admission?.kind === 'exponential'
    && field.constantField === 'Q', 'domain-mismatch', 'certified first-level exponential field required');
  requireRationalVariable(ctx, field.parent);
  if (field.height > bounds.towerHeight) ctx.exhaust('tower-height');
  verifyAdmission(ctx, field, field.admission);
}
const domains = new WeakSet<object>();
export function assertExponentialRationalDomain(ctx: ExecutionContext, domain: ExponentialRationalDomain): void {
  ctx.tick(); demand(typeof domain === 'object' && domain !== null && domains.has(domain), 'domain-mismatch', 'exponential rational domain ownership');
}
export class ExponentialRationalDomain {
  readonly field: DifferentialField;
  readonly base: DifferentialField;
  readonly t: PolynomialRing<E>;
  readonly z: PolynomialRing<Rational>;
  readonly kz: PolynomialRing<E>;
  readonly fz: PolynomialRing<E>;
  readonly elimination: PolynomialRing<EP, PolynomialDomain<E>>;
  constructor(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds) {
    requireExponentialField(ctx, field, bounds); ctx.allocate(24);
    this.field = field; this.base = field.parent!; this.t = field.fractions!.ring;
    let variable = 'z';
    while (variable === this.t.variable || variable === this.base.fractions!.ring.variable) { ctx.tick(); ctx.allocate(1); variable += '1'; }
    this.z = new PolynomialRing(rationalField, variable);
    this.kz = new PolynomialRing(this.base, variable); this.fz = new PolynomialRing(field, variable);
    this.elimination = new PolynomialRing(new PolynomialDomain(this.kz), this.t.variable);
    domains.add(this); Object.freeze(this);
  }
  lift(ctx: ExecutionContext, p: Polynomial<Rational>, ring = this.fz): EP {
    this.z.assert(ctx, p); ctx.allocate(p.coefficients.length);
    demand(ring === this.fz || ring === this.kz, 'domain-mismatch', 'exponential residue ring');
    const owner = ring === this.fz ? this.field : this.base;
    return ring.make(ctx, p.coefficients.map(c => owner.embed(ctx, this.base.parent!.scalar(ctx, c))));
  }
}
export function polynomialElement(ctx: ExecutionContext, field: DifferentialField, p: EP): E {
  field.fractions!.ring.assert(ctx, p); return field.make(ctx, p.coefficients);
}
export function polynomialValue(ctx: ExecutionContext, field: DifferentialField, value: E): EP {
  field.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'exponential fraction');
  const ring = field.fractions!.ring;
  demand(ring.equal(ctx, value.value.denominator, ring.one(ctx)), 'verification-failed', 'expected polynomial in exponential');
  return value.value.numerator;
}
export function totalPolynomialDerivative(ctx: ExecutionContext, field: DifferentialField, p: EP): DerivativeEvidence {
  return differentiate(ctx, field, polynomialElement(ctx, field, p));
}
export function verifyTotalPolynomialDerivative(ctx: ExecutionContext, field: DifferentialField, p: EP, proof: DerivativeEvidence): EP {
  verifyDerivative(ctx, field, polynomialElement(ctx, field, p), proof);
  return polynomialValue(ctx, field, proof.derivative);
}
