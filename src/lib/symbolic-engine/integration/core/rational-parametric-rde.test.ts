import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { solveRationalParametricRde as solve, verifyRationalParametricRde as verify } from './rational-parametric-rde';
import { solveRationalRde } from './rational-rde';
import { differentiate } from './differential-derivative';
import { rational } from './rational';
import { ExecutionContext } from './execution';

describe('paired rational parametric RDE families', () => {
  it('retains dependent coefficient directions with function zero and pure homogeneous freedom', () => {
    const {ctx, f, p} = setup(), a = p([]), b = p([1], [0, 1]), bs = [b, p([2], [0, 1]), p([])];
    const d = solve(ctx, f, a, b, bs); verify(ctx, f, a, b, bs, d);
    expect(d.kind).toBe('solutions'); expect(d.family!.directions).toHaveLength(3);
    expect(d.family!.directions.filter(p => f.isZero(ctx, p.value))).toHaveLength(2);
    expect(d.family!.directions.filter(p => p.coefficients.every(c => c.numerator === 0n))).toHaveLength(1);
    expect(f.isZero(ctx, d.family!.particular.value)).toBe(true);
    expect(d.family!.particular.coefficients[0]).toEqual(rational(ctx, -1n));
  });
  it.each([
    [[0], [5], undefined], [[1], [0], undefined], [[0, 2], [1], undefined],
    [[1], [0], [0, 1]], [[0], [-2], [0, 0, 0, 1]],
  ])('agrees with the retained nonparametric solver (%j,%j)', (aa, bb, denominator) => {
    const {ctx, f, p} = setup(), a = p(aa), b = p(bb, denominator);
    const old = solveRationalRde(ctx, f, a, b), d = solve(ctx, f, a, b, []);
    expect(d.kind === 'solutions').toBe(old.kind === 'solutions');
    if (d.family && old.solution) {
      expect(f.equal(ctx, d.family.particular.value, old.solution.particular)).toBe(true);
      expect(d.family.directions).toHaveLength(old.solution.homogeneous.length);
    }
  });
  it('uses every forcing denominator and includes a cancelling constant parameter', () => {
    const {ctx, f, p} = setup(), a = p([1], [0, 1]), b = p([1], [0, 0, 1]), bs = [b];
    const d = solve(ctx, f, a, b, bs); expect(d.kind).toBe('solutions');
    expect(d.family!.particular.coefficients).toEqual([rational(ctx, -1n)]);
    expect(d.family!.directions).toHaveLength(1);
    expect(f.equal(ctx, d.family!.directions[0].value, p([1], [0, 1]))).toBe(true);
  });
  it('retains nonzero function directions and complete ordered forcing coverage', () => {
    const {ctx, f, p} = setup(), a = p([1]), b = p([2]), bs = [p([1]), p([0, 1])];
    const d = solve(ctx, f, a, b, bs); expect(d.family!.directions).toHaveLength(2);
    expect(f.equal(ctx, d.family!.directions[0].value, p([1]))).toBe(true);
    expect(f.equal(ctx, d.family!.directions[1].value, p([-1, 1]))).toBe(true);
    expect(d.conditions.inputs).toHaveLength(4); expect(d.conditions.representatives).toHaveLength(3);
  });
  it('checks independent derivative-constructed affine forcing', () => {
    const {ctx, f, p} = setup(), a = p([1, 1]), y = p([2, 1], [1, 0, 1]);
    const b = f.add(ctx, differentiate(ctx, f, y).derivative, f.multiply(ctx, a, y));
    const d = solve(ctx, f, a, b, [b, p([])]); verify(ctx, f, a, b, [b, p([])], d);
    expect(d.family!.directions).toHaveLength(2);
  });
  it('rejects mutated completeness, mappings, degree and retained conditions', () => {
    const {ctx, f, p} = setup(), a = p([]), b = p([1]), bs = [b], d = solve(ctx, f, a, b, bs);
    const bad = [
      {...d, polynomial: {...d.polynomial, degree: {...d.polynomial.degree, bound: d.polynomial.degree.bound + 1n}}},
      {...d, clearing: {...d.clearing, C: []}},
      {...d, family: {...d.family!, directions: []}},
      {...d, conditions: {...d.conditions, inputs: []}},
      {...d, family: {...d.family!, particular: {...d.family!.particular, value: p([])}}},
    ];
    for (const e of bad) expect(() => verify(ctx, f, a, b, bs, e)).toThrow('verification-failed');
    expect(() => verify(ctx, f, a, p([2]), bs, d)).toThrow('verification-failed');
  });
  it('rejects foreign owners, stays immutable and respects stricter replay contexts', () => {
    const {ctx, f, p} = setup(), a = p([]), b = p([1]);
    expect(() => solve(ctx, f, a, setup().p([1]), [])).toThrow('domain-mismatch');
    const d = solve(ctx, f, a, b, []);
    expect(Object.isFrozen(d.family!.directions)).toBe(true);
    expect(() => verify(new ExecutionContext({...ctx.limits, work: 0}), f, a, b, [], d)).toThrow('resource-limit');
    expect(bounds.towerHeight).toBe(8);
  });
});
