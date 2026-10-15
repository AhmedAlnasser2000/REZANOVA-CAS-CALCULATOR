import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {preparedCantor} from './__tests__/cantor-support';
import {ExecutionContext} from './execution';
import {constructAlgebraicDivisor} from './algebraic-divisor';
import {certifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {specializeAlgebraicDivisor} from './algebraic-divisor-specialization';
import {principalReducedDivisor, scaleReducedDivisor, equalReducedDivisors} from './reduced-divisor';
import {decideReducedCantorOrder, verifyReducedCantorOrder} from './reduced-cantor-order';
import {reducedCantorOrderCodec} from './reduced-cantor-wire';
import {PositiveWireContext} from './positive-wire';
import {positivePower} from './positive-field';
import * as native from './reduced-cantor-order';
import * as group from './positive-cantor';
import * as order from './positive-cantor-order';
import * as arithmetic from './cantor-arithmetic';
import * as reduced from './reduced-divisor-order';
import * as places from './reduced-place';
import * as factor from './positive-factorization';
import * as linear from './arithmetic-linear';

function prepared(order: bigint) {
  const b = ellipticDivisor(order), reduction = certifyAlgebraicGoodReduction(fresh(), b.curve, bounds), specialization = specializeAlgebraicDivisor(fresh(), reduction, b.divisor, bounds);
  return {curve: reduction.curve, original: reduction.model, divisor: specialization.divisor};
}
describe('native reduced Cantor order correspondence', () => {
  it.each([2n, 3n])('proves least order %s and independently agrees with the complete principal divisor', expected => {
    const b = prepared(expected), ctx = fresh(), proof = decideReducedCantorOrder(ctx, b.curve, b.original, b.divisor, bounds);
    expect(proof.order).toBe(expected); let argument = b.curve.field.fromInteger(ctx, 1n);
    for (const f of proof.witness) argument = b.curve.field.multiply(ctx, argument, positivePower(ctx, b.curve.field, f.exponent < 0n ? b.curve.field.inverse(ctx, f.value) : f.value, f.exponent < 0n ? -f.exponent : f.exponent));
    const principal = principalReducedDivisor(ctx, b.curve, argument), multiple = scaleReducedDivisor(ctx, b.curve, b.divisor, expected);
    expect(equalReducedDivisors(ctx, b.curve, principal.divisor, multiple)).toBe(true); verifyReducedCantorOrder(fresh(), b.curve, b.original, b.divisor, proof, bounds);
    const signed = scaleReducedDivisor(ctx, b.curve, b.divisor, -expected); expect(decideReducedCantorOrder(fresh(), b.curve, b.original, signed, bounds).order).toBe(1n);
  });
  it('replays native correspondence through its composition codec without searches', () => {
    const b = prepared(3n), proof = decideReducedCantorOrder(fresh(), b.curve, b.original, b.divisor, bounds), encode = fresh(), data = encode.operation(() => reducedCantorOrderCodec(new PositiveWireContext(encode, bounds), b.curve, b.original, b.divisor).encode(proof));
    const spies = [vi.spyOn(native, 'decideReducedCantorOrderWithin'), vi.spyOn(group, 'multiplyPositiveMumfordPairWithin'), vi.spyOn(group, 'addPositiveMumfordPairsWithin'),
      vi.spyOn(order, 'decidePositiveCantorOrderWithin'), vi.spyOn(arithmetic, 'multiplyCantorPair'), vi.spyOn(arithmetic, 'addCantorPairs'), vi.spyOn(arithmetic, 'constructCantorPair'),
      vi.spyOn(reduced, 'decideReducedDivisorOrder'), vi.spyOn(places, 'decomposeReducedPlaces'), vi.spyOn(factor, 'factorPositivePolynomial'), vi.spyOn(linear, 'solveArithmeticLinearSystem')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyReducedCantorOrder(fresh(), b.curve, b.original, b.divisor, proof, bounds); const decode = fresh(), result = decode.operation(() => reducedCantorOrderCodec(new PositiveWireContext(decode, bounds), b.curve, b.original, b.divisor).decode(data));
      expect(result.order).toBe(3n); expect(result.model).not.toBe(proof.model);}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('preserves inert and nonrational split-place coverage through good specialization', () => {
    for (const split of [false, true]) {
      const source = preparedCantor(split ? [1n, 0n, 0n, 1n, 0n, 1n] : [1n, 0n, 0n, 1n]);
      const entries = split ? [{place: source.choose([1n, 0n, 1n], 1n), coefficient: 1n}, {place: source.choose([0n, 1n], 1n), coefficient: 3n}, {place: source.infinity, coefficient: -5n}]
        : [{place: source.above([-1n, 1n])[0], coefficient: 1n}, {place: source.infinity, coefficient: -2n}];
      const originalDivisor = constructAlgebraicDivisor(source.ctx, source.curve, entries, bounds), reduction = certifyAlgebraicGoodReduction(fresh(), source.curve, bounds), specialization = specializeAlgebraicDivisor(fresh(), reduction, originalDivisor, bounds),
        ctx = fresh(), proof = decideReducedCantorOrder(ctx, reduction.curve, reduction.model, specialization.divisor, bounds);
      expect(proof.order).toBe(1n); expect(proof.terms.some(t => split ? t.transport.place.degree === 2n && t.transport.kind === 'split' : t.transport.kind === 'inert')).toBe(true);
      let argument = reduction.curve.field.fromInteger(ctx, 1n);
      for (const f of proof.witness) argument = reduction.curve.field.multiply(ctx, argument, positivePower(ctx, reduction.curve.field, f.exponent < 0n ? reduction.curve.field.inverse(ctx, f.value) : f.value, f.exponent < 0n ? -f.exponent : f.exponent));
      expect(equalReducedDivisors(ctx, reduction.curve, principalReducedDivisor(ctx, reduction.curve, argument).divisor, specialization.divisor)).toBe(true);
    }
  });
  it('rejects altered place coverage, functions, orders, bounds and forged geometry', () => {
    const b = prepared(3n), proof = decideReducedCantorOrder(fresh(), b.curve, b.original, b.divisor, bounds);
    for (const change of [{...proof, terms: []}, {...proof, witness: []}, {...proof, order: 1n}, {...proof, pair: proof.orderEvidence.multiple.result},
      {...proof, orderEvidence: {...proof.orderEvidence, exclusions: []}}, {...proof, orderEvidence: {...proof.orderEvidence, bound: {...proof.orderEvidence.bound, upper: 1n}}}])
      expect(() => verifyReducedCantorOrder(fresh(), b.curve, b.original, b.divisor, change, bounds)).toThrow('verification-failed');
    expect(() => verifyReducedCantorOrder(fresh(), b.curve, {...b.original, genus: 0n}, b.divisor, proof, bounds)).toThrow('domain-mismatch');
    const ctx = fresh(); verifyReducedCantorOrder(ctx, b.curve, b.original, b.divisor, proof, bounds); const first = ctx.usage.work; verifyReducedCantorOrder(ctx, b.curve, b.original, b.divisor, proof, bounds); expect(ctx.usage.work).toBe(2 * first);
    const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => verifyReducedCantorOrder(limited, b.curve, b.original, b.divisor, proof, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
    expect(Object.isFrozen(proof.witness) && Object.isFrozen(proof.terms)).toBe(true);
  });
});
