import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { solveRationalLimitedIntegration as solve, verifyRationalLimitedIntegration as verify, type RationalLimitedIntegrationDecision } from './rational-limited-integration';
import { differentiate } from './differential-derivative';
import { DifferentialField } from './differential-field';
import { ExecutionContext } from './execution';
import { rationalField as Q } from './field';

const cases = [
  { name: 'empty zero', f: [], g: [], primitive: [], directions: 0 },
  { name: 'empty constant', f: [3], g: [], primitive: [0, 3], directions: 0 },
  { name: 'empty polynomial', f: [2, 4, 6], g: [], primitive: [0, 2, 2, 2], directions: 0 },
  { name: 'empty nonintegrable', f: [1], fd: [0, 1], g: [], negative: true },
  { name: 'unique cancellation', f: [1, 1], fd: [0, 0, 1], g: [{ n: [1], d: [0, 1] }], primitive: [-1], pd: [0, 1], directions: 0 },
  { name: 'dependent generators', f: [1], fd: [0, 1], g: [{ n: [1], d: [0, 1] }, { n: [2], d: [0, 1] }], primitive: [], directions: 1 },
  { name: 'different poles', f: [1], fd: [-1, 1], g: [{ n: [1], d: [0, 1] }], negative: true },
  { name: 'free polynomial coefficients', f: [1], g: [{ n: [2] }, { n: [0, 2] }, { n: [] }], primitive: [0, 1], directions: 3 },
  { name: 'irreducible simple pole', f: [1], fd: [1, 0, 1], g: [], negative: true },
  { name: 'irreducible cubic pole', f: [1], fd: [1, -1, 0, 1], g: [], negative: true },
  { name: 'irreducible derivative', f: [0, -2], fd: [1, 0, 2, 0, 1], g: [], primitive: [1], pd: [1, 0, 1], directions: 0 },
  { name: 'repeated pole', f: [-2], fd: [0, 0, 0, 1], g: [], primitive: [1], pd: [0, 0, 1], directions: 0 },
  { name: 'duplicate generators', f: [1], fd: [1, 0, 1], g: [{ n: [1], d: [1, 0, 1] }, { n: [1], d: [1, 0, 1] }], primitive: [], directions: 1 },
];
describe('complete rational limited integration', () => {
  it.each(cases)('$name', c => {
    const { ctx, f: owner, p } = setup(), f = p(c.f, c.fd), gs = c.g.map(g => p(g.n, 'd' in g ? g.d : undefined));
    const result = solve(ctx, owner, f, gs); verify(ctx, owner, f, gs, result);
    expect(result.kind).toBe(c.negative ? 'no-rational-solution' : 'solutions');
    expect(Object.isFrozen(result)).toBe(true);
    if (result.kind === 'solutions') {
      expect(owner.equal(ctx, result.family.particular.primitive, p(c.primitive!, c.pd))).toBe(true);
      expect(result.family.directions).toHaveLength(c.directions!);
      expect(result.family.additiveConstant).toBe('arbitrary-rational');
    }
    expect(result.conditions.inputs).toHaveLength(gs.length + 1);
    expect(result.system.columns).toBe(gs.length);
  });
  it('preserves a nonzero coefficient direction with zero primitive', () => {
    const { ctx, f: owner, p } = setup(), f = p([1], [0, 1]), gs = [f, p([2], [0, 1])];
    const d = solve(ctx, owner, f, gs); expect(d.kind).toBe('solutions'); if (d.kind !== 'solutions') return;
    const { particular, directions } = d.family;
    expect(particular.coefficients.map(q => q.numerator)).toEqual([-1n, 0n]);
    expect(directions[0].coefficients.map(q => q.numerator)).toEqual([-2n, 1n]);
    expect(owner.isZero(ctx, directions[0].primitive)).toBe(true);
    expect(d.conditions.primitives).toHaveLength(2);
  });
  it('keeps zero rows and every free column; an empty system still has an additive constant', () => {
    const { ctx, f: owner, p } = setup();
    const d = solve(ctx, owner, p([]), [p([]), p([1]), p([0, 1])]);
    expect(d.system.rows).toBe(0); expect(d.system.columns).toBe(3);
    expect(d.linear.kind === 'consistent' && d.linear.nullspace.length).toBe(3);
  });
  it('retains canceled input poles and normalized primitive denominators by position', () => {
    const { ctx, f: owner, p } = setup(), f = p([1], [0, 1]), gs = [f, f, p([-1], [0, 0, 1])];
    const d = solve(ctx, owner, f, gs); if (d.kind !== 'solutions') throw Error('fixture');
    expect(d.conditions.inputs.map(q => q.coefficients.length - 1)).toEqual([1, 1, 1, 2]);
    expect(d.conditions.primitives.map(q => q.coefficients.length - 1)).toEqual([0, 0, 1]);
    expect(d.domain.x.degree(ctx, d.common.denominator)).toBe(1);
    // The caller's list is never frozen or retained as mutable proof authority.
    gs[0] = p([]); expect(owner.equal(ctx, d.generators[0], f)).toBe(true);
    expect(Object.isFrozen(d.family.directions)).toBe(true);
    expect(Object.isFrozen(d.family.particular.coefficients)).toBe(true);
    expect(Object.isFrozen(d.common.steps[0])).toBe(true);
    expect(Object.isFrozen(d.reductions[0].hermite.blocks)).toBe(true);
  });
  it('normalizes by the polynomial part even when zero is a pole', () => {
    const { ctx, f: owner, p } = setup(), f = p([-1, 0, 2], [0, 0, 1]);
    const d = solve(ctx, owner, f, []); if (d.kind !== 'solutions') throw Error('fixture');
    expect(owner.equal(ctx, d.family.particular.primitive, p([1, 0, 2], [0, 1]))).toBe(true);
    const shifted = owner.add(ctx, d.family.particular.primitive, p([7]));
    const bad = { ...d, family: { ...d.family, particular: { ...d.family.particular, primitive: shifted,
      derivative: differentiate(ctx, owner, shifted) } } };
    expect(() => verify(ctx, owner, f, [], bad)).toThrow('verification-failed');
  });
  it('does not impose a generator count limit or discard dependent zero directions', () => {
    const { ctx, f: owner, p } = setup(), zero = p([]), gs = Array.from({ length: 70 }, () => zero);
    const d = solve(ctx, owner, zero, gs); if (d.kind !== 'solutions') throw Error('fixture');
    expect(d.family.directions).toHaveLength(70);
    expect(d.family.directions.every(pair => owner.isZero(ctx, pair.primitive))).toBe(true);
  });
  it('uses normalized nonmonic values and exact large coefficients without mutating operands', () => {
    const { ctx, f: owner, p } = setup(), f = p([9007199254740993n], [0, 2]), gs = [p([3], [0, 2])];
    const before = [...gs], d = solve(ctx, owner, f, gs);
    expect(gs).toEqual(before); expect(Object.isFrozen(gs)).toBe(false);
    expect(d.kind === 'solutions' && d.family.particular.coefficients[0].numerator).toBe(-3002399751580331n);
    expect(d.kind === 'solutions' && owner.isZero(ctx, d.family.particular.primitive)).toBe(true);
  });
  it('binds alternate variables and rejects foreign, forged and formal owners', () => {
    const { ctx, q, f, p } = setup(), other = setup(), zero = p([]);
    const z = DifferentialField.rationalFunctions(ctx, q, 'z', bounds), zx = z.generator(ctx);
    expect(solve(ctx, z, zx, []).kind).toBe('solutions');
    expect(() => solve(ctx, f, other.x, [])).toThrow('domain-mismatch');
    expect(() => solve(ctx, f, zero, [other.x])).toThrow('domain-mismatch');
    expect(() => solve(ctx, f, { ...zero }, [])).toThrow('domain-mismatch');
    expect(() => solve(ctx, Object.create(DifferentialField.prototype), zero, [])).toThrow('domain-mismatch');
    const formal = DifferentialField.formal(ctx, f, 't', [p([1])], bounds);
    expect(() => solve(ctx, formal, formal.generator(ctx), [])).toThrow('domain-mismatch');
  });
  it('checks seeded rational identities, arbitrary poles, and all family directions', () => {
    const { ctx, f: owner, p } = setup(); let seed = 173;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 7 + 1; };
    for (let i = 0; i < 6; i++) {
      const a = next(), b = next(), u = p([b, a], [a, 0, 1]), g = p([1], [-b, 1]);
      const h = owner.subtract(ctx, differentiate(ctx, owner, u).derivative, owner.multiply(ctx, p([a]), g));
      const d = solve(ctx, owner, h, [g, owner.multiply(ctx, p([2]), g), p([0, 2])]);
      expect(d.kind).toBe('solutions'); verify(ctx, owner, h, [g, owner.multiply(ctx, p([2]), g), p([0, 2])], d);
      if (d.kind === 'solutions') expect(owner.equal(ctx, d.family.particular.primitive, u)).toBe(true);
    }
  });
  it('solves independent residual constraints over a common denominator with distinct factors', () => {
    const { ctx, f: owner, p } = setup(), g1 = p([1], [0, 1]), g2 = p([1], [-1, 1]), u = p([1], [1, 0, 1]);
    const f = owner.add(ctx, differentiate(ctx, owner, u).derivative, owner.add(ctx, g1, owner.multiply(ctx, p([2]), g2)));
    const d = solve(ctx, owner, f, [g1, g2]); if (d.kind !== 'solutions') throw Error('fixture');
    expect(d.system.rows).toBe(2); expect(d.linear.rank).toBe(2); expect(d.family.directions).toHaveLength(0);
    expect(d.family.particular.coefficients.map(q => q.numerator)).toEqual([-1n, -2n]);
    expect(owner.equal(ctx, d.family.particular.primitive, u)).toBe(true);
  });
  it('rejects altered coverage, Hermite, LCM, matrices, nullspaces, mappings and conditions', () => {
    const { ctx, f: owner, p } = setup(), f = p([1, 1], [0, 0, 1]), gs = [p([1], [0, 1]), p([])];
    const d = solve(ctx, owner, f, gs); if (d.kind !== 'solutions' || d.linear.kind !== 'consistent') throw Error('fixture');
    const ring = d.domain.x, zero = ring.zero(ctx), one = ring.one(ctx), r = d.reductions[0], common = d.common;
    const mutations: unknown[] = [
      { ...d, rule: 'other' }, { ...d, f: p([1]) }, { ...d, generators: gs.slice().reverse() },
      { ...d, reductions: d.reductions.slice(1) },
      { ...d, reductions: [{ ...r, index: 1 }, ...d.reductions.slice(1)] },
      { ...d, reductions: [{ ...r, residual: p([]) }, ...d.reductions.slice(1)] },
      { ...d, reductions: [{ ...r, hermite: { ...r.hermite, residual: r.hermite.rationalPart } }, ...d.reductions.slice(1)] },
      { ...d, common: { ...common, steps: [] } }, { ...d, common: { ...common, denominator: one } },
      { ...d, common: { ...common, quotients: [zero, ...common.quotients.slice(1)] } },
      { ...d, common: { ...common, steps: [{ ...common.steps[0], previousQuotient: zero }, ...common.steps.slice(1)] } },
      { ...d, common: { ...common, squareFree: { ...common.squareFree, s: zero, t: zero } } },
      { ...d, system: { ...d.system, rhs: d.system.rhs.map(q => Q.negate(ctx, q)) } },
      { ...d, system: { ...d.system, columns: 1 } },
      { ...d, linear: { ...d.linear, nullspace: [] } },
      { ...d, family: { ...d.family, directions: [] } },
      { ...d, family: { ...d.family, additiveConstant: 'none' } },
      { ...d, family: { ...d.family, particular: { ...d.family.particular, primitive: p([]) } } },
      { ...d, family: { ...d.family, particular: { ...d.family.particular, derivative: { input: p([]), derivative: p([]) } } } },
      { ...d, conditions: { ...d.conditions, inputs: [] } }, { ...d, conditions: { ...d.conditions, primitives: [] } },
    ];
    for (const candidate of mutations) expect(() => verify(ctx, owner, f, gs, candidate as RationalLimitedIntegrationDecision)).toThrow();
  });
  it('rejects a false inconsistency witness and does not claim elementary nonintegrability', () => {
    const { ctx, f: owner, p } = setup(), f = p([1], [0, 1]), d = solve(ctx, owner, f, []);
    expect(d.kind).toBe('no-rational-solution'); expect(d.rule).toBe('rational-limited-integration-hermite-v1');
    if (d.linear.kind !== 'inconsistent') throw Error('fixture');
    const bad = { ...d, linear: { ...d.linear, witness: [Q.fromInteger(ctx, 0n)] } };
    expect(() => verify(ctx, owner, f, [], bad)).toThrow('verification-failed');
  });
  it('enforces fresh stricter contexts and sticky resource exhaustion', () => {
    const { ctx, f: owner, p } = setup(), f = p([9007199254740993n], [1, 0, 1]), d = solve(ctx, owner, f, [f]);
    for (const limits of [{ work: 1 }, { allocation: 1 }, { integerBits: 8 }, { degree: 1 }]) {
      const limited = new ExecutionContext({ work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256, ...limits });
      expect(() => verify(limited, owner, f, [f], d)).toThrow('resource-limit');
      expect(() => solve(limited, owner, p([]), [])).toThrow('resource-limit');
    }
  });
  it.each([{ work: 1 }, { allocation: 1 }, { integerBits: 8 }, { degree: 1 }])('fails construction under a fresh constrained profile %j', limits => {
    const { f: owner, p } = setup(), f = p([9007199254740993n], [1, 0, 1]);
    const ctx = new ExecutionContext({ work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256, ...limits });
    expect(() => solve(ctx, owner, f, [f])).toThrow('resource-limit');
  });
  it('exhausts on the mathematically required common denominator instead of dropping a generator', () => {
    const { f: owner, p } = setup(), f = p([1], [1, 0, 1]), g = p([1], [2, 0, 1]);
    const ctx = new ExecutionContext({ work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 3 });
    expect(() => solve(ctx, owner, f, [g])).toThrow('resource-limit');
  });
});
