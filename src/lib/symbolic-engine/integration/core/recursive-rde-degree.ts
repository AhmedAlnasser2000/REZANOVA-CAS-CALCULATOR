/** Complete infinity bounds, including the primitive next-coefficient cancellation. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { Polynomial as P } from './polynomial';
import { type CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { solveRecursiveLogarithmicMembershipWithin, verifyRecursiveLogarithmicMembershipWithin, type RecursiveLogarithmicMembership } from './recursive-logarithmic-membership';
import { solveRecursiveLimitedIntegrationWithin, verifyRecursiveLimitedIntegrationWithin, type RecursiveLimitedIntegrationDecision } from './recursive-limited-integration';
import { solveHyperexponentialResonance, verifyHyperexponentialResonance, type HyperexponentialResonance } from './recursive-hyperexponential-resonance';

export interface RecursiveDegreeBound {
  readonly baseline: bigint;
  readonly bound: bigint;
  readonly membership: RecursiveLogarithmicMembership | null;
  readonly limited: RecursiveLimitedIntegrationDecision | null;
  readonly hyper: HyperexponentialResonance | null;
}
function data(ctx: ExecutionContext, view: CertifiedTowerView, A: P<E>, B: P<E>, C: readonly P<E>[]) {
  const ring = view.owner.fractions!.ring, parent = view.parent!.owner, da = ring.degree(ctx, A), db = ring.degree(ctx, B);
  demand(da >= 0, 'invalid-input', 'nonzero polynomial differential coefficient');
  let dc = -1; for (const c of C) dc = Math.max(dc, ring.degree(ctx, c));
  const dominant = db > da, hyp = view.monomial === 'hyperexponential';
  const baseline = BigInt(Math.max(0, dominant ? dc - db : hyp ? dc - da : dc - da + 1)); ctx.integer(baseline);
  const a = ring.leading(ctx, A), zero = parent.fromInteger(ctx, 0n);
  const alpha = parent.negate(ctx, parent.exactDivide(ctx, db === da ? ring.leading(ctx, B) : zero, a));
  // Exact indexed coefficients matter when the leading cancellation has an abnormal drop.
  const beta = parent.negate(ctx, parent.exactDivide(ctx, parent.add(ctx,
    parent.multiply(ctx, A.coefficients[da - 1] ?? zero, alpha), B.coefficients[da - 1] ?? zero), a));
  return {da, db, baseline, dominant, hyp, alpha, beta};
}
function limitedDegree(ctx: ExecutionContext, limited: RecursiveLimitedIntegrationDecision | null): bigint | null {
  if (!limited?.family) return null;
  demand(limited.family.directions.length === 0 && limited.family.particular.coefficients.length === 1,
    'verification-failed', 'primitive admission excludes coefficient freedom');
  const c = limited.family.particular.coefficients[0];
  return c.denominator === 1n && c.numerator <= 0n ? ctx.add(0n, -c.numerator) : null;
}
function upper(ctx: ExecutionContext, baseline: bigint, e: RecursiveDegreeBound): bigint {
  let extra = limitedDegree(ctx, e.limited);
  if (e.hyper?.actual && e.hyper.exponent?.denominator === 1n && e.hyper.exponent.numerator >= 0n) extra = e.hyper.exponent.numerator;
  return extra !== null && extra > baseline ? extra : baseline;
}
export function boundRecursiveDegree(ctx: ExecutionContext, view: CertifiedTowerView, A: P<E>, B: P<E>, C: readonly P<E>[], bounds: DifferentialBounds): RecursiveDegreeBound {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(view.parent !== null && view.rate !== null, 'domain-mismatch', 'recursive infinity level');
  const d = data(ctx, view, A, B, C); let membership: RecursiveLogarithmicMembership | null = null,
    limited: RecursiveLimitedIntegrationDecision | null = null, hyper: HyperexponentialResonance | null = null;
  if (!d.dominant) {
    if (d.hyp) hyper = solveHyperexponentialResonance(ctx, view, d.alpha, bounds);
    else if (d.db === d.da) {
      membership = solveRecursiveLogarithmicMembershipWithin(ctx, view.parent, d.alpha, bounds);
      if (membership.actual) limited = solveRecursiveLimitedIntegrationWithin(ctx, view.parent, d.beta, [view.rate], bounds);
    } else if (d.db === d.da - 1) limited = solveRecursiveLimitedIntegrationWithin(ctx, view.parent, d.beta, [view.rate], bounds);
  }
  const base = {baseline: d.baseline, bound: d.baseline, membership, limited, hyper}; ctx.allocate(5);
  const e = Object.freeze({...base, bound: upper(ctx, d.baseline, base)}); verifyRecursiveDegreeBound(ctx, view, A, B, C, e, bounds); return e;
}
export function verifyRecursiveDegreeBound(ctx: ExecutionContext, view: CertifiedTowerView, A: P<E>, B: P<E>, C: readonly P<E>[], e: RecursiveDegreeBound, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(view.parent !== null && view.rate !== null, 'domain-mismatch', 'recursive infinity level');
  const d = data(ctx, view, A, B, C);
  demand(e.baseline === d.baseline, 'verification-failed', 'complete infinity forcing bound');
  if (d.dominant || (!d.hyp && d.db < d.da - 1)) demand(e.membership === null && e.limited === null && e.hyper === null, 'verification-failed', 'dominant infinity certificate');
  else if (d.hyp) {
    demand(e.hyper !== null && e.membership === null && e.limited === null, 'verification-failed', 'hyperexponential infinity coverage');
    verifyHyperexponentialResonance(ctx, view, d.alpha, e.hyper, bounds);
  } else {
    demand(e.hyper === null, 'verification-failed', 'primitive infinity type');
    if (d.db === d.da) {
      demand(e.membership !== null, 'verification-failed', 'primitive homogeneous leading membership');
      verifyRecursiveLogarithmicMembershipWithin(ctx, view.parent, d.alpha, e.membership, bounds);
      if (!e.membership.actual) demand(e.limited === null, 'verification-failed', 'primitive nonactual leading stop');
    } else demand(e.membership === null, 'verification-failed', 'primitive direct cancellation coverage');
    if (d.db === d.da - 1 || e.membership?.actual) {
      demand(e.limited !== null, 'verification-failed', 'primitive next-coefficient completeness');
      verifyRecursiveLimitedIntegrationWithin(ctx, view.parent, d.beta, [view.rate], e.limited, bounds);
    }
  }
  ctx.integer(e.bound); demand(e.bound === upper(ctx, d.baseline, e), 'verification-failed', 'complete recursive polynomial degree bound');
}
