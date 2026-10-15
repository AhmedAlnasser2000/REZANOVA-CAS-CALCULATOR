import {it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {rational, type Rational} from './rational';
import {ExecutionContext} from './execution';
import {solveCompactRationalLinearSystem, verifyCompactRationalLinearSystem} from './compact-rational-linear';
import {encodeCompactRationalLinearSystem, decodeCompactRationalLinearSystem} from './compact-rational-linear-wire';
import {solveLinearSystem, type LinearSystem} from './linear-system';
import * as compact from './compact-rational-linear';
import * as padic from './rational-padic-matrix';
import * as legacy from './arithmetic-linear';
import * as primes from './rational-gcd-evidence';
import {setup} from './differential-test-support';
import {DifferentialField} from './differential-field';
import {descendCoefficientSystemWithin, verifyCoefficientSystemWithin} from './recursive-coefficient-system';

function system(matrix: readonly (readonly bigint[])[], rhs: readonly bigint[], columns = matrix[0]?.length ?? 0): LinearSystem<Rational> {
  const ctx = fresh(); return Object.freeze({rows: matrix.length, columns, matrix: Object.freeze(matrix.map(row => Object.freeze(row.map(n => Q.fromInteger(ctx, n))))), rhs: Object.freeze(rhs.map(n => Q.fromInteger(ctx, n)))});
}
it('proves complete rational families for rectangular, dependent and empty systems', () => {
  const fixtures = [system([], [], 3), system([], []), system([[], []], [0n, 0n]), system([[], []], [0n, 1n]), system([[0n, 0n], [0n, 0n]], [0n, 0n]),
    system([[0n, 2n, 3n], [0n, 4n, 6n]], [5n, 10n]), system([[0n, 1n], [1n, 0n], [2n, 3n]], [2n, 1n, 8n]), system([[1n, 2n], [2n, 4n]], [3n, 7n])];
  for (const input of fixtures) {
    const proof = solveCompactRationalLinearSystem(fresh(), input), old = solveLinearSystem(fresh(), Q, input);
    expect(proof.kind).toBe(old.kind); expect(proof.rank).toBe(old.rank); expect(proof.nullspace).toHaveLength(input.columns - old.rank);
    if (proof.kind === 'consistent' && old.kind === 'consistent') {
      expect(proof.particular.every((q, i) => Q.equal(fresh(), q, old.particular[i]))).toBe(true);
      expect(proof.nullspace.every((row, i) => row.every((q, j) => Q.equal(fresh(), q, old.nullspace[i][j])))).toBe(true);
    }
    verifyCompactRationalLinearSystem(fresh(), input, proof); expect(Object.isFrozen(proof.inverse)).toBe(true); expect(Object.isFrozen(proof.input.matrix)).toBe(true);
  }
});
it('handles rational denominators, bad primes, pivot permutations and seeded exact matrices', () => {
  const ctx = fresh(), input = system([[2n, 1n], [0n, 2n]], [1n, 3n]);
  const recorded = ctx.operation(() => primes.recordRationalGcdEvidence(ctx, () => compact.solveCompactRationalLinearSystemWithin(ctx, input)));
  const proof = recorded.value; expect(proof.rank).toBe(2); expect(recorded.evidence.primes).toEqual([2n, 3n]);
  // Prime two is singular for this block; subsequent deterministic primes recover it.
  const rationalInput = {...input, matrix: input.matrix.map((row, i) => row.map((q, j) => rational(fresh(), q.numerator, BigInt(i + j + 2))))};
  verifyCompactRationalLinearSystem(fresh(), rationalInput, solveCompactRationalLinearSystem(fresh(), rationalInput));
  let seed = 7n;
  for (let n = 1; n <= 6; n++) {
    const a = Array.from({length: n + 1}, (_, i) => Array.from({length: n + 2}, (_, j) => {seed = (seed * 17n + 3n) % 101n; return i === n ? BigInt(j + 1) : seed - 50n;}));
    const request = system(a, a.map(row => row.reduce((sum, q, j) => sum + q * BigInt(j - 2), 0n))), expected = solveLinearSystem(fresh(), Q, request), value = solveCompactRationalLinearSystem(fresh(), request);
    expect(value.kind).toBe(expected.kind); expect(value.rank).toBe(expected.rank); verifyCompactRationalLinearSystem(fresh(), request, value);
  }
  const large = 1n << 180n, big = system([[large, 1n], [1n, large + 1n]], [1n, 2n]); verifyCompactRationalLinearSystem(fresh(), big, solveCompactRationalLinearSystem(fresh(), big));
});
it('rejects mutated rank, inverse, kernel, mapping and inconsistency evidence', () => {
  const input = system([[1n, 2n, 3n], [2n, 4n, 6n]], [7n, 14n]), proof = solveCompactRationalLinearSystem(fresh(), input);
  for (const p of [{...proof, rank: 0}, {...proof, independentRows: []}, {...proof, pivots: [2]}, {...proof, inverse: [[Q.fromInteger(fresh(), 0n)]]}, {...proof, nullspace: []}, {...proof, nullspace: proof.nullspace.map(row => row.map(() => Q.fromInteger(fresh(), 0n)))}]) expect(() => verifyCompactRationalLinearSystem(fresh(), input, p)).toThrow('verification-failed');
  if (proof.kind !== 'consistent') throw Error('known complete family'); expect(() => verifyCompactRationalLinearSystem(fresh(), input, {...proof, particular: proof.particular.map(() => Q.fromInteger(fresh(), 0n))})).toThrow('verification-failed');
  const negativeInput = system([[1n, 2n], [2n, 4n]], [3n, 7n]), negative = solveCompactRationalLinearSystem(fresh(), negativeInput);
  if (negative.kind !== 'inconsistent') throw Error('known row contradiction'); expect(() => verifyCompactRationalLinearSystem(fresh(), negativeInput, {...negative, witness: negative.witness.map(() => Q.fromInteger(fresh(), 0n))})).toThrow('verification-failed');
});
it('replays compact positive and negative artifacts without search or elimination producers', () => {
  for (const input of [system([[1n, 2n, 3n], [2n, 4n, 6n]], [7n, 14n]), system([[1n, 2n], [2n, 4n]], [3n, 7n])]) {
    const proof = solveCompactRationalLinearSystem(fresh(), input), data = JSON.parse(JSON.stringify(encodeCompactRationalLinearSystem(fresh(), input, proof, bounds))) as {evidence: Record<string, unknown>};
    const spies = [vi.spyOn(compact, 'solveCompactRationalLinearSystemWithin'), vi.spyOn(padic, 'invertRationalBlockPadicWithin'), vi.spyOn(legacy, 'solveArithmeticLinearSystem'), vi.spyOn(primes, 'rationalGcdPrimeFields')];
    for (const spy of spies) spy.mockImplementation(() => {throw Error('linear producer disabled');});
    try {expect(decodeCompactRationalLinearSystem(fresh(), input, data, bounds).kind).toBe(proof.kind);} finally {for (const spy of spies) spy.mockRestore();}
    expect(() => decodeCompactRationalLinearSystem(fresh(), {...input, rhs: input.rhs.map(() => Q.fromInteger(fresh(), 0n))}, data, bounds)).toThrow('verification-failed');
    expect(() => decodeCompactRationalLinearSystem(fresh(), input, {...data, evidence: {...data.evidence, verified: true}}, bounds)).toThrow('invalid-input');
    expect(() => decodeCompactRationalLinearSystem(fresh(), input, data, {...bounds, artifactNodes: 1})).toThrow('resource-limit');
  }
});
it('preserves fresh cumulative accounting, strict resources, malformed requests and operands', () => {
  const input = system([[2n, 1n], [1n, 2n]], [1n, 3n]), snapshot = JSON.stringify(input, (_, v) => typeof v === 'bigint' ? String(v) : v), ctx = fresh();
  const proof = solveCompactRationalLinearSystem(ctx, input), work = ctx.usage.work; solveCompactRationalLinearSystem(ctx, input); expect(ctx.usage.work).toBe(2 * work); expect(JSON.stringify(input, (_, v) => typeof v === 'bigint' ? String(v) : v)).toBe(snapshot);
  for (const limit of [{work: 1}, {allocation: 1}, {integerBits: 1}]) {const limited = new ExecutionContext({...fresh().limits, ...limit}); expect(() => solveCompactRationalLinearSystem(limited, input)).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');}
  expect(() => solveCompactRationalLinearSystem(fresh(), {...input, columns: Number.MAX_SAFE_INTEGER})).toThrow('invalid-input');
  expect(() => solveCompactRationalLinearSystem(fresh(), {...input, matrix: [[]]})).toThrow('invalid-input');
  expect(() => solveCompactRationalLinearSystem(fresh(), {...input, rhs: [{...input.rhs[0]}, input.rhs[1]]})).toThrow('domain-mismatch');
  expect(() => verifyCompactRationalLinearSystem(fresh(), {...input, rhs: []}, proof)).toThrow('invalid-input');
});
it('composes complete rational descent from recursive coefficient fields without field-constant assumptions', () => {
  const {ctx, f, p} = setup(), t = DifferentialField.formal(ctx, f, 't', [p([1])], bounds), u = t.make(ctx, [p([1], [0, 1]), p([1])], [p([1, 1]), p([1])]);
  const input = {rows: 1, columns: 2, matrix: [[u, t.negate(ctx, u)]], rhs: [t.fromInteger(ctx, 0n)]};
  ctx.operation(() => {
    const token = ctx.operationToken, descent = descendCoefficientSystemWithin(ctx, t, input, bounds);
    const proof = compact.solveCompactRationalLinearSystemWithin(ctx, descent.system); expect(ctx.operationToken).toBe(token); expect(proof.kind).toBe('consistent'); expect(proof.nullspace).toHaveLength(1);
    verifyCoefficientSystemWithin(ctx, t, input, descent, bounds); compact.verifyCompactRationalLinearSystemWithin(ctx, descent.system, proof);
  });
  const contradiction = {rows: 1, columns: 1, matrix: [[p([0, 1])]], rhs: [p([1])]};
  ctx.operation(() => {const descent = descendCoefficientSystemWithin(ctx, f, contradiction, bounds); expect(compact.solveCompactRationalLinearSystemWithin(ctx, descent.system).kind).toBe('inconsistent');});
});
