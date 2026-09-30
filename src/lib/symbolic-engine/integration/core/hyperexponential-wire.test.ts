import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { DifferentialField as DF } from './differential-field';
import { encodeHyperexponentialDecision, decodeHyperexponentialDecision } from './hyperexponential-wire';
import * as hyper from './hyperexponential-decision';
import * as admissions from './differential-admission';
import * as derivatives from './differential-derivative';
import * as rde from './rational-rde';
import * as roots from './rde-integer-roots';
import * as denominator from './rde-denominator';
import * as polynomial from './rde-polynomial';
import * as linear from './linear-system';

type Data = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const mutable = (v: unknown): Data => JSON.parse(JSON.stringify(v)) as Data;
function fixture(negative = false, reverse = false) {
  const s = setup(), b = s.p([1]), r = negative ? s.p([0, 0, 1]) : s.p([0, reverse ? -1 : 1]);
  const result = hyper.integrateHyperexponential(s.ctx, s.f, b, r, bounds);
  if (result.kind === 'unsupported') throw new Error('fixture');
  return { ...s, b, r, result, wire: encodeHyperexponentialDecision(s.ctx, s.f, b, r, result, bounds) };
}
describe('complete hyperexponential decision replay', () => {
  it.each([[false, false], [false, true], [true, false]])('replays negative=%s reverse=%s with producers disabled', (negative, reverse) => {
    const s = fixture(negative, reverse), t = setup();
    const b = t.p([1]), r = negative ? t.p([0, 0, 1]) : t.p([0, reverse ? -1 : 1]);
    const forbidden = () => { throw new Error('producer invoked during replay'); };
    vi.spyOn(hyper, 'integrateHyperexponential').mockImplementation(forbidden);
    vi.spyOn(admissions, 'buildExponential').mockImplementation(forbidden);
    vi.spyOn(admissions, 'buildLogarithm').mockImplementation(forbidden);
    vi.spyOn(derivatives, 'differentiate').mockImplementation(forbidden);
    vi.spyOn(rde, 'solveRationalRde').mockImplementation(forbidden);
    vi.spyOn(roots, 'positiveIntegerRoots').mockImplementation(forbidden);
    vi.spyOn(denominator, 'boundDenominator').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'degreeBound').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'rdeMatrix').mockImplementation(forbidden);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
    try {
      const replay = decodeHyperexponentialDecision(t.ctx, t.f, b, r, s.wire, bounds);
      expect(replay.kind).toBe(s.result.kind); expect(replay.owner).toBe(t.f);
      expect(replay.field).not.toBe(s.result.field); expect(replay.field.parent).toBe(t.f);
      expect(replay.alias.owner).toBe(replay.field); expect(replay.b.owner).toBe(t.f);
      expect(Object.isFrozen(replay)).toBe(true); expect(Object.isFrozen(replay.conditions)).toBe(true);
      expect(encodeHyperexponentialDecision(t.ctx, t.f, b, r, replay, bounds)).toEqual(s.wire);
      const second = decodeHyperexponentialDecision(t.ctx, t.f, b, r, s.wire, bounds);
      expect(second.field).not.toBe(replay.field);
    } finally { vi.restoreAllMocks(); }
  });
  it.each([
    ['theorem identifier', (w: Data) => { w.reduction = 'rational-rde-failed'; }],
    ['outcome', (w: Data) => { w.kind = 'non-elementary'; }],
    ['missing alias', (w: Data) => { w.field.elements.splice(2, 1); }],
    ['duplicate evidence', (w: Data) => { w.field.elements.push(w.field.elements[0]); }],
    ['alias value', (w: Data) => { w.field.elements[2] = w.field.elements[5]; w.field.elements[2].numerator[0] = w.field.elements[0]; }],
    ['missing derivative', (w: Data) => { w.field.derivatives.pop(); }],
    ['derivative tangent', (w: Data) => { w.field.derivatives[1].derivative = w.field.elements[0]; }],
    ['base derivation', (w: Data) => { w.field.construction[1].rule[0].scalar[0] = '2'; }],
    ['base variable', (w: Data) => { w.field.construction[1].variable = 'y'; }],
    ['extension variable', (w: Data) => { w.field.construction[2].variable = 'other'; }],
    ['missing admission', (w: Data) => { w.field.construction[2].admission = null; }],
    ['admission obstruction', (w: Data) => { w.field.construction[2].admission.obstruction = 'finite-pole'; }],
    ['admission exponent', (w: Data) => { w.field.construction[2].admission.exponents[0] = '2'; }],
    ['missing admission condition', (w: Data) => { w.field.construction[2].admission.conditions = []; }],
    ['forward coefficient', (w: Data) => { w.field.construction[2].rule[1].level = 2; }],
    ['wrong RDE target', (w: Data) => { w.rde.decision.b.numerator.coefficients[0].value.numerator = '2'; }],
    ['wrong RDE bound', (w: Data) => { w.rde.decision.degree.bound = '1'; }],
    ['lost RDE coverage', (w: Data) => { w.rde.decision.denominator.hasseA = []; }],
    ['changed coefficient', (w: Data) => { w.field.elements[4].numerator[0].scalar[0] = '2'; }],
    ['missing conditions', (w: Data) => { delete w.conditions.exponentDenominator; }],
    ['changed input condition', (w: Data) => { w.conditions.coefficientDenominator.coefficients[0].value.numerator = '2'; }],
    ['extra universal denominator', (w: Data) => { w.conditions.universal = w.rde.decision.denominator.denominator; }],
    ['missing primitive condition', (w: Data) => { w.conditions.primitiveCoefficientDenominator = null; }],
    ['noncanonical rational', (w: Data) => { w.field.elements[0].numerator[0].scalar = ['2', '2']; }],
    ['noncanonical integer', (w: Data) => { w.field.elements[0].numerator[0].scalar[0] = '01'; }],
    ['unknown property', (w: Data) => { w.verified = true; }],
  ] as const)('rejects %s', (_label, mutate) => {
    const s = fixture(), w = mutable(s.wire); mutate(w);
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, w, bounds)).toThrow();
  });
  it.each([false, true])('replays pole conditions and zero coefficients (zero=%s)', zero => {
    const s = setup(), r = s.p([1], [0, 1]), b = zero ? s.p([]) : s.p([-9007199254740993n], [0, 0, 1]);
    const result = hyper.integrateHyperexponential(s.ctx, s.f, b, r, bounds);
    if (result.kind !== 'elementary') throw new Error('fixture');
    const wire = encodeHyperexponentialDecision(s.ctx, s.f, b, r, result, bounds);
    const replay = decodeHyperexponentialDecision(s.ctx, s.f, b, r, wire, bounds);
    expect(replay.kind).toBe('elementary'); expect(encodeHyperexponentialDecision(s.ctx, s.f, b, r, replay, bounds)).toEqual(wire);
    expect(s.f.fractions!.ring.degree(s.ctx, replay.conditions.exponentDenominator)).toBe(1);
    if (!zero) expect(JSON.stringify(wire)).toContain('9007199254740993');
  });
  it('rejects a changed exponent with the same derivative, even when all original argument slots are changed', () => {
    const s = fixture(), shifted = s.p([1, 1]);
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, shifted, s.wire, bounds)).toThrow('verification-failed');
    const w = mutable(s.wire), xPlusOne = mutable(w.field.elements[1]);
    xPlusOne.numerator[0] = { level: 0, scalar: ['1', '1'] };
    w.field.elements[1] = xPlusOne; w.field.derivatives[0].input = xPlusOne;
    // The RDE and derivatives still match. Admission must bind the exponent itself.
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, shifted, w, bounds)).toThrow('verification-failed');
  });
  it('rejects negative decisions with corrupted witnesses, fabricated positive outcomes or extra conditions', () => {
    const s = fixture(true), w = mutable(s.wire);
    w.rde.decision.linear.witness[0].value.numerator = '0';
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, w, bounds)).toThrow('verification-failed');
    const cs = mutable(s.wire); cs.conditions.primitiveCoefficientDenominator = cs.conditions.exponentDenominator;
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, cs, bounds)).toThrow('verification-failed');
    const outcome = mutable(s.wire); outcome.kind = 'elementary';
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, outcome, bounds)).toThrow('verification-failed');
  });
  it('preserves mutable caller data and never trusts a prior successful replay', () => {
    const s = fixture(), w = mutable(s.wire), before = JSON.stringify(w);
    decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, w, bounds);
    expect(JSON.stringify(w)).toBe(before); expect(Object.isFrozen(w)).toBe(false);
    Object.freeze(w); w.conditions.primitiveCoefficientDenominator = null;
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, w, bounds)).toThrow('verification-failed');
  });
  it('rejects foreign expected inputs, different base variables and unsupported artifact kinds', () => {
    const s = fixture(), foreign = setup();
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, foreign.x, s.r, s.wire, bounds)).toThrow('domain-mismatch');
    const y = DF.rationalFunctions(s.ctx, s.q, 'y', bounds);
    expect(() => decodeHyperexponentialDecision(s.ctx, y, y.fromInteger(s.ctx, 1n), y.generator(s.ctx), s.wire, bounds)).toThrow('domain-mismatch');
    const unsupported = mutable(s.wire); unsupported.kind = 'unsupported';
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, unsupported, bounds)).toThrow('invalid-input');
  });
  it('rejects cycles, accessors, sparse evidence and noncanonical fractions', () => {
    const s = fixture(), cycle = mutable(s.wire); cycle.field.elements.push(cycle);
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, cycle, bounds)).toThrow('cyclic artifact');
    const getter = vi.fn(), accessor = mutable(s.wire); Object.defineProperty(accessor, 'rde', { enumerable: true, get: getter });
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, accessor, bounds)).toThrow('accessor'); expect(getter).not.toHaveBeenCalled();
    const sparse = mutable(s.wire); delete sparse.field.elements[0];
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, sparse, bounds)).toThrow('artifact array');
    const fraction = mutable(s.wire); fraction.field.elements[0].denominator[0].scalar[0] = '2';
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, fraction, bounds)).toThrow('noncanonical fraction');
  });
  it.each(['artifactDepth', 'artifactNodes', 'artifactBytes', 'towerHeight'] as const)('bounds %s with sticky exhaustion', key => {
    const s = fixture(), ctx = new ExecutionContext(s.ctx.limits);
    expect(() => decodeHyperexponentialDecision(ctx, s.f, s.b, s.r, s.wire, { ...bounds, [key]: 1 })).toThrow('resource-limit');
    expect(() => ctx.tick()).toThrow('resource-limit');
  });
  it('bounds the complete envelope even when each component fits separately', () => {
    const s = fixture(), w = mutable(s.wire), max = Math.max(JSON.stringify(w.field).length, JSON.stringify(w.rde).length);
    expect(JSON.stringify(w).length).toBeGreaterThan(max);
    expect(() => decodeHyperexponentialDecision(s.ctx, s.f, s.b, s.r, w, { ...bounds, artifactBytes: max })).toThrow('resource-limit');
  });
  it('exhausts arithmetic and late encoding/replay verification without a partial success', () => {
    const s = fixture(true);
    for (const limits of [{ work: 0 }, { allocation: 0 }, { integerBits: 1 }, { degree: 0 }]) {
      expect(() => decodeHyperexponentialDecision(new ExecutionContext({ ...s.ctx.limits, ...limits }), s.f, s.b, s.r, s.wire, bounds)).toThrow('resource-limit');
    }
    const checked = new ExecutionContext(s.ctx.limits);
    decodeHyperexponentialDecision(checked, s.f, s.b, s.r, s.wire, bounds);
    expect(() => decodeHyperexponentialDecision(new ExecutionContext({ ...s.ctx.limits, work: checked.usage.work - 1 }), s.f, s.b, s.r, s.wire, bounds)).toThrow('resource-limit');
    const encoded = new ExecutionContext(s.ctx.limits);
    encodeHyperexponentialDecision(encoded, s.f, s.b, s.r, s.result, bounds);
    expect(() => encodeHyperexponentialDecision(new ExecutionContext({ ...s.ctx.limits, work: encoded.usage.work - 1 }), s.f, s.b, s.r, s.result, bounds)).toThrow('resource-limit');
  });
});
