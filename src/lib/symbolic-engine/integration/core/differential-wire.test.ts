import { describe, expect, it, vi } from 'vitest';
import { bounds, setup } from './differential-test-support';
import { DifferentialField as DF } from './differential-field';
import { differentiate, verifyDerivative } from './differential-derivative';
import { buildExponential, buildLogarithm } from './differential-admission';
import { decodeDifferentialArtifact, encodeDifferentialArtifact } from './differential-wire';
import { ExecutionContext } from './execution';
import * as derivatives from './differential-derivative';
import * as admissions from './differential-admission';

function fixture(kind: 'formal' | 'exp' | 'log' = 'exp') {
  const s = setup(), { ctx, f, x, p } = s;
  const result = kind === 'formal' ? undefined : kind === 'exp'
    ? buildExponential(ctx, f, 't', [p([1], [0, 1]), p([-2], [0, 1])], bounds)
    : buildLogarithm(ctx, f, 't', p([-1, 1], [1, 1]), bounds);
  if (result && result.status !== 'supported') throw new Error('fixture');
  const owner = result?.field ?? DF.formal(ctx, f, 't', [x, p([1])], bounds);
  const value = owner.add(ctx, owner.generator(ctx), owner.embed(ctx, x));
  const proof = differentiate(ctx, owner, value);
  const selection = { elements: [value, x], derivatives: [proof] };
  const wire = encodeDifferentialArtifact(ctx, owner, selection, bounds);
  return { ...s, owner, value, proof, wire, selection };
}
// Deliberately mutable JSON fixture type for attacks on otherwise immutable evidence.
type Data = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
function mutable(wire: unknown): Data { return JSON.parse(JSON.stringify(wire)) as Data; }

