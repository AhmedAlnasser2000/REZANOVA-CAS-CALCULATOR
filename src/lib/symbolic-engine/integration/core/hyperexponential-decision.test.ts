import { describe, expect, it, vi } from 'vitest';
import { bounds, setup } from './differential-test-support';
import { DifferentialField as DF } from './differential-field';
import { ExecutionContext } from './execution';
import { buildLogarithm } from './differential-admission';
import { differentiate } from './differential-derivative';
import * as rde from './rational-rde';
import { integrateHyperexponential, verifyHyperexponentialDecision, type HyperexponentialDecision } from './hyperexponential-decision';

const positive = [
  { name: 'quadratic exponential', b: [0, 2], r: [0, 0, 1], u: [1] },
  { name: 'linear exponential', b: [1], r: [0, 1], u: [1] },
  { name: 'negative generator alias', b: [1], r: [0, -1], u: [-1] },
  { name: 'rational exponent', b: [-1], bd: [0, 0, 1], r: [1], rd: [0, 1], u: [1] },
  { name: 'coefficient denominator', b: [-1, 1], bd: [0, 0, 1], r: [0, 1], u: [1], ud: [0, 1] },
  { name: 'additive exponent constant', b: [1], r: [1, 1], u: [1] },
  { name: 'negative shifted exponent', b: [1], r: [-1, -1], u: [-1] },
  { name: 'large exact coefficient', b: [9007199254740993n], r: [0, 1], u: [9007199254740993n] },
  { name: 'nonmonic input construction', b: [2], bd: [2], r: [0, 2], rd: [2], u: [1] },
  { name: 'zero retains exponent exclusion', b: [], r: [1], rd: [0, 1], u: [] },
];
function decision(s: ReturnType<typeof setup>, b = s.p([1]), r = s.x): HyperexponentialDecision {
  const out = integrateHyperexponential(s.ctx, s.f, b, r, bounds);
  if (out.kind === 'unsupported') throw new Error('fixture unsupported'); return out;
}
describe('complete single-product hyperexponential decisions', () => {
  it.each(positive)('$name', fixture => {
    const s = setup(), { ctx, f, p } = s, b = p(fixture.b, fixture.bd), r = p(fixture.r, fixture.rd), out = decision(s, b, r);
    expect(out.kind).toBe('elementary'); if (out.kind !== 'elementary') throw new Error('positive fixture');
    expect(f.equal(ctx, out.primitive.coefficient, p(fixture.u, fixture.ud))).toBe(true);
    expect(out.rde.solution!.homogeneous).toHaveLength(0);
    expect(out.field.equal(ctx, out.primitive.derivative.derivative, out.integrand)).toBe(true);
    expect(Object.isFrozen(out)).toBe(true); expect(Object.isFrozen(out.primitive)).toBe(true);
    verifyHyperexponentialDecision(new ExecutionContext(ctx.limits), f, b, r, out);
    const ring = f.fractions!.ring;
    expect(ring.equal(ctx, out.conditions.exponentDenominator, r.kind === 'fraction' ? r.value.denominator : ring.zero(ctx))).toBe(true);
    expect(ring.degree(ctx, out.conditions.primitiveCoefficientDenominator!)).toBe(fixture.ud ? fixture.ud.length - 1 : 0);
  });
  it.each([
    { name: 'exp(x^2)', b: [1], r: [0, 0, 1] },
    { name: 'exp(x)/x', b: [1], bd: [0, 1], r: [0, 1] },
    { name: 'exp(1/x)', b: [1], r: [1], rd: [0, 1] },
    { name: 'exp(-x^2)', b: [1], r: [0, 0, -1] },
  ])('certifies non-elementarity of $name', fixture => {
    const s = setup(), b = s.p(fixture.b, fixture.bd), r = s.p(fixture.r, fixture.rd), out = decision(s, b, r);
    expect(out.kind).toBe('non-elementary'); expect(out.primitive).toBeNull();
    expect(out.rde.kind).toBe('no-rational-solution'); expect(out.rde.linear.kind).toBe('inconsistent');
    expect(out.conditions.primitiveCoefficientDenominator).toBeNull();
    verifyHyperexponentialDecision(s.ctx, s.f, b, r, out);
  });
  it('returns unsupported for every constant exponent, including zero times exp(0)', () => {
    const s = setup();
    for (const r of [s.p([]), s.p([1]), s.p([-2], [3])]) {
      for (const b of [s.p([]), s.p([1])]) expect(integrateHyperexponential(s.ctx, s.f, b, r, bounds))
        .toEqual({ kind: 'unsupported', reason: 'constant-exponent' });
    }
  });
  it('rejects foreign owners, rational scalars, and formal towers', () => {
    const s = setup(), foreign = setup(), formal = DF.formal(s.ctx, s.f, 't', [s.x], bounds);
    expect(() => integrateHyperexponential(s.ctx, s.f, foreign.x, s.x, bounds)).toThrow('domain-mismatch');
    expect(() => integrateHyperexponential(s.ctx, s.f, s.x, foreign.x, bounds)).toThrow('domain-mismatch');
    expect(() => integrateHyperexponential(s.ctx, s.q, s.c(1), s.c(1), bounds)).toThrow('domain-mismatch');
    expect(() => integrateHyperexponential(s.ctx, formal, formal.generator(s.ctx), formal.generator(s.ctx), bounds)).toThrow('domain-mismatch');
  });
  it('avoids colliding generator labels when the integration variable is h', () => {
    const s = setup(), f = DF.rationalFunctions(s.ctx, s.q, 'h', bounds), x = f.generator(s.ctx);
    const out = integrateHyperexponential(s.ctx, f, f.fromInteger(s.ctx, 1n), x, bounds);
    expect(out.kind).toBe('elementary'); if (out.kind === 'unsupported') throw new Error('fixture');
    expect(out.field.fractions!.ring.variable).toBe('h1');
  });
  it('checks seeded derivative-constructed rational coefficients and operand immutability', () => {
    const s = setup(), { ctx, f, p } = s; let seed = 2718;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 5 + 1; };
    for (let i = 0; i < 5; i++) {
      const r = i % 2 ? p([next()], [next(), 1]) : p([next(), next(), 1]);
      const u = p([next(), 1], [next(), 1]), dr = differentiate(ctx, f, r), du = differentiate(ctx, f, u);
      const b = f.add(ctx, du.derivative, f.multiply(ctx, dr.derivative, u));
      const beforeB = b.kind === 'fraction' ? b.value : null, beforeR = r.kind === 'fraction' ? r.value : null;
      const out = decision(s, b, r); expect(out.kind).toBe('elementary');
      if (out.kind !== 'elementary') throw new Error('seed');
      expect(f.equal(ctx, out.primitive.coefficient, u)).toBe(true);
      expect(b.kind === 'fraction' && b.value === beforeB).toBe(true);
      expect(r.kind === 'fraction' && r.value === beforeR).toBe(true);
    }
  });
  it('retains conditions when a zero coefficient or product cancellation removes factors', () => {
    const s = setup(), zero = decision(s, s.p([]), s.p([1], [0, 1]));
    expect(zero.kind).toBe('elementary'); expect(zero.field.isZero(s.ctx, zero.integrand)).toBe(true);
    expect(s.f.fractions!.ring.degree(s.ctx, zero.conditions.exponentDenominator)).toBe(1);
    // b = (x-1)/x^2 is the derivative coefficient of exp(x)/x.
    const out = decision(s, s.p([-1, 1], [0, 0, 1]), s.x);
    expect(s.f.fractions!.ring.degree(s.ctx, out.conditions.coefficientDenominator)).toBe(2);
    expect(s.f.fractions!.ring.degree(s.ctx, out.conditions.primitiveCoefficientDenominator!)).toBe(1);
    expect(Object.keys(out.conditions)).toHaveLength(3);
  });
  it('rejects mutated targets, aliases, rules, coefficients, derivatives and conditions', () => {
    const s = setup(), out = decision(s); if (out.kind !== 'elementary') throw new Error('fixture');
    const field = out.field, one = field.fromInteger(s.ctx, 1n);
    const bad = [
      { ...out, r: s.p([1, 1]) }, { ...out, alias: one }, { ...out, integrand: one },
      { ...out, reduction: 'unproved' },
      { ...out, exponentDerivative: { input: s.x, derivative: s.p([2]) } },
      { ...out, rde: { ...out.rde, a: s.p([2]) } },
      { ...out, primitive: { ...out.primitive, coefficient: s.p([2]) } },
      { ...out, primitive: { ...out.primitive, value: one } },
      { ...out, primitive: { ...out.primitive, derivative: { input: out.primitive.value, derivative: one } } },
      { ...out, conditions: { ...out.conditions, exponentDenominator: s.f.fractions!.ring.zero(s.ctx) } },
      { ...out, conditions: { ...out.conditions, primitiveCoefficientDenominator: null } },
      { ...out, kind: 'non-elementary', primitive: null },
    ];
    for (const candidate of bad) expect(() => verifyHyperexponentialDecision(s.ctx, s.f, out.b, out.r, candidate as HyperexponentialDecision)).toThrow('verification-failed');
    expect(() => verifyHyperexponentialDecision(s.ctx, s.f, out.b, s.p([1, 1]), out)).toThrow('verification-failed');
    expect(() => verifyHyperexponentialDecision(s.ctx, s.f, s.p([2]), out.r, out)).toThrow('verification-failed');
  });
  it('rejects absent, logarithmic and foreign admission fields', () => {
    const s = setup(), out = decision(s), plain = DF.formal(s.ctx, s.f, 'h', [s.p([]), s.p([1])], bounds);
    const log = buildLogarithm(s.ctx, s.f, 'h', s.x, bounds); if (log.status !== 'supported') throw new Error('fixture');
    for (const field of [plain, log.field, decision(setup()).field]) {
      expect(() => verifyHyperexponentialDecision(s.ctx, s.f, out.b, out.r, { ...out, field })).toThrow('verification-failed');
    }
  });
  it('rejects prototype-forged base and admission owners with typed failures', () => {
    const s = setup(), out = decision(s);
    const fakeBase = Object.assign(Object.create(DF.prototype), s.f) as DF;
    const fakeExtension = Object.assign(Object.create(DF.prototype), out.field) as DF;
    expect(() => integrateHyperexponential(s.ctx, fakeBase, out.b, out.r, bounds)).toThrow('domain-mismatch');
    expect(() => verifyHyperexponentialDecision(s.ctx, s.f, out.b, out.r, { ...out, field: fakeExtension })).toThrow('domain-mismatch');
  });
  it('shares the execution context and propagates exhaustion specifically inside the RDE stage', () => {
    const s = setup(), b = s.p([1]), r = s.p([0, 0, 1]), solve = rde.solveRationalRde;
    let startsAt = 0, entered = false;
    const measure = new ExecutionContext(s.ctx.limits);
    const spy = vi.spyOn(rde, 'solveRationalRde').mockImplementation((ctx, ...args) => {
      expect(ctx).toBe(measure); startsAt = ctx.usage.work; return solve(ctx, ...args);
    });
    try {
      integrateHyperexponential(measure, s.f, b, r, bounds);
      const low = new ExecutionContext({ ...s.ctx.limits, work: startsAt + 10 });
      spy.mockImplementation((ctx, ...args) => { expect(ctx).toBe(low); entered = true; return solve(ctx, ...args); });
      expect(() => integrateHyperexponential(low, s.f, b, r, bounds)).toThrow('resource-limit');
      expect(entered).toBe(true); expect(() => low.tick()).toThrow('resource-limit');
    } finally { spy.mockRestore(); }
  });
  it('does not turn exhaustion in admission, the RDE, or final verification into an outcome', () => {
    const s = setup(), b = s.p([1]), r = s.x;
    for (const limits of [{ work: 0 }, { allocation: 0 }, { integerBits: 1 }, { degree: 0 }]) {
      expect(() => integrateHyperexponential(new ExecutionContext({ ...s.ctx.limits, ...limits }), s.f, b, s.p([1, 2]), bounds)).toThrow('resource-limit');
    }
    expect(() => integrateHyperexponential(new ExecutionContext(s.ctx.limits), s.f, b, r, { ...bounds, towerHeight: 1 })).toThrow('resource-limit');
    const measured = new ExecutionContext(s.ctx.limits), out = integrateHyperexponential(measured, s.f, b, r, bounds);
    const low = new ExecutionContext({ ...s.ctx.limits, work: measured.usage.work - 1 });
    expect(() => integrateHyperexponential(low, s.f, b, r, bounds)).toThrow('resource-limit'); expect(() => low.tick()).toThrow('resource-limit');
    if (out.kind === 'unsupported') throw new Error('fixture');
    const checked = new ExecutionContext(s.ctx.limits); verifyHyperexponentialDecision(checked, s.f, b, r, out);
    expect(() => verifyHyperexponentialDecision(new ExecutionContext({ ...s.ctx.limits, work: checked.usage.work - 1 }), s.f, b, r, out)).toThrow('resource-limit');
  });
});
