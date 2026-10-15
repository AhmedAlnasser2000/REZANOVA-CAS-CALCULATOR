import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, quadratic, base} from './__tests__/algebraic-support';
import {ExecutionContext} from './execution';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral} from './algebraic-place';
import {principalAlgebraicDivisor} from './algebraic-divisor';
import {solvePolynomialPell} from './polynomial-pell';
import {trySplitHyperellipticModel, verifySplitHyperellipticModel, reconstructSplitHyperellipticModelWithin} from './hyperelliptic-curve-model';
import {constructHyperellipticPellUnit, verifyHyperellipticPellUnit, constructHyperellipticPellInfinityWithin, verifyHyperellipticPellInfinityWithin} from './hyperelliptic-pell-unit';
import * as models from './hyperelliptic-curve-model';
import * as units from './hyperelliptic-pell-unit';
import * as pell from './polynomial-pell';
import * as constants from './algebraic-constant-field';
import * as places from './algebraic-place';
import * as factor from './algebraic-factorization';

function prepared() {
  const b = quadratic([1n, 0n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
  const model = trySplitHyperellipticModel(fresh(), curve, bounds)!;
  const pell = solvePolynomialPell(fresh(), model.polynomial.ring, model.polynomial, 2n, bounds), unit = constructHyperellipticPellUnit(fresh(), model, pell, bounds);
  return {...b, curve, model, pell, unit};
}
describe('native split hyperelliptic Pell transport', () => {
  it('verifies the complete unit/inverse and independently agrees with its principal divisor', () => {
    const b = prepared(), {ctx, curve, model, unit} = b;
    expect(b.owner.equal(ctx, b.owner.multiply(ctx, unit.argument, unit.inverse), b.owner.fromInteger(ctx, 1n))).toBe(true);
    const r = curve.infinity.lattice.scalar.ring, decomposition = decomposeAlgebraicPlaces(ctx, curve, r.make(ctx, [r.domain.fromInteger(ctx, 0n), r.domain.fromInteger(ctx, 1n)]), true, bounds);
    const scaled = b.owner.exactDivide(ctx, model.y, b.owner.multiply(ctx, model.x, model.x));
    const positive = decomposition.places.find(p => p.residue.equal(ctx, evaluateAlgebraicPlaceIntegral(ctx, curve, p, scaled), p.residue.fromInteger(ctx, 1n)))!;
    const negative = decomposition.places.find(p => p.residue.equal(ctx, evaluateAlgebraicPlaceIntegral(ctx, curve, p, scaled), p.residue.fromInteger(ctx, -1n)))!;
    const transport = ctx.operation(() => constructHyperellipticPellInfinityWithin(ctx, model, unit, positive, negative, bounds));
    expect(transport.poleDegree).toBe(2n); ctx.operation(() => verifyHyperellipticPellInfinityWithin(ctx, model, transport, bounds));
    const principal = principalAlgebraicDivisor(ctx, curve, unit.argument, bounds);
    expect(principal.divisor.entries).toHaveLength(2);
    expect(principal.divisor.entries.filter(p => p.coefficient === -2n)).toHaveLength(1);
    expect(principal.divisor.entries.filter(p => p.coefficient === 2n)).toHaveLength(1);
    expect(() => ctx.operation(() => verifyHyperellipticPellInfinityWithin(ctx, model, {...transport, positive: negative, negative: positive}, bounds))).toThrow('domain-mismatch');
    expect(() => ctx.operation(() => verifyHyperellipticPellInfinityWithin(ctx, model, {...transport, poleDegree: 1n}, bounds))).toThrow('verification-failed');
  });
  it('preserves shifted and nonmonic original relations with exact inverse basis transport', () => {
    const b = base('s'), {ctx, field: f, ring: r} = b;
    const h = f.make(ctx, r.make(ctx, [1n, 0n, 0n, 0n, 1n].map(n => r.domain.fromInteger(ctx, n))), r.one(ctx)), x2 = f.multiply(ctx, b.x, b.x), twoX = f.multiply(ctx, f.fromInteger(ctx, 2n), b.x);
    const relation = new PolynomialRing(f, 'theta'), monic = relation.make(ctx, [f.subtract(ctx, x2, h), twoX, f.fromInteger(ctx, 1n)]), input = relation.scale(ctx, monic, f.fromInteger(ctx, 7n));
    const owner = constructAlgebraicExtension(ctx, relation, input, bounds), constants = certifyAlgebraicConstantField(ctx, owner, bounds), curve = certifyAlgebraicCurve(ctx, owner, constants, bounds), model = trySplitHyperellipticModel(fresh(), curve, bounds)!;
    expect(owner.equal(ctx, model.y, owner.add(ctx, owner.generator(ctx), owner.embed(ctx, b.x)))).toBe(true);
    expect(owner.equal(ctx, model.inverseGenerator, owner.generator(ctx))).toBe(true);
    const pell = solvePolynomialPell(fresh(), model.polynomial.ring, model.polynomial, 2n, bounds), unit = constructHyperellipticPellUnit(fresh(), model, pell, bounds); verifyHyperellipticPellUnit(fresh(), model, unit, bounds);
    expect(owner.equal(ctx, owner.multiply(ctx, unit.argument, unit.inverse), owner.fromInteger(ctx, 1n))).toBe(true);
  });
  it('checks native evidence independently and rejects changed maps, norms, restrictions and foreign ownership', () => {
    const b = prepared(), spies = [vi.spyOn(models, 'trySplitHyperellipticModelWithin'), vi.spyOn(units, 'constructHyperellipticPellUnitWithin'), vi.spyOn(pell, 'solvePolynomialPellWithin'),
      vi.spyOn(constants, 'certifyAlgebraicConstantField'), vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyHyperellipticPellUnit(fresh(), b.model, b.unit, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    for (const change of [{...b.unit, argument: b.unit.conjugate}, {...b.unit, norm: b.owner.fromInteger(b.ctx, 1n)}, {...b.unit, inverse: b.unit.argument}, {...b.unit, conditions: []}])
      expect(() => verifyHyperellipticPellUnit(fresh(), b.model, change, bounds)).toThrow('verification-failed');
    const evidence = {b: b.model.b, c: b.model.c, polynomial: b.model.polynomial, squareFree: b.model.squareFree, halfDegree: b.model.halfDegree,
      x: b.model.x, y: b.model.y, inverseGenerator: b.model.inverseGenerator};
    expect(() => reconstructSplitHyperellipticModelWithin(fresh(), b.curve, {...evidence, y: b.model.x}, bounds)).toThrow('verification-failed');
    expect(() => reconstructSplitHyperellipticModelWithin(fresh(), b.curve, {...evidence, halfDegree: 1}, bounds)).toThrow('verification-failed');
    const other = prepared(); expect(() => verifyHyperellipticPellUnit(fresh(), other.model, b.unit, bounds)).toThrow('domain-mismatch');
    expect(Object.isFrozen(b.model) && Object.isFrozen(b.unit.conditions)).toBe(true);
  });
  it('keeps applicability, fresh authority and sticky exhaustion distinct', () => {
    const b = quadratic([1n, 0n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    expect(trySplitHyperellipticModel(fresh(), curve, bounds)).toBeNull();
    const preparedInput = prepared(), ctx = fresh(); verifySplitHyperellipticModel(ctx, preparedInput.curve, preparedInput.model, bounds); const first = ctx.usage.work;
    verifySplitHyperellipticModel(ctx, preparedInput.curve, preparedInput.model, bounds); expect(ctx.usage.work).toBe(2 * first);
    const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => verifyHyperellipticPellUnit(limited, preparedInput.model, preparedInput.unit, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
  });
});
