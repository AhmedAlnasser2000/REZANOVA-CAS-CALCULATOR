import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { FirstLevelPrimitive } from './first-level-rational-primitive';
import type { FirstLevelRationalDomain } from './first-level-rational-domain';

export interface FirstLevelCondition {
  readonly category: 'construction' | 'outer-denominator' | 'coefficient-denominator' | 'log-norm';
  readonly path: string;
  /** Nonvanishing in the caller's original field. */
  readonly value: E;
}
export function firstLevelConditions(ctx: ExecutionContext, d: FirstLevelRationalDomain,
  input: E, primitive?: FirstLevelPrimitive): readonly FirstLevelCondition[] {
  const out: FirstLevelCondition[] = [], f = d.field, base = d.base;
  const add = (category: FirstLevelCondition['category'], path: string, value: E) => {
    ctx.allocate(3 + path.length); demand(!f.isZero(ctx, value), 'verification-failed', 'zero retained condition');
    out.push(Object.freeze({ category, path, value }));
  };
  const baseDenominator = (a: E, path: string, category: FirstLevelCondition['category']) => {
    base.assert(ctx, a); demand(a.kind === 'fraction', 'domain-mismatch', 'condition rational coefficient');
    add(category, path, f.embed(ctx, base.make(ctx, a.value.denominator.coefficients)));
  };
  const native = (a: E, path: string) => {
    f.assert(ctx, a); demand(a.kind === 'fraction', 'domain-mismatch', 'condition exponential value');
    const den = a.value.denominator.coefficients;
    let power = 0;
    while (f.admission?.kind === 'exponential' && power < den.length && base.isZero(ctx, den[power])) { ctx.tick(); power++; }
    // Only an exponential generator is everywhere nonzero. All x denominators
    // remain, including those appearing in numerator coefficients.
    ctx.allocate(den.length - power);
    if (den.length - power > 1) add('outer-denominator', path, f.make(ctx, den.slice(power)));
    for (const [label, p] of [['numerator', a.value.numerator], ['denominator', a.value.denominator]] as const) {
      for (let i = 0; i < p.coefficients.length; i++) { ctx.tick(); baseDenominator(p.coefficients[i], `${path}.${label}.${i}`, 'coefficient-denominator'); }
    }
  };
  const admission = f.admission;
  demand(admission?.kind === 'exponential' || admission?.kind === 'logarithmic', 'domain-mismatch', 'certified first-level conditions');
  if (admission.kind === 'exponential') {
    baseDenominator(admission.argument, 'construction.common', 'construction');
    for (let i = 0; i < admission.arguments.length; i++) baseDenominator(admission.arguments[i], `construction.argument.${i}`, 'construction');
  } else {
    const argument = admission.argument;
    demand(argument.kind === 'fraction', 'domain-mismatch', 'logarithm argument');
    for (const label of ['numerator', 'denominator'] as const) {
      add('construction', `construction.argument.${label}`, f.embed(ctx, base.make(ctx, argument.value[label].coefficients)));
    }
  }
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
export function verifyFirstLevelConditions(ctx: ExecutionContext, d: FirstLevelRationalDomain,
  expected: readonly FirstLevelCondition[], supplied: readonly FirstLevelCondition[]): void {
  demand(expected.length === supplied.length, 'verification-failed', 'condition coverage');
  for (let i = 0; i < expected.length; i++) {
    ctx.tick(); const a = expected[i], b = supplied[i];
    demand(a.category === b.category && a.path === b.path && d.field.equal(ctx, a.value, b.value), 'verification-failed', 'retained exponential condition');
  }
}
