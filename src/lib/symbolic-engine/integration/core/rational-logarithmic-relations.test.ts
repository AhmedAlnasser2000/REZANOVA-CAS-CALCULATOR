import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { solveRationalLogarithmicDerivativeRelations as solve, verifyRationalLogarithmicDerivativeRelations as verify } from './rational-logarithmic-relations';

describe('complete rational radical logarithmic-derivative relations', () => {
  it('finds the full space with duplicate, zero and dependent inputs', () => {
    const {ctx, f, p} = setup(), inputs = [p([1], [0, 1]), p([2], [0, 1]), p([])];
    const e = solve(ctx, f, inputs, bounds); verify(ctx, f, inputs, e, bounds);
    expect(e.basis).toHaveLength(3); expect(e.factors).toHaveLength(1);
    expect(Object.isFrozen(e.basis[0].powers)).toBe(true);
  });
  it('rejects higher poles, polynomial parts and nonrational irreducible-factor residues', () => {
    const {ctx, f, p} = setup();
    for (const input of [p([1]), p([1], [0, 0, 1]), p([1], [1, 0, 1])]) expect(solve(ctx, f, [input], bounds).basis).toHaveLength(0);
  });
  it('recovers rational residues on irreducible factors and their minimal radical indices', () => {
    const {ctx, f, p} = setup(), e = solve(ctx, f, [p([0, 1], [1, 0, 1])], bounds);
    expect(e.basis).toHaveLength(1);
    // Canonical nullspace makes the factor valuation 1 and input coefficient 2.
    expect(e.basis[0].coefficients[0].numerator).toBe(2n);
    expect(e.basis[0].index).toBe(1n);
  });
  it('finds combinations that cancel higher poles before extracting residues', () => {
    const {ctx, f, p} = setup(), inputs = [p([1, 1], [0, 0, 1]), p([1], [0, 0, 1])];
    const e = solve(ctx, f, inputs, bounds); expect(e.basis).toHaveLength(1);
    expect(e.basis[0].coefficients.map(c => c.numerator)).toEqual([1n, -1n]);
  });
  it('preserves empty requests and original denominator positions', () => {
    const {ctx, f, p} = setup(); expect(solve(ctx, f, [], bounds).basis).toHaveLength(0);
    const inputs = [p([1], [0, 1]), p([1], [1, 1])], e = solve(ctx, f, inputs, bounds);
    expect(e.conditions).toHaveLength(2); expect(e.factorizations).toHaveLength(2);
  });
  it('rejects mutated factor coverage, valuations, minimal indices and ordered inputs', () => {
    const {ctx, f, p} = setup(), inputs = [p([1], [0, 1]), p([1], [1, 1])], e = solve(ctx, f, inputs, bounds);
    const bad = [
      {...e, factors: []}, {...e, basis: []}, {...e, conditions: []},
      {...e, basis: [{...e.basis[0], index: 2n}, ...e.basis.slice(1)]},
      {...e, basis: [{...e.basis[0], powers: [0n, 0n]}, ...e.basis.slice(1)]},
    ];
    for (const mutation of bad) expect(() => verify(ctx, f, inputs, mutation, bounds)).toThrow('verification-failed');
    expect(() => verify(ctx, f, [...inputs].reverse(), e, bounds)).toThrow('verification-failed');
    expect(() => solve(ctx, f, [setup().p([1])], bounds)).toThrow('domain-mismatch');
  });
});
