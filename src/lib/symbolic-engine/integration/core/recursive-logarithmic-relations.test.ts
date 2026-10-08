import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView, verifyCertifiedTower } from './recursive-certified-tower';
import { solveRecursiveLogarithmicDerivativeRelations as solve, verifyRecursiveLogarithmicDerivativeRelations as verify } from './recursive-logarithmic-relations';
import { differentiate } from './differential-derivative';
import { DifferentialField } from './differential-field';

function fixture(hyper: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  const a = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (a.status !== 'supported') throw Error('fixture admission');
  const view = CertifiedTowerView.firstLevel(s.ctx, root, a.field, a.field.admission!, bounds);
  return {...s, root, owner: a.field, view, t: a.field.generator(s.ctx)};
}
describe('strict parent-field descent of radical logarithmic relations', () => {
  it.each([false, true])('preserves a supplied certified owner and full first-level construction (hyper=%s)', hyper => {
    const s = fixture(hyper); verifyCertifiedTower(s.ctx, s.view, bounds);
    expect(s.view.owner).toBe(s.owner); expect(s.view.parent!.owner).toBe(s.f);
    expect(s.view.monomial).toBe(hyper ? 'hyperexponential' : 'primitive');
    expect(Object.isFrozen(s.view)).toBe(true);
  });
  it('recognizes logarithmic factors involving the generator and coefficient derivatives', () => {
    const s = fixture(false), g = s.owner.add(s.ctx, s.t, s.owner.embed(s.ctx, s.x));
    const input = s.owner.exactDivide(s.ctx, differentiate(s.ctx, s.owner, g).derivative, g);
    const e = solve(s.ctx, s.view, [input], bounds); verify(s.ctx, s.view, [input], e, bounds);
    expect(e.basis).toHaveLength(1); expect(e.route).toBe('recursive');
    if (e.route === 'recursive') expect(e.descent.factors).toHaveLength(1);
  });
  it('recognizes log(t) derivatives and descends lower-field prime factors', () => {
    const s = fixture(false), dx = s.owner.embed(s.ctx, s.p([1], [0, 1]));
    const input = s.owner.exactDivide(s.ctx, dx, s.t), e = solve(s.ctx, s.view, [input, dx, s.owner.fromInteger(s.ctx, 0n)], bounds);
    expect(e.basis).toHaveLength(3); verify(s.ctx, s.view, [input, dx, s.owner.fromInteger(s.ctx, 0n)], e, bounds);
    expect(e.factors.length).toBeGreaterThanOrEqual(2);
  });
  it('adds the hyperexponential generator coordinate with the checked sign', () => {
    const s = fixture(true), one = s.owner.fromInteger(s.ctx, 1n), dx = s.owner.embed(s.ctx, s.p([1], [0, 1]));
    const e = solve(s.ctx, s.view, [one, dx], bounds); expect(e.basis).toHaveLength(2);
    verify(s.ctx, s.view, [one, dx], e, bounds);
    expect(e.factors.some(f => s.owner.equal(s.ctx, f.value, s.t))).toBe(true);
  });
  it.each([false, true])('excludes higher normal poles and positive polynomial parts completely (hyper=%s)', hyper => {
    const s = fixture(hyper), input = s.owner.inverse(s.ctx, s.owner.add(s.ctx, s.t, s.owner.embed(s.ctx, s.x)));
    const e = solve(s.ctx, s.view, [input], bounds); expect(e.basis).toHaveLength(0);
    const polynomial = solve(s.ctx, s.view, [s.t], bounds); expect(polynomial.basis).toHaveLength(0);
  });
  it('finds radical relations after cancellation of repeated poles', () => {
    const s = fixture(false), dt = s.owner.embed(s.ctx, s.p([1], [0, 1]));
    const a = s.owner.exactDivide(s.ctx, dt, s.t), b = s.owner.inverse(s.ctx, s.owner.multiply(s.ctx, s.t, s.t));
    const inputs = [s.owner.add(s.ctx, a, b), b], e = solve(s.ctx, s.view, inputs, bounds);
    expect(e.basis).toHaveLength(1); expect(e.basis[0].coefficients.map(c => c.numerator)).toEqual([1n, -1n]);
  });
  it('rejects forged views, foreign values and changed full construction arguments', () => {
    const s = fixture(false);
    expect(() => solve(s.ctx, Object.create(CertifiedTowerView.prototype), [s.t], bounds)).toThrow('domain-mismatch');
    expect(() => solve(s.ctx, s.view, [fixture(false).t], bounds)).toThrow('domain-mismatch');
    const other = buildLogarithm(s.ctx, s.f, 'u', s.p([0, 2]), bounds);
    if (other.status !== 'supported') throw Error('fixture admission');
    expect(() => CertifiedTowerView.firstLevel(s.ctx, s.root, s.owner, other.field.admission!, bounds)).toThrow('verification-failed');
    const formal = DifferentialField.formal(s.ctx, s.f, 'a', [s.p([])], bounds);
    expect(() => CertifiedTowerView.rationalFunctions(s.ctx, formal, bounds)).toThrow('domain-mismatch');
  });
  it('rejects missing descent, parent, valuation, derivative and target evidence', () => {
    const s = fixture(true), input = s.owner.fromInteger(s.ctx, 1n), e = solve(s.ctx, s.view, [input], bounds);
    if (e.route !== 'recursive') throw Error('recursive fixture');
    const bad = [
      {...e, basis: []}, {...e, factors: []}, {...e, conditions: []},
      {...e, descent: {...e.descent, lower: []}},
      {...e, factors: [{...e.factors[0], derivative: {...e.factors[0].derivative, derivative: s.owner.fromInteger(s.ctx, 0n)}}, ...e.factors.slice(1)]},
    ];
    for (const d of bad) expect(() => verify(s.ctx, s.view, [input], d, bounds)).toThrow('verification-failed');
  });
});
