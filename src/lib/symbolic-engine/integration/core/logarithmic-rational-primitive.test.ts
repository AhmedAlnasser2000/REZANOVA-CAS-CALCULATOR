import { afterEach, describe, expect, it, vi } from 'vitest';
import { logarithmicSetup } from './__tests__/logarithmic-rational-fixtures';
import { bounds } from './differential-test-support';
import { AlgebraError, ExecutionContext } from './execution';
import * as admission from './differential-admission';
import * as derivatives from './differential-derivative';
import * as prs from './subresultant';
import * as trace from './quotient-trace';
import { LogarithmicRationalDomain } from './logarithmic-rational-domain';
import { ExponentialRationalDomain } from './exponential-rational-domain';
import { logarithmicLogTerm, logarithmicPrimitive, differentiateLogarithmicPrimitive, verifyLogarithmicPrimitive } from './logarithmic-rational-primitive';
import { logarithmicConditions } from './logarithmic-rational-conditions';
import { encodeLogarithmicRationalPrimitive, decodeLogarithmicRationalPrimitive } from './logarithmic-rational-primitive-wire';
import { FormalPrimitiveDomain } from './formal-primitive';
import { toRationalPrimitiveInput } from './exponential-sum-bridge';
import { integrateRational } from './rational-decision';
import { embedRationalPrimitive, verifyRationalPrimitiveEmbedding } from './logarithmic-rational-bridge';

