import { describe, expect, it } from 'vitest';
import { ExecutionContext } from './execution';
import { DifferentialField as DF, type DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative } from './differential-derivative';
import { buildExponential, buildLogarithm, verifyAdmission } from './differential-admission';
import { setup, bounds } from './differential-test-support';

function supported<T extends { status: string }>(r: T): asserts r is T & { status: 'supported' } { expect(r.status).toBe('supported'); }

describe('recursive differential arithmetic', () => {
  it('differentiates Q, Q(x), large coefficients and checks independently supplied claims', () => {
    const { ctx, q, f, c, p } = setup();
    expect(q.isZero(ctx, differentiate(ctx, q, c(9007199254740993n)).derivative)).toBe(true);
    const a = p([1n, 9007199254740993n, -3n]);
    const evidence = differentiate(ctx, f, a);
    expect(f.equal(ctx, evidence.derivative, p([9007199254740993n, -6n]))).toBe(true);
    verifyDerivative(ctx, f, a, { input: a, derivative: p([9007199254740993n, -6n]) });
    expect(() => verifyDerivative(ctx, f, a, { ...evidence, derivative: p([1]) })).toThrow('verification-failed');
    expect(Object.isFrozen(a)).toBe(true);
  });
  it('checks sum, product and quotient laws against explicit rational derivatives', () => {
    const { ctx, f, p } = setup();
    const a = p([1, 0, 1]), b = p([0, 1]);
    const da = p([0, 2]), db = p([1]);
    const fixtures: [E, E][] = [
      [f.add(ctx, a, b), f.add(ctx, da, db)],
      [f.multiply(ctx, a, b), f.add(ctx, f.multiply(ctx, da, b), f.multiply(ctx, a, db))],
      [f.exactDivide(ctx, a, b), p([-1, 0, 1], [0, 0, 1])],
    ];
    for (const [input, derivative] of fixtures) {
      expect(f.equal(ctx, differentiate(ctx, f, input).derivative, derivative)).toBe(true);
      verifyDerivative(ctx, f, input, { input, derivative });
    }
  });
  it('differentiates coefficients in a five-level tower and keeps additional constants unestablished', () => {
    const { ctx, f, x, p } = setup();
    const t = DF.formal(ctx, f, 't', [p([1])], bounds), tx = t.subtract(ctx, t.generator(ctx), t.embed(ctx, x));
    expect(t.isZero(ctx, tx)).toBe(false);
    expect(t.isZero(ctx, differentiate(ctx, t, tx).derivative)).toBe(true);
    expect(t.constantField).toBe('unestablished');
    let owner = t, value = t.multiply(ctx, t.embed(ctx, x), t.generator(ctx));
    let expected = t.add(ctx, t.generator(ctx), t.embed(ctx, x));
    for (let i = 0; i < 3; i++) {
      const next = DF.formal(ctx, owner, `u_${i}`, [owner.fromInteger(ctx, 0n)], bounds);
      value = next.multiply(ctx, next.embed(ctx, value), next.generator(ctx));
      expected = next.multiply(ctx, next.embed(ctx, expected), next.generator(ctx)); owner = next;
    }
    expect(owner.height).toBe(5);
    expect(owner.equal(ctx, differentiate(ctx, owner, value).derivative, expected)).toBe(true);
  });
  it('handles polynomial generator rules and rejects foreign or descendant coefficients', () => {
    const { ctx, f, x, p } = setup();
    const t = DF.formal(ctx, f, 't', [x, p([0]), p([1])], bounds), a = t.generator(ctx);
    expect(t.equal(ctx, differentiate(ctx, t, a).derivative, t.add(ctx, t.embed(ctx, x), t.multiply(ctx, a, a)))).toBe(true);
    expect(() => Reflect.construct(DF, [])).toThrow('domain-mismatch');
    expect(() => DF.formal(ctx, Object.create(DF.prototype), 't', [], bounds)).toThrow('domain-mismatch');
    const other = setup();
    expect(() => t.embed(ctx, other.x)).toThrow('domain-mismatch');
    expect(() => DF.formal(ctx, f, 't', [a], bounds)).toThrow('domain-mismatch');
    expect(() => f.add(ctx, x, other.x)).toThrow('domain-mismatch');
  });
  it('checks seeded polynomial product laws and exact operand immutability', () => {
    const { ctx, f, p } = setup(); let seed = 7391;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed % 9) - 4; };
    for (let i = 0; i < 12; i++) {
      const a = p([next(), next(), next()]), b = p([next(), next(), 1]);
      const aBefore = a.kind === 'fraction' ? [...a.value.numerator.coefficients] : [];
      const da = differentiate(ctx, f, a).derivative, db = differentiate(ctx, f, b).derivative;
      const product = f.multiply(ctx, a, b);
      verifyDerivative(ctx, f, product, { input: product,
        derivative: f.add(ctx, f.multiply(ctx, da, b), f.multiply(ctx, a, db)) });
      if (a.kind === 'fraction') expect(a.value.numerator.coefficients).toEqual(aBefore);
    }
  });
  it('differentiates fractional lower-field coefficients and nontrivial generator chains', () => {
    const { ctx, f, p } = setup();
    const t = DF.formal(ctx, f, 't', [p([1])], bounds), tv = t.generator(ctx);
    const value = t.make(ctx, [p([]), p([1], [0, 1])]);
    const expected = t.make(ctx, [p([1], [0, 1]), p([-1], [0, 0, 1])]);
    expect(t.equal(ctx, differentiate(ctx, t, value).derivative, expected)).toBe(true);
    const u = DF.formal(ctx, t, 'u', [tv], bounds), uv = u.generator(ctx);
    const input = u.multiply(ctx, u.embed(ctx, tv), uv);
    expect(u.equal(ctx, differentiate(ctx, u, input).derivative,
      u.add(ctx, uv, u.embed(ctx, t.multiply(ctx, tv, tv))))).toBe(true);
  });
  it('honors stricter contexts for pre-existing values and bounds before allocation', () => {
    const { ctx, q, c, f, x } = setup(), huge = c(9007199254740993n);
    const strict = new ExecutionContext({ ...ctx.limits, integerBits: 8 });
    expect(() => differentiate(strict, q, huge)).toThrow('resource-limit');
    const low = new ExecutionContext({ ...ctx.limits, allocation: 10 });
    expect(() => buildExponential(low, f, 't', [x], bounds)).toThrow('resource-limit');
    expect(() => buildExponential(ctx, f, 't', [], bounds)).toThrow('invalid-input');
    expect(() => DF.formal(ctx, f, 't', [], { ...bounds, towerHeight: Infinity })).toThrow('invalid-input');
  });
  it('rejects altered derivative targets and preserves sticky limits', () => {
    const { ctx, f, x, p } = setup(), proof = differentiate(ctx, f, x);
    expect(() => verifyDerivative(ctx, f, p([1, 1]), proof)).toThrow('verification-failed');
    const low = new ExecutionContext({ ...ctx.limits, work: 0 });
    expect(() => differentiate(low, f, x)).toThrow('resource-limit');
    expect(() => verifyDerivative(low, f, x, proof)).toThrow('resource-limit');
    expect(() => DF.formal(ctx, f, 't', [], { ...bounds, towerHeight: 1 })).toThrow('tower-height');
    expect(() => ctx.tick()).toThrow('resource-limit');
  });
});

