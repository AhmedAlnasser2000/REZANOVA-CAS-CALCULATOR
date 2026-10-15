import {afterEach, expect, it, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';
import {constructGenusOnePresentation} from './genus-one-presentation';
import {constructGenusOneCoordinates} from './genus-one-coordinates';
import {decideGenusOneRationalTorsion as decide, verifyGenusOneRationalTorsion as verify} from './genus-one-torsion';
import {encodeGenusOneRationalTorsion as encode, decodeGenusOneRationalTorsion as decode} from './genus-one-torsion-wire';
import {scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {ExecutionContext} from './execution';
import * as presentation from './genus-one-presentation';
import * as coordinates from './genus-one-coordinates';
import * as reduction from './genus-one-divisor-class';
import * as places from './genus-one-place';
import * as torsion from './genus-one-torsion';
import * as group from './elliptic-group';
import {rationalEllipticOrders} from './elliptic-rational-orders';
afterEach(() => vi.restoreAllMocks());
function fixture(order: bigint|null) {
  const s = ellipticDivisor(order), p = constructGenusOnePresentation(fresh(), s.curve, s.divisor.entries[1].place, bounds), model = constructGenusOneCoordinates(fresh(), p, bounds), proof = decide(fresh(), model, s.divisor, bounds);
  return {...s, p, model, proof};
}
it.each([2n, null])('replays general genus-one order %s into fresh owners with all search producers disabled', order => {
  const s = fixture(order), data = encode(fresh(), s.model, s.divisor, s.proof, bounds), target = ellipticDivisor(order), p = constructGenusOnePresentation(fresh(), target.curve, target.divisor.entries[1].place, bounds), stop = () => {throw Error('genus-one search disabled');};
  const restore = disableAlgebraicIntegrationProducers();
  vi.spyOn(presentation, 'constructGenusOnePresentationWithin').mockImplementation(stop); vi.spyOn(coordinates, 'constructGenusOneCoordinatesWithin').mockImplementation(stop);
  vi.spyOn(reduction, 'reduceGenusOneDivisorWithin').mockImplementation(stop); vi.spyOn(places, 'transportGenusOnePlaceWithin').mockImplementation(stop); vi.spyOn(torsion, 'decideGenusOneRationalTorsionWithin').mockImplementation(stop);
  vi.spyOn(group, 'multiplyEllipticPoint').mockImplementation(stop); vi.spyOn(group, 'addEllipticPoints').mockImplementation(stop);
  try {
    const result = decode(fresh(), p, target.divisor, structuredClone(data), bounds); verify(fresh(), result.model, target.divisor, result, bounds);
    expect(result.kind).toBe(s.proof.kind); expect(result.order).toBe(s.proof.order); expect(result.model.ring).not.toBe(s.model.ring); expect(result.model.curve).toBe(target.curve);
    expect(encode(fresh(), result.model, target.divisor, result, bounds)).toEqual(data);
  } finally {restore();}
});
it('rejects changed requests, trusted flags, malformed and stricter artifacts with cold accounting', () => {
  const s = fixture(2n), data = encode(fresh(), s.model, s.divisor, s.proof, bounds);
  expect(() => decode(fresh(), s.p, scaleAlgebraicDivisorWithin(s.ctx, s.curve, s.divisor, -1n), data, bounds)).toThrow('verification-failed');
  expect(() => decode(fresh(), s.p, s.divisor, {...data as object, verified: true}, bounds)).toThrow('invalid-input');
  for (const patch of [{artifactBytes: 1}, {artifactDepth: 1}, {artifactNodes: 1}]) expect(() => decode(fresh(), s.p, s.divisor, data, {...bounds, ...patch})).toThrow('resource-limit');
  const ctx = fresh(); decode(ctx, s.p, s.divisor, data, bounds); const work = ctx.usage.work; decode(ctx, s.p, s.divisor, data, bounds); expect(ctx.usage.work).toBe(2 * work);
  const limited = new ExecutionContext({...fresh().limits, work: 1}); expect(() => decode(limited, s.p, s.divisor, data, bounds)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
it('retains original version-one complete native rational-order replay', () => {
  const s = fixture(2n), tests = [];
  for (const n of rationalEllipticOrders) {const m = group.multiplyEllipticPoint(s.ctx, s.model, s.proof.reduction.point, n); tests.push(m); if (m.point.kind === 'infinity') break;}
  const legacy = Object.freeze({rule: s.proof.rule, model: s.model, divisor: s.divisor, reduction: s.proof.reduction, tests: Object.freeze(tests), kind: s.proof.kind, order: s.proof.order, factors: s.proof.factors, conditions: s.proof.conditions});
  verify(fresh(), s.model, s.divisor, legacy, bounds); const data = encode(fresh(), s.model, s.divisor, legacy, bounds) as {version: number}; expect(data.version).toBe(1);
  const restore = disableAlgebraicIntegrationProducers(); try {const decoded = decode(fresh(), s.p, s.divisor, structuredClone(data), bounds); expect(decoded.format).toBeUndefined(); verify(fresh(), decoded.model, s.divisor, decoded, bounds);} finally {restore();}
});
it('checks every finite reduction, specialization, order and binary branch without trusted exclusions', () => {
  const s = fixture(2n), proof = s.proof; if (proof.format !== 'rational-order-filter-v2') throw Error('known filtered evidence');
  const f = proof.filters[0], changes = [
    [...proof.filters.slice(0, 1)], [f, f], [{...f, prime: 9n}, proof.filters[1]], [{...f, polynomial: [0n]}, proof.filters[1]],
    [{...f, squareFree: {...f.squareFree, gcd: []}}, proof.filters[1]], [{...f, tests: f.tests.slice(1)}, proof.filters[1]],
    [{...f, tests: f.tests.map((t, i) => i ? t : {...t, steps: []})}, proof.filters[1]],
    [{...f, point: {kind: 'infinity' as const}}, proof.filters[1]],
    [{...f, tests: f.tests.map((t, i) => i ? t : {...t, steps: t.steps.map(step => ({...step, add: undefined as never}))})}, proof.filters[1]]
  ];
  for (const filters of changes) expect(() => verify(fresh(), s.model, s.divisor, {...proof, filters}, bounds)).toThrow();
  const data = encode(fresh(), s.model, s.divisor, proof, bounds) as {version: number}; expect(data.version).toBe(2);
  expect(() => decode(fresh(), s.p, s.divisor, {...data, version: 1}, bounds)).toThrow('invalid-input');
});
