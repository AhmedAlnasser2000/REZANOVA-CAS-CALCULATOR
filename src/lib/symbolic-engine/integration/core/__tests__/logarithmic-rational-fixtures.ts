import { setup, bounds } from '../differential-test-support';
import { buildLogarithm } from '../differential-admission';
import { LogarithmicRationalDomain } from '../logarithmic-rational-domain';
import { rational } from '../rational';

export function logarithmicSetup(ns: (number | bigint)[] = [0, 1], ds: (number | bigint)[] = [1]) {
  const s = setup(), built = buildLogarithm(s.ctx, s.f, 't', s.p(ns, ds), bounds);
  if (built.status !== 'supported') throw Error('logarithmic fixture admission');
  const F = built.field, d = new LogarithmicRationalDomain(s.ctx, F, bounds), t = F.generator(s.ctx);
  const C = (n: number | bigint) => F.fromInteger(s.ctx, BigInt(n));
  const Q = (cs: (number | bigint)[]) => d.z.make(s.ctx, cs.map(c => rational(s.ctx, c)));
  const v = (n: (number | bigint)[], den: (number | bigint)[] = [1]) => F.make(s.ctx, n.map(c => s.f.fromInteger(s.ctx, BigInt(c))), den.map(c => s.f.fromInteger(s.ctx, BigInt(c))));
  const a = F.rule!.coefficients[0];
  return { ...s, F, d, t, C, Q, v, a };
}
