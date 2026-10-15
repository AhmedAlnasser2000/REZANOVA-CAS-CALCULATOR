import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, quadratic} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces} from './algebraic-place';
import {constructAlgebraicDivisor} from './algebraic-divisor';
import {certifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {specializeAlgebraicDivisor} from './algebraic-divisor-specialization';
import {scaleReducedDivisor, principalReducedDivisor, equalReducedDivisors} from './reduced-divisor';
import {decideReducedInfinityPellOrderWithin, verifyReducedInfinityPellOrderWithin} from './reduced-infinity-pell-order';
import * as pell from './positive-pell';
import * as reduced from './reduced-divisor-order';
import * as places from './reduced-place';
import * as factor from './positive-factorization';
import * as linear from './arithmetic-linear';
import {ExecutionContext} from './execution';

function prepared() {
  const b = quadratic([1n, 0n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds), r = curve.infinity.lattice.scalar.ring;
  const pair = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), true, bounds), divisor = constructAlgebraicDivisor(b.ctx, curve, [{place: pair.places[0], coefficient: 1n}, {place: pair.places[1], coefficient: -1n}], bounds);
  const reduction = certifyAlgebraicGoodReduction(fresh(), curve, bounds), specialization = specializeAlgebraicDivisor(fresh(), reduction, divisor, bounds);
  return {...b, reduction, divisor: specialization.divisor};
}
describe('complete reduced two-infinity Pell orders', () => {
  it('derives the exact fundamental order and independently checks its complete principal divisor', () => {
    const b = prepared(), ctx = fresh(), curve = b.reduction.curve, proof = ctx.operation(() => decideReducedInfinityPellOrderWithin(ctx, curve, b.reduction.model, b.divisor, bounds));
    expect(proof.order).toBe(2n); expect(proof.pell.leastDegree).toBe(2n); expect(proof.exclusions).toHaveLength(1);
    const value = proof.exponent === 1n ? proof.argument : curve.field.inverse(ctx, proof.argument), principal = principalReducedDivisor(ctx, curve, value), multiple = scaleReducedDivisor(ctx, curve, b.divisor, 2n);
    expect(equalReducedDivisors(ctx, curve, principal.divisor, multiple)).toBe(true);
    const doubled = scaleReducedDivisor(ctx, curve, b.divisor, -2n), second = ctx.operation(() => decideReducedInfinityPellOrderWithin(ctx, curve, b.reduction.model, doubled, bounds));
    expect(second.order).toBe(1n); expect(second.exclusions).toHaveLength(0); ctx.operation(() => verifyReducedInfinityPellOrderWithin(ctx, curve, b.reduction.model, doubled, second, bounds));
  });
  it('verifies all stored finite-field/curve/class evidence without searches', () => {
    const b = prepared(), ctx = fresh(), curve = b.reduction.curve, proof = ctx.operation(() => decideReducedInfinityPellOrderWithin(ctx, curve, b.reduction.model, b.divisor, bounds));
    const spies = [vi.spyOn(pell, 'solvePositivePellWithin'), vi.spyOn(reduced, 'decideReducedDivisorOrder'), vi.spyOn(places, 'decomposeReducedPlaces'), vi.spyOn(factor, 'factorPositivePolynomial'), vi.spyOn(linear, 'solveArithmeticLinearSystem')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {const cold = fresh(); cold.operation(() => verifyReducedInfinityPellOrderWithin(cold, curve, b.reduction.model, b.divisor, proof, bounds));}
    finally {for (const spy of spies) spy.mockRestore();}
  });
  it('rejects changed bounds, model/genus, residues, exact order, exponents and missing prime exclusions', () => {
    const b = prepared(), ctx = fresh(), curve = b.reduction.curve, proof = ctx.operation(() => decideReducedInfinityPellOrderWithin(ctx, curve, b.reduction.model, b.divisor, bounds));
    for (const change of [{...proof, order: 1n}, {...proof, exponent: -proof.exponent}, {...proof, exclusions: []}, {...proof, polynomial: proof.pell.polynomialPart}, {...proof, coefficient: -proof.coefficient},
      {...proof, bound: {...proof.bound, upper: proof.bound.upper + 1n}}, {...proof, positiveResidue: proof.positive.residue.fromInteger(ctx, 0n)}])
      expect(() => ctx.operation(() => verifyReducedInfinityPellOrderWithin(ctx, curve, b.reduction.model, b.divisor, change, bounds))).toThrow('verification-failed');
    expect(() => ctx.operation(() => verifyReducedInfinityPellOrderWithin(ctx, {...curve, genus: 0n}, b.reduction.model, b.divisor, proof, bounds))).toThrow();
    const cold = fresh(); cold.operation(() => verifyReducedInfinityPellOrderWithin(cold, curve, b.reduction.model, b.divisor, proof, bounds)); const first = cold.usage.work;
    cold.operation(() => verifyReducedInfinityPellOrderWithin(cold, curve, b.reduction.model, b.divisor, proof, bounds)); expect(cold.usage.work).toBe(2 * first);
    const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => stopped.operation(() => verifyReducedInfinityPellOrderWithin(stopped, curve, b.reduction.model, b.divisor, proof, bounds))).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
  });
});
