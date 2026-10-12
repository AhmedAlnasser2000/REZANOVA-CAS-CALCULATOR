import { type ArithmeticRationalDomain } from './transcendental-domain';
import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { QPolynomial } from './formal-primitive';
import type { ComponentPolynomial } from './first-level-rational-selection';
import type { EP } from './first-level-rational-domain';

export function descendConstantPolynomial(ctx: ExecutionContext, d: ArithmeticRationalDomain, p: EP): QPolynomial {
  d.kz.assert(ctx, p); ctx.allocate(p.coefficients.length);
  const coefficients = p.coefficients.map(c => {
    d.base.assert(ctx, c); let owner = d.base, value = c;
    while (owner.kind !== 'rational') {
      ctx.tick(); demand(value.kind === 'fraction' && value.value.numerator.coefficients.length <= 1
        && value.value.denominator.coefficients.length === 1, 'verification-failed', 'residue coefficient must descend to Q');
      value = owner.parent!.exactDivide(ctx, value.value.numerator.coefficients[0] ?? owner.parent!.fromInteger(ctx, 0n), value.value.denominator.coefficients[0]);
      owner = owner.parent!;
    }
    demand(value.kind === 'scalar' && d.base.equal(ctx, c, d.base.embed(ctx, value)), 'verification-failed', 'constant descent identity');
    return value.value;
  });
  const result = d.z.make(ctx, coefficients);
  demand(d.kz.equal(ctx, p, d.lift(ctx, result, d.kz)), 'verification-failed', 'constant polynomial reconstruction'); return result;
}
export function residueInputs(ctx: ExecutionContext, d: ArithmeticRationalDomain, residual: E, dn: EP) {
  d.field.assert(ctx, residual); demand(residual.kind === 'fraction', 'domain-mismatch', 'normal residual'); d.t.assert(ctx, dn);
  const z = d.kz.make(ctx, [d.base.fromInteger(ctx, 0n), d.base.fromInteger(ctx, 1n)]);
  const { numerator: a, denominator: n } = residual.value;
  ctx.allocate(n.coefficients.length + Math.max(dn.coefficients.length, a.coefficients.length));
  const denominator = d.elimination.make(ctx, n.coefficients.map(c => d.kz.constant(ctx, c)));
  const coefficients: EP[] = [];
  for (let j = 0; j < Math.max(a.coefficients.length, dn.coefficients.length); j++) {
    ctx.tick(); coefficients.push(d.kz.make(ctx, [a.coefficients[j] ?? d.base.fromInteger(ctx, 0n),
      d.base.negate(ctx, dn.coefficients[j] ?? d.base.fromInteger(ctx, 0n))]));
  }
  return { denominator, residue: d.elimination.make(ctx, coefficients), z };
}
export function selectionArgument(ctx: ExecutionContext, d: ArithmeticRationalDomain, argument: ComponentPolynomial): EP {
  let length = 0;
  for (const c of argument.coefficients) { ctx.tick(); argument.ring.domain.assert(ctx, c); length = Math.max(length, c.representative.coefficients.length); }
  ctx.degree(length - 1); ctx.allocate(length * argument.coefficients.length + length);
  const out: E[] = [];
  for (let j = 0; j < length; j++) {
    ctx.tick(); out.push(d.field.make(ctx, argument.coefficients.map(c => c.representative.coefficients[j] ?? d.base.fromInteger(ctx, 0n))));
  }
  return d.fz.make(ctx, out);
}
