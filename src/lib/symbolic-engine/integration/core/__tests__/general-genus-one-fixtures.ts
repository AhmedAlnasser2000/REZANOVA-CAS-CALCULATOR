import {quadratic, bounds} from './algebraic-support';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {certifyAlgebraicCurve} from '../algebraic-curve';
import type {ExecutionContext} from '../execution';

/** Singular degree-five model of v^2=x^3-2 with the supplied generator a=xv.
 * Its complete normalized curve has genus one; cubic/Cantor guards are absent. */
export function generalGenusOneFixture(ctx?: ExecutionContext, negative = false) {
  const s = quadratic([0n, 0n, -2n, 0n, 0n, 1n], ctx), f = s.owner, x = f.embed(s.ctx, s.x), v = f.exactDivide(s.ctx, s.a, x),
    curve = certifyAlgebraicCurve(s.ctx, f, certifyAlgebraicConstantField(s.ctx, f, bounds), bounds), argument = f.add(s.ctx, v, x);
  const derivative = f.add(s.ctx, f.exactDivide(s.ctx, f.multiply(s.ctx, f.fromInteger(s.ctx, 3n), f.multiply(s.ctx, x, x)), f.multiply(s.ctx, f.fromInteger(s.ctx, 2n), v)), f.fromInteger(s.ctx, 1n));
  const input = negative ? f.exactDivide(s.ctx, x, f.multiply(s.ctx, f.subtract(s.ctx, x, f.fromInteger(s.ctx, 3n)), s.a)) : f.exactDivide(s.ctx, derivative, argument);
  return {...s, curve, input, argument};
}
