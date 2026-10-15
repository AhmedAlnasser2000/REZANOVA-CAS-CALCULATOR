import {extend, bounds} from './transcendental-support';
import type {ExecutionContext} from '../execution';
import {CertifiedTowerView} from '../recursive-certified-tower';
import {DifferentialField} from '../differential-field';
import {rational} from '../rational';

export type CompactNegativeFixture = 'residue' | 'polynomial-prefix' | 'laurent-prefix' | 'parent' | 'residue-polynomial';
export function compactNegativeFixture(ctx: ExecutionContext, kind: CompactNegativeFixture, scale = 1) {
  const q = DifferentialField.rationals(ctx, bounds), f0 = DifferentialField.rationalFunctions(ctx, q, 'x', bounds), p = (ns: number[]) => f0.make(ctx, ns.map(n => q.scalar(ctx, rational(ctx, n)))), s = {f: f0, x: f0.generator(ctx), p}, root = CertifiedTowerView.rationalFunctions(ctx, s.f, bounds);
  const parent = kind === 'parent' ? extend(ctx, root, 'exponential', s.p([0, 0, 1]), 's') : root;
  const argument = s.f.multiply(ctx, s.f.fromInteger(ctx, BigInt(scale)), s.x), view = extend(ctx, parent, kind === 'laurent-prefix' ? 'exponential' : 'logarithm', parent.owner.embed(ctx, argument), 't'), f = view.owner, t = f.generator(ctx), x = f.embed(ctx, s.x);
  let input;
  if (kind === 'residue') input = f.inverse(ctx, t);
  else if (kind === 'parent') input = f.embed(ctx, parent.owner.generator(ctx));
  else if (kind === 'laurent-prefix') input = f.add(ctx, f.inverse(ctx, t), f.exactDivide(ctx, t, x));
  else {
    input = f.exactDivide(ctx, t, f.add(ctx, x, f.fromInteger(ctx, 1n)));
    if (kind === 'polynomial-prefix') input = f.add(ctx, f.multiply(ctx, t, t), input);
    else input = f.add(ctx, input, f.exactDivide(ctx, f.add(ctx, f.fromInteger(ctx, 1n), f.inverse(ctx, x)), f.add(ctx, t, x)));
  }
  ctx.allocate(3); return Object.freeze({view, input, ctx});
}
