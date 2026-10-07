import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { type LogarithmicRationalDomain, assertLogarithmicRationalDomain, polynomialValue } from './logarithmic-rational-domain';
import { solveRationalLimitedIntegration, verifyRationalLimitedIntegration, type RationalLimitedIntegrationDecision } from './rational-limited-integration';

export interface LogarithmicPolynomialStep {
  readonly degree: bigint;
  readonly input: E;
  readonly leading: E;
  readonly limited: RationalLimitedIntegrationDecision;
  readonly correction: E | null;
  readonly derivative: DerivativeEvidence | null;
  readonly next: E | null;
}
export interface LogarithmicPolynomialReduction {
  readonly input: E;
  readonly steps: readonly LogarithmicPolynomialStep[];
  readonly fieldPart: E;
  /** Base-owner value, or null at the first checked obstruction. */
  readonly remainder: E | null;
  readonly failure: number | null;
}
export function logarithmicBaseValue(ctx: ExecutionContext, d: LogarithmicRationalDomain, value: E): E {
  const p = polynomialValue(ctx, d.field, value);
  demand(d.t.degree(ctx, p) <= 0, 'verification-failed', 'base remainder degree');
  const out = p.coefficients[0] ?? d.base.fromInteger(ctx, 0n);
  demand(d.field.equal(ctx, d.field.embed(ctx, out), value), 'verification-failed', 'base remainder reconstruction'); return out;
}
export function logarithmicCorrection(ctx: ExecutionContext, d: LogarithmicRationalDomain,
  degree: bigint, limited: RationalLimitedIntegrationDecision): E {
  ctx.integer(degree); demand(degree > 0n && degree <= BigInt(Number.MAX_SAFE_INTEGER - 1), 'verification-failed', 'polynomial degree index');
  demand(limited.kind === 'solutions' && limited.family.particular.coefficients.length === 1
    && limited.family.directions.length === 0, 'verification-failed', 'unique primitive coefficient choice');
  const m = Number(degree), u = limited.family.particular.primitive;
  const c = d.base.embed(ctx, d.base.parent!.scalar(ctx, limited.family.particular.coefficients[0]));
  const top = d.base.negate(ctx, d.base.exactDivide(ctx, c, d.base.fromInteger(ctx, ctx.add(degree, 1n))));
  const hasTop = !d.base.isZero(ctx, top), size = m + (hasTop ? 2 : 1);
  // The theoretical m+1 bound must not exhaust a zero top coefficient.
  ctx.degree(hasTop ? m + 1 : m); ctx.allocate(size);
  const cs = Array<E>(size).fill(d.base.fromInteger(ctx, 0n)); cs[m] = u;
  if (hasTop) cs[m + 1] = top;
  return d.field.make(ctx, cs);
}
export function reduceLogarithmicPolynomial(ctx: ExecutionContext, d: LogarithmicRationalDomain, input: E): LogarithmicPolynomialReduction {
  return ctx.operation(() => {
    assertLogarithmicRationalDomain(ctx, d); const a = d.field.rule!.coefficients[0], steps: LogarithmicPolynomialStep[] = [];
    let current = input, fieldPart = d.field.fromInteger(ctx, 0n), failure: number | null = null;
    for (;;) {
      const p = polynomialValue(ctx, d.field, current), m = d.t.degree(ctx, p); if (m <= 0) break;
      const degree = BigInt(m), leading = p.coefficients[m], limited = solveRationalLimitedIntegration(ctx, d.base, leading, [a]);
      ctx.integer(degree); ctx.allocate(8);
      if (limited.kind === 'no-rational-solution') {
        failure = steps.length; steps.push(Object.freeze({ degree, input: current, leading, limited, correction: null, derivative: null, next: null })); break;
      }
      const correction = logarithmicCorrection(ctx, d, degree, limited), derivative = differentiate(ctx, d.field, correction);
      const next = d.field.subtract(ctx, current, derivative.derivative);
      demand(d.t.degree(ctx, polynomialValue(ctx, d.field, next)) < m, 'verification-failed', 'strict polynomial reduction');
      steps.push(Object.freeze({ degree, input: current, leading, limited, correction, derivative, next }));
      fieldPart = d.field.add(ctx, fieldPart, correction); current = next;
    }
    ctx.allocate(5); const result = Object.freeze({ input, steps: Object.freeze(steps), fieldPart,
      remainder: failure === null ? logarithmicBaseValue(ctx, d, current) : null, failure });
    verifyLogarithmicPolynomial(ctx, d, input, result); return result;
  });
}
export function verifyLogarithmicPolynomial(ctx: ExecutionContext, d: LogarithmicRationalDomain,
  input: E, proof: LogarithmicPolynomialReduction): void {
  ctx.operation(() => {
    assertLogarithmicRationalDomain(ctx, d); const f = d.field, a = f.rule!.coefficients[0];
    demand(f.equal(ctx, input, proof.input), 'verification-failed', 'polynomial input');
    let current = input, fieldPart = f.fromInteger(ctx, 0n), failed = false;
    for (let i = 0; i < proof.steps.length; i++) {
      ctx.tick(); const step = proof.steps[i], p = polynomialValue(ctx, f, current), m = d.t.degree(ctx, p);
      demand(!failed && m > 0 && step.degree === BigInt(m) && f.equal(ctx, current, step.input)
        && d.base.equal(ctx, p.coefficients[m], step.leading), 'verification-failed', 'polynomial step degree/target');
      verifyRationalLimitedIntegration(ctx, d.base, step.leading, [a], step.limited);
      if (step.limited.kind === 'no-rational-solution') {
        demand(proof.failure === i && i === proof.steps.length - 1 && step.correction === null
          && step.derivative === null && step.next === null && proof.remainder === null, 'verification-failed', 'polynomial obstruction stop');
        failed = true; continue;
      }
      demand(step.correction !== null && step.derivative !== null && step.next !== null, 'verification-failed', 'successful polynomial evidence');
      const expected = logarithmicCorrection(ctx, d, step.degree, step.limited);
      demand(f.equal(ctx, expected, step.correction), 'verification-failed', 'polynomial coefficient mapping');
      verifyDerivative(ctx, f, step.correction, step.derivative);
      demand(f.equal(ctx, step.next, f.subtract(ctx, current, step.derivative.derivative))
        && d.t.degree(ctx, polynomialValue(ctx, f, step.next)) < m, 'verification-failed', 'polynomial descent identity');
      fieldPart = f.add(ctx, fieldPart, step.correction); current = step.next;
    }
    demand(f.equal(ctx, fieldPart, proof.fieldPart), 'verification-failed', 'polynomial prefix assembly');
    if (!failed) demand(proof.failure === null && proof.remainder !== null
      && d.base.equal(ctx, proof.remainder, logarithmicBaseValue(ctx, d, current)), 'verification-failed', 'complete polynomial coverage');
  });
}
