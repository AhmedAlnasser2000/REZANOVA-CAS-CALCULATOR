import { describe, expect, it, vi } from 'vitest';
import { bounds, setup } from './differential-test-support';
import { ExecutionContext } from './execution';
import { encodeRationalRde, decodeRationalRde } from './rational-rde-wire';
import * as rde from './rational-rde';
import * as roots from './rde-integer-roots';
import * as denominator from './rde-denominator';
import * as polynomial from './rde-polynomial';
import * as algebra from './rde-algebra';
import * as linear from './linear-system';
import * as derivatives from './differential-derivative';
import * as prs from './subresultant';

// Mutable JSON is deliberately used to attack the serialized certificates.
type Data = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const scalar = (n: string, d = '1') => ({ version: 1, kind: 'rational', domain: 'Q', value: { numerator: n, denominator: d } });
const mutable = (v: unknown): Data => JSON.parse(JSON.stringify(v)) as Data;
function fixture(negative = false) {
  const s = setup(), a = negative ? s.p([]) : s.p([-1, 3], [-1, 0, 1]), b = negative ? s.p([1], [0, 1]) : s.p([]);
  const decision = rde.solveRationalRde(s.ctx, s.f, a, b);
  const wire = encodeRationalRde(s.ctx, s.f, a, b, decision, bounds);
  return { ...s, a, b, decision, wire };
}
describe('rational RDE decision artifacts', () => {
  it.each([false, true])('replays a complete decision (negative=%s) with producers disabled', negative => {
    const s = fixture(negative), t = setup();
    const a = negative ? t.p([]) : t.p([-1, 3], [-1, 0, 1]), b = negative ? t.p([1], [0, 1]) : t.p([]);
    const forbidden = () => { throw new Error('producer invoked during replay'); };
    vi.spyOn(rde, 'solveRationalRde').mockImplementation(forbidden);
    vi.spyOn(roots, 'positiveIntegerRoots').mockImplementation(forbidden);
    vi.spyOn(denominator, 'boundDenominator').mockImplementation(forbidden);
    vi.spyOn(algebra, 'clearRde').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'polynomialEquation').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'degreeBound').mockImplementation(forbidden);
    vi.spyOn(polynomial, 'rdeMatrix').mockImplementation(forbidden);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
    vi.spyOn(derivatives, 'differentiate').mockImplementation(forbidden);
    vi.spyOn(prs, 'subresultants').mockImplementation(forbidden);
    try {
      const replay = decodeRationalRde(t.ctx, t.f, a, b, mutable(s.wire), bounds);
      expect(replay.kind).toBe(s.decision.kind);
      expect(replay.domain.owner).toBe(t.f); expect(replay.domain.orders).not.toBe(s.decision.domain.orders);
      expect(encodeRationalRde(t.ctx, t.f, a, b, replay, bounds)).toEqual(s.wire);
      expect(Object.isFrozen(replay.denominator.blocks)).toBe(true);
      expect(Object.isFrozen(replay.linear)).toBe(true);
      expect(() => s.f.assert(t.ctx, replay.a)).toThrow('domain-mismatch');
    } finally { vi.restoreAllMocks(); }
  });
  it.each([
    ['clearing quotient', (d: Data) => { d.clearing.quotientA = d.a.numerator; }],
    ['missing pole factor', (d: Data) => { d.denominator.squareFree.factors = []; }],
    ['factor multiplicity', (d: Data) => { d.denominator.squareFree.factors[0].multiplicity++; }],
    ['Hasse recurrence', (d: Data) => { d.denominator.hasseA[1] = d.denominator.hasseA[0]; }],
    ['valuation split', (d: Data) => { d.denominator.blocks[0].valuationSplits[0].gcd = d.a.denominator; }],
    ['missing resultant indices', (d: Data) => { d.denominator.blocks[0].resonance.resultant.indexed = []; }],
    ['resultant degree', (d: Data) => { d.denominator.blocks[0].resonance.resultant.inputDegrees[0]++; }],
    ['indicial leading unit', (d: Data) => { d.denominator.blocks[0].resonance.leadingUnit.s = d.a.numerator; }],
    ['missing resonance root', (d: Data) => { d.denominator.blocks[0].resonance.integers.roots.pop(); }],
    ['missing root interval', (d: Data) => { d.denominator.blocks[0].resonance.integers.intervals.shift(); }],
    ['duplicate root interval', (d: Data) => { d.denominator.blocks[0].resonance.integers.intervals.push(d.denominator.blocks[0].resonance.integers.intervals[0]); }],
    ['missing split', (d: Data) => { d.denominator.blocks[0].resonance.splits.pop(); }],
    ['degree bound', (d: Data) => { d.degree.bound = '1'; }],
    ['missing nullspace', (d: Data) => { d.linear.nullspace = []; }],
    ['altered homogeneous value', (d: Data) => { d.solution.homogeneous[0] = d.solution.particular; }],
    ['derivative tangent', (d: Data) => { d.solution.derivatives[1].derivative = d.solution.derivatives[1].input; }],
    ['missing condition', (d: Data) => { d.conditions.coefficients.pop(); }],
    ['extra universal-denominator condition', (d: Data) => { d.conditions.solutions.push(d.denominator.denominator); }],
    ['noncanonical bound', (d: Data) => { d.degree.bound = '01'; }],
    ['noncanonical scalar', (d: Data) => { d.a.numerator.coefficients[0] = scalar('2', '2'); }],
    ['noncanonical polynomial', (d: Data) => { d.a.numerator.coefficients.push(scalar('0')); }],
    ['noncanonical fraction', (d: Data) => { d.a.denominator.coefficients[2] = scalar('2'); }],
    ['foreign variable', (d: Data) => { d.a.numerator.variable = 'y'; }],
    ['trusted flag', (d: Data) => { d.verified = true; }],
  ] as const)('rejects %s', (_name, mutate) => {
    const s = fixture(), changed = mutable(s.wire); mutate(changed.decision);
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, changed, bounds)).toThrow();
  });
  it('rejects altered matrix coefficients and row operations in nonempty systems', () => {
    const s = setup(), a = s.p([1]), b = s.p([1, 1]), proof = rde.solveRationalRde(s.ctx, s.f, a, b);
    const wire = encodeRationalRde(s.ctx, s.f, a, b, proof, bounds), matrix = mutable(wire);
    matrix.decision.system.matrix[0][0] = scalar('7');
    expect(() => decodeRationalRde(s.ctx, s.f, a, b, matrix, bounds)).toThrow('verification-failed');
    const ops = mutable(wire); ops.decision.linear.operations = [];
    expect(() => decodeRationalRde(s.ctx, s.f, a, b, ops, bounds)).toThrow('verification-failed');
  });
  it('rejects altered inconsistency witnesses and expected inputs', () => {
    const s = fixture(true), w = mutable(s.wire); w.decision.linear.witness[0] = scalar('0');
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, w, bounds)).toThrow('verification-failed');
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.p([]), s.wire, bounds)).toThrow('verification-failed');
    const changed = mutable(s.wire); changed.variable = 'y';
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, changed, bounds)).toThrow('domain-mismatch');
  });
  it('preserves input and stored evidence without trusting earlier replay', () => {
    const s = fixture(), w = mutable(s.wire), saved = JSON.stringify(w);
    decodeRationalRde(s.ctx, s.f, s.a, s.b, w, bounds); expect(JSON.stringify(w)).toBe(saved);
    expect(Object.isFrozen(w.decision)).toBe(false); w.decision.conditions.solutions = [];
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, w, bounds)).toThrow('verification-failed');
  });
  it('rejects cyclic, sparse, accessor and incomplete nested evidence without evaluating getters', () => {
    const s = fixture(), cyclic = mutable(s.wire); cyclic.decision.extra = cyclic;
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, cyclic, bounds)).toThrow('cyclic artifact');
    const sparse = mutable(s.wire); delete sparse.decision.denominator.hasseA[0];
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, sparse, bounds)).toThrow('artifact array');
    const getter = vi.fn(), accessor = mutable(s.wire);
    Object.defineProperty(accessor, 'decision', { enumerable: true, get: getter });
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, accessor, bounds)).toThrow('accessor'); expect(getter).not.toHaveBeenCalled();
    const missing = mutable(s.wire); delete missing.decision.polynomial.common;
    expect(() => decodeRationalRde(s.ctx, s.f, s.a, s.b, missing, bounds)).toThrow('invalid-input');
  });
  it.each(['artifactDepth', 'artifactNodes', 'artifactBytes'] as const)('bounds %s with sticky exhaustion', key => {
    const s = fixture(), ctx = new ExecutionContext(s.ctx.limits);
    expect(() => decodeRationalRde(ctx, s.f, s.a, s.b, s.wire, { ...bounds, [key]: 1 })).toThrow('resource-limit');
    expect(() => ctx.tick()).toThrow('resource-limit');
  });
  it('bounds fresh replay arithmetic, integer conversion and final verification', () => {
    const s = fixture();
    for (const limits of [{ work: 0 }, { allocation: 0 }, { integerBits: 1 }, { degree: 0 }]) {
      expect(() => decodeRationalRde(new ExecutionContext({ ...s.ctx.limits, ...limits }), s.f, s.a, s.b, s.wire, bounds)).toThrow('resource-limit');
    }
    const measure = new ExecutionContext(s.ctx.limits); decodeRationalRde(measure, s.f, s.a, s.b, s.wire, bounds);
    expect(() => decodeRationalRde(new ExecutionContext({ ...s.ctx.limits, work: measure.usage.work - 1 }), s.f, s.a, s.b, s.wire, bounds)).toThrow('resource-limit');
  });
});
