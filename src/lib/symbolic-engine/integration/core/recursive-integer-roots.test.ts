import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { PolynomialRing } from './polynomial';
import { integerRootsRecursive as roots, verifyRecursiveIntegerRoots as verify } from './recursive-integer-roots';
import { DifferentialField } from './differential-field';
import { ExecutionContext } from './execution';

describe('complete integer resonances over recursive coefficients', () => {
  it('retains every positive, negative and zero integer root', () => {
    const {ctx, f, p} = setup(), ring = new PolynomialRing(f, 'n');
    const polynomial = ring.make(ctx, [p([]), p([-6]), p([1]), p([1])]);
    const e = roots(ctx, ring, polynomial, bounds); verify(ctx, ring, polynomial, e, bounds);
    expect(e.kind === 'finite' && e.roots).toEqual([-3n, 0n, 2n]);
  });
  it('compares all nonconstant coefficients rather than searching a specialization', () => {
    const {ctx, f, p} = setup(), ring = new PolynomialRing(f, 'n');
    const polynomial = ring.make(ctx, [p([-2, -2]), p([1, 3]), p([0, -1])]);
    const e = roots(ctx, ring, polynomial, bounds); expect(e.kind === 'finite' && e.roots).toEqual([2n]);
    expect(e.comparison.system.rows).toBe(2);
  });
  it('distinguishes the zero polynomial, constants and a nonzero polynomial with no integer zeros', () => {
    const {ctx, f, p} = setup(), ring = new PolynomialRing(f, 'n');
    expect(roots(ctx, ring, ring.zero(ctx), bounds).kind).toBe('all-integers');
    const constant = roots(ctx, ring, ring.constant(ctx, p([2])), bounds);
    expect(constant.kind === 'finite' && constant.roots).toEqual([]);
    const no = roots(ctx, ring, ring.make(ctx, [p([0, 1]), p([1])]), bounds);
    expect(no.kind === 'finite' && no.roots).toEqual([]);
  });
  it('clears nested rational coefficients and handles multiplicity without duplicated roots', () => {
    const {ctx, f, p} = setup(), t = DifferentialField.formal(ctx, f, 't', [p([1])], bounds);
    const ring = new PolynomialRing(t, 'n'), u = t.make(ctx, [p([1], [0, 1]), p([1])], [p([1]), p([1])]);
    const polynomial = ring.make(ctx, [t.multiply(ctx, t.fromInteger(ctx, 4n), u), t.multiply(ctx, t.fromInteger(ctx, -4n), u), u]);
    const e = roots(ctx, ring, polynomial, bounds); expect(e.kind === 'finite' && e.roots).toEqual([2n]);
  });
  it('rejects omitted coefficient GCDs, signed roots and zero-polynomial relabeling', () => {
    const {ctx, f, p} = setup(), ring = new PolynomialRing(f, 'n'), polynomial = ring.make(ctx, [p([-4]), p([]), p([1])]);
    const e = roots(ctx, ring, polynomial, bounds);
    expect(() => verify(ctx, ring, polynomial, {...e, gcds: []}, bounds)).toThrow('verification-failed');
    if (e.kind === 'finite') expect(() => verify(ctx, ring, polynomial, {...e, roots: [2n]}, bounds)).toThrow('verification-failed');
    expect(() => verify(ctx, ring, polynomial, {...e, kind: 'all-integers'}, bounds)).toThrow('verification-failed');
    expect(() => verify(new ExecutionContext({...ctx.limits, work: 0}), ring, polynomial, e, bounds)).toThrow('resource-limit');
  });
});
