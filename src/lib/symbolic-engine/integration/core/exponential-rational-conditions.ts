import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { ExponentialPrimitive } from './exponential-rational-primitive';
import type { ExponentialRationalDomain } from './exponential-rational-domain';

export interface ExponentialCondition {
  readonly category: 'construction' | 'outer-denominator' | 'coefficient-denominator' | 'log-norm';
  readonly path: string;
  /** Nonvanishing in the caller's original exponential field. */
  readonly value: E;
}
export function exponentialConditions(ctx: ExecutionContext, d: ExponentialRationalDomain,
  input: E, primitive?: ExponentialPrimitive): readonly ExponentialCondition[] {
  const out: ExponentialCondition[] = [], f = d.field, base = d.base;
  const add = (category: ExponentialCondition['category'], path: string, value: E) => {
    ctx.allocate(3 + path.length); demand(!f.isZero(ctx, value), 'verification-failed', 'zero retained condition');
    out.push(Object.freeze({ category, path, value }));
  };
  const baseDenominator = (a: E, path: string, category: ExponentialCondition['category']) => {
    base.assert(ctx, a); demand(a.kind === 'fraction', 'domain-mismatch', 'condition rational coefficient');
    add(category, path, f.embed(ctx, base.make(ctx, a.value.denominator.coefficients)));
  };
  const native = (a: E, path: string) => {
    f.assert(ctx, a); demand(a.kind === 'fraction', 'domain-mismatch', 'condition exponential value');
    const den = a.value.denominator.coefficients;
    let power = 0;
    while (power < den.length && base.isZero(ctx, den[power])) { ctx.tick(); power++; }
    // Strip only the everywhere-nonzero exponential factor. All x denominators
    // remain, including those appearing in numerator coefficients.
    ctx.allocate(den.length - power);
    if (den.length - power > 1) add('outer-denominator', path, f.make(ctx, den.slice(power)));
    for (const [label, p] of [['numerator', a.value.numerator], ['denominator', a.value.denominator]] as const) {
      for (let i = 0; i < p.coefficients.length; i++) { ctx.tick(); baseDenominator(p.coefficients[i], `${path}.${label}.${i}`, 'coefficient-denominator'); }
    }
  };
  const admission = f.admission;
  demand(admission?.kind === 'exponential', 'domain-mismatch', 'conditions require exponential admission');
  baseDenominator(admission.argument, 'construction.common', 'construction');
  for (let i = 0; i < admission.arguments.length; i++) baseDenominator(admission.arguments[i], `construction.argument.${i}`, 'construction');
  native(input, 'input');
  if (primitive) {
    demand(primitive.domain === d, 'domain-mismatch', 'condition primitive domain');
    native(primitive.fieldPart, 'primitive.field');
    for (let i = 0; i < primitive.terms.length; i++) {
      const term = primitive.terms[i]; ctx.tick();
      for (let j = 0; j < term.argument.coefficients.length; j++) native(term.argument.coefficients[j], `primitive.log.${i}.argument.${j}`);
      add('log-norm', `primitive.log.${i}.norm`, term.norm); native(term.norm, `primitive.log.${i}.norm`);
    }
  }
  return Object.freeze(out);
}
export function verifyExponentialConditions(ctx: ExecutionContext, d: ExponentialRationalDomain,
  expected: readonly ExponentialCondition[], supplied: readonly ExponentialCondition[]): void {
  demand(expected.length === supplied.length, 'verification-failed', 'condition coverage');
  for (let i = 0; i < expected.length; i++) {
    ctx.tick(); const a = expected[i], b = supplied[i];
    demand(a.category === b.category && a.path === b.path && d.field.equal(ctx, a.value, b.value), 'verification-failed', 'retained exponential condition');
  }
}
