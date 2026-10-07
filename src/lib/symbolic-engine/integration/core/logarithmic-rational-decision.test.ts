import { describe, expect, it } from 'vitest';
import { logarithmicSetup } from './__tests__/logarithmic-rational-fixtures';
import { bounds, setup } from './differential-test-support';
import { AlgebraError, ExecutionContext } from './execution';
import { integrateLogarithmicRational, verifyLogarithmicRationalDecision } from './logarithmic-rational-decision';
import { differentiate } from './differential-derivative';
import { logarithmicCorrection } from './logarithmic-rational-polynomial';
import { solveRationalLimitedIntegration } from './rational-limited-integration';
import { DifferentialField } from './differential-field';
import { LogarithmicRationalDomain } from './logarithmic-rational-domain';
import { buildExponential, buildLogarithm } from './differential-admission';

describe('complete one-logarithm rational decisions', () => {
  it.each([
    { name: 'zero', n: [], primitive: [] }, { name: 'constant', n: [2], primitive: [2] },
    { name: 'log x', n: [0, 1], primitive: [0, 1] }, { name: 'log squared', n: [0, 0, 1], primitive: [0, 0, 1] },
  ])('integrates $name with an independently known primitive', ({ name, n }) => {
    const s = logarithmicSetup(), input = s.v(n), out = integrateLogarithmicRational(s.ctx, s.F, input, bounds);
    expect(out.kind).toBe('elementary'); if (out.kind !== 'elementary') throw Error('positive fixture');
    const X = s.F.embed(s.ctx, s.x);
    const expected = name === 'log x' ? s.F.multiply(s.ctx, X, s.F.subtract(s.ctx, s.t, s.C(1)))
      : name === 'log squared' ? s.F.multiply(s.ctx, X, s.F.add(s.ctx, s.F.subtract(s.ctx, s.v([0, 0, 1]), s.v([0, 2])), s.C(2)))
      : name === 'constant' ? s.F.multiply(s.ctx, s.C(2), X) : s.C(0);
    expect(s.F.equal(s.ctx, out.primitive.fieldPart, expected)).toBe(true);
    expect(out.primitive.terms).toHaveLength(0);
    verifyLogarithmicRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, out, bounds);
  });
  it('keeps the top integration constant to produce log squared / 2', () => {
    const s = logarithmicSetup(), input = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.t);
    const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds); expect(out.kind).toBe('elementary');
    if (out.kind !== 'elementary') throw Error('fixture');
    expect(s.F.equal(s.ctx, out.primitive.fieldPart, s.F.exactDivide(s.ctx, s.v([0, 0, 1]), s.C(2)))).toBe(true);
    expect(out.remainder.reduction.steps[0].limited.kind).toBe('solutions');
    expect(out.remainder.reduction.steps[0].degree).toBe(1n);
  });
  it.each([1, 2, 3])('handles normal powers t^%s, including the inverse-t restriction', exponent => {
    const s = logarithmicSetup(), den = Array<number>(exponent + 1).fill(0); den[exponent] = 1;
    const input = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.v([1], den));
    const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds); expect(out.kind).toBe('elementary');
    if (out.kind !== 'elementary') throw Error('fixture');
    expect(out.hermite.power).toBe(0);
    expect(out.conditions.some(c => c.category === 'outer-denominator' && c.path === 'input')).toBe(true);
    if (exponent === 1) expect(out.primitive.terms).toHaveLength(1);
    else {
      const ds = Array<number>(exponent).fill(0); ds[exponent - 1] = -(exponent - 1);
      expect(s.F.equal(s.ctx, out.primitive.fieldPart, s.v([1], ds))).toBe(true);
    }
  });
  it('differentiates base coefficients in a moving normal pole', () => {
    const s = logarithmicSetup(), g = s.F.add(s.ctx, s.t, s.F.embed(s.ctx, s.x));
    const input = s.F.exactDivide(s.ctx, s.F.embed(s.ctx, s.f.add(s.ctx, s.a, s.f.fromInteger(s.ctx, 1n))), g);
    const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds); expect(out.kind).toBe('elementary');
    if (out.kind !== 'elementary') throw Error('fixture');
    expect(s.F.equal(s.ctx, out.primitive.terms[0].argument.coefficients[0], g)).toBe(true);
  });
  it.each([{ n: [0, 0, 1], d: [1] }, { n: [1], d: [0, 1] }, { n: [-1, 1], d: [1, 1] }, { n: [0, -3], d: [1] }])('supports the full rational log argument $n/$d', ({ n, d }) => {
    const s = logarithmicSetup(n, d), input = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.t);
    const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds); expect(out.kind).toBe('elementary');
    if (out.kind !== 'elementary') throw Error('fixture');
    expect(s.F.equal(s.ctx, out.primitive.fieldPart, s.F.exactDivide(s.ctx, s.v([0, 0, 1]), s.C(2)))).toBe(true);
  });
  it.each([{ n: [1], d: [0, 1] }, { n: [1], d: [0, 2] }])('certifies nonconstant normal residues for $n/$d', ({ n, d }) => {
    const s = logarithmicSetup(), input = s.v(n, d), out = integrateLogarithmicRational(s.ctx, s.F, input, bounds);
    expect(out.kind).toBe('non-elementary'); expect(out.obstruction).toBe('nonconstant-residue'); expect(out.remainder).toBeNull();
    verifyLogarithmicRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, out, bounds);
  });
  it('certifies a moving denominator obstruction', () => {
    const s = logarithmicSetup(), input = s.F.make(s.ctx, [s.f.fromInteger(s.ctx, 1n)], [s.x, s.f.fromInteger(s.ctx, 1n)]);
    expect(integrateLogarithmicRational(s.ctx, s.F, input, bounds).obstruction).toBe('nonconstant-residue');
  });
  it('certifies a polynomial coefficient obstruction and its successful prefix', () => {
    const s = logarithmicSetup(), first = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [1, 1])), s.t);
    const prefix = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.v([0, 0, 1]));
    for (const input of [first, s.F.add(s.ctx, prefix, first)]) {
      const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds);
      expect(out.obstruction).toBe('polynomial-coefficient'); if (out.obstruction !== 'polynomial-coefficient') throw Error('fixture');
      expect(out.remainder.reduction.steps.at(-1)!.limited.kind).toBe('no-rational-solution');
      expect(out.remainder.reduction.failure).toBe(out.remainder.reduction.steps.length - 1);
      expect(out.primitive).toBeNull(); expect(out.rational).toBeNull();
    }
  });
  it('keeps constant-residue evidence before a polynomial obstruction', () => {
    const s = logarithmicSetup(), log = s.F.exactDivide(s.ctx, s.F.embed(s.ctx, s.a), s.t);
    const bad = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [1, 1])), s.t);
    const out = integrateLogarithmicRational(s.ctx, s.F, s.F.add(s.ctx, log, bad), bounds);
    expect(out.obstruction).toBe('polynomial-coefficient'); expect(out.residue?.nonconstant).toBeNull();
    expect(out.remainder?.logarithms.terms).toHaveLength(1);
  });
  it('retains algebraic residues and embedded rational root-log additions', () => {
    const s = logarithmicSetup(), a = s.F.embed(s.ctx, s.a);
    const input = s.F.add(s.ctx, s.F.multiply(s.ctx, a, s.v([1], [2, 0, 1])), s.F.embed(s.ctx, s.p([1], [1, 0, 1])));
    const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds); expect(out.kind).toBe('elementary');
    if (out.kind !== 'elementary') throw Error('fixture');
    expect(out.primitive.terms.length).toBeGreaterThanOrEqual(2);
    expect(out.residue!.decomposition!.factors[0].factor.coefficients).toHaveLength(3);
  });
  it('covers repeated residues without multiplying their weights by multiplicity', () => {
    const s = logarithmicSetup(), input = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.v([0, 2], [-1, 0, 1]));
    const out = integrateLogarithmicRational(s.ctx, s.F, input, bounds); expect(out.kind).toBe('elementary');
    expect(out.residue!.decomposition!.factors[0].multiplicity).toBe(2);
    verifyLogarithmicRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, out, bounds);
  });
  it('checks specialization degree loss, component splitting and indexed PRS selection', () => {
    const s = logarithmicSetup(), fractions = s.F.add(s.ctx, s.F.add(s.ctx, s.v([1], [-1, 1]), s.v([2], [-2, 1])), s.v([3], [-3, 1]));
    const input = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), fractions), out = integrateLogarithmicRational(s.ctx, s.F, input, bounds);
    expect(out.kind).toBe('elementary');
    expect(out.residue!.groups[0].nodes.length).toBeGreaterThan(1);
    expect(out.residue!.groups[0].components.map(c => c.specializedDegree)).toContain(1);
    verifyLogarithmicRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, out, bounds);
  });
  it('uses the supplied rational variable owner and rejects a deeper formal extension', () => {
    const s = setup(), K = DifferentialField.rationalFunctions(s.ctx, s.q, 'y', bounds), y = K.generator(s.ctx);
    const built = buildLogarithm(s.ctx, K, 'z', y, bounds); if (built.status !== 'supported') throw Error('fixture');
    const input = built.field.generator(s.ctx), out = integrateLogarithmicRational(s.ctx, built.field, input, bounds);
    expect(out.kind).toBe('elementary');
    verifyLogarithmicRationalDecision(new ExecutionContext(s.ctx.limits), built.field, input, out, bounds);
    const deeper = DifferentialField.formal(s.ctx, built.field, 'u', [built.field.fromInteger(s.ctx, 1n)], bounds);
    expect(() => integrateLogarithmicRational(s.ctx, deeper, deeper.generator(s.ctx), bounds)).toThrow(AlgebraError);
  });
  it('checks seeded rational and logarithmic derivative identities without mutating operands', () => {
    const s = logarithmicSetup(); let seed = 619;
    for (let i = 0; i < 3; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const g = s.F.add(s.ctx, s.t, s.F.embed(s.ctx, s.p([i + 1, 1]))), v = s.F.exactDivide(s.ctx, s.C(seed % 7 + 1), s.F.multiply(s.ctx, g, g));
      const before = v.kind === 'fraction' ? v.value : null;
      const input = s.F.add(s.ctx, differentiate(s.ctx, s.F, v).derivative, s.F.exactDivide(s.ctx, differentiate(s.ctx, s.F, g).derivative, g));
      expect(integrateLogarithmicRational(s.ctx, s.F, input, bounds).kind).toBe('elementary');
      expect(v.kind === 'fraction' ? v.value : null).toBe(before);
    }
  });
  it('preserves exact large coefficients and zero/base-field inputs', () => {
    const s = logarithmicSetup(), big = 9007199254740993n;
    const input = s.F.multiply(s.ctx, s.C(big), s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.t));
    expect(integrateLogarithmicRational(s.ctx, s.F, input, bounds).kind).toBe('elementary');
    for (const p of [s.p([]), s.p([2, 3]), s.p([1], [1, 0, 1])]) expect(integrateLogarithmicRational(s.ctx, s.F, s.F.embed(s.ctx, p), bounds).kind).toBe('elementary');
  });
  it('rejects foreign owners, exponential fields and uncertified formal towers', () => {
    const s = logarithmicSetup(), other = logarithmicSetup();
    expect(() => integrateLogarithmicRational(s.ctx, s.F, other.t, bounds)).toThrow(AlgebraError);
    const formal = DifferentialField.formal(s.ctx, s.f, 'u', [s.a], bounds);
    expect(() => integrateLogarithmicRational(s.ctx, formal, formal.generator(s.ctx), bounds)).toThrow(AlgebraError);
    const exp = buildExponential(s.ctx, s.f, 'e', [s.x], bounds); if (exp.status !== 'supported') throw Error('fixture');
    expect(() => new LogarithmicRationalDomain(s.ctx, exp.field, bounds)).toThrow(AlgebraError);
    const base = setup(); expect(buildLogarithm(base.ctx, base.f, 't', base.p([2]), bounds).status).toBe('unsupported');
    expect(() => buildLogarithm(base.ctx, base.f, 't', base.p([]), bounds)).toThrow(AlgebraError);
  });
  it('checks actual correction degree before allocation and permits a zero theoretical leading term', () => {
    const s = logarithmicSetup(), a = s.a, one = s.f.fromInteger(s.ctx, 1n);
    const ordinary = solveRationalLimitedIntegration(s.ctx, s.f, one, [a]);
    const small = () => new ExecutionContext({ ...s.ctx.limits, degree: 1 });
    expect(() => logarithmicCorrection(small(), s.d, 1n, ordinary)).not.toThrow();
    const extra = solveRationalLimitedIntegration(s.ctx, s.f, a, [a]);
    expect(() => logarithmicCorrection(small(), s.d, 1n, extra)).toThrow(AlgebraError);
  });
  it.each([{ work: 2 }, { allocation: 2 }, { integerBits: 1 }, { degree: 0 }])('exhausts $work/$allocation/$integerBits/$degree without a mathematical decision', limits => {
    const s = logarithmicSetup(), ctx = new ExecutionContext({ ...s.ctx.limits, ...limits });
    expect(() => integrateLogarithmicRational(ctx, s.F, s.t, bounds)).toThrow(AlgebraError);
    expect(() => ctx.tick()).toThrow(AlgebraError);
  });
});
