import { afterEach, describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import * as sums from './exponential-sum-decision';
import * as normalization from './exponential-sum-normalization';
import * as admissions from './differential-admission';
import * as derivatives from './differential-derivative';
import * as rde from './rational-rde';
import * as roots from './rde-integer-roots';
import * as denominator from './rde-denominator';
import * as polynomial from './rde-polynomial';
import * as linear from './linear-system';
import * as rational from './rational-decision';
import * as hermite from './hermite-reduction';
import * as lrt from './lrt-reduction';
import { decodeExponentialSumDecision as decode, encodeExponentialSumDecision as encode } from './exponential-sum-wire';

type Data = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const mutable = (v: unknown): Data => JSON.parse(JSON.stringify(v)) as Data;
afterEach(() => vi.restoreAllMocks());
function fixture(kind = 'positive') {
  const s = setup(), input = { rationalPart: s.p([1], [1, 0, 1]), terms: kind === 'rational' ? [] : [
    { coefficient: kind === 'negative' ? s.p([1], [0, 1]) : s.p([1]), argument: s.x }] };
  const out = sums.integrateExponentialSum(s.ctx, s.f, input, bounds);
  if (out.kind === 'unsupported') throw new Error('fixture');
  return { ...s, input, out, wire: encode(s.ctx, s.f, input, out, bounds) };
}
describe('exponential sum complete artifact replay', () => {
  it.each(['positive', 'negative', 'rational'])('replays %s with producers disabled', kind => {
    const s = fixture(kind), t = setup(), input = { rationalPart: t.p([1], [1, 0, 1]), terms: kind === 'rational' ? [] : [
      { coefficient: kind === 'negative' ? t.p([1], [0, 1]) : t.p([1]), argument: t.x }] };
    const forbidden = () => { throw new Error('producer invoked during replay'); };
    vi.spyOn(sums, 'integrateExponentialSum').mockImplementation(forbidden);
    vi.spyOn(normalization, 'normalizeSum').mockImplementation(forbidden);
    vi.spyOn(admissions, 'buildExponential').mockImplementation(forbidden);
    vi.spyOn(derivatives, 'differentiate').mockImplementation(forbidden);
    vi.spyOn(rde, 'solveRationalRde').mockImplementation(forbidden);
    vi.spyOn(roots, 'positiveIntegerRoots').mockImplementation(forbidden);
    vi.spyOn(denominator, 'boundDenominator').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'degreeBound').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'rdeMatrix').mockImplementation(forbidden);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
    vi.spyOn(rational, 'integrateRational').mockImplementation(forbidden);
    vi.spyOn(hermite, 'hermiteReduce').mockImplementation(forbidden);
    vi.spyOn(lrt, 'lrtReduce').mockImplementation(forbidden);
    const out = decode(t.ctx, t.f, input, s.wire, bounds);
    expect(out.kind).toBe(s.out.kind); expect(out.owner).toBe(t.f);
    if (out.field) { expect(out.field.parent).toBe(t.f); expect(out.field).not.toBe(s.out.field); }
    expect(encode(t.ctx, t.f, input, out, bounds)).toEqual(s.wire);
    expect(Object.isFrozen(out)).toBe(true); expect(Object.isFrozen(out.normalization.groups)).toBe(true);
    const replay = decode(t.ctx, t.f, input, s.wire, bounds); if (out.field) expect(replay.field).not.toBe(out.field);
  });
  it.each([
    ['rule', (w: Data) => { w.reduction = 'failed-component'; }],
    ['group coverage', (w: Data) => { w.normalization.groups = []; }],
    ['duplicate slot', (w: Data) => { w.normalization.groups[0].indices.push(0); }],
    ['duplicate group', (w: Data) => { w.normalization.groups.push(w.normalization.groups[0]); }],
    ['group sum', (w: Data) => { w.normalization.groups[0].coefficient.numerator.coefficients[0].value.numerator = '2'; }],
    ['argument', (w: Data) => { w.normalization.groups[0].argument = w.normalization.groups[0].coefficient; }],
    ['component index', (w: Data) => { w.components[0].group = 999; }],
    ['component exponent', (w: Data) => { w.components[0].exponent = '-1'; }],
    ['noncanonical exponent', (w: Data) => { w.components[0].exponent = '01'; }],
    ['missing component', (w: Data) => { w.components = []; }],
    ['missing success evidence', (w: Data) => { w.solved = []; }],
    ['solved index', (w: Data) => { w.solved[0].component = 1; }],
    ['RDE target', (w: Data) => { w.solved[0].rde.decision.b.numerator.coefficients[0].value.numerator = '2'; }],
    ['RDE bounds', (w: Data) => { w.solved[0].rde.decision.degree.bound = '1'; }],
    ['RDE matrix', (w: Data) => { w.solved[0].rde.decision.system.rhs[0].value.numerator = '2'; }],
    ['RDE nullspace', (w: Data) => { w.solved[0].rde.decision.linear.nullspace.push(w.solved[0].rde.decision.linear.particular); }],
    ['alias', (w: Data) => { w.field.elements[0] = w.field.elements[1]; }],
    ['primitive', (w: Data) => { w.field.elements[2] = w.field.elements[1]; }],
    ['tangent', (w: Data) => { w.field.derivatives[0].derivative = w.field.elements[1]; }],
    ['assembled derivative', (w: Data) => { w.field.elements[3] = w.field.elements[0]; }],
    ['admission alias', (w: Data) => { w.field.construction[2].admission.exponents[0] = '-1'; }],
    ['admission obstruction', (w: Data) => { w.field.construction[2].admission.obstruction = 'finite-pole'; }],
    ['derivation', (w: Data) => { w.field.construction[2].rule = []; }],
    ['rational target', (w: Data) => { w.rational.input.numerator.coefficients[0].value.numerator = '2'; }],
    ['trace', (w: Data) => { w.rational.derivative.terms[0].trace.columns = []; }],
    ['lost conditions', (w: Data) => { w.conditions.pop(); }],
    ['condition provenance', (w: Data) => { w.conditions[0].kind = 'primitive-rational'; }],
    ['condition value', (w: Data) => { w.conditions[0].value = w.input.rationalPart; }],
    ['unknown flag', (w: Data) => { w.verified = true; }],
    ['noncanonical fraction', (w: Data) => { w.input.rationalPart.numerator.coefficients.push({ tag: 'exact-algebra', version: 1 }); }],
  ] as const)('rejects mutated %s', (_name, mutate) => {
    const s = fixture(), w = mutable(s.wire); mutate(w);
    expect(() => decode(s.ctx, s.f, s.input, w, bounds)).toThrow();
  });
  it('checks the original canceled inputs even if normalized sums and derivatives agree', () => {
    const s = setup(), input = { rationalPart: s.p([]), terms: [
      { coefficient: s.p([1]), argument: s.p([1, 1]) }, { coefficient: s.p([-1]), argument: s.p([1, 1]) }] };
    const out = sums.integrateExponentialSum(s.ctx, s.f, input, bounds); if (out.kind === 'unsupported') throw new Error('fixture');
    const wire = encode(s.ctx, s.f, input, out, bounds);
    const shifted = { ...input, terms: input.terms.map(t => ({ ...t, argument: s.x })) };
    expect(() => decode(s.ctx, s.f, shifted, wire, bounds)).toThrow('verification-failed');
  });
  it('replays negative decisions with a successful prefix and unsolved suffix', () => {
    const s = setup(), input = { rationalPart: s.p([1], [1, 0, 1]), terms: [
      { coefficient: s.p([1]), argument: s.x }, { coefficient: s.p([1], [0, 1]), argument: s.p([0, 2]) },
      { coefficient: s.p([3]), argument: s.p([0, 3]) }] };
    const out = sums.integrateExponentialSum(s.ctx, s.f, input, bounds); if (out.kind !== 'non-elementary') throw new Error('fixture');
    const wire = encode(s.ctx, s.f, input, out, bounds), replay = decode(s.ctx, s.f, input, wire, bounds);
    expect(replay.components).toHaveLength(3); expect(replay.solved).toHaveLength(2);
    const skipped = mutable(wire); skipped.solved.shift();
    expect(() => decode(s.ctx, s.f, input, skipped, bounds)).toThrow('verification-failed');
    const missing = mutable(wire); missing.components.pop();
    expect(() => decode(s.ctx, s.f, input, missing, bounds)).toThrow('verification-failed');
    const reordered = mutable(wire); reordered.components.reverse();
    expect(() => decode(s.ctx, s.f, input, reordered, bounds)).toThrow('verification-failed');
  });
  it('replays zero, fractional powers, inverse aliases and exact large coefficients', () => {
    const s = setup();
    for (const input of [
      { rationalPart: s.p([]), terms: [] },
      { rationalPart: s.p([]), terms: [
        { coefficient: s.p([9007199254740993n]), argument: s.p([0, -1]) },
        { coefficient: s.p([1]), argument: s.p([0, 1], [2]) }] },
    ]) {
      const out = sums.integrateExponentialSum(s.ctx, s.f, input, bounds); if (out.kind !== 'elementary') throw new Error('fixture');
      const wire = encode(s.ctx, s.f, input, out, bounds), replay = decode(s.ctx, s.f, input, wire, bounds);
      expect(encode(s.ctx, s.f, input, replay, bounds)).toEqual(wire);
      if (input.terms.length) expect(JSON.stringify(wire)).toContain('9007199254740993');
    }
  });
  it('rejects changed exponents with unchanged derivatives', () => {
    const s = fixture(), input = { ...s.input, terms: [{ ...s.input.terms[0], argument: s.p([1, 1]) }] };
    expect(() => decode(s.ctx, s.f, input, s.wire, bounds)).toThrow('verification-failed');
  });
  it('rejects altered negative witnesses and fabricated positive outcomes', () => {
    const s = fixture('negative'), w = mutable(s.wire);
    for (const c of w.solved[0].rde.decision.linear.witness) c.value.numerator = '0';
    expect(() => decode(s.ctx, s.f, s.input, w, bounds)).toThrow();
    const outcome = mutable(s.wire); outcome.kind = 'elementary';
    expect(() => decode(s.ctx, s.f, s.input, outcome, bounds)).toThrow();
  });
  it('does not trust previous replay or freeze caller evidence', () => {
    const s = fixture(), w = mutable(s.wire), before = JSON.stringify(w);
    decode(s.ctx, s.f, s.input, w, bounds); expect(JSON.stringify(w)).toBe(before); expect(Object.isFrozen(w)).toBe(false);
    Object.freeze(w); w.conditions.pop(); expect(() => decode(s.ctx, s.f, s.input, w, bounds)).toThrow('verification-failed');
  });
  it('bounds the combined artifact and rejects hostile nested records', () => {
    const s = fixture();
    for (const key of ['artifactNodes', 'artifactBytes', 'artifactDepth'] as const)
      expect(() => decode(new ExecutionContext(s.ctx.limits), s.f, s.input, s.wire, { ...bounds, [key]: 1 })).toThrow('resource-limit');
    const cycle = mutable(s.wire); cycle.conditions.push(cycle);
    expect(() => decode(s.ctx, s.f, s.input, cycle, bounds)).toThrow('invalid-input');
    const accessor = mutable(s.wire), spy = vi.fn(); Object.defineProperty(accessor, 'input', { get: spy, enumerable: true });
    expect(() => decode(s.ctx, s.f, s.input, accessor, bounds)).toThrow('invalid-input'); expect(spy).not.toHaveBeenCalled();
  });
  it('exhausts during decoding and final verification without returning a partial decision', () => {
    const s = fixture();
    expect(() => decode(new ExecutionContext({ ...s.ctx.limits, allocation: 20 }), s.f, s.input, s.wire, bounds)).toThrow('resource-limit');
    const original = derivatives.verifyDerivative;
    vi.spyOn(derivatives, 'verifyDerivative').mockImplementation((ctx, owner, input, evidence) => {
      if (owner.kind === 'formal') ctx.exhaust('sum-final-replay'); original(ctx, owner, input, evidence);
    });
    expect(() => decode(s.ctx, s.f, s.input, s.wire, bounds)).toThrow('resource-limit');
  });
});
