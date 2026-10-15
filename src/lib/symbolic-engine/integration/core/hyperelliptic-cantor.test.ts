import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds, quadratic, base} from './__tests__/algebraic-support';
import {preparedCantor} from './__tests__/cantor-support';
import {ExecutionContext} from './execution';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces} from './algebraic-place';
import {constructAlgebraicDivisor, principalAlgebraicDivisor, equalAlgebraicDivisors} from './algebraic-divisor';
import {tryRamifiedHyperellipticModel, verifyRamifiedHyperellipticModel, reconstructRamifiedHyperellipticModelWithin} from './ramified-hyperelliptic-model';
import {reduceCantorDivisor, verifyCantorDivisorClass, expandCantorFunctionWithin} from './hyperelliptic-cantor-divisor';
import {decideCantorPrincipality, verifyCantorPrincipality} from './hyperelliptic-cantor-principality';
import {equalMumfordPairs} from './hyperelliptic-cantor';
import * as models from './ramified-hyperelliptic-model';
import * as transport from './hyperelliptic-cantor-place';
import * as classes from './hyperelliptic-cantor-divisor';
import * as group from './hyperelliptic-cantor';
import * as places from './algebraic-place';
import * as divisor from './algebraic-divisor';
import * as arithmetic from './cantor-arithmetic';

