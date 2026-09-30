import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { solveRationalRde, verifyRationalRde } from './rational-rde';
import { differentiate } from './differential-derivative';
import { DifferentialField } from './differential-field';
import { ExecutionContext } from './execution';
import { naturalDegree } from './rde-algebra';

const fixtures = [
  { name: 'zero equation', a: [0], b: [0], h: [1], u: [0] },
  { name: 'constant forcing', a: [0], b: [5], h: [1], u: [0, 5] },
  { name: 'logarithmic forcing', a: [0], b: [1], bd: [0, 1], no: true },
  { name: 'finite resonance', a: [1], ad: [0, 1], b: [0], h: [1], hd: [0, 1], u: [0] },
  { name: 'infinity resonance', a: [-3], ad: [0, 1], b: [0], h: [0, 0, 0, 1], u: [0] },
  { name: 'exponential positive', a: [0, 2], b: [0, 2], u: [1] },
  { name: 'exponential negative', a: [0, 2], b: [1], no: true },
  { name: 'trivial homogeneous', a: [1], b: [0], u: [0] },
  { name: 'repeated pole', a: [0], b: [-2], bd: [0, 0, 0, 1], u: [1], ud: [0, 0, 1], h: [1] },
  { name: 'irregular singularity', a: [1], ad: [0, 0, 1], b: [1], bd: [0, 0, 1], u: [1] },
  { name: 'quadratic resonance', a: [0, 2], ad: [1, 0, 1], b: [0], u: [0], h: [1], hd: [1, 0, 1] },
  { name: 'fractional resonance', a: [0, 1], ad: [1, 0, 1], b: [0], u: [0] },
  { name: 'distinct resonances', a: [-1, 3], ad: [-1, 0, 1], b: [0], u: [0], h: [1], hd: [-1, -1, 1, 1] },
  { name: 'quadratic rational primitive', a: [0], b: [0, -2], bd: [1, 0, 2, 0, 1], u: [1], ud: [1, 0, 1], h: [1] },
  { name: 'quadratic nonrational primitive', a: [0], b: [1], bd: [1, 0, 2, 0, 1], no: true },
];
describe('complete rational RDE decisions', () => {
  it.each(fixtures)('$name', fixture => {
    const { ctx, f, p } = setup(), a = p(fixture.a, fixture.ad), b = p(fixture.b, fixture.bd);
    const proof = solveRationalRde(ctx, f, a, b); verifyRationalRde(ctx, f, a, b, proof);
    if (fixture.no) { expect(proof.kind).toBe('no-rational-solution'); expect(proof.solution).toBeNull(); return; }
    expect(proof.kind).toBe('solutions'); const solution = proof.solution!;
    expect(f.equal(ctx, solution.particular, p(fixture.u!, fixture.ud))).toBe(true);
    expect(solution.homogeneous.length).toBe(fixture.h ? 1 : 0);
    if (fixture.h) expect(f.equal(ctx, solution.homogeneous[0], p(fixture.h, fixture.hd))).toBe(true);
    expect(Object.isFrozen(proof)).toBe(true);
  });
  it('accepts nonmonic sources and large exact scalars; rejects incompatible owners', () => {
    const { ctx, f, p, x } = setup(), a = p([2], [2]), b = p([9007199254740993n]);
    expect(f.equal(ctx, solveRationalRde(ctx, f, a, b).solution!.particular, b)).toBe(true);
    const foreign = setup(); expect(() => solveRationalRde(ctx, f, foreign.x, x)).toThrow('domain-mismatch');
    const formal = DifferentialField.formal(ctx, f, 't', [p([1])], bounds);
    expect(() => solveRationalRde(ctx, formal, formal.generator(ctx), formal.generator(ctx))).toThrow('domain-mismatch');
  });
  it('checks derivative-constructed seeded equations and full solution membership', () => {
    const { ctx, f, p } = setup(); let seed = 983;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 5 + 1; };
    for (let i = 0; i < 6; i++) {
      const n = next(), a = p([next(), 1]), u = p([next(), 1], [-n, 1]);
      const b = f.add(ctx, differentiate(ctx, f, u).derivative, f.multiply(ctx, a, u));
      const result = solveRationalRde(ctx, f, a, b);
      expect(result.kind).toBe('solutions'); expect(result.solution!.homogeneous).toHaveLength(0);
      expect(f.equal(ctx, result.solution!.particular, u)).toBe(true);
    }
  });
  it('distinguishes empty search spaces, empty systems and retained conditions', () => {
    const { ctx, f, p } = setup(), zero = p([]);
    const no = solveRationalRde(ctx, f, p([0, 2]), p([1])); expect(no.degree.bound).toBe(-1n); expect(no.system.columns).toBe(0);
    const all = solveRationalRde(ctx, f, zero, zero); expect(all.system.rows).toBe(0); expect(all.system.columns).toBe(1);
    const rational = solveRationalRde(ctx, f, zero, p([-2], [0, 0, 0, 1]));
    expect(rational.conditions.coefficients).toHaveLength(2); expect(rational.conditions.solutions).toHaveLength(2);
    expect(rational.conditions.solutions).not.toContain(rational.denominator.denominator);
  });
  it('rejects changed degrees, denominator coverage, nullspaces, targets and derivative evidence', () => {
    const { ctx, f, p } = setup(), a = p([1], [0, 1]), b = p([]), result = solveRationalRde(ctx, f, a, b);
    const bad = [
      { ...result, degree: { ...result.degree, bound: result.degree.bound + 1n } },
      { ...result, denominator: { ...result.denominator, blocks: [] } },
      { ...result, solution: { ...result.solution!, homogeneous: [] } },
      { ...result, solution: { ...result.solution!, derivatives: [] } },
      { ...result, conditions: { ...result.conditions, coefficients: [] } },
    ];
    for (const e of bad) expect(() => verifyRationalRde(ctx, f, a, b, e)).toThrow('verification-failed');
    expect(() => verifyRationalRde(ctx, f, a, p([1]), result)).toThrow('verification-failed');
  });
  it('returns an affine family and retains actual denominators rather than the universal proof bound', () => {
    const { ctx, f, p } = setup(), a = p([1], [0, 1]), b = p([2]);
    const affine = solveRationalRde(ctx, f, a, b).solution!;
    expect(f.equal(ctx, affine.particular, p([0, 1]))).toBe(true);
    expect(f.equal(ctx, affine.homogeneous[0], p([1], [0, 1]))).toBe(true);
    const irregular = p([1, 1], [0, 1]), unique = solveRationalRde(ctx, f, irregular, irregular);
    expect(unique.solution!.homogeneous).toHaveLength(0);
    expect(f.equal(ctx, unique.solution!.particular, p([1]))).toBe(true);
    const ring = unique.domain.ring;
    expect(ring.degree(ctx, unique.denominator.denominator)).toBe(1);
    expect(unique.conditions.solutions.map(d => ring.degree(ctx, d))).toEqual([0]);
  });
  it('handles repeated irregular poles and negative or algebraic residues without invented resonances', () => {
    const { ctx, f, p } = setup();
    for (const a of [p([1], [0, 0, 0, 1]), p([-2], [0, 1]), p([1], [1, 0, 1])]) {
      const u = p([2, 1], [1, 0, 1]), b = f.add(ctx, differentiate(ctx, f, u).derivative, f.multiply(ctx, a, u));
      const proof = solveRationalRde(ctx, f, a, b);
      expect(proof.kind).toBe('solutions');
      const delta = f.subtract(ctx, u, proof.solution!.particular);
      expect(f.isZero(ctx, f.add(ctx, differentiate(ctx, f, delta).derivative, f.multiply(ctx, a, delta)))).toBe(true);
    }
  });
  it('keeps large finite resonances exact and exhausts construction during its final proof', () => {
    const s = setup(), a = s.p([9007199254740993n], [0, 1]), zero = s.p([]);
    expect(() => solveRationalRde(s.ctx, s.f, a, zero)).toThrow('resource-limit');
    const t = setup(), input = t.p([1]), forcing = t.p([2]);
    const measured = new ExecutionContext(t.ctx.limits); solveRationalRde(measured, t.f, input, forcing);
    expect(() => solveRationalRde(new ExecutionContext({ ...t.ctx.limits, work: measured.usage.work - 1 }), t.f, input, forcing)).toThrow('resource-limit');
  });
  it('never turns proved but oversized degree requirements into a negative decision', () => {
    const { ctx, f, p } = setup();
    expect(() => solveRationalRde(ctx, f, p([-257], [0, 1]), p([]))).toThrow('resource-limit');
    expect(() => ctx.tick()).toThrow('resource-limit');
    const s = setup(), proof = solveRationalRde(s.ctx, s.f, s.p([1]), s.p([2]));
    const oversized = new ExecutionContext({ ...s.ctx.limits, degree: Number.MAX_SAFE_INTEGER });
    expect(() => naturalDegree(oversized, 0xffff_ffffn)).toThrow('RDE-array-capacity');
    const measured = new ExecutionContext(s.ctx.limits); verifyRationalRde(measured, s.f, proof.a, proof.b, proof);
    expect(() => verifyRationalRde(new ExecutionContext({ ...s.ctx.limits, work: measured.usage.work - 1 }), s.f, proof.a, proof.b, proof)).toThrow('resource-limit');
    expect(() => solveRationalRde(new ExecutionContext({ ...s.ctx.limits, work: 0 }), s.f, proof.a, proof.b)).toThrow('resource-limit');
  });
});
