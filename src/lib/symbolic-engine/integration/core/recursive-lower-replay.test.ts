import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import * as rde from './rational-parametric-rde';
import * as relations from './rational-logarithmic-relations';
import * as roots from './recursive-integer-roots';
import * as oldRoots from './rde-integer-roots';
import * as factor from './recursive-polynomial-factorization';
import * as integerFactor from './factorization-rational';
import * as linear from './linear-system';
import * as derivative from './differential-derivative';
import * as denominator from './rde-denominator';
import * as comparison from './recursive-coefficient-system';
import { encodeRationalParametricRde, decodeRationalParametricRde } from './rational-parametric-rde-wire';
import { encodeRationalLogarithmicRelations, decodeRationalLogarithmicRelations } from './rational-logarithmic-relations-wire';
import { recursiveIntegerRootsEvidenceCodec } from './recursive-integer-roots-wire';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { PolynomialRing } from './polynomial';
import { DifferentialField } from './differential-field';
import { ExecutionContext } from './execution';

type Data = {[key: string]: any}; // eslint-disable-line @typescript-eslint/no-explicit-any
const copy = (v: unknown): Data => JSON.parse(JSON.stringify(v)) as Data;
const forbidden = () => { throw Error('producer during replay'); };

describe('independent replay of recursive lower-field evidence', () => {
  it.each([false, true])('replays rational affine RDEs with producers disabled (negative=%s)', negative => {
    const s = setup(), a = s.p(negative ? [0, 2] : []), b = s.p([1], negative ? undefined : [0, 1]);
    const bs = negative ? [] : [b, s.p([2], [0, 1]), s.p([])], e = rde.solveRationalParametricRde(s.ctx, s.f, a, b, bs);
    const data = encodeRationalParametricRde(s.ctx, s.f, a, b, bs, e, bounds);
    const t = setup(), aa = t.p(negative ? [0, 2] : []), bb = t.p([1], negative ? undefined : [0, 1]);
    const gs = negative ? [] : [bb, t.p([2], [0, 1]), t.p([])];
    vi.spyOn(rde, 'solveRationalParametricRde').mockImplementation(forbidden);
    vi.spyOn(denominator, 'boundDenominator').mockImplementation(forbidden);
    vi.spyOn(oldRoots, 'positiveIntegerRoots').mockImplementation(forbidden);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
    vi.spyOn(derivative, 'differentiate').mockImplementation(forbidden);
    try {
      const replay = decodeRationalParametricRde(t.ctx, t.f, aa, bb, gs, copy(data), bounds);
      expect(replay.kind).toBe(e.kind); expect(replay.domain).not.toBe(e.domain);
      expect(encodeRationalParametricRde(t.ctx, t.f, aa, bb, gs, replay, bounds)).toEqual(data);
    } finally { vi.restoreAllMocks(); }
  });
  it.each([false, true])('replays complete logarithmic relation spaces without search (no relation=%s)', negative => {
    const s = setup(), inputs = negative ? [s.p([1], [0, 0, 1])] : [s.p([1], [0, 1]), s.p([0, 1], [1, 0, 1]), s.p([])];
    const e = relations.solveRationalLogarithmicDerivativeRelations(s.ctx, s.f, inputs, bounds);
    const data = encodeRationalLogarithmicRelations(s.ctx, s.f, inputs, e, bounds), t = setup();
    const expected = negative ? [t.p([1], [0, 0, 1])] : [t.p([1], [0, 1]), t.p([0, 1], [1, 0, 1]), t.p([])];
    vi.spyOn(relations, 'solveRationalLogarithmicDerivativeRelations').mockImplementation(forbidden);
    vi.spyOn(factor, 'factorRecursivePolynomial').mockImplementation(forbidden);
    vi.spyOn(integerFactor, 'factorRationalPolynomial').mockImplementation(forbidden);
    vi.spyOn(comparison, 'descendCoefficientSystem').mockImplementation(forbidden);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
    vi.spyOn(derivative, 'differentiate').mockImplementation(forbidden);
    try {
      const replay = decodeRationalLogarithmicRelations(t.ctx, t.f, expected, copy(data), bounds);
      expect(replay.basis.length).toBe(e.basis.length);
      expect(encodeRationalLogarithmicRelations(t.ctx, t.f, expected, replay, bounds)).toEqual(data);
    } finally { vi.restoreAllMocks(); }
  });
  it.each([true, false])('replays zero and signed indicial polynomials without root search (zero=%s)', zero => {
    const s = setup(), ring = new PolynomialRing(s.f, 'm'), input = zero ? ring.zero(s.ctx) : ring.make(s.ctx, [s.p([-4]), s.p([]), s.p([1])]);
    const e = roots.integerRootsRecursive(s.ctx, ring, input, bounds), data = recursiveIntegerRootsEvidenceCodec(s.ctx, ring, bounds).encode(e);
    const t = setup(), tr = new PolynomialRing(t.f, 'm'), tp = zero ? tr.zero(t.ctx) : tr.make(t.ctx, [t.p([-4]), t.p([]), t.p([1])]);
    vi.spyOn(roots, 'integerRootsRecursive').mockImplementation(forbidden);
    vi.spyOn(oldRoots, 'positiveIntegerRoots').mockImplementation(forbidden);
    vi.spyOn(comparison, 'descendCoefficientSystem').mockImplementation(forbidden);
    try {
      const replay = recursiveIntegerRootsEvidenceCodec(t.ctx, tr, bounds).decode(copy(data));
      roots.verifyRecursiveIntegerRoots(t.ctx, tr, tp, replay, bounds);
      expect(replay.kind).toBe(e.kind);
    } finally { vi.restoreAllMocks(); }
  });
  it('replays nested coefficient conversions in a fresh auxiliary domain', () => {
    const s = setup(), t = DifferentialField.formal(s.ctx, s.f, 't', [s.p([1])], bounds), v = t.generator(s.ctx);
    const input = {rows: 1, columns: 1, matrix: [[v]], rhs: [v]};
    const e = comparison.descendCoefficientSystem(s.ctx, t, input, bounds), codec = coefficientSystemCodec(s.ctx, t, bounds);
    const replay = codec.decode(copy(codec.encode(e))); comparison.verifyCoefficientSystem(s.ctx, t, input, replay, bounds);
    expect(replay.auxiliary).not.toBe(e.auxiliary);
  });
  it('rejects mutated artifacts, wrong expected requests, noncanonical data and overflow', () => {
    const s = setup(), a = s.p([]), b = s.p([1]), bs = [b], e = rde.solveRationalParametricRde(s.ctx, s.f, a, b, bs);
    const wire = encodeRationalParametricRde(s.ctx, s.f, a, b, bs, e, bounds);
    for (const mutate of [
      (d: Data) => { d.decision.clearing.C.pop(); },
      (d: Data) => { d.decision.family.directions.pop(); },
      (d: Data) => { d.decision.linear.nullspace.pop(); },
      (d: Data) => { d.decision.polynomial.degree.bound = '0'; },
      (d: Data) => { d.decision.conditions.inputs = []; },
      (d: Data) => { d.decision.verified = true; },
    ]) {
      const bad = copy(wire); mutate(bad);
      expect(() => decodeRationalParametricRde(s.ctx, s.f, a, b, bs, bad, bounds)).toThrow();
    }
    expect(() => decodeRationalParametricRde(s.ctx, s.f, a, s.p([2]), bs, wire, bounds)).toThrow('verification-failed');
    expect(() => decodeRationalParametricRde(s.ctx, s.f, a, b, bs, wire, {...bounds, artifactBytes: 1})).toThrow('resource-limit');
    expect(() => decodeRationalParametricRde(new ExecutionContext({...s.ctx.limits, work: 0}), s.f, a, b, bs, wire, bounds)).toThrow('resource-limit');
  });
});
