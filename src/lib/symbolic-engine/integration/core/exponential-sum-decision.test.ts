import { afterEach, describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { DifferentialField } from './differential-field';
import { differentiate } from './differential-derivative';
import * as derivatives from './differential-derivative';
import * as rde from './rational-rde';
import * as rational from './rational-decision';
import * as admission from './differential-admission';
import { FormalPrimitiveDomain } from './formal-primitive';
import { toRationalPrimitiveInput, fromRationalPrimitiveInput } from './exponential-sum-bridge';
import { integrateExponentialSum, verifyExponentialSumDecision, type ExponentialSumInput, type ExponentialSumDecision } from './exponential-sum-decision';

afterEach(() => vi.restoreAllMocks());
function decide(s: ReturnType<typeof setup>, input: ExponentialSumInput): ExponentialSumDecision {
  const out = integrateExponentialSum(s.ctx, s.f, input, bounds);
  if (out.kind === 'unsupported') throw new Error(out.reason); return out;
}
describe('finite one-family exponential decisions', () => {
  it.each([[], [1], [0, 2]].map(ns => ({ ns })))('integrates pure rational $ns without an exponential construction', ({ ns }) => {
    const s = setup(), input = { rationalPart: s.p(ns), terms: [] }, spy = vi.spyOn(admission, 'buildExponential');
    const out = decide(s, input); expect(out.kind).toBe('elementary'); expect(out.field).toBeNull(); expect(out.solved).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled(); verifyExponentialSumDecision(s.ctx, s.f, input, out, bounds);
  });
  it('moves exp(0) to the rational part and keeps all source slots', () => {
    const s = setup(), input = { rationalPart: s.p([1]), terms: [{ coefficient: s.p([0, 2]), argument: s.p([]) }] };
    const out = decide(s, input); expect(out.field).toBeNull(); expect(s.f.equal(s.ctx, out.normalization.rationalPart, s.p([1, 2]))).toBe(true);
    expect(out.conditions.slice(0, 4).map(c => c.kind)).toEqual(['input-rational', 'input-coefficient', 'input-argument', 'normalized-rational']);
  });
  it('combines root-log rational integration and both signs of exponential powers', () => {
    const s = setup(), input = { rationalPart: s.p([1], [1, 0, 1]), terms: [
      { coefficient: s.p([2]), argument: s.p([0, 2]) }, { coefficient: s.p([1]), argument: s.p([0, -1]) },
      { coefficient: s.p([1], [2]), argument: s.p([0, 1], [2]) }] };
    const out = decide(s, input); expect(out.kind).toBe('elementary'); if (out.kind !== 'elementary') throw new Error('fixture');
    expect(out.components.map(c => c.exponent)).toEqual([-2n, 1n, 4n]);
    expect(out.solved.map(c => s.f.equal(s.ctx, c.rde.solution!.particular, s.p([c.component === 0 ? -1 : 1])))).toEqual([true, true, true]);
    expect(out.primitive.rational.primitive.terms).toHaveLength(1);
    expect(out.conditions.some(c => c.kind === 'primitive-log-norm')).toBe(true);
    verifyExponentialSumDecision(new ExecutionContext(s.ctx.limits), s.f, input, out, bounds);
  });
  it('preserves shifted arguments and deterministic normalization under input permutations', () => {
    const s = setup(), terms = [{ coefficient: s.p([1]), argument: s.p([1, 1]) }, { coefficient: s.p([2]), argument: s.p([2, 2]) }];
    const a = decide(s, { rationalPart: s.p([]), terms }), b = decide(s, { rationalPart: s.p([]), terms: [...terms].reverse() });
    expect(a.kind).toBe('elementary'); expect(b.kind).toBe('elementary');
    expect(s.f.equal(s.ctx, a.field!.admission!.argument, s.p([1, 1]))).toBe(true);
    expect(s.f.equal(s.ctx, a.field!.admission!.argument, b.field!.admission!.argument)).toBe(true);
    expect(a.components.map(c => c.exponent)).toEqual(b.components.map(c => c.exponent));
    expect(integrateExponentialSum(s.ctx, s.f, { rationalPart: s.p([]), terms: [terms[0], { coefficient: s.p([1]), argument: s.x }] }, bounds))
      .toEqual({ kind: 'unsupported', reason: 'not-rational-multiples' });
  });
  it.each([[0, 0, 1], [1], [1, 0, 0, 1]].map(ns => ({ ns })))('cancels identical unsupported or non-elementary arguments $ns before admission', ({ ns }) => {
    const s = setup(), r = s.p(ns), input = { rationalPart: s.p([]), terms: [
      { coefficient: s.p([1], [-1, 1]), argument: r }, { coefficient: s.p([-1], [-1, 1]), argument: r },
      { coefficient: s.p([1]), argument: s.x }] };
    const out = decide(s, input); expect(out.kind).toBe('elementary'); expect(out.components).toHaveLength(1);
    expect(out.normalization.groups[0].indices).toEqual([0, 1]); expect(s.f.isZero(s.ctx, out.normalization.groups[0].coefficient)).toBe(true);
    expect(s.f.equal(s.ctx, out.conditions[1].value, s.p([-1, 1]))).toBe(true);
  });
  it('turns individually obstructed terms into an integrable coefficient after grouping', () => {
    const s = setup(), r = s.p([0, 0, 1]), input = { rationalPart: s.p([]), terms: [
      { coefficient: s.p([1]), argument: r }, { coefficient: s.p([-1, 2]), argument: r }] };
    const out = decide(s, input); expect(out.kind).toBe('elementary'); expect(out.solved).toHaveLength(1);
    expect(s.f.equal(s.ctx, out.solved[0].rde.solution!.particular, s.p([1]))).toBe(true);
  });
  it('retains canceled argument poles and validates zero-coefficient owners', () => {
    const s = setup(), r = s.p([1], [0, 1]), input = { rationalPart: s.p([]), terms: [{ coefficient: s.p([]), argument: r }] };
    const out = decide(s, input); expect(out.field).toBeNull(); expect(s.f.equal(s.ctx, out.conditions[2].value, s.x)).toBe(true);
    const foreign = setup(); expect(() => decide(s, { ...input, terms: [{ coefficient: s.p([]), argument: foreign.x }] })).toThrow('domain-mismatch');
  });
  it('stops at the first obstruction before rational integration or later RDEs', () => {
    const s = setup(), input = { rationalPart: s.p([1], [-1, -1, 0, 0, 0, 1]), terms: [
      { coefficient: s.p([1]), argument: s.x }, { coefficient: s.p([1], [0, 1]), argument: s.p([0, 2]) },
      { coefficient: s.p([3]), argument: s.p([0, 3]) }] };
    const solve = vi.spyOn(rde, 'solveRationalRde'), integrate = vi.spyOn(rational, 'integrateRational');
    const out = decide(s, input); expect(out.kind).toBe('non-elementary'); expect(out.solved).toHaveLength(2);
    expect(out.solved.map(v => v.rde.kind)).toEqual(['solutions', 'no-rational-solution']);
    expect(solve).toHaveBeenCalledTimes(2); expect(integrate).not.toHaveBeenCalled(); expect(out.primitive).toBeNull();
    verifyExponentialSumDecision(s.ctx, s.f, input, out, bounds);
  });
  it('does not cancel obstructions between positive and negative powers', () => {
    const s = setup(), out = decide(s, { rationalPart: s.p([]), terms: [
      { coefficient: s.p([1]), argument: s.p([0, 0, 1]) }, { coefficient: s.p([-1]), argument: s.p([0, 0, -1]) }] });
    expect(out.kind).toBe('non-elementary'); expect(out.components.map(c => c.exponent)).toEqual([-1n, 1n]);
  });
  it('refuses surviving constant exponentials and independent families', () => {
    const s = setup();
    expect(integrateExponentialSum(s.ctx, s.f, { rationalPart: s.p([]), terms: [{ coefficient: s.p([1]), argument: s.p([2]) }] }, bounds))
      .toEqual({ kind: 'unsupported', reason: 'constant-exponent' });
    expect(integrateExponentialSum(s.ctx, s.f, { rationalPart: s.p([]), terms: [
      { coefficient: s.p([1]), argument: s.x }, { coefficient: s.p([1]), argument: s.p([0, 0, 1]) }] }, bounds).kind).toBe('unsupported');
  });
  it('checks seeded rational primitive coefficients and preserves caller operands', () => {
    const s = setup(); let seed = 1949;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 4 + 1; };
    for (let sample = 0; sample < 3; sample++) {
      const argument = sample === 1 ? s.p([1], [1, 1]) : s.p([next(), next()]);
      const dr = differentiate(s.ctx, s.f, argument).derivative, expected = [s.p([next(), 1], [next(), 1]), s.p([next()])];
      const terms = [-1n, 2n].map((k, i) => ({ argument: s.f.multiply(s.ctx, argument, s.p([k])), coefficient: s.f.add(s.ctx,
        differentiate(s.ctx, s.f, expected[i]).derivative, s.f.multiply(s.ctx, s.f.multiply(s.ctx, s.p([k]), dr), expected[i])) }));
      const input = { rationalPart: s.p([9007199254740993n]), terms }, original = [...terms];
      const out = decide(s, input); expect(out.kind).toBe('elementary');
      out.solved.forEach((c, i) => expect(s.f.equal(s.ctx, c.rde.solution!.particular, expected[i])).toBe(true));
      expect(input.terms).toEqual(original); expect(Object.isFrozen(input)).toBe(false); expect(Object.isFrozen(out.input.terms)).toBe(true);
    }
  });
  it('checks both bridge directions and rejects incompatible owners', () => {
    const s = setup(), domain = new FormalPrimitiveDomain('x', 'z'), value = s.p([9007199254740993n, -2], [2, 2]);
    const native = toRationalPrimitiveInput(s.ctx, s.f, domain, value);
    expect(s.f.equal(s.ctx, value, fromRationalPrimitiveInput(s.ctx, s.f, domain, native))).toBe(true);
    expect(() => toRationalPrimitiveInput(s.ctx, s.f, domain, setup().x)).toThrow('domain-mismatch');
    expect(() => fromRationalPrimitiveInput(s.ctx, s.f, new FormalPrimitiveDomain('x', 'z'), native)).toThrow('domain-mismatch');
    expect(() => toRationalPrimitiveInput(s.ctx, s.f, new FormalPrimitiveDomain('y', 'z'), value)).toThrow('domain-mismatch');
  });
  it('rejects formal towers and forged owners', () => {
    const s = setup(), formal = DifferentialField.formal(s.ctx, s.f, 't', [s.x], bounds);
    expect(() => integrateExponentialSum(s.ctx, formal, { rationalPart: formal.generator(s.ctx), terms: [] }, bounds)).toThrow('domain-mismatch');
    expect(() => integrateExponentialSum(s.ctx, Object.create(DifferentialField.prototype), { rationalPart: s.x, terms: [] }, bounds)).toThrow('domain-mismatch');
  });
  it('checks mutable certificates afresh after successful verification', () => {
    const s = setup(), input = { rationalPart: s.p([]), terms: [{ coefficient: s.p([1]), argument: s.x }] }, out = decide(s, input);
    const indices = [0], mutable = { ...out, normalization: { ...out.normalization, groups: [{ ...out.normalization.groups[0], indices }] } };
    Object.freeze(mutable); verifyExponentialSumDecision(s.ctx, s.f, input, mutable, bounds); indices.push(0);
    expect(() => verifyExponentialSumDecision(s.ctx, s.f, input, mutable, bounds)).toThrow('verification-failed');
  });
  it('exhausts before oversized powers and under stricter verification profiles', () => {
    const s = setup(), input = { rationalPart: s.p([]), terms: [
      { coefficient: s.p([1]), argument: s.x }, { coefficient: s.p([1]), argument: s.p([0, 257]) }] };
    expect(() => decide(s, input)).toThrow('resource-limit');
    const t = setup(), small = { rationalPart: t.p([9007199254740993n]), terms: [] }, out = decide(t, small);
    expect(() => verifyExponentialSumDecision(new ExecutionContext({ ...t.ctx.limits, integerBits: 16 }), t.f, small, out, bounds)).toThrow('resource-limit');
  });
  it.each(['normalization', 'RDE', 'final'] as const)('exhaustion during %s never becomes a negative answer', stage => {
    const s = setup(), input = { rationalPart: s.p([]), terms: [{ coefficient: s.p([1]), argument: s.x }] };
    if (stage === 'normalization') {
      expect(() => integrateExponentialSum(new ExecutionContext({ ...s.ctx.limits, work: 20 }), s.f, input, bounds)).toThrow('resource-limit'); return;
    }
    if (stage === 'RDE') vi.spyOn(rde, 'solveRationalRde').mockImplementation(ctx => ctx.exhaust('test-RDE'));
    else {
      const original = derivatives.verifyDerivative;
      vi.spyOn(derivatives, 'verifyDerivative').mockImplementation((ctx, owner, value, evidence) => {
        if (owner.kind === 'formal') ctx.exhaust('test-final'); original(ctx, owner, value, evidence);
      });
    }
    expect(() => decide(s, input)).toThrow('resource-limit');
  });
});