afterEach(() => vi.restoreAllMocks());
function saved(s = logarithmicSetup()) {
  const term = logarithmicLogTerm(s.ctx, s.d, s.Q([1, 0, 1]), s.Q([0, 1]), s.d.fz.make(s.ctx, [s.t, s.C(-1)]));
  const primitive = logarithmicPrimitive(s.ctx, s.d, s.F.inverse(s.ctx, s.t), [term]);
  const derivative = differentiateLogarithmicPrimitive(s.ctx, primitive, bounds), target = derivative.derivative;
  return { s, target, primitive, derivative, conditions: logarithmicConditions(s.ctx, s.d, target, primitive) };
}
describe('logarithmic rational primitive checkpoint', () => {
  it.each([{ n: [0, 1], d: [1] }, { n: [0, 0, 1], d: [1] }, { n: [1], d: [0, 1] }, { n: [-1, 1], d: [1, 1] }])('checks total coefficient derivatives for argument $n/$d', ({ n, d }) => {
    const s = logarithmicSetup(n, d), g = s.F.add(s.ctx, s.t, s.F.embed(s.ctx, s.x));
    const term = logarithmicLogTerm(s.ctx, s.d, s.Q([0, 1]), s.Q([1]), s.d.fz.constant(s.ctx, g));
    const p = logarithmicPrimitive(s.ctx, s.d, s.C(0), [term]);
    const target = s.F.exactDivide(s.ctx, s.F.embed(s.ctx, s.f.add(s.ctx, s.a, s.f.fromInteger(s.ctx, 1n))), g);
    const proof = differentiateLogarithmicPrimitive(s.ctx, p, bounds);
    verifyLogarithmicPrimitive(new ExecutionContext(s.ctx.limits), p, target, proof, bounds);
    expect(Object.isFrozen(p) && Object.isFrozen(p.terms) && Object.isFrozen(term)).toBe(true);
  });
  it.each([[-1, 0, 1], [1, 0, 1], [-1, -1, 0, 0, 0, 1]].map(q => ({ q })))('checks all roots of $q without treating a reducible modulus as a field', ({ q }) => {
    const s = logarithmicSetup(), term = logarithmicLogTerm(s.ctx, s.d, s.Q(q), s.Q([1]), s.d.fz.make(s.ctx, [s.t, s.C(-1)]));
    const p = logarithmicPrimitive(s.ctx, s.d, s.C(0), [term]);
    const at = (cs: number[]) => cs.reduceRight((v, c) => s.F.add(s.ctx, s.F.multiply(s.ctx, v, s.t), s.C(c)), s.C(0));
    const target = s.F.exactDivide(s.ctx, s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), at(q.slice(1).map((c, i) => c * (i + 1)))), at(q));
    verifyLogarithmicPrimitive(s.ctx, p, target, differentiateLogarithmicPrimitive(s.ctx, p, bounds), bounds);
  });
  it('rejects repeated roots and an argument zero on one component', () => {
    const s = logarithmicSetup();
    expect(() => logarithmicLogTerm(s.ctx, s.d, s.Q([1, -2, 1]), s.Q([1]), s.d.fz.one(s.ctx))).toThrow();
    expect(() => logarithmicLogTerm(s.ctx, s.d, s.Q([-1, 0, 1]), s.Q([1]), s.d.fz.make(s.ctx, [s.C(-1), s.C(1)]))).toThrow();
  });
  it('embeds rational root-log primitives with exact binding and norm conditions', () => {
    const s = logarithmicSetup(), owner = new FormalPrimitiveDomain('x', 'z'), input = s.p([1], [1, 0, 1]);
    const source = integrateRational(s.ctx, owner, toRationalPrimitiveInput(s.ctx, s.f, owner, input));
    const p = embedRationalPrimitive(s.ctx, s.d, source.primitive);
    verifyRationalPrimitiveEmbedding(s.ctx, s.d, source.primitive, p);
    verifyLogarithmicPrimitive(s.ctx, p, s.F.embed(s.ctx, input), differentiateLogarithmicPrimitive(s.ctx, p, bounds), bounds);
    expect(() => verifyRationalPrimitiveEmbedding(s.ctx, s.d, source.primitive, { ...p, terms: [] })).toThrow();
  });
  it('retains log construction zeros/poles, inverse-t restrictions and log norms', () => {
    const { s, target, primitive } = saved(logarithmicSetup([-1, 1], [1, 1]));
    const conditions = logarithmicConditions(s.ctx, s.d, target, primitive);
    for (const label of ['numerator', 'denominator']) expect(conditions.some(c => c.path === `construction.argument.${label}`)).toBe(true);
    expect(conditions.some(c => c.category === 'outer-denominator' && c.path === 'primitive.field' && s.F.equal(s.ctx, c.value, s.t))).toBe(true);
    expect(conditions.some(c => c.category === 'log-norm')).toBe(true);
  });
  it.each(['weight', 'argument', 'norm', 'inverse', 'modulus', 'trace', 'columns', 'field', 'target', 'coefficient', 'coverage'])('rejects mutated %s', mutation => {
    const { s, target, primitive: p, derivative: proof } = saved();
    const term = { ...p.terms[0] }, part = { ...proof.terms[0] }, evidence = { ...proof, terms: [part] };
    if (mutation === 'weight') term.weight = s.Q([2]);
    if (mutation === 'argument') term.argument = s.d.fz.constant(s.ctx, s.t);
    if (mutation === 'norm') term.norm = s.C(1);
    if (mutation === 'inverse') term.inverse = { kind: 'zero' };
    if (mutation === 'modulus') term.modulus = s.Q([-2, 1]);
    if (mutation === 'trace') part.trace = { ...part.trace, trace: s.C(1) };
    if (mutation === 'columns') part.trace = { ...part.trace, columns: [] };
    if (mutation === 'field') evidence.field = { ...proof.field, derivative: s.C(1) };
    if (mutation === 'target') evidence.derivative = s.C(1);
    if (mutation === 'coefficient') part.coefficients = [{ input: term.argument.coefficients[0], derivative: s.C(0) }];
    if (mutation === 'coverage') evidence.terms = [];
    expect(() => verifyLogarithmicPrimitive(s.ctx, { ...p, terms: [term] }, target, evidence, bounds)).toThrow();
  });
  it('replays bound targets without any proof producers', () => {
    const v = saved(), { s, target } = v, data = encodeLogarithmicRationalPrimitive(s.ctx, s.F, target, v, bounds);
    const disabled = () => { throw Error('producer disabled'); };
    vi.spyOn(admission, 'buildLogarithm').mockImplementation(disabled);
    vi.spyOn(derivatives, 'differentiate').mockImplementation(disabled);
    vi.spyOn(prs, 'subresultants').mockImplementation(disabled);
    vi.spyOn(trace, 'quotientTrace').mockImplementation(disabled);
    const out = decodeLogarithmicRationalPrimitive(new ExecutionContext(s.ctx.limits), s.F, target, structuredClone(data), bounds);
    expect(out.primitive.domain.field).toBe(s.F);
    expect(out.primitive.domain).not.toBe(s.d);
  });
  it('rejects foreign owners, forged domains and an equal derivative with a different log argument', () => {
    const v = saved(), { s, target } = v, other = logarithmicSetup([0, 2]);
    const data = encodeLogarithmicRationalPrimitive(s.ctx, s.F, target, v, bounds);
    expect(() => decodeLogarithmicRationalPrimitive(other.ctx, other.F, other.F.inverse(other.ctx, other.t), data, bounds)).toThrow();
    expect(() => logarithmicPrimitive(s.ctx, s.d, other.t, [])).toThrow();
    expect(() => logarithmicPrimitive(s.ctx, { ...s.d, lift: s.d.lift }, s.t, [])).toThrow();
    expect(() => new ExponentialRationalDomain(s.ctx, s.F, bounds)).toThrow();
    expect(() => new LogarithmicRationalDomain(s.ctx, s.f, bounds)).toThrow();
  });
  it('rejects changed conditions, malformed data and wrong targets before success', () => {
    const v = saved(), { s, target } = v, data = encodeLogarithmicRationalPrimitive(s.ctx, s.F, target, v, bounds);
    const c = structuredClone(data) as { conditions: unknown[] }; c.conditions.pop();
    expect(() => decodeLogarithmicRationalPrimitive(s.ctx, s.F, target, c, bounds)).toThrow();
    const bad = structuredClone(data) as { derivative: unknown }; bad.derivative = { checked: true };
    expect(() => decodeLogarithmicRationalPrimitive(s.ctx, s.F, target, bad, bounds)).toThrow();
    expect(() => decodeLogarithmicRationalPrimitive(s.ctx, s.F, s.C(0), data, bounds)).toThrow();
    for (const b of [{ ...bounds, artifactDepth: 2 }, { ...bounds, artifactNodes: 5 }, { ...bounds, artifactBytes: 20 }])
      expect(() => decodeLogarithmicRationalPrimitive(new ExecutionContext(s.ctx.limits), s.F, target, data, b)).toThrow(AlgebraError);
  });
  it('starts fresh operations and keeps all arithmetic exhaustion sticky', () => {
    const v = saved(), { s, target, primitive, derivative } = v;
    const ctx = new ExecutionContext(s.ctx.limits); verifyLogarithmicPrimitive(ctx, primitive, target, derivative, bounds);
    expect(ctx.operationToken).toBeUndefined();
    expect(() => verifyLogarithmicPrimitive(ctx, primitive, target, { ...derivative, derivative: s.C(0) }, bounds)).toThrow();
    for (const limits of [{ work: 2 }, { allocation: 2 }, { integerBits: 1 }, { degree: 0 }]) {
      const small = new ExecutionContext({ ...s.ctx.limits, ...limits });
      expect(() => verifyLogarithmicPrimitive(small, primitive, target, derivative, bounds)).toThrow(AlgebraError);
      expect(() => small.tick()).toThrow(AlgebraError);
    }
  });
});
