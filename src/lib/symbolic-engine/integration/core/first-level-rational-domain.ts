import { ArithmeticRationalDomain } from './transcendental-domain';
export { requireFirstLevelField } from './transcendental-domain';
import { demand, type ExecutionContext } from './execution';
import { type DifferentialBounds, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { verifyDerivative, differentiate, type DerivativeEvidence } from './differential-derivative';
import { type Polynomial } from './polynomial';

export type EP = Polynomial<E>;
const domains = new WeakSet<object>();
export function assertFirstLevelRationalDomain(ctx: ExecutionContext, domain: FirstLevelRationalDomain): void {
  ctx.tick(); demand(typeof domain === 'object' && domain !== null && domains.has(domain), 'domain-mismatch', 'first-level transcendental rational domain ownership');
}
export class FirstLevelRationalDomain extends ArithmeticRationalDomain {
  constructor(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds) {
    super(ctx, field, bounds); domains.add(this); Object.freeze(this);
  }
}
export function polynomialElement(ctx: ExecutionContext, field: DifferentialField, p: EP): E {
  field.fractions!.ring.assert(ctx, p); return field.make(ctx, p.coefficients);
}
export function polynomialValue(ctx: ExecutionContext, field: DifferentialField, value: E): EP {
  field.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'first-level transcendental fraction');
  const ring = field.fractions!.ring;
  demand(ring.equal(ctx, value.value.denominator, ring.one(ctx)), 'verification-failed', 'expected polynomial in first-level transcendental');
  return value.value.numerator;
}
export function totalPolynomialDerivative(ctx: ExecutionContext, field: DifferentialField, p: EP): DerivativeEvidence {
  return differentiate(ctx, field, polynomialElement(ctx, field, p));
}
export function verifyTotalPolynomialDerivative(ctx: ExecutionContext, field: DifferentialField, p: EP, proof: DerivativeEvidence): EP {
  verifyDerivative(ctx, field, polynomialElement(ctx, field, p), proof);
  return polynomialValue(ctx, field, proof.derivative);
}
