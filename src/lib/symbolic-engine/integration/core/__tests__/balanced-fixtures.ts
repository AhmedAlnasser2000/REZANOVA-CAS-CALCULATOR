/** Full native construction is part of these named performance cycles. */
import {bounds, quadratic} from './algebraic-support';
import type {ExecutionContext} from '../execution';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {certifyAlgebraicCurve} from '../algebraic-curve';

export function balancedIntegrationFixture(ctx: ExecutionContext, negative: boolean) {
  const b = quadratic(negative ? [-27n, -40n, -18n, 0n, 1n] : [1n, 0n, 0n, 0n, 1n], ctx), f = b.owner;
  const constants = certifyAlgebraicConstantField(ctx, f, bounds), curve = certifyAlgebraicCurve(ctx, f, constants, bounds), x = f.embed(ctx, b.x);
  let input: typeof b.a;
  if (negative) input = f.add(ctx, f.exactDivide(ctx, x, b.a), f.inverse(ctx, x));
  else {
    const x2 = f.multiply(ctx, x, x), argument = f.subtract(ctx, f.add(ctx, b.a, x2), f.fromInteger(ctx, 1n));
    const derivative = f.add(ctx, f.exactDivide(ctx, f.multiply(ctx, f.fromInteger(ctx, 2n), f.multiply(ctx, x2, x)), b.a), f.multiply(ctx, f.fromInteger(ctx, 2n), x));
    input = f.exactDivide(ctx, derivative, argument);
  }
  return {curve, input};
}
