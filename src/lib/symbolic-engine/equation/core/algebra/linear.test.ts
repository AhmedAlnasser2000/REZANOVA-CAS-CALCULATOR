import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context, seeded } from '../test-support';
import { determinant, solveLinear, verifyLinear } from './linear';
import { rational, type Rational } from './rational';

const code = (run: () => unknown) => { try { run(); } catch (e) { return e instanceof EquationAlgebraError ? e.code : 'other'; } return 'none'; };
const R = (ctx: ReturnType<typeof context>, rows: (number | [number, number])[][]) =>
  rows.map(r => r.map(v => (Array.isArray(v) ? rational(ctx, v[0], v[1]) : rational(ctx, v))));
const nums = (v: readonly Rational[]) => v.map(x => `${x.numerator}/${x.denominator}`);

describe('Bareiss linear systems', () => {
  it('solves a unique system with fractions', () => {
    const ctx = context();
    const s = solveLinear(ctx, R(ctx, [[2, 1], [1, 3]]), [rational(ctx, 3n), rational(ctx, 5n)]);
    expect(s.kind).toBe('consistent');
    if (s.kind === 'consistent') { expect(s.rank).toBe(2); expect(nums(s.particular)).toEqual(['4/5', '7/5']); expect(s.nullspace).toHaveLength(0); }
  });

  it('returns a particular solution plus nullspace for underdetermined systems', () => {
    const ctx = context();
    const a = R(ctx, [[1, 2, 3], [2, 4, 6]]), b = R(ctx, [[6], [12]]).map(r => r[0]);
    const s = solveLinear(ctx, a, b);
    expect(s.kind === 'consistent' && s.rank === 1 && s.nullspace.length === 2).toBe(true);
  });

  it('detects inconsistency with a checked witness', () => {
    const ctx = context();
    const a = R(ctx, [[1, 1], [2, 2]]), b = R(ctx, [[1], [3]]).map(r => r[0]);
    const s = solveLinear(ctx, a, b);
    expect(s.kind).toBe('inconsistent');
    if (s.kind === 'inconsistent') {
      const mutated = { ...s, witness: [rational(ctx, 1n), rational(ctx, 1n)] };
      expect(code(() => verifyLinear(ctx, a, b, mutated))).toBe('verification-failed');
    }
  });

  it('needs row swaps and handles empty dimensions', () => {
    const ctx = context();
    const s = solveLinear(ctx, R(ctx, [[0, 1], [1, 0]]), R(ctx, [[2], [3]]).map(r => r[0]));
    expect(s.kind === 'consistent' && nums(s.particular).join() === '3/1,2/1').toBe(true);
    const empty = solveLinear(ctx, [], [], 0);
    expect(empty.kind === 'consistent' && empty.rank === 0).toBe(true);
    const noColumns = solveLinear(ctx, [[], []], R(ctx, [[1], [0]]).map(r => r[0]));
    expect(noColumns.kind).toBe('inconsistent');
    const freeOnly = solveLinear(ctx, [], [], 3);
    expect(freeOnly.kind === 'consistent' && freeOnly.nullspace.length === 3).toBe(true);
  });

  it('rejects mutated solutions', () => {
    const ctx = context();
    const a = R(ctx, [[1, 2, 3], [2, 4, 6]]), b = R(ctx, [[6], [12]]).map(r => r[0]);
    const s = solveLinear(ctx, a, b);
    if (s.kind !== 'consistent') throw new Error('expected consistent');
    expect(code(() => verifyLinear(ctx, a, b, { ...s, particular: [rational(ctx, 1n), rational(ctx, 1n), rational(ctx, 0n)] }))).toBe('verification-failed');
    expect(code(() => verifyLinear(ctx, a, b, { ...s, nullspace: s.nullspace.slice(1) }))).toBe('verification-failed');
  });

  it('solves seeded random systems and agrees with determinants', () => {
    const ctx = context(), rng = seeded(17);
    for (let t = 0; t < 25; t++) {
      const n = rng.int(1, 9), m = rng.int(1, 9);
      const a = Array.from({ length: n }, () => Array.from({ length: m }, () => rational(ctx, rng.big(40), rng.big(12) || 1n)));
      const b = Array.from({ length: n }, () => rational(ctx, rng.big(40), rng.big(12) || 1n));
      solveLinear(ctx, a, b); // verified internally
    }
    expect(nums([determinant(ctx, R(ctx, [[1, 2], [3, 4]]))])).toEqual(['-2/1']);
    expect(nums([determinant(ctx, R(ctx, [[[1, 2], 0, 0], [0, [2, 3], 0], [0, 0, 6]]))])).toEqual(['2/1']);
    expect(nums([determinant(ctx, R(ctx, [[1, 2], [2, 4]]))])).toEqual(['0/1']);
    expect(nums([determinant(ctx, R(ctx, [[0, 1], [1, 0]]))])).toEqual(['-1/1']);
  });

  it('handles a 30x30 integer system without any size limit', () => {
    const ctx = context(), rng = seeded(30);
    const a = Array.from({ length: 30 }, () => Array.from({ length: 30 }, () => rational(ctx, rng.big(30))));
    const b = Array.from({ length: 30 }, () => rational(ctx, rng.big(30)));
    expect(['consistent', 'inconsistent']).toContain(solveLinear(ctx, a, b).kind);
  });
});
