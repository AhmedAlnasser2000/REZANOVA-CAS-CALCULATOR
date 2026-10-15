import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {constructGenusOnePresentation} from './genus-one-presentation';
import {constructGenusOneCoordinates} from './genus-one-coordinates';
import {decideGenusOneRationalTorsion as decide, verifyGenusOneRationalTorsion as verify} from './genus-one-torsion';
import {transportGenusOnePlaceWithin as transport, verifyGenusOnePlaceTransportWithin as verifyTransport} from './genus-one-place';
import {constructAlgebraicDivisor, scaleAlgebraicDivisorWithin, principalAlgebraicDivisor, equalAlgebraicDivisors} from './algebraic-divisor';
import {expandEllipticFactors} from './elliptic-miller';
import {ExecutionContext} from './execution';
import * as rr from './algebraic-riemann-roch';
import * as group from './elliptic-group';
import * as reduction from './genus-one-divisor-class';
import * as places from './genus-one-place';
afterEach(() => vi.restoreAllMocks());

it.each([2n, 3n])('transports complete divisors and Miller witnesses of least order %s', order => {
  const s = ellipticDivisor(order), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[1].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds), proof = decide(fresh(), model, s.divisor, bounds);
  expect(proof.kind).toBe('torsion'); expect(proof.order).toBe(order); verify(fresh(), model, s.divisor, proof, bounds);
  const expanded = expandEllipticFactors(fresh(), model, proof.factors), principal = principalAlgebraicDivisor(fresh(), s.curve, expanded, bounds);
  expect(equalAlgebraicDivisors(s.ctx, s.curve, principal.divisor, scaleAlgebraicDivisorWithin(s.ctx, s.curve, s.divisor, order))).toBe(true);
});
it('maps the other quartic infinity to an affine point and returns its exact function witness', () => {
  const s = hyperellipticInfinityDivisor(), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[0].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds);
  const atOrigin = transport(fresh(), model, s.divisor.entries[0].place, bounds), other = transport(fresh(), model, s.divisor.entries[1].place, bounds);
  expect(atOrigin.point.kind).toBe('infinity'); expect(other.point.kind).toBe('affine'); verifyTransport(fresh(), model, other.place, other, bounds);
  const proof = decide(fresh(), model, s.divisor, bounds); expect(proof.kind).toBe('torsion'); expect(proof.order).toBe(2n);
  const principal = principalAlgebraicDivisor(fresh(), s.curve, expandEllipticFactors(fresh(), model, proof.factors), bounds);
  expect(equalAlgebraicDivisors(s.ctx, s.curve, principal.divisor, scaleAlgebraicDivisorWithin(s.ctx, s.curve, s.divisor, 2n))).toBe(true);
});
it('reduces a divisor with a nonrational place and arbitrary signs through the complete degree-one space', () => {
  const s = ellipticDivisor(2n), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[1].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds);
  const value = s.owner.subtract(s.ctx, s.owner.embed(s.ctx, s.x), s.owner.fromInteger(s.ctx, 2n)), principal = principalAlgebraicDivisor(fresh(), s.curve, value, bounds);
  expect(principal.divisor.entries.some(e => e.place.degree === 2n)).toBe(true);
  const divisor = scaleAlgebraicDivisorWithin(s.ctx, s.curve, principal.divisor, -2n), proof = decide(fresh(), model, divisor, bounds);
  expect(proof.order).toBe(1n); expect(proof.reduction.point.kind).toBe('infinity'); verify(fresh(), model, divisor, proof, bounds);
  const checked = principalAlgebraicDivisor(fresh(), s.curve, expandEllipticFactors(fresh(), model, proof.factors), bounds);
  expect(equalAlgebraicDivisors(s.ctx, s.curve, checked.divisor, divisor)).toBe(true);
});
it('checks a finite-origin negative with all producers disabled, and preserves zero requests', () => {
  const s = ellipticDivisor(null), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[0].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds), proof = decide(fresh(), model, s.divisor, bounds);
  expect(proof.kind).toBe('non-torsion'); expect(proof.filters).toHaveLength(2); expect(proof.filters!.every(f => f.tests.length === 11)).toBe(true);
  const stop = () => {throw Error('genus-one producer disabled');};
  vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin').mockImplementation(stop); vi.spyOn(group, 'multiplyEllipticPoint').mockImplementation(stop); vi.spyOn(group, 'addEllipticPoints').mockImplementation(stop);
  vi.spyOn(reduction, 'reduceGenusOneDivisorWithin').mockImplementation(stop); vi.spyOn(places, 'transportGenusOnePlaceWithin').mockImplementation(stop);
  verify(fresh(), model, s.divisor, proof, bounds); vi.restoreAllMocks();
  const zero = constructAlgebraicDivisor(s.ctx, s.curve, [], bounds), answer = decide(fresh(), model, zero, bounds); expect(answer.order).toBe(1n);
});
it('eliminates the doubled signed finite-origin class before large native multiples', () => {
  const s = ellipticDivisor(null), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[0].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds), divisor = scaleAlgebraicDivisorWithin(s.ctx, s.curve, s.divisor, -2n), proof = decide(fresh(), model, divisor, bounds);
  expect(proof.kind).toBe('non-torsion'); expect(proof.tests).toHaveLength(0); verify(fresh(), model, divisor, proof, bounds);
});
it('rejects altered complete mappings, branches, witness signs, conditions and ownership; starts cold', () => {
  const s = ellipticDivisor(2n), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[1].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds), proof = decide(fresh(), model, s.divisor, bounds);
  const changed = [{...proof, order: 1n}, {...proof, tests: []}, {...proof, factors: []}, {...proof, factors: proof.factors.map(f => ({...f, exponent: -f.exponent}))}, {...proof, conditions: []}, {...proof, reduction: {...proof.reduction, index: 2}},
    {...proof, reduction: {...proof.reduction, ratio: s.owner.fromInteger(s.ctx, 0n)}}, {...proof, reduction: {...proof.reduction, coordinates: model.ring.one(s.ctx)}},
    {...proof, reduction: {...proof.reduction, extended: proof.reduction.space}}];
  for (const value of changed) expect(() => verify(fresh(), model, s.divisor, value, bounds)).toThrow('verification-failed');
  const other = constructGenusOneCoordinates(fresh(), p, bounds); expect(() => verify(fresh(), other, s.divisor, proof, bounds)).toThrow('domain-mismatch');
  const ctx = fresh(); verify(ctx, model, s.divisor, proof, bounds); const first = ctx.usage.work; verify(ctx, model, s.divisor, proof, bounds); expect(ctx.usage.work).toBe(first * 2);
  const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decide(limited, model, s.divisor, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
