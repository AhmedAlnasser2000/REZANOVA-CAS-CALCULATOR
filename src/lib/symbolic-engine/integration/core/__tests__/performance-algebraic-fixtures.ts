/** Complete source construction belongs to the Schultz cycle, not hidden setup. */
import {quadratic, bounds} from './algebraic-support';
import type {ExecutionContext} from '../execution';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {certifyAlgebraicCurve} from '../algebraic-curve';

export function schultzIntegrationFixture(ctx: ExecutionContext, kind: 'dependent' | 'order29') {
  const b = quadratic(kind === 'dependent' ? [1n, 0n, 0n, 1n] : [0n, -16n, 33n, -12n, 6n, 4n, 1n], ctx), f = b.owner;
  const constants = certifyAlgebraicConstantField(ctx, f, bounds), curve = certifyAlgebraicCurve(ctx, f, constants, bounds), r = b.ring;
  const polynomial = (v: readonly bigint[]) => r.make(ctx, v.map(n => r.domain.fromInteger(ctx, n)));
  const numerator = polynomial(kind === 'dependent' ? [4n, 8n, -20n, 6n] : [-3n, 18n, 29n]);
  const denominator = kind === 'dependent' ? r.multiply(ctx, polynomial([-1n, 2n]), polynomial([1n, 0n, -2n, 1n])) : r.one(ctx);
  const input = f.exactDivide(ctx, f.embed(ctx, b.field.make(ctx, numerator, denominator)), b.a);
  return {...b, constants, curve, input};
}
