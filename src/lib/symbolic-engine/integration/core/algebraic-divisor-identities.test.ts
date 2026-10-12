import { describe, it, expect } from 'vitest';
import { base, bounds, fresh } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { principalAlgebraicDivisor, addAlgebraicDivisorsWithin, scaleAlgebraicDivisorWithin, constructAlgebraicDivisor, equalAlgebraicDivisors } from './algebraic-divisor';
import { solveAlgebraicRiemannRoch } from './algebraic-riemann-roch';

describe('seeded exact divisor identities', () => {
  it('preserves full principal products and inverse valuations with an alternate variable', () => {
    const b = base('zeta'), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    let seed = 713n;
    for (let i = 0; i < 5; i++) {
      seed = (17n * seed + 3n) % 97n; const a = b.field.subtract(b.ctx, b.x, b.field.fromInteger(b.ctx, seed));
      const denominator = b.field.add(b.ctx, b.x, b.field.fromInteger(b.ctx, seed + 1n));
      const value = b.field.exactDivide(b.ctx, b.field.multiply(b.ctx, a, a), denominator), pa = principalAlgebraicDivisor(fresh(), curve, a, bounds), pb = principalAlgebraicDivisor(fresh(), curve, denominator, bounds);
      const principal = principalAlgebraicDivisor(fresh(), curve, value, bounds), expected = addAlgebraicDivisorsWithin(b.ctx, curve,
        scaleAlgebraicDivisorWithin(b.ctx, curve, pa.divisor, 2n), scaleAlgebraicDivisorWithin(b.ctx, curve, pb.divisor, -1n));
      expect(equalAlgebraicDivisors(b.ctx, curve, principal.divisor, expected)).toBe(true);
      expect(principal.divisor.degree).toBe(0n); expect(solveAlgebraicRiemannRoch(fresh(), curve, expected, bounds).dimension).toBe(1);
    }
  });
  it('preserves original zero and cancelling entries while reducing support', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const p = principalAlgebraicDivisor(fresh(), curve, b.x, bounds).divisor.entries[0].place;
    const d = constructAlgebraicDivisor(b.ctx, curve, [{place: p, coefficient: 0n}, {place: p, coefficient: -13n}, {place: p, coefficient: 13n}], bounds);
    expect(d.input).toHaveLength(3); expect(d.entries).toHaveLength(0); expect(d.degree).toBe(0n);
    expect(solveAlgebraicRiemannRoch(fresh(), curve, d, bounds).dimension).toBe(1);
  });
});
