import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView } from './recursive-certified-tower';
import { solveRecursiveParametricRde as solve, verifyRecursiveParametricRde as verify } from './recursive-rde';
import { solveRecursiveLimitedIntegration as limited, verifyRecursiveLimitedIntegration as verifyLimited } from './recursive-limited-integration';
import { differentiate } from './differential-derivative';
import { descendCoefficientSystem } from './recursive-coefficient-system';
import { solveLinearSystem } from './linear-system';
import { rationalField as Q } from './field';
import { rationalInOwner } from './recursive-rde-family';
import type { RecursiveParametricRdeDecision } from './recursive-rde-types';
import type { DifferentialElement as E } from './differential-field';

function fixture(hyper: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  const a = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (a.status !== 'supported') throw Error('fixture admission');
  const owner = a.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds), t = owner.generator(s.ctx);
  return {...s, owner, view, t};
}
function contains(s: ReturnType<typeof fixture>, e: RecursiveParametricRdeDecision, cs: readonly bigint[], value: E) {
  if (!e.family) return false;
  const owner = s.owner, ds = e.family.directions;
  const matrix = cs.map((_, i) => ds.map(p => rationalInOwner(s.ctx, owner, p.coefficients[i])));
  const rhs = cs.map((c, i) => owner.subtract(s.ctx, owner.fromInteger(s.ctx, c), rationalInOwner(s.ctx, owner, e.family!.particular.coefficients[i])));
  matrix.push(ds.map(p => p.value)); rhs.push(owner.subtract(s.ctx, value, e.family.particular.value));
  const system = descendCoefficientSystem(s.ctx, owner, {rows: cs.length + 1, columns: ds.length, matrix, rhs}, bounds);
  return solveLinearSystem(s.ctx, Q, system.system).kind === 'consistent';
}
describe('complete paired recursive RDE families', () => {
  it('retains forcing and homogeneous freedom for D(y)-y=c*t', () => {
    const s = fixture(true), zero = s.owner.fromInteger(s.ctx, 0n), a = s.owner.fromInteger(s.ctx, -1n);
    const e = solve(s.ctx, s.view, a, zero, [s.t], bounds); verify(s.ctx, s.view, a, zero, [s.t], e, bounds);
    expect(e.family!.directions).toHaveLength(2);
    expect(contains(s, e, [1n], s.owner.multiply(s.ctx, s.owner.embed(s.ctx, s.x), s.t))).toBe(true);
    expect(contains(s, e, [0n], s.t)).toBe(true);
  });
  it('preserves inverse-power pure homogeneous solutions', () => {
    const s = fixture(true), zero = s.owner.fromInteger(s.ctx, 0n), a = s.owner.fromInteger(s.ctx, 2n), e = solve(s.ctx, s.view, a, zero, [], bounds);
    expect(e.family!.directions).toHaveLength(1);
    expect(contains(s, e, [], s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, s.t, s.t)))).toBe(true);
  });
  it('integrates t and t/x within the primitive field', () => {
    const s = fixture(false), zero = s.owner.fromInteger(s.ctx, 0n), x = s.owner.embed(s.ctx, s.x);
    const input = s.t, e = solve(s.ctx, s.view, zero, input, [], bounds);
    expect(e.kind).toBe('solutions'); expect(contains(s, e, [], s.owner.subtract(s.ctx, s.owner.multiply(s.ctx, x, s.t), x))).toBe(true);
    const second = limited(s.ctx, s.view, s.owner.exactDivide(s.ctx, s.t, x), [], bounds);
    expect(second.family!.directions).toHaveLength(0); expect(second.family!.additiveConstant).toBe('arbitrary-rational');
    expect(s.owner.equal(s.ctx, second.family!.particular.value, s.owner.exactDivide(s.ctx, s.owner.multiply(s.ctx, s.t, s.t), s.owner.fromInteger(s.ctx, 2n)))).toBe(true);
    verifyLimited(s.ctx, s.view, s.owner.exactDivide(s.ctx, s.t, x), [], second, bounds);
  });
  it('returns a field-solution obstruction for D(v)=1/(x*t)', () => {
    const s = fixture(false), input = s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, s.owner.embed(s.ctx, s.x), s.t));
    const e = limited(s.ctx, s.view, input, [], bounds); expect(e.kind).toBe('no-field-solution'); expect(e.family).toBe(null);
    verifyLimited(s.ctx, s.view, input, [], e, bounds); expect(e.rde.slice.kind).toBe('inconsistent');
  });
  it.each([false, true])('preserves duplicates, zero inputs and zero function directions (hyper=%s)', hyper => {
    const s = fixture(hyper), zero = s.owner.fromInteger(s.ctx, 0n), x = s.owner.embed(s.ctx, s.x), one = s.owner.fromInteger(s.ctx, 1n);
    const e = solve(s.ctx, s.view, zero, zero, [one, one, zero], bounds);
    expect(e.family!.directions).toHaveLength(4);
    expect(contains(s, e, [1n, -1n, 0n], zero)).toBe(true); expect(contains(s, e, [0n, 0n, 1n], zero)).toBe(true);
    expect(contains(s, e, [1n, 0n, 0n], x)).toBe(true); expect(contains(s, e, [0n, 0n, 0n], one)).toBe(true);
  });
  it.each([false, true])('reconstructs a repeated normal-pole solution independently (hyper=%s)', hyper => {
    const s = fixture(hyper), p = s.owner.add(s.ctx, s.t, s.owner.embed(s.ctx, s.x)), value = s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, p, p));
    const input = differentiate(s.ctx, s.owner, value).derivative, e = solve(s.ctx, s.view, s.owner.fromInteger(s.ctx, 0n), input, [], bounds);
    expect(contains(s, e, [], value)).toBe(true);
  });
  it('rejects mutated bounds, mappings, derivatives and conditions', () => {
    const s = fixture(true), zero = s.owner.fromInteger(s.ctx, 0n), e = solve(s.ctx, s.view, s.owner.fromInteger(s.ctx, -1n), zero, [s.t], bounds);
    if (e.homogeneous.route !== 'recursive' || !e.family) throw Error('recursive fixture');
    const bad = [
      {...e, conditions: []}, {...e, family: {...e.family, directions: []}},
      {...e, homogeneous: {...e.homogeneous, degree: {...e.homogeneous.degree, bound: 0n}}},
      {...e, homogeneous: {...e.homogeneous, polynomial: {...e.homogeneous.polynomial, coefficients: []}}},
    ];
    for (const d of bad) expect(() => verify(s.ctx, s.view, s.owner.fromInteger(s.ctx, -1n), zero, [s.t], d, bounds)).toThrow('verification-failed');
  });
});
