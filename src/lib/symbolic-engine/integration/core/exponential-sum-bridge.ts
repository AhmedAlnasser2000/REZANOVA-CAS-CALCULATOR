import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { requireRationalVariable } from './differential-admission';
import { rationalField } from './field';
import { FormalPrimitiveDomain, type QRationalFunction } from './formal-primitive';
import type { Rational } from './rational';

/** Explicit binding, never an implicit embedding inferred from a printed name. */
function binding(ctx: ExecutionContext, base: DifferentialField, target: FormalPrimitiveDomain): void {
  assertDifferentialFieldOwner(ctx, base); requireRationalVariable(ctx, base);
  demand(target instanceof FormalPrimitiveDomain && target.x.variable === base.fractions!.ring.variable,
    'domain-mismatch', 'sum rational bridge binding');
}
function coefficients(ctx: ExecutionContext, base: DifferentialField, values: readonly E[]): readonly Rational[] {
  ctx.allocate(values.length);
  return values.map(c => {
    base.parent!.assert(ctx, c); demand(c.kind === 'scalar', 'domain-mismatch', 'sum bridge scalar'); return c.value;
  });
}
function check(ctx: ExecutionContext, base: DifferentialField, native: QRationalFunction, value: E): void {
  base.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'sum bridge fraction');
  const compare = (a: readonly Rational[], b: readonly E[]) => {
    demand(a.length === b.length, 'verification-failed', 'sum bridge coefficient coverage');
    for (let i = 0; i < a.length; i++) {
      ctx.tick(); base.parent!.assert(ctx, b[i]); const c = b[i];
      demand(c.kind === 'scalar' && rationalField.equal(ctx, a[i], c.value), 'verification-failed', 'sum bridge exact coefficient');
    }
  };
  compare(native.numerator.coefficients, value.value.numerator.coefficients);
  compare(native.denominator.coefficients, value.value.denominator.coefficients);
}
export function toRationalPrimitiveInput(ctx: ExecutionContext, base: DifferentialField, target: FormalPrimitiveDomain, value: E): QRationalFunction {
  binding(ctx, base, target); base.assert(ctx, value);
  demand(value.kind === 'fraction', 'domain-mismatch', 'sum bridge Q(x) input');
  const native = target.fractions.make(ctx,
    target.x.make(ctx, coefficients(ctx, base, value.value.numerator.coefficients)),
    target.x.make(ctx, coefficients(ctx, base, value.value.denominator.coefficients)));
  check(ctx, base, native, value); return native;
}
export function fromRationalPrimitiveInput(ctx: ExecutionContext, base: DifferentialField, source: FormalPrimitiveDomain, value: QRationalFunction): E {
  binding(ctx, base, source); source.fractions.assert(ctx, value);
  ctx.allocate(value.numerator.coefficients.length + value.denominator.coefficients.length);
  const convert = (a: readonly Rational[]) => a.map(c => base.parent!.scalar(ctx, c));
  const out = base.make(ctx, convert(value.numerator.coefficients), convert(value.denominator.coefficients));
  check(ctx, base, value, out); return out;
}
