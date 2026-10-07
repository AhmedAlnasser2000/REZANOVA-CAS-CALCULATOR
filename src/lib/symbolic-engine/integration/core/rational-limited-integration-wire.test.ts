import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { encodeRationalLimitedIntegration as encode, decodeRationalLimitedIntegration as decode } from './rational-limited-integration-wire';
import * as limited from './rational-limited-integration';
import * as hermite from './hermite-reduction';
import * as linear from './linear-system';
import * as derivative from './differential-derivative';
import { rational } from './rational';

type Data = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const mutable = (v: unknown): Data => JSON.parse(JSON.stringify(v)) as Data;
const scalar = (n: string, d = '1') => ({ version: 1, kind: 'rational', domain: 'Q', value: { numerator: n, denominator: d } });
const limits = { work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 };
function fixture(negative = false) {
  const s = setup(), f = s.p([1, 1], [0, 0, 1]), gs = negative ? [s.p([1], [1, 0, 1])] : [s.p([1], [0, 1]), s.p([2], [0, 1]), s.p([0, 2])];
  const decision = limited.solveRationalLimitedIntegration(s.ctx, s.f, f, gs);
  return { ...s, input: f, gs, decision, wire: encode(s.ctx, s.f, f, gs, decision, bounds) };
}
describe('rational limited integration artifacts', () => {
  it.each([0, 3])('replays zero-row systems with %s free columns', columns => {
    const s = setup(), f = s.p([2]), gs = Array.from({ length: columns }, () => s.p([]));
    const decision = limited.solveRationalLimitedIntegration(s.ctx, s.f, f, gs);
    const artifact = encode(s.ctx, s.f, f, gs, decision, bounds);
    const replay = decode(s.ctx, s.f, f, gs, artifact, bounds);
    expect(replay.system.rows).toBe(0); expect(replay.system.columns).toBe(columns);
    expect(replay.kind === 'solutions' && replay.family.directions.length).toBe(columns);
  });
  it.each([false, true])('replays the full decision with all producers disabled (negative=%s)', negative => {
    const s = fixture(negative), t = setup(), f = t.p([1, 1], [0, 0, 1]);
    const gs = negative ? [t.p([1], [1, 0, 1])] : [t.p([1], [0, 1]), t.p([2], [0, 1]), t.p([0, 2])];
    const forbidden = () => { throw Error('producer called during replay'); };
    vi.spyOn(limited, 'solveRationalLimitedIntegration').mockImplementation(forbidden);
    vi.spyOn(hermite, 'hermiteReduce').mockImplementation(forbidden);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
    vi.spyOn(derivative, 'differentiate').mockImplementation(forbidden);
    try {
      const replay = decode(t.ctx, t.f, f, gs, mutable(s.wire), bounds);
      expect(replay.kind).toBe(s.decision.kind); expect(replay.domain).not.toBe(s.decision.domain);
      expect(replay.f.owner).toBe(t.f); expect(Object.isFrozen(replay.reductions)).toBe(true);
      expect(encode(t.ctx, t.f, f, gs, replay, bounds)).toEqual(s.wire);
      expect(() => s.f.assert(t.ctx, replay.f)).toThrow('domain-mismatch');
    } finally { vi.restoreAllMocks(); }
  });
  it.each([
    ['input', (d: Data) => { d.f = d.generators[0]; }],
    ['input order', (d: Data) => { d.generators.reverse(); }],
    ['input coverage', (d: Data) => { d.generators.pop(); }],
    ['reduction index', (d: Data) => { d.reductions[0].index++; }],
    ['missing reduction', (d: Data) => { d.reductions.pop(); }],
    ['Hermite division', (d: Data) => { d.reductions[0].hermite.division.remainder = d.common.denominator; }],
    ['Hermite multiplicity', (d: Data) => { d.reductions[0].hermite.decomposition.factors[0].multiplicity++; }],
    ['Hermite steps', (d: Data) => { d.reductions[0].hermite.blocks[0].steps = []; }],
    ['reduction derivative', (d: Data) => { d.reductions[0].derivative.derivative = d.f; }],
    ['polynomial constant', (d: Data) => { d.reductions[0].normalization.quotient.coefficients = [scalar('1')]; }],
    ['LCM factors', (d: Data) => { d.common.steps = []; }],
    ['LCM gcd', (d: Data) => { d.common.steps[0].gcd.gcd = d.common.denominator; }],
    ['LCM input quotient', (d: Data) => { d.common.steps[0].inputQuotient.coefficients = []; }],
    ['LCM square-free evidence', (d: Data) => { d.common.squareFree.s.coefficients = []; d.common.squareFree.t.coefficients = []; }],
    ['residual quotient', (d: Data) => { d.common.quotients[0].coefficients = []; }],
    ['missing residual numerator', (d: Data) => { d.common.numerators.pop(); }],
    ['matrix column', (d: Data) => { d.system.matrix[0][0] = scalar('2'); }],
    ['matrix sign', (d: Data) => { d.system.rhs[0] = scalar('1'); }],
    ['missing row', (d: Data) => { d.system.rows = 0; d.system.matrix = []; d.system.rhs = []; }],
    ['linear rank', (d: Data) => { d.linear.rank++; }],
    ['linear operation', (d: Data) => { d.linear.operations.push({ kind: 'scale', target: 0, factor: scalar('0') }); }],
    ['nullspace missing', (d: Data) => { d.linear.nullspace.pop(); d.family.directions.pop(); }],
    ['nullspace altered', (d: Data) => { d.linear.nullspace[0][0] = scalar('1'); }],
    ['coefficient pairing', (d: Data) => { d.family.directions[0].coefficients = d.family.directions[1].coefficients; }],
    ['primitive mapping', (d: Data) => { d.family.particular.primitive = d.f; }],
    ['direction derivative', (d: Data) => { d.family.directions[0].derivative.derivative = d.f; }],
    ['constant freedom', (d: Data) => { d.family.additiveConstant = 'none'; }],
    ['input conditions', (d: Data) => { d.conditions.inputs.pop(); }],
    ['condition factor', (d: Data) => { d.conditions.inputs[0] = d.common.denominator; }],
    ['primitive conditions', (d: Data) => { d.conditions.primitives.pop(); }],
    ['rule', (d: Data) => { d.rule = 'non-elementary'; }],
    ['outcome', (d: Data) => { d.kind = 'no-rational-solution'; }],
    ['noncanonical scalar', (d: Data) => { d.system.rhs[0] = scalar('-01'); }],
    ['noncanonical fraction', (d: Data) => { d.f.denominator.coefficients.push(scalar('0')); }],
    ['extra trusted flag', (d: Data) => { d.verified = true; }],
  ] as const)('rejects altered %s', (_name, change) => {
    const s = fixture(), data = mutable(s.wire); change(data.decision);
    expect(() => decode(s.ctx, s.f, s.input, s.gs, data, bounds)).toThrow();
  });
  it('rejects negative witness tampering and a false positive envelope', () => {
    const s = fixture(true), data = mutable(s.wire);
    data.decision.linear.witness = data.decision.linear.witness.map(() => scalar('0'));
    expect(() => decode(s.ctx, s.f, s.input, s.gs, data, bounds)).toThrow('verification-failed');
    const bad = mutable(s.wire); bad.decision.kind = 'solutions';
    expect(() => decode(s.ctx, s.f, s.input, s.gs, bad, bounds)).toThrow('verification-failed');
  });
  it('checks expected values, original order, variable binding and envelope version', () => {
    const s = fixture();
    expect(() => decode(s.ctx, s.f, s.p([1]), s.gs, s.wire, bounds)).toThrow('verification-failed');
    expect(() => decode(s.ctx, s.f, s.input, [...s.gs].reverse(), s.wire, bounds)).toThrow('verification-failed');
    const bad = mutable(s.wire); bad.version = 2;
    expect(() => decode(s.ctx, s.f, s.input, s.gs, bad, bounds)).toThrow('invalid-input');
    bad.version = 1; bad.variable = 'y';
    expect(() => decode(s.ctx, s.f, s.input, s.gs, bad, bounds)).toThrow('domain-mismatch');
    expect(() => decode(s.ctx, setup().f, s.input, s.gs, s.wire, bounds)).toThrow('domain-mismatch');
  });
  it.each(['artifactDepth', 'artifactNodes', 'artifactBytes'] as const)('bounds the entire envelope before nested decode: %s', key => {
    const s = fixture(), ctx = new ExecutionContext(limits);
    const spy = vi.spyOn(limited, 'limitedIntegrationDomain');
    try {
      expect(() => decode(ctx, s.f, s.input, s.gs, s.wire, { ...bounds, [key]: 1 })).toThrow('resource-limit');
      expect(spy).not.toHaveBeenCalled(); expect(() => ctx.tick()).toThrow('resource-limit');
    } finally { vi.restoreAllMocks(); }
  });
  it('rejects sparse, cyclic, accessor and extra-field artifacts without reading accessors', () => {
    const s = fixture(), bad = mutable(s.wire), getter = vi.fn(() => bad);
    Object.defineProperty(bad, 'decision', { get: getter, enumerable: true });
    expect(() => decode(s.ctx, s.f, s.input, s.gs, bad, bounds)).toThrow('invalid-input'); expect(getter).not.toHaveBeenCalled();
    const cycle = mutable(s.wire); cycle.decision = cycle;
    expect(() => decode(s.ctx, s.f, s.input, s.gs, cycle, bounds)).toThrow('invalid-input');
    const sparse = mutable(s.wire); delete sparse.decision.generators[0];
    expect(() => decode(s.ctx, s.f, s.input, s.gs, sparse, bounds)).toThrow('invalid-input');
  });
  it('does not reuse a prior successful proof after mutable evidence changes in the same context', () => {
    const s = fixture(); if (s.decision.kind !== 'solutions') throw Error('fixture');
    const coefficients = [...s.decision.family.particular.coefficients];
    const changed = { ...s.decision, family: { ...s.decision.family, particular: { ...s.decision.family.particular, coefficients } } };
    limited.verifyRationalLimitedIntegration(s.ctx, s.f, s.input, s.gs, changed);
    coefficients[0] = rational(s.ctx, 7n);
    expect(() => limited.verifyRationalLimitedIntegration(s.ctx, s.f, s.input, s.gs, changed)).toThrow('verification-failed');
    expect(Object.isFrozen(coefficients)).toBe(false);
  });
  it('exhausts during decode with each arithmetic limit and never returns a negative decision', () => {
    const s = fixture();
    for (const change of [{ work: 1000 }, { allocation: 1000 }, { integerBits: 1 }, { degree: 1 }]) {
      const ctx = new ExecutionContext({ ...limits, ...change });
      expect(() => decode(ctx, s.f, s.input, s.gs, s.wire, bounds)).toThrow('resource-limit');
    }
  });
  it('exhausts after reduction construction and during independent proof checking with no decision', () => {
    const s = fixture(), solveContext = new ExecutionContext(limits), verifyContext = new ExecutionContext(limits);
    limited.solveRationalLimitedIntegration(solveContext, s.f, s.input, s.gs);
    limited.verifyRationalLimitedIntegration(verifyContext, s.f, s.input, s.gs, s.decision);
    const solveBudget = new ExecutionContext({ ...limits, work: solveContext.usage.work - 1 });
    const verifyBudget = new ExecutionContext({ ...limits, work: verifyContext.usage.work - 1 });
    expect(() => limited.solveRationalLimitedIntegration(solveBudget, s.f, s.input, s.gs)).toThrow('resource-limit');
    expect(() => limited.verifyRationalLimitedIntegration(verifyBudget, s.f, s.input, s.gs, s.decision)).toThrow('resource-limit');
    expect(() => verifyBudget.tick()).toThrow('resource-limit');
  });
});
