import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { solveRationalParametricRde, verifyRationalParametricRde } from './rational-parametric-rde';
import { encodeRationalParametricRde, decodeRationalParametricRde } from './rational-parametric-rde-wire';
import { solveRationalLogarithmicDerivativeRelations, verifyRationalLogarithmicDerivativeRelations } from './rational-logarithmic-relations';
import { decodeRationalLogarithmicRelations, encodeRationalLogarithmicRelations } from './rational-logarithmic-relations-wire';
import { rational, type Rational } from './rational';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { integerRootsRecursive, verifyRecursiveIntegerRoots } from './recursive-integer-roots';
import { descendCoefficientSystem, verifyCoefficientSystem } from './recursive-coefficient-system';

const limits = {work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256};
describe('fresh, bounded recursive subsidiary infrastructure', () => {
  it.each([{work: 0}, {allocation: 0}, {degree: 0}, {integerBits: 2}])('enforces all arithmetic categories %j in producers, verification and decoding', restriction => {
    const s = setup(), a = s.p([1]), b = s.p([17, 1]), fs = [s.p([1], [1, 1])];
    const e = solveRationalParametricRde(s.ctx, s.f, a, b, fs), wire = encodeRationalParametricRde(s.ctx, s.f, a, b, fs, e, bounds);
    const context = () => new ExecutionContext({...limits, ...restriction});
    expect(() => solveRationalParametricRde(context(), s.f, a, b, fs)).toThrow('resource-limit');
    expect(() => verifyRationalParametricRde(context(), s.f, a, b, fs, e)).toThrow('resource-limit');
    expect(() => decodeRationalParametricRde(context(), s.f, a, b, fs, wire, bounds)).toThrow('resource-limit');
  });
  it('preserves sticky exhaustion and fresh external proof scopes on a reused context', () => {
    const s = setup(), a = s.p([]), b = s.p([1]);
    const e = solveRationalParametricRde(s.ctx, s.f, a, b, []), before = s.ctx.usage;
    verifyRationalParametricRde(s.ctx, s.f, a, b, [], e); const between = s.ctx.usage;
    verifyRationalParametricRde(s.ctx, s.f, a, b, [], e);
    expect(s.ctx.usage.work - between.work).toBe(between.work - before.work);
    expect(s.ctx.operationToken).toBeUndefined();
    const exhausted = new ExecutionContext({...limits, work: 0});
    expect(() => solveRationalParametricRde(exhausted, s.f, a, b, [])).toThrow('resource-limit');
    expect(() => exhausted.tick()).toThrow('resource-limit');
  });
  it('supports registered native rational-function owners and rejects mutable custom domains', () => {
    const s = setup();
    expect(s.x.kind).toBe('fraction');
    if (s.x.kind === 'fraction') {
      const native = {rows: 1, columns: 1, matrix: [[s.x.value]], rhs: [s.x.value]};
      const e = descendCoefficientSystem(s.ctx, s.f.fractions!, native, bounds); verifyCoefficientSystem(s.ctx, s.f.fractions!, native, e, bounds);
    }
    const mutable = {...Q, fromInteger: (ctx: ExecutionContext, n: bigint): Rational => ({...rational(ctx, n)}),
      assert: () => undefined};
    expect(() => descendCoefficientSystem(s.ctx, mutable, {rows: 0, columns: 0, matrix: [], rhs: []}, bounds)).toThrow('unsupported');
  });
  it('keeps exact large signed resonances without a machine-number search loop', () => {
    const s = setup(), ring = new PolynomialRing(s.f, 'n'), large = 9007199254740993n;
    const input = ring.make(s.ctx, [s.p([-large]), s.p([1])]), e = integerRootsRecursive(s.ctx, ring, input, bounds);
    expect(e.kind === 'finite' && e.roots).toEqual([large]);
    verifyRecursiveIntegerRoots(s.ctx, ring, input, e, bounds);
  });
  it('bounds the complete relation artifact before nested processing and rejects forged flags', () => {
    const s = setup(), inputs = [s.p([1], [0, 1])], e = solveRationalLogarithmicDerivativeRelations(s.ctx, s.f, inputs, bounds);
    const wire = encodeRationalLogarithmicRelations(s.ctx, s.f, inputs, e, bounds);
    expect(() => decodeRationalLogarithmicRelations(new ExecutionContext(limits), s.f, inputs, wire, {...bounds, artifactDepth: 1})).toThrow('resource-limit');
    expect(() => decodeRationalLogarithmicRelations(new ExecutionContext(limits), s.f, inputs, wire, {...bounds, artifactNodes: 1})).toThrow('resource-limit');
    expect(() => verifyRationalLogarithmicDerivativeRelations(s.ctx, s.f, inputs, {...e, basis: []}, bounds)).toThrow('verification-failed');
    const bad = structuredClone(wire) as {decision: Record<string, unknown>}; bad.decision.verified = true;
    expect(() => decodeRationalLogarithmicRelations(s.ctx, s.f, inputs, bad, bounds)).toThrow('invalid-input');
  });
});
