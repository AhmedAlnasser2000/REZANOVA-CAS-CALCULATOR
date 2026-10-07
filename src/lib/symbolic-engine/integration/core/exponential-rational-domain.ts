import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialBounds } from './differential-field';
import { FirstLevelRationalDomain, requireFirstLevelField } from './first-level-rational-domain';
export { polynomialElement, polynomialValue, totalPolynomialDerivative, verifyTotalPolynomialDerivative, type EP } from './first-level-rational-domain';

export function requireExponentialField(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds): void {
  requireFirstLevelField(ctx, field, bounds);
  demand(field.admission?.kind === 'exponential', 'domain-mismatch', 'certified first-level exponential field required');
}
const domains = new WeakSet<object>();
export function assertExponentialRationalDomain(ctx: ExecutionContext, domain: ExponentialRationalDomain): void {
  ctx.tick(); demand(typeof domain === 'object' && domain !== null && domains.has(domain), 'domain-mismatch', 'exponential rational domain ownership');
}
export class ExponentialRationalDomain extends FirstLevelRationalDomain {
  constructor(ctx: ExecutionContext, field: DifferentialField, bounds: DifferentialBounds) {
    requireExponentialField(ctx, field, bounds); super(ctx, field, bounds);
    domains.add(this); Object.freeze(this);
  }
}
