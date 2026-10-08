import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { DifferentialField } from './differential-field';
import { descendCoefficientSystem as descend, verifyCoefficientSystem as verify } from './recursive-coefficient-system';
import { solveLinearSystem } from './linear-system';
import { rationalField as Q } from './field';

describe('checked rational coefficient comparison in recursive fields', () => {
  it('forces rational constants by complete monomial comparison', () => {
    const {ctx, f, p} = setup(), system = {rows: 1, columns: 2, matrix: [[p([1, 1]), p([1, -1])]], rhs: [p([2])]};
    const d = descend(ctx, f, system, bounds); verify(ctx, f, system, d, bounds);
    expect(d.system.rows).toBe(2);
    const solution = solveLinearSystem(ctx, Q, d.system); expect(solution.kind).toBe('consistent');
    if (solution.kind === 'consistent') expect(solution.particular.map(c => c.numerator)).toEqual([1n, 1n]);
  });
  it('proves contradiction even though the field-valued equation has a field solution', () => {
    const {ctx, f, p} = setup(), system = {rows: 1, columns: 1, matrix: [[p([0, 1])]], rhs: [p([1])]};
    const d = descend(ctx, f, system, bounds);
    expect(solveLinearSystem(ctx, Q, d.system).kind).toBe('inconsistent');
  });
  it('checks cleared nested denominators and all native inverse conversions', () => {
    const {ctx, f, p} = setup(), t = DifferentialField.formal(ctx, f, 't', [p([1])], bounds);
    const u = t.make(ctx, [p([1], [0, 1]), p([1])], [p([1, 1]), p([1])]);
    const system = {rows: 1, columns: 2, matrix: [[u, t.negate(ctx, u)]], rhs: [t.fromInteger(ctx, 0n)]};
    const d = descend(ctx, t, system, bounds); verify(ctx, t, system, d, bounds);
    const s = solveLinearSystem(ctx, Q, d.system); expect(s.kind === 'consistent' && s.nullspace.length).toBe(1);
  });
  it.each([0, 3])('preserves zero rows and %s columns', columns => {
    const {ctx, f} = setup(), system = {rows: 0, columns, matrix: [], rhs: []};
    const d = descend(ctx, f, system, bounds); expect(d.system).toEqual(system);
    const s = solveLinearSystem(ctx, Q, d.system); expect(s.kind === 'consistent' && s.nullspace.length).toBe(columns);
  });
  it('preserves zero-column contradictions and rejects omitted RHS support', () => {
    const {ctx, f, p} = setup(), system = {rows: 1, columns: 0, matrix: [[]], rhs: [p([1, 1])]};
    const d = descend(ctx, f, system, bounds); expect(solveLinearSystem(ctx, Q, d.system).kind).toBe('inconsistent');
    expect(() => verify(ctx, f, system, {...d, rows: [{...d.rows[0], support: []}]}, bounds)).toThrow('verification-failed');
  });
  it('rejects conversion, clearing, sign, ownership and coverage mutations', () => {
    const {ctx, f, p} = setup(), system = {rows: 1, columns: 1, matrix: [[p([1], [1, 1])]], rhs: [p([2], [1, 1])]};
    const d = descend(ctx, f, system, bounds), ring = d.auxiliary;
    const bad = [
      {...d, rows: [{...d.rows[0], denominator: ring.zero(ctx)}]},
      {...d, rows: [{...d.rows[0], cleared: [ring.one(ctx), ring.one(ctx)]}]},
      {...d, rows: [{...d.rows[0], values: []}]},
      {...d, system: {...d.system, rhs: d.system.rhs.map(c => Q.negate(ctx, c))}},
    ];
    for (const e of bad) expect(() => verify(ctx, f, system, e, bounds)).toThrow('verification-failed');
    expect(() => descend(ctx, f, {...system, rhs: [setup().p([2])]}, bounds)).toThrow('domain-mismatch');
  });
});
