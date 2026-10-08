import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { solveRationalLogarithmicMembership as solve, verifyRationalLogarithmicMembership as verify } from './rational-logarithmic-membership';
import { rational } from './rational';

describe('actual versus radical rational logarithmic membership', () => {
  it('checks least positive radical index rather than the arbitrary basis scaling', () => {
    const {ctx, f, p} = setup(), input = p([0, 1], [1, 0, 1]), e = solve(ctx, f, input, bounds);
    expect(e.radical).toBe(true); expect(e.actual).toBe(false);
    expect(e.witness!.index).toBe(2n); expect(e.witness!.powers).toEqual([1n]);
    verify(ctx, f, input, e, bounds);
  });
  it('checks integer positive/negative valuations and the constant-unit zero witness', () => {
    const {ctx, f, p} = setup();
    for (const input of [p([-7], [0, 1]), p([0, 2], [1, 0, 1]), p([])]) expect(solve(ctx, f, input, bounds).actual).toBe(true);
    expect(solve(ctx, f, p([]), bounds).witness!.index).toBe(1n);
  });
  it('keeps huge radical indices as exact integers and factored witnesses', () => {
    const {ctx, f, c} = setup(), n = 9007199254740993n, input = f.make(ctx, [c(1n, n)], [c(0), c(1)]);
    const e = solve(ctx, f, input, bounds); expect(e.witness!.index).toBe(n); expect(e.witness!.powers).toEqual([1n]);
  });
  it('requires actual membership to have integral valuations and rejects changed evidence', () => {
    const {ctx, f, p} = setup(), input = p([1], [0, 2]), e = solve(ctx, f, input, bounds);
    expect(() => verify(ctx, f, input, {...e, actual: true}, bounds)).toThrow('verification-failed');
    expect(() => verify(ctx, f, input, {...e, witness: {...e.witness!, index: 1n}}, bounds)).toThrow('verification-failed');
    expect(() => verify(ctx, f, input, {...e, witness: {...e.witness!, valuations: [rational(ctx, 1n)]}}, bounds)).toThrow('verification-failed');
    expect(solve(ctx, f, p([1]), bounds).radical).toBe(false);
  });
});
