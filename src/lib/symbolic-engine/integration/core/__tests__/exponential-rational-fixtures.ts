import { setup, bounds } from '../differential-test-support';
import { buildExponential } from '../differential-admission';
export function exponentialSetup(exponent = [0, 1], denominator?: number[]) {
  const s = setup(), built = buildExponential(s.ctx, s.f, 't', [s.p(exponent, denominator)], bounds);
  if (built.status !== 'supported') throw Error('fixture');
  const F = built.field, t = F.generator(s.ctx), c = (n: number) => s.f.fromInteger(s.ctx, BigInt(n));
  const v = (ns: number[], ds?: number[]) => F.make(s.ctx, ns.map(c), ds?.map(c));
  return { ...s, F, t, c, v };
}
