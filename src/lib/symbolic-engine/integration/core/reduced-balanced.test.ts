import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {certifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {specializeAlgebraicDivisor} from './algebraic-divisor-specialization';
import {principalReducedDivisor, scaleReducedDivisor, equalReducedDivisors} from './reduced-divisor';
import {decideReducedBalancedOrder, verifyReducedBalancedOrder} from './reduced-balanced-order';
import {reducedBalancedOrderCodec} from './reduced-balanced-wire';
import {PositiveWireContext} from './positive-wire';
import {positivePower} from './positive-field';
import * as models from './reduced-balanced-model';
import * as native from './reduced-balanced-order';
import * as group from './positive-balanced-cantor';
import * as order from './positive-balanced-order';
import * as arithmetic from './balanced-cantor-arithmetic';
import * as search from './finite-class-order-search';
import * as places from './reduced-place';
import * as factor from './positive-factorization';
import * as linear from './arithmetic-linear';

function prepared() {
  const b = hyperellipticInfinityDivisor(), reduction = certifyAlgebraicGoodReduction(fresh(), b.curve, bounds), specialization = specializeAlgebraicDivisor(fresh(), reduction, b.divisor, bounds);
  return {curve: reduction.curve, original: reduction.model, divisor: specialization.divisor};
}
describe('native reduced balanced class-order correspondence', () => {
  it('checks both infinite places and independently reconstructs the complete principal witness', () => {
    const b = prepared(), ctx = fresh(), proof = decideReducedBalancedOrder(ctx, b.curve, b.original, b.divisor, bounds); expect(proof.order).toBe(2n);
    expect(proof.terms.map(t => t.transport.kind).sort()).toEqual(['infinity-minus', 'infinity-plus']); let argument = b.curve.field.fromInteger(ctx, 1n);
    for (const f of proof.witness) argument = b.curve.field.multiply(ctx, argument, positivePower(ctx, b.curve.field, f.exponent < 0n ? b.curve.field.inverse(ctx, f.value) : f.value, f.exponent < 0n ? -f.exponent : f.exponent));
    expect(equalReducedDivisors(ctx, b.curve, principalReducedDivisor(ctx, b.curve, argument).divisor, scaleReducedDivisor(ctx, b.curve, b.divisor, 2n))).toBe(true);
    const multiple = scaleReducedDivisor(ctx, b.curve, b.divisor, -2n); expect(decideReducedBalancedOrder(fresh(), b.curve, b.original, multiple, bounds).order).toBe(1n);
  });
  it('replays fresh native model/transport without search, geometry or linear producers', () => {
    const b = prepared(), proof = decideReducedBalancedOrder(fresh(), b.curve, b.original, b.divisor, bounds), encode = fresh(), data = encode.operation(() => reducedBalancedOrderCodec(new PositiveWireContext(encode, bounds), b.curve, b.original, b.divisor).encode(proof));
    const spies = [vi.spyOn(native, 'decideReducedBalancedOrderWithin'), vi.spyOn(models, 'constructReducedBalancedModelWithin'), vi.spyOn(models, 'transportReducedBalancedPlaceWithin'),
      vi.spyOn(group, 'multiplyPositiveBalancedDivisorWithin'), vi.spyOn(group, 'addPositiveBalancedDivisorsWithin'), vi.spyOn(order, 'decidePositiveBalancedOrderWithin'),
      vi.spyOn(arithmetic, 'normalizeBalancedDivisor'), vi.spyOn(arithmetic, 'addBalancedDivisors'), vi.spyOn(arithmetic, 'multiplyBalancedDivisor'), vi.spyOn(search, 'findFiniteClassOrderMultiple'),
      vi.spyOn(places, 'decomposeReducedPlaces'), vi.spyOn(factor, 'factorPositivePolynomial'), vi.spyOn(linear, 'solveArithmeticLinearSystem')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyReducedBalancedOrder(fresh(), b.curve, b.original, b.divisor, proof, bounds); const decode = fresh(), result = decode.operation(() => reducedBalancedOrderCodec(new PositiveWireContext(decode, bounds), b.curve, b.original, b.divisor).decode(data));
      expect(result.order).toBe(2n); expect(result.model).not.toBe(proof.model);} finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects missing branches, altered functions/orders, infinity weights and foreign geometry', () => {
    const b = prepared(), proof = decideReducedBalancedOrder(fresh(), b.curve, b.original, b.divisor, bounds);
    for (const changed of [{...proof, terms: []}, {...proof, witness: []}, {...proof, order: 1n}, {...proof, result: {...proof.result, n: proof.result.n + 1n}},
      {...proof, orderEvidence: {...proof.orderEvidence, exclusions: []}}, {...proof, orderEvidence: {...proof.orderEvidence, bound: {...proof.orderEvidence.bound, upper: 1n}}}])
      expect(() => verifyReducedBalancedOrder(fresh(), b.curve, b.original, b.divisor, changed, bounds)).toThrow('verification-failed');
    expect(() => verifyReducedBalancedOrder(fresh(), b.curve, {...b.original, genus: 0n}, b.divisor, proof, bounds)).toThrow('domain-mismatch');
    const ctx = fresh(); verifyReducedBalancedOrder(ctx, b.curve, b.original, b.divisor, proof, bounds); const work = ctx.usage.work; verifyReducedBalancedOrder(ctx, b.curve, b.original, b.divisor, proof, bounds); expect(ctx.usage.work).toBe(work * 2);
  });
});
