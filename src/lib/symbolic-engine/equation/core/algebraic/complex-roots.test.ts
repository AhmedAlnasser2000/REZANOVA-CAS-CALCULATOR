import { describe, expect, it } from 'vitest';
import { context, seeded } from '../test-support';
import { ZZ } from '../algebra/domain';
import { PolynomialRing } from '../algebra/polynomial';
import { rational } from '../algebra/rational';
import { certainlyNonReal, disjoint, isolateComplexRoots } from './complex-roots';
import { allRoots, complexDecimal, realDecimal, refineComplex, type ComplexRootOf } from './root-of';

const Z = () => new PolynomialRing(ZZ, 'x');

describe('certified complex root isolation', () => {
  it('x^5 - x - 1 has one real root and two conjugate pairs', () => {
    const ctx = context(), z = Z();
    const roots = allRoots(ctx, z.fromIntegers(ctx, [-1, -1, 0, 0, 0, 1]));
    expect(roots.map(r => r.root.kind)).toEqual(['real', 'complex', 'complex', 'complex', 'complex']);
    const nonreal = roots.slice(1).map(r => complexDecimal(ctx, r.root as ComplexRootOf, 12));
    // Independent reference (mpmath): -0.764884433600585 ± 0.352471546031726 i, 0.181232444469875 ± 1.083954101317711 i
    expect(nonreal.map(v => `${v.re},${v.im}`).sort()).toEqual([
      '-0.764884433601,-0.352471546032', '-0.764884433601,0.352471546032',
      '0.181232444470,-1.083954101318', '0.181232444470,1.083954101318',
    ]);
    expect(realDecimal(ctx, roots[0].root as never, 12)).toBe('1.167303978261');
  });

  it('x^20 - 1 gives 20 disjoint disks, 2 real and 18 non-real', () => {
    const ctx = context(), z = Z();
    const f = z.make(ctx, [-1n, ...Array<bigint>(19).fill(0n), 1n]);
    const disks = isolateComplexRoots(ctx, f, 2);
    expect(disks).toHaveLength(20);
    expect(disks.filter(certainlyNonReal)).toHaveLength(18);
    const roots = allRoots(ctx, f);
    expect(roots).toHaveLength(20);
  });

  it('certifies all 60 roots of a random degree-60 polynomial', () => {
    const ctx = context(), z = Z(), rng = seeded(60);
    const f = z.make(ctx, [...Array.from({ length: 60 }, () => rng.big(30)), 1n]);
    const roots = allRoots(ctx, f);
    expect(roots.reduce((acc, r) => acc + r.multiplicity * (r.root.poly.coefficients.length - 1 > 0 ? 1 : 0), 0)).toBe(60);
  }, 600_000);

  it('isolates Gaussian roots and refines while keeping the same root', () => {
    const ctx = context(), z = Z();
    const roots = allRoots(ctx, z.fromIntegers(ctx, [1, 0, 1])); // ±i
    expect(roots.map(r => complexDecimal(ctx, r.root as ComplexRootOf, 20))).toEqual([
      { re: '0.00000000000000000000', im: '-1.00000000000000000000' }, { re: '0.00000000000000000000', im: '1.00000000000000000000' }]);
    const other = allRoots(ctx, z.fromIntegers(ctx, [3, 0, 1]))[1].root as ComplexRootOf; // i·sqrt3
    const fine = refineComplex(ctx, other, rational(ctx, 1n, 10n ** 30n));
    expect(complexDecimal(ctx, fine, 25)).toEqual({ re: '0.0000000000000000000000000', im: '1.7320508075688772935274463' });
  });

  it('rejects overlapping disks', () => {
    const ctx = context();
    const d = { center: { re: 0n, im: 0n }, scale: 0, radiusExponent: 1 };
    expect(disjoint(ctx, d, { center: { re: 3n, im: 0n }, scale: 0, radiusExponent: 1 })).toBe(false);
    expect(disjoint(ctx, d, { center: { re: 5n, im: 0n }, scale: 0, radiusExponent: 1 })).toBe(true);
  });
});