describe('differential field artifacts', () => {
  it.each(['formal', 'exp', 'log'] as const)('reconstructs fresh %s owners and replays without producers', kind => {
    const { ctx, owner, wire, selection } = fixture(kind);
    vi.spyOn(derivatives, 'differentiate').mockImplementation(() => { throw new Error('producer called'); });
    vi.spyOn(admissions, 'buildExponential').mockImplementation(() => { throw new Error('producer called'); });
    vi.spyOn(admissions, 'buildLogarithm').mockImplementation(() => { throw new Error('producer called'); });
    try {
      const replay = decodeDifferentialArtifact(ctx, owner, wire, bounds);
      expect(replay.owner).not.toBe(owner);
      expect(replay.owner.identity).not.toBe(owner.identity);
      expect(replay.elements.length).toBe(selection.elements.length);
      expect(encodeDifferentialArtifact(ctx, replay.owner, replay, bounds)).toEqual(wire);
      expect(() => owner.assert(ctx, replay.elements[0])).toThrow('domain-mismatch');
      expect(Object.isFrozen(replay.derivatives[0])).toBe(true);
    } finally { vi.restoreAllMocks(); }
  });
  it('replays a deeper formal extension above a certified field', () => {
    const { ctx, owner, value } = fixture('log');
    const upper = DF.formal(ctx, owner, 'u', [value], bounds), input = upper.generator(ctx);
    const selection = { elements: [input], derivatives: [differentiate(ctx, upper, input)] };
    const wire = encodeDifferentialArtifact(ctx, upper, selection, bounds);
    const replay = decodeDifferentialArtifact(ctx, upper, wire, bounds);
    expect(replay.owner.constantField).toBe('unestablished');
    expect(replay.owner.parent?.constantField).toBe('Q');
    expect(encodeDifferentialArtifact(ctx, replay.owner, replay, bounds)).toEqual(wire);
  });
  it('replays Q and Q(x) with exact large coefficients', () => {
    const { ctx, q, f, c, p } = setup();
    for (const [owner, value] of [[q, c(9007199254740993n)], [f, p([9007199254740993n, 1])]] as const) {
      const proof = differentiate(ctx, owner, value), selection = { elements: [value], derivatives: [proof] };
      const wire = encodeDifferentialArtifact(ctx, owner, selection, bounds);
      expect(JSON.stringify(wire)).toContain('9007199254740993');
      const replay = decodeDifferentialArtifact(ctx, owner, wire, bounds);
      expect(encodeDifferentialArtifact(ctx, replay.owner, replay, bounds)).toEqual(wire);
    }
  });
  it('rejects a different expected construction even with identical printed names', () => {
    const { ctx, f, p, owner, wire } = fixture('formal');
    const other = DF.formal(ctx, f, 't', [p([2])], bounds);
    expect(() => decodeDifferentialArtifact(ctx, other, wire, bounds)).toThrow('domain-mismatch');
    const changed = mutable(wire); changed.construction[2].variable = 'u';
    expect(() => decodeDifferentialArtifact(ctx, owner, changed, bounds)).toThrow('domain-mismatch');
  });
  it.each([
    ['forward reference', (w: Data) => { w.construction[2].rule[1].level = 2; }],
    ['missing derivative', (w: Data) => { delete w.construction[2].admission.derivative; }],
    ['changed alias', (w: Data) => { w.construction[2].admission.exponents[1] = '3'; }],
    ['lost condition', (w: Data) => { w.construction[2].admission.conditions = []; }],
    ['changed obstruction', (w: Data) => { w.construction[2].admission.obstruction = 'polynomial-part'; }],
    ['wrong candidate', (w: Data) => { w.derivatives[0].derivative = w.derivatives[0].input; }],
    ['noncanonical integer', (w: Data) => { w.construction[1].rule[0].scalar[0] = '01'; }],
    ['noncanonical scalar', (w: Data) => { w.construction[1].rule[0].scalar = ['2', '2']; }],
    ['changed base rule', (w: Data) => { w.construction[1].rule[0].scalar = ['2', '1']; }],
    ['noncanonical polynomial', (w: Data) => { w.construction[1].rule.push({ level: 0, scalar: ['0', '1'] }); }],
    ['unknown property', (w: Data) => { w.trusted = true; }],
  ])('rejects %s', (_name, mutate) => {
    const { ctx, owner, wire } = fixture(), changed = mutable(wire);
    (mutate as (w: Data) => void)(changed);
    expect(() => decodeDifferentialArtifact(ctx, owner, changed, bounds)).toThrow();
  });
  it('rejects residue mutation, noncanonical fractions and cyclic/accessor data', () => {
    const { ctx, owner, wire } = fixture('log');
    const residue = mutable(wire); residue.construction[2].admission.residue = '7';
    expect(() => decodeDifferentialArtifact(ctx, owner, residue, bounds)).toThrow('verification-failed');
    const fraction = mutable(wire); fraction.elements[1].denominator[0].scalar[0] = '2';
    expect(() => decodeDifferentialArtifact(ctx, owner, fraction, bounds)).toThrow('noncanonical fraction');
    const cycle = mutable(wire); cycle.elements.push(cycle);
    expect(() => decodeDifferentialArtifact(ctx, owner, cycle, bounds)).toThrow('cyclic artifact');
    const getter = vi.fn(() => 'secret'); const accessor = mutable(wire);
    Object.defineProperty(accessor, 'tag', { enumerable: true, get: getter });
    expect(() => decodeDifferentialArtifact(ctx, owner, accessor, bounds)).toThrow('accessor');
    expect(getter).not.toHaveBeenCalled();
  });
  it.each(['artifactDepth', 'artifactNodes', 'artifactBytes', 'towerHeight'] as const)('bounds %s with sticky failure', key => {
    const { ctx, owner, wire } = fixture();
    expect(() => decodeDifferentialArtifact(ctx, owner, wire, { ...bounds, [key]: 1 })).toThrow('resource-limit');
    expect(() => ctx.tick()).toThrow('resource-limit');
  });
  it('exhausts integer/work/allocation limits in fresh construction, replay and final checking', () => {
    const { ctx, owner, wire, value, proof } = fixture();
    for (const limits of [{ ...ctx.limits, work: 0 }, { ...ctx.limits, allocation: 0 }, { ...ctx.limits, integerBits: 1 }]) {
      expect(() => decodeDifferentialArtifact(new ExecutionContext(limits), owner, wire, bounds)).toThrow('resource-limit');
    }
    const measured = new ExecutionContext(ctx.limits);
    verifyDerivative(measured, owner, value, proof);
    const produced = new ExecutionContext(ctx.limits);
    differentiate(produced, owner, value);
    expect(() => differentiate(new ExecutionContext({ ...ctx.limits, work: produced.usage.work - 1 }), owner, value)).toThrow('resource-limit');
    const low = new ExecutionContext({ ...ctx.limits, work: measured.usage.work - 1 });
    expect(() => verifyDerivative(low, owner, value, proof)).toThrow('resource-limit');
    const fresh = new ExecutionContext({ ...ctx.limits, allocation: 0 });
    expect(() => DF.rationals(fresh, bounds)).toThrow('resource-limit');
  });
  it('records representative construction, differentiation and replay costs', () => {
    const start = performance.now(), { ctx, owner, wire } = fixture();
    const constructed = performance.now(), before = ctx.usage;
    decodeDifferentialArtifact(ctx, owner, wire, bounds);
    console.info('differential-field metrics', JSON.stringify({ constructionMs: constructed - start,
      construction: before, replayMs: performance.now() - constructed,
      replay: { work: ctx.usage.work - before.work, allocation: ctx.usage.allocation - before.allocation } }));
  });
});