describe('certified first-level functions', () => {
  it.each(['polynomial', 'pole'] as const)('admits exponentials using the %s obstruction', kind => {
    const { ctx, f, p } = setup(), argument = kind === 'pole' ? p([1], [0, 1]) : p([0, 0, 1]);
    const r = buildExponential(ctx, f, 't', [argument], bounds); supported(r); if (r.status !== 'supported') return;
    expect(r.field.constantField).toBe('Q'); verifyAdmission(ctx, r.field, r.field.admission!);
    const t = r.field.generator(ctx), coefficient = kind === 'pole' ? p([-1], [0, 0, 1]) : p([0, 2]);
    expect(r.field.equal(ctx, differentiate(ctx, r.field, t).derivative,
      r.field.multiply(ctx, r.field.embed(ctx, coefficient), t))).toBe(true);
    expect(r.field.admission?.conditions.length).toBe(1);
  });
  it.each(['x', 'ratio'] as const)('admits local log %s with nonzero residue evidence', kind => {
    const { ctx, f, p } = setup(), argument = kind === 'x' ? p([0, 1]) : p([-1, 1], [1, 1]);
    const r = buildLogarithm(ctx, f, 'l', argument, bounds); supported(r); if (r.status !== 'supported') return;
    const expected = kind === 'x' ? p([1], [0, 1]) : p([2], [-1, 0, 1]);
    expect(r.field.equal(ctx, differentiate(ctx, r.field, r.aliases[0]).derivative, r.field.embed(ctx, expected))).toBe(true);
    expect(r.field.admission?.conditions.length).toBe(2);
    expect(r.field.constantField).toBe('Q');
  });
  it('normalizes rational-multiple batches, signs, zeros and permutations deterministically', () => {
    const { ctx, f, c, x, p } = setup();
    const args = [x, p([0, 2]), f.make(ctx, [c(0), c(1, 2)]), p([0, -3]), p([])];
    const a = buildExponential(ctx, f, 't', args, bounds), b = buildExponential(ctx, f, 't', [...args].reverse(), bounds);
    supported(a); supported(b); if (a.status !== 'supported' || b.status !== 'supported') return;
    expect(a.field.admission?.kind).toBe('exponential');
    if (a.field.admission?.kind !== 'exponential' || b.field.admission?.kind !== 'exponential') return;
    expect(a.field.admission.exponents).toEqual([2n, 4n, 1n, -6n, 0n]);
    expect(f.equal(ctx, a.field.admission.argument, b.field.admission.argument)).toBe(true);
    expect(a.field.equal(ctx, a.aliases[4], a.field.fromInteger(ctx, 1n))).toBe(true);
    const z = buildExponential(ctx, f, 't', [p([])], bounds); supported(z);
    if (z.status === 'supported') expect(z.field).toBe(f);
  });
  it('does not discard exponent constants or admit mixed/nested function families', () => {
    const { ctx, f, x, p } = setup();
    expect(buildExponential(ctx, f, 't', [x, p([1, 2])], bounds)).toEqual({ status: 'unsupported', reason: 'not-rational-multiples' });
    expect(buildExponential(ctx, f, 't', [p([1])], bounds).status).toBe('unsupported');
    // A single nonconstant shifted argument is valid and must retain its shift.
    const shifted = buildExponential(ctx, f, 't', [p([1, 1])], bounds); supported(shifted);
    if (shifted.status === 'supported') expect(f.equal(ctx, shifted.field.admission!.argument, p([1, 1]))).toBe(true);
    expect(buildLogarithm(ctx, f, 'l', p([1]), bounds).status).toBe('unsupported');
    expect(() => buildLogarithm(ctx, f, 'l', p([]), bounds)).toThrow('invalid-input');
    const formal = DF.formal(ctx, f, 't', [x], bounds);
    expect(buildLogarithm(ctx, formal, 'l', formal.generator(ctx), bounds).status).toBe('unsupported');
  });
  it('certified owners copy evidence containers and do not invent logarithmic identities', () => {
    const { ctx, f, x, p } = setup(), result = buildLogarithm(ctx, f, 'l', x, bounds);
    if (result.status !== 'supported' || result.field.admission?.kind !== 'logarithmic') throw new Error('fixture');
    const certificate = result.field.admission;
    const mutable = { ...certificate, conditions: [...certificate.conditions],
      numerator: { ...certificate.numerator, factors: certificate.numerator.factors.map(a => ({ ...a })) } };
    const copied = DF.certified(ctx, f, 'l', [p([1], [0, 1])], bounds, mutable);
    mutable.conditions.length = 0; mutable.numerator.factors[0].multiplicity = 2;
    verifyAdmission(ctx, copied, copied.admission!);
    expect(Object.isFrozen(copied.admission?.conditions)).toBe(true);
    const other = buildLogarithm(ctx, f, 'l', p([0, 2]), bounds);
    if (other.status !== 'supported') throw new Error('fixture');
    expect(() => copied.equal(ctx, copied.generator(ctx), other.field.generator(ctx))).toThrow('domain-mismatch');
    expect(() => verifyAdmission(ctx, copied, { ...certificate,
      numerator: { ...certificate.numerator, factors: [{ ...certificate.numerator.factors[0], multiplicity: 2 }] } })).toThrow('verification-failed');
  });
  it('rejects mutated admissions, rule, residues, conditions and aliases', () => {
    const { ctx, f, x, p } = setup(), r = buildExponential(ctx, f, 't', [x], bounds);
    if (r.status !== 'supported' || r.field.admission?.kind !== 'exponential') throw new Error('fixture');
    const a = r.field.admission;
    expect(() => verifyAdmission(ctx, r.field, { ...a, exponents: [2n] })).toThrow('verification-failed');
    expect(() => verifyAdmission(ctx, r.field, { ...a, conditions: [] })).toThrow('verification-failed');
    expect(() => verifyAdmission(ctx, r.field, { ...a, obstruction: 'finite-pole' })).toThrow('verification-failed');
    const bad = DF.formal(ctx, f, 't', [p([1])], bounds);
    expect(() => verifyAdmission(ctx, bad, a)).toThrow('verification-failed');
    const l = buildLogarithm(ctx, f, 'l', p([1], [0, 1]), bounds);
    if (l.status !== 'supported' || l.field.admission?.kind !== 'logarithmic') throw new Error('fixture');
    const logAdmission = l.field.admission;
    expect(logAdmission.residue).toBe(-1n);
    expect(() => verifyAdmission(ctx, l.field, { ...logAdmission, residue: 1n })).toThrow('verification-failed');
    expect(() => verifyAdmission(ctx, l.field, { ...logAdmission, semantics: 'principal' as 'chosen-local-log' })).toThrow('verification-failed');
  });
});