describe('native closed-place Cantor divisors', () => {
  it('constructs principal Miller functions and agrees with complete independently constructed divisors', () => {
    const b = preparedCantor(), finite = b.choose([0n, 1n], 1n);
    const d = constructAlgebraicDivisor(b.ctx, b.curve, [{place: finite, coefficient: 3n}, {place: b.infinity, coefficient: -3n}], bounds), proof = decideCantorPrincipality(fresh(), b.model, d, bounds);
    expect(proof.kind).toBe('principal'); const argument = expandCantorFunctionWithin(b.ctx, b.model, proof.reduction!.factors);
    const general = principalAlgebraicDivisor(fresh(), b.curve, argument, bounds);
    expect(equalAlgebraicDivisors(b.ctx, b.curve, general.divisor, d)).toBe(true); verifyCantorPrincipality(fresh(), b.model, d, proof, bounds);
    const small = constructAlgebraicDivisor(b.ctx, b.curve, [{place: finite, coefficient: 1n}, {place: b.infinity, coefficient: -1n}], bounds);
    expect(decideCantorPrincipality(fresh(), b.model, small, bounds).kind).toBe('not-principal');
  });
  it('handles a genus-two nonrational closed place without splitting its residue field', () => {
    const b = preparedCantor([1n, 0n, 0n, 1n, 0n, 1n]), point = b.choose([0n, 1n], 1n), closed = b.choose([1n, 0n, 1n], 1n);
    expect(closed.degree).toBe(2n);
    const d = constructAlgebraicDivisor(b.ctx, b.curve, [{place: closed, coefficient: 1n}, {place: point, coefficient: 3n}, {place: b.infinity, coefficient: -5n}], bounds);
    const proof = decideCantorPrincipality(fresh(), b.model, d, bounds); expect(proof.kind).toBe('principal');
    expect(proof.reduction!.terms[0].transport.initial.u.coefficients).toHaveLength(3);
    const argument = expandCantorFunctionWithin(b.ctx, b.model, proof.reduction!.factors), general = principalAlgebraicDivisor(fresh(), b.curve, argument, bounds);
    expect(equalAlgebraicDivisors(b.ctx, b.curve, general.divisor, d)).toBe(true);
  });
  it('checks inert and ramified places, signed coefficients and nonzero degrees', () => {
    const b = preparedCantor(), inert = b.above([-1n, 1n])[0], branch = b.choose([1n, 1n], 0n);
    expect(inert.residueDegree).toBe(2n); expect(branch.ramification).toBe(2n);
    for (const [place, coefficient] of [[inert, -3n], [branch, -2n]] as const) {
      const d = constructAlgebraicDivisor(b.ctx, b.curve, [{place, coefficient}, {place: b.infinity, coefficient: -coefficient * place.degree}], bounds);
      const proof = decideCantorPrincipality(fresh(), b.model, d, bounds); expect(proof.kind).toBe('principal');
      const general = principalAlgebraicDivisor(fresh(), b.curve, expandCantorFunctionWithin(b.ctx, b.model, proof.reduction!.factors), bounds);
      expect(equalAlgebraicDivisors(b.ctx, b.curve, general.divisor, d)).toBe(true);
    }
    const nonzero = constructAlgebraicDivisor(b.ctx, b.curve, [{place: branch, coefficient: 1n}], bounds), proof = decideCantorPrincipality(fresh(), b.model, nonzero, bounds);
    expect(proof.kind).toBe('not-principal'); expect(proof.reduction).toBeNull();
  });
  it('preserves nonmonic shifted relations and distinct native ownership', () => {
    const b = base('s'), {ctx, field: f, ring: r} = b, h = f.make(ctx, r.make(ctx, [1n, 0n, 0n, 3n].map(n => r.domain.fromInteger(ctx, n))), r.one(ctx));
    const relationRing = new PolynomialRing(f, 'theta'), relation = relationRing.scale(ctx, relationRing.make(ctx, [f.subtract(ctx, f.multiply(ctx, b.x, b.x), h), f.multiply(ctx, f.fromInteger(ctx, 2n), b.x), f.fromInteger(ctx, 1n)]), f.fromInteger(ctx, 7n));
    const owner = constructAlgebraicExtension(ctx, relationRing, relation, bounds), constants = certifyAlgebraicConstantField(ctx, owner, bounds), curve = certifyAlgebraicCurve(ctx, owner, constants, bounds), model = tryRamifiedHyperellipticModel(fresh(), curve, bounds)!;
    expect(owner.equal(ctx, model.y, owner.add(ctx, owner.generator(ctx), owner.embed(ctx, b.x)))).toBe(true);
    expect(curve.coordinates.constantOwner.equal(ctx, model.polynomial.ring.leading(ctx, model.polynomial), curve.coordinates.constantOwner.fromInteger(ctx, 3n))).toBe(true);
    const evidence = {b: model.b, c: model.c, polynomial: model.polynomial, squareFree: model.squareFree, x: model.x, y: model.y, inverseGenerator: model.inverseGenerator};
    expect(() => reconstructRamifiedHyperellipticModelWithin(fresh(), curve, {...evidence, y: model.x}, bounds)).toThrow('verification-failed');
    expect(() => verifyRamifiedHyperellipticModel(fresh(), curve, {...model}, bounds)).toThrow('domain-mismatch');
  });
  it('retains the certified hidden constant field through native class transport', () => {
    const b = quadratic([0n, 1n]), ring = new PolynomialRing(b.owner, 'beta'), relation = ring.make(b.ctx, [b.owner.negate(b.ctx, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, 2n), b.owner.embed(b.ctx, b.x))), b.owner.fromInteger(b.ctx, 0n), b.owner.fromInteger(b.ctx, 1n)]),
      owner = constructAlgebraicExtension(b.ctx, ring, relation, bounds), constants = certifyAlgebraicConstantField(b.ctx, owner, bounds), curve = certifyAlgebraicCurve(b.ctx, owner, constants, bounds), model = tryRamifiedHyperellipticModel(fresh(), curve, bounds)!;
    expect(constants.basis.length).toBe(2);
    const r = curve.coordinates.scalar.ring, k = r.domain, zero = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [k.fromInteger(b.ctx, 0n), k.fromInteger(b.ctx, 1n)]), false, bounds).places;
    const positive = zero[0];
    const infinity = decomposeAlgebraicPlaces(b.ctx, curve, curve.infinity.lattice.scalar.ring.make(b.ctx, [k.fromInteger(b.ctx, 0n), k.fromInteger(b.ctx, 1n)]), true, bounds).places[0];
    const d = constructAlgebraicDivisor(b.ctx, curve, [{place: positive, coefficient: 3n}, {place: infinity, coefficient: -3n}], bounds);
    expect(decideCantorPrincipality(fresh(), model, d, bounds).kind).toBe('principal'); expect(model.curve.owner).toBe(owner);
  });
  it('rejects altered coverage, residues, factors and conditions without search producers', () => {
    const b = preparedCantor(), point = b.choose([0n, 1n], 1n), d = constructAlgebraicDivisor(b.ctx, b.curve, [{place: point, coefficient: 3n}, {place: b.infinity, coefficient: -3n}], bounds), proof = reduceCantorDivisor(fresh(), b.model, d, bounds);
    const spies = [vi.spyOn(models, 'tryRamifiedHyperellipticModelWithin'), vi.spyOn(transport, 'transportCantorPlaceWithin'), vi.spyOn(classes, 'reduceCantorDivisorWithin'),
      vi.spyOn(group, 'multiplyMumfordPairWithin'), vi.spyOn(group, 'addMumfordPairsWithin'), vi.spyOn(arithmetic, 'constructCantorPair'), vi.spyOn(arithmetic, 'composeCantorPairs'),
      vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(divisor, 'principalAlgebraicDivisorWithin')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('producer disabled');});
    try {verifyCantorDivisorClass(fresh(), b.model, d, proof, bounds);} finally {for (const spy of spies) spy.mockRestore();}
    const term = proof.terms[0];
    for (const mutation of [{...proof, terms: proof.terms.slice(1)}, {...proof, additions: proof.additions.slice(1)}, {...proof, factors: []}, {...proof, conditions: []},
      {...proof, terms: [{...term, transport: {...term.transport, yResidue: point.residue.fromInteger(b.ctx, -1n)}}, ...proof.terms.slice(1)]}])
      expect(() => verifyCantorDivisorClass(fresh(), b.model, d, mutation, bounds)).toThrow('verification-failed');
    const ctx = fresh(); verifyCantorDivisorClass(ctx, b.model, d, proof, bounds); const first = ctx.usage.work;
    verifyCantorDivisorClass(ctx, b.model, d, proof, bounds); expect(ctx.usage.work).toBe(2 * first);
    const stopped = new ExecutionContext({...fresh().limits, allocation: 1}); expect(() => verifyCantorDivisorClass(stopped, b.model, d, proof, bounds)).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    expect(Object.isFrozen(proof) && Object.isFrozen(proof.terms)).toBe(true);
    expect(equalMumfordPairs(b.ctx, b.model.domain, proof.pair, proof.additions.at(-1)!.result)).toBe(true);
  });
});
