import { describe, expect, it } from 'vitest';
import { bounds } from './differential-test-support';
import { exponentialSetup } from './__tests__/exponential-rational-fixtures';
import { ExecutionContext } from './execution';
import { integrateExponentialRational, verifyExponentialRationalDecision } from './exponential-rational-decision';

describe('one exponential rational decisions', () => {
  it.each([
    { name: 'zero', n: [], d: [1] }, { name: 'constant', n: [2], d: [1] },
    { name: 'inverse affine', n: [1], d: [1, 1] }, { name: 'repeated affine', n: [1], d: [1, 2, 1] },
    { name: 'quadratic residues', n: [0, 1], d: [1, 0, 1] },
    { name: 'mixed special normal', n: [1], d: [0, 1, 2, 1] },
    { name: 'rebased Laurent', n: [1, 0, 0, 0, 1], d: [0, 0, 1] },
  ])('integrates $name', ({ n, d }) => {
    const s = exponentialSetup(), input = s.v(n, d), result = integrateExponentialRational(s.ctx, s.F, input, bounds);
    expect(result.kind).toBe('elementary');
    verifyExponentialRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, result, bounds);
  });
  it('differentiates x coefficients in the normal denominator', () => {
    const s = exponentialSetup(), input = s.F.make(s.ctx, [s.c(1), s.c(1)], [s.x, s.c(1)]);
    const result = integrateExponentialRational(s.ctx, s.F, input, bounds); expect(result.kind).toBe('elementary');
  });
  it('proves nonconstant normal residue', () => {
    const s = exponentialSetup(), input = s.F.make(s.ctx, [s.c(1)], [s.x, s.c(1)]);
    const result = integrateExponentialRational(s.ctx, s.F, input, bounds);
    expect(result.kind).toBe('non-elementary'); expect(result.obstruction).toBe('nonconstant-residue');
  });
  it('proves a Laurent obstruction after subtracting constant-residue logarithms', () => {
    const s = exponentialSetup(), input = s.F.add(s.ctx, s.v([1], [1, 1]), s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [0, 1])), s.t));
    const result = integrateExponentialRational(s.ctx, s.F, input, bounds);
    expect(result.kind).toBe('non-elementary'); expect(result.obstruction).toBe('laurent');
  });
  it('checks nonlinear and rational exponents', () => {
    for (const [ns, ds] of [[[0, 0, 1], [1]], [[1], [0, 1]]]) {
      const s = exponentialSetup(ns, ds), input = s.v([1], [1, 1]);
      const result = integrateExponentialRational(s.ctx, s.F, input, bounds);
      expect(result.kind).toBe('non-elementary'); expect(result.obstruction).toBe('nonconstant-residue');
    }
  });
});

import { differentiate } from './differential-derivative';
import { ExponentialRationalDomain } from './exponential-rational-domain';
import { exponentialPrimitive, exponentialLogTerm, differentiateExponentialPrimitive } from './exponential-rational-primitive';
import { rational } from './rational';

describe('exponential rational completeness fixtures', () => {
  it.each([{ r: [0, 0, 1], rd: [1] }, { r: [1], rd: [0, 1] }, { r: [1, 1], rd: [1] }])('integrates constructed log and rational derivatives for $r/$rd', ({ r, rd }) => {
    const s = exponentialSetup(r, rd), { ctx, F, t } = s;
    const g = F.add(ctx, t, F.fromInteger(ctx, 1n));
    const v = F.inverse(ctx, F.multiply(ctx, g, g));
    const input = F.add(ctx, differentiate(ctx, F, v).derivative, F.exactDivide(ctx, differentiate(ctx, F, g).derivative, g));
    const result = integrateExponentialRational(ctx, F, input, bounds); expect(result.kind).toBe('elementary');
  });
  it('keeps nontrivial algebraic residues and rational root-log additions', () => {
    const s = exponentialSetup(), { ctx, F } = s;
    const input = F.add(ctx, s.v([0, 1], [1, 0, 1]), F.embed(ctx, s.p([1], [1, 0, 1])));
    const out = integrateExponentialRational(ctx, F, input, bounds);
    expect(out.kind).toBe('elementary'); expect(out.primitive!.terms.length).toBeGreaterThanOrEqual(2);
    expect(out.residue!.decomposition!.factors[0].factor.coefficients.length).toBe(3);
  });
  it('handles repeated residues, multiple multiplicities and the highest boundary with nonzero B', () => {
    const s = exponentialSetup(), { ctx, F } = s;
    // D log((t-1)(t+1)) + 2 D log(t-2): residues 1 (twice) and 2.
    const input = F.add(ctx, s.v([0, 0, 2], [-1, 0, 1]), s.v([0, 2], [-2, 1]));
    const out = integrateExponentialRational(ctx, F, input, bounds);
    expect(out.kind).toBe('elementary'); expect(out.residue!.decomposition!.factors.map(v => v.multiplicity)).toEqual([1, 2]);
    const highest = integrateExponentialRational(ctx, F, s.v([1], [1, 1]), bounds);
    expect(highest.residue!.groups[0].components[0].normalization).toBeNull();
    expect(highest.residue!.groups[0].components[0].residueDivision.quotient.coefficients.length).toBe(1);
  });
  it('checks a derivative fixture with reducible all-root modulus', () => {
    const s = exponentialSetup(), { ctx, F, t } = s, d = new ExponentialRationalDomain(ctx, F, bounds);
    const q = d.z.make(ctx, [-1, 0, 1].map(n => rational(ctx, n))), w = d.z.make(ctx, [rational(ctx, 0), rational(ctx, 1)]);
    const term = exponentialLogTerm(ctx, d, q, w, d.fz.make(ctx, [F.add(ctx, t, F.embed(ctx, s.x)), F.fromInteger(ctx, -1n)]));
    const p = exponentialPrimitive(ctx, d, F.fromInteger(ctx, 0n), [term]);
    const input = differentiateExponentialPrimitive(ctx, p, bounds).derivative;
    expect(integrateExponentialRational(ctx, F, input, bounds).kind).toBe('elementary');
  });
  it('supports nonmonic source fractions and coefficients above 2^53', () => {
    const s = exponentialSetup(), big = s.f.fromInteger(s.ctx, 9007199254740993n);
    const input = s.F.make(s.ctx, [big], [s.c(2), s.c(2)]);
    expect(integrateExponentialRational(s.ctx, s.F, input, bounds).kind).toBe('elementary');
  });
  it('rejects foreign fields and unadmitted formal towers', () => {
    const a = exponentialSetup(), b = exponentialSetup();
    expect(() => integrateExponentialRational(a.ctx, a.F, b.t, bounds)).toThrow();
    expect(() => integrateExponentialRational(a.ctx, a.f, a.x, bounds)).toThrow();
  });
  it('checks seeded field-derivative fixtures and preserves operands', () => {
    const s = exponentialSetup(), { ctx, F } = s; let seed = 419;
    for (let j = 0; j < 4; j++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = s.v([1 + seed % 5, j + 1], [1 + j, 1]), input = differentiate(ctx, F, v).derivative;
      const numerator = input.kind === 'fraction' ? input.value.numerator : null;
      expect(integrateExponentialRational(ctx, F, input, bounds).kind).toBe('elementary');
      expect(input.kind === 'fraction' ? input.value.numerator : null).toBe(numerator);
    }
  });
});
