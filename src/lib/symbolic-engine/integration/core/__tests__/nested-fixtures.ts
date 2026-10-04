import type { ExecutionContext as C } from '../execution';
import type { exponentialSetup } from './exponential-rational-fixtures';
type S = ReturnType<typeof exponentialSetup>;
type E = S['t'];

export function nestedStress(c: C, s: S, rp: E, ordinary: boolean): E {
  const { F, f } = s, one = F.fromInteger(c, 1n), x = f.generator(c);
  const h = F.embed(c, f.add(c, x, f.fromInteger(c, 1n))), g = F.add(c, s.t, F.embed(c, x));
  const dg = F.add(c, F.multiply(c, F.embed(c, rp), s.t), one);
  if (ordinary) {
    const g2 = F.multiply(c, g, g), g3 = F.multiply(c, g2, g), h2 = F.multiply(c, h, h);
    return F.add(c, F.subtract(c, F.negate(c, F.inverse(c, F.multiply(c, h2, g2))),
      F.exactDivide(c, F.multiply(c, F.fromInteger(c, 2n), dg), F.multiply(c, h, g3))), F.exactDivide(c, dg, g));
  }
  const ring = F.fractions!.ring, a = ring.make(c, [x, f.fromInteger(c, 1n)]), b = ring.make(c, [f.fromInteger(c, 1n), rp]);
  const hc = f.add(c, x, f.fromInteger(c, 1n)), h2 = f.multiply(c, hc, hc);
  const n = ring.add(c, ring.subtract(c, ring.negate(c, a), ring.scale(c, b, f.multiply(c, f.fromInteger(c, 2n), hc))),
    ring.scale(c, ring.multiply(c, ring.multiply(c, a, a), b), h2));
  return F.fraction(c, F.fractions!.make(c, n, ring.scale(c, ring.power(c, a, 3), h2)));
}
