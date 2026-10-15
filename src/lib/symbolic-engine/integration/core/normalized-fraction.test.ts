import {expect, it, vi} from 'vitest';
import {fresh, base, bounds} from './__tests__/algebraic-support';
import {normalizedFractionCodec} from './normalized-fraction-wire';
import * as division from './polynomial-division';
import * as gcd from './number-field-polynomial-gcd';
import * as linear from './polynomial-linear-power';
import {RationalFunctionField} from './rational-function';
import {PolynomialRing} from './polynomial';
import {rationalField as Q} from './field';
import {constructAlgebraicExtension} from './algebraic-field';
import {algebraicCoefficientCodec} from './algebraic-wire';
import * as w from './decision-wire-algebra';

it('binds complete canonical normalization without invoking normalization producers', () => {
  const b = base(), input = b.field.make(b.ctx, b.ring.make(b.ctx, [b.q(1n), b.q(1n)]), b.ring.make(b.ctx, [b.q(1n), b.q(0n), b.q(1n)]));
  const data = JSON.parse(JSON.stringify(normalizedFractionCodec(b.ctx, b.field, w.scalar(b.ctx)).encode(input)));
  const spies = [vi.spyOn(division, 'extendedGcd'), vi.spyOn(gcd, 'numberFieldPolynomialGcd'), vi.spyOn(linear, 'checkedLinearPowerGcd')];
  for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
  try {
    const ctx = fresh(), value = normalizedFractionCodec(ctx, b.field, w.scalar(ctx)).decode(data); expect(b.field.equal(ctx, value, input)).toBe(true);
    expect(() => normalizedFractionCodec(ctx, b.field, w.scalar(ctx)).decode({...data, s: {...data.s, coefficients: []}})).toThrow('verification-failed');
    expect(() => normalizedFractionCodec(ctx, b.field, w.scalar(ctx)).decode({...data, verified: true})).toThrow('invalid-input');
  } finally {for (const spy of spies) spy.mockRestore();}
});
it('preserves exact number-field coefficients, zero, constants and original ownership', () => {
  const ctx = fresh(), relation = new PolynomialRing(Q, 'a'), c = constructAlgebraicExtension(ctx, relation, relation.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds);
  const r = new PolynomialRing(c, 't'), f = new RationalFunctionField(r), alpha = c.generator(ctx);
  const input = f.make(ctx, r.make(ctx, [alpha, c.fromInteger(ctx, 1n)]), r.make(ctx, [c.fromInteger(ctx, 1n), c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]));
  for (const value of [input, f.fromInteger(ctx, 0n), f.fromCoefficient(ctx, alpha)]) {
    const data = JSON.parse(JSON.stringify(normalizedFractionCodec(ctx, f, algebraicCoefficientCodec(ctx, c, bounds)).encode(value)));
    const cold = fresh(), result = normalizedFractionCodec(cold, f, algebraicCoefficientCodec(cold, c, bounds)).decode(data);
    expect(f.equal(ctx, value, result)).toBe(true); expect(Object.isFrozen(result)).toBe(true);
  }
  const b = base(); expect(() => f.bindNormalized(ctx, input.numerator, input.denominator, {s: b.ring.one(b.ctx), t: b.ring.zero(b.ctx)} as never)).toThrow('domain-mismatch');
});
it('rejects nonmonic, noncoprime and noncanonical zero representations', () => {
  const b = base(), r = b.ring, f = b.field, one = r.one(b.ctx), zero = r.zero(b.ctx), x = r.make(b.ctx, [b.q(0n), b.q(1n)]);
  expect(() => f.bindNormalized(b.ctx, one, r.constant(b.ctx, b.q(2n)), {s: one, t: zero})).toThrow('verification-failed');
  expect(() => f.bindNormalized(b.ctx, x, x, {s: one, t: zero})).toThrow('verification-failed');
  expect(() => f.bindNormalized(b.ctx, zero, x, {s: zero, t: one})).toThrow('verification-failed');
  const cold = fresh(); expect(() => f.bindNormalized(cold, one, zero, {s: zero, t: one})).toThrow('verification-failed');
});
