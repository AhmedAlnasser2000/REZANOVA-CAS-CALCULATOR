import { describe, expect, it } from 'vitest';
import { rationalField as Q } from './field';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';
import { rational, type Rational } from './rational';
import { RationalFunctionField } from './rational-function';
import { context, poly, rationalRing } from './test-support';
import type { ExecutionContext } from './execution';

function system(c: ExecutionContext, rows: number[][], rhs: number[], columns = rows[0]?.length ?? 0): LinearSystem<Rational> {
  return { rows: rows.length, columns, matrix: rows.map(row => row.map(n => rational(c, n))), rhs: rhs.map(n => rational(c, n)) };
}
describe('verified exact rectangular elimination', () => {
  it('handles row swaps and returns a known unique solution', () => {
    const c = context(), s = system(c, [[0, 2], [3, 1]], [4, 5]), result = solveLinearSystem(c, Q, s);
    expect(result.kind).toBe('consistent'); expect(result.rank).toBe(2); expect(result.pivots).toEqual([0, 1]);
    if (result.kind !== 'consistent') throw Error('expected solution');
    expect(result.particular).toEqual([rational(c, 1), rational(c, 2)]); expect(result.nullspace).toEqual([]);
    expect(result.operations[0].kind).toBe('swap');
    expect(Object.isFrozen(result.reduced[0])).toBe(true);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, particular: [rational(c, 0), rational(c, 2)] })).toThrowError(/verification-failed/);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, operations: result.operations.slice(1) })).toThrowError(/verification-failed/);
  });
  it('returns and verifies the whole affine solution space', () => {
    const c = context(), s = system(c, [[1, 2, 3], [2, 4, 6]], [4, 8]), result = solveLinearSystem(c, Q, s);
    if (result.kind !== 'consistent') throw Error('expected solution');
    expect(result.rank).toBe(1); expect(result.particular).toEqual([rational(c, 4), rational(c, 0), rational(c, 0)]);
    expect(result.nullspace).toEqual([[-2, 1, 0], [-3, 0, 1]].map(row => row.map(n => rational(c, n))));
    expect(() => verifyLinearSolution(c, Q, s, { ...result, nullspace: result.nullspace.slice(1) })).toThrowError(/incomplete nullspace/);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, nullspace: [result.nullspace[0], result.nullspace[0]] })).toThrowError(/independence/);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, rank: 2 })).toThrowError(/verification-failed/);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, pivots: [1] })).toThrowError(/verification-failed/);
  });
  it('proves inconsistency by a checked left witness after several row operations', () => {
    const c = context(), s = system(c, [[0, 2], [3, 1], [6, 4]], [4, 5, 15]), result = solveLinearSystem(c, Q, s);
    expect(result.kind).toBe('inconsistent');
    if (result.kind !== 'inconsistent') throw Error('expected contradiction');
    expect(() => verifyLinearSolution(c, Q, s, { ...result, witness: result.witness.map(() => rational(c, 0)) })).toThrowError(/verification-failed/);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, operations: [{ kind: 'scale', target: 0, factor: rational(c, 0) }] })).toThrowError(/noninvertible/);
    expect(() => verifyLinearSolution(c, Q, s, { ...result, operations: [{ kind: 'add', target: 0, source: 0, factor: rational(c, 1) }] })).toThrowError(/row source/);
    const foreign = { ...result, kind: 'unexpected' } as unknown as LinearSolution<Rational>;
    expect(() => verifyLinearSolution(c, Q, s, foreign)).toThrowError(/verification-failed/);
  });
  it('handles empty, zero-column, tall and all-zero systems', () => {
    const c = context();
    const empty = solveLinearSystem(c, Q, system(c, [], [], 3));
    if (empty.kind !== 'consistent') throw Error('expected solution');
    expect(empty.rank).toBe(0); expect(empty.nullspace.length).toBe(3);
    const zeroDim = solveLinearSystem(c, Q, system(c, [], []));
    expect(zeroDim.kind === 'consistent' && zeroDim.particular.length).toBe(0);
    expect(solveLinearSystem(c, Q, system(c, [[], []], [0, 0])).kind).toBe('consistent');
    expect(solveLinearSystem(c, Q, system(c, [[], []], [0, 1])).kind).toBe('inconsistent');
    expect(solveLinearSystem(c, Q, system(c, [[1], [2], [3]], [2, 4, 6])).rank).toBe(1);
    expect(solveLinearSystem(c, Q, system(c, [[0, 0]], [0])).rank).toBe(0);
    expect(() => solveLinearSystem(c, Q, { ...system(c, [[1]], [1]), columns: 2 })).toThrowError(/invalid-input/);
  });
  it('solves and rejects inconsistent systems over Q(t)', () => {
    const c = context(), r = rationalRing('t'), f = new RationalFunctionField(r);
    const t = f.make(c, poly(c, r, [0, 1]), r.one(c)), one = f.fromInteger(c, 1n), zero = f.fromInteger(c, 0n);
    const unique = solveLinearSystem(c, f, { rows: 2, columns: 2, matrix: [[zero, t], [one, one]], rhs: [t, f.fromInteger(c, 2n)] });
    if (unique.kind !== 'consistent') throw Error('expected solution');
    expect(unique.particular.every(v => f.equal(c, v, one))).toBe(true);
    const under = solveLinearSystem(c, f, { rows: 1, columns: 2, matrix: [[one, t]], rhs: [one] });
    expect(under.kind === 'consistent' && under.nullspace.length).toBe(1);
    const inconsistent = solveLinearSystem(c, f, { rows: 2, columns: 1, matrix: [[one], [t]], rhs: [one, zero] });
    expect(inconsistent.kind).toBe('inconsistent');
  });
  it('solves seeded invertible systems against known vectors', () => {
    const c = context(); let seed = 121;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 13 - 6; };
    for (let sample = 0; sample < 24; sample++) {
      // Unit triangular matrices remain invertible; integer row swaps/additions preserve that.
      const matrix = [[1, next(), next()], [0, 1, next()], [0, 0, 1]], expected = [next(), next(), next()];
      const factor = next();
      for (let j = 0; j < 3; j++) matrix[2][j] += factor * matrix[0][j];
      [matrix[0], matrix[2]] = [matrix[2], matrix[0]];
      const rhs = matrix.map(row => row.reduce((sum, value, j) => sum + value * expected[j], 0));
      const result = solveLinearSystem(c, Q, system(c, matrix, rhs));
      expect(result.kind === 'consistent' && result.particular).toEqual(expected.map(n => rational(c, n)));
    }
  });
  it('rejects a resource stop during replay instead of returning success', () => {
    const setup = context(), s = system(setup, [[1, 2], [3, 4]], [5, 6]), measured = context();
    const result = solveLinearSystem(measured, Q, s);
    expect(() => solveLinearSystem(context({ work: measured.usage.work - 1 }), Q, s)).toThrowError(/resource-limit/);
    expect(() => verifyLinearSolution(context({ work: 10 }), Q, s, result)).toThrowError(/resource-limit/);
    expect(() => solveLinearSystem(context({ allocation: 2 }), Q, s)).toThrowError(/resource-limit/);
  });
});
