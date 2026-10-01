import { afterEach, describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { buildExponential } from './differential-admission';
import * as admission from './differential-admission';
import * as derivative from './differential-derivative';
import * as prs from './subresultant';
import * as trace from './quotient-trace';
import { rational } from './rational';
import { FormalPrimitiveDomain } from './formal-primitive';
import { integrateRational } from './rational-decision';
import { embedRationalPrimitive, verifyRationalPrimitiveEmbedding } from './exponential-rational-bridge';
import { toRationalPrimitiveInput } from './exponential-sum-bridge';
import { ExponentialRationalDomain } from './exponential-rational-domain';
import { exponentialLogTerm, exponentialPrimitive, differentiateExponentialPrimitive, verifyExponentialPrimitive } from './exponential-rational-primitive';
import { exponentialConditions } from './exponential-rational-conditions';
import { encodeExponentialRationalPrimitive, decodeExponentialRationalPrimitive } from './exponential-rational-primitive-wire';

afterEach(() => vi.restoreAllMocks());
function fixture(ns = [0, 1]) {
  const s = setup(), built = buildExponential(s.ctx, s.f, 't', [s.p(ns)], bounds);
  if (built.status !== 'supported') throw Error('fixture');
  const f = built.field, d = new ExponentialRationalDomain(s.ctx, f, bounds), t = f.generator(s.ctx);
  const c = (n: number | bigint) => f.fromInteger(s.ctx, BigInt(n));
  const q = (ns: (number | bigint)[]) => d.z.make(s.ctx, ns.map(n => rational(s.ctx, n)));
  return { ...s, f: s.f, F: f, d, t, C: c, Q: q };
}
describe('exponential rational primitive representation', () => {
  it.each([[0, 1], [0, 0, 1], [1, 1]].map(ns => ({ ns })))('checks coefficient and generator derivatives for exponent $ns', ({ ns }) => {
    const s = fixture(ns), { ctx, F, d, t, C, Q } = s;
    const g = F.add(ctx, t, F.embed(ctx, s.x));
    const term = exponentialLogTerm(ctx, d, Q([0, 1]), Q([1]), d.fz.constant(ctx, g));
    const p = exponentialPrimitive(ctx, d, F.fromInteger(ctx, 0n), [term]);
    const expected = F.exactDivide(ctx, F.add(ctx, derivative.differentiate(ctx, F, t).derivative, C(1)), g);
    const proof = differentiateExponentialPrimitive(ctx, p, bounds);
    verifyExponentialPrimitive(ctx, p, expected, proof, bounds);
    expect(() => verifyExponentialPrimitive(ctx, p, expected, { ...proof, terms: [{ ...proof.terms[0], coefficients: [] }] }, bounds)).toThrow();
  });
  it.each([[-1, 0, 1], [1, 0, 1], [-1, -1, 0, 0, 0, 1]].map(coefficients => ({ coefficients })))('keeps all roots of modulus $coefficients without resolving them', ({ coefficients }) => {
    const { ctx, F, d, t, C, Q } = fixture();
    const q = Q(coefficients), term = exponentialLogTerm(ctx, d, q, Q([1]), d.fz.make(ctx, [t, C(-1)]));
    const p = exponentialPrimitive(ctx, d, C(0), [term]), proof = differentiateExponentialPrimitive(ctx, p, bounds);
    const at = (cs: readonly number[]) => { let out = C(0); for (let i = cs.length - 1; i >= 0; i--) out = F.add(ctx, F.multiply(ctx, out, t), C(cs[i])); return out; };
    const dq = coefficients.slice(1).map((c, i) => c * (i + 1));
    const expected = F.exactDivide(ctx, F.multiply(ctx, t, at(dq)), at(coefficients));
    verifyExponentialPrimitive(ctx, p, expected, proof, bounds);
  });
  it('rejects repeated roots and an argument vanishing on one reducible component', () => {
    const { ctx, d, C, Q } = fixture();
    expect(() => exponentialLogTerm(ctx, d, Q([1, -2, 1]), Q([1]), d.fz.one(ctx))).toThrow();
    expect(() => exponentialLogTerm(ctx, d, Q([-1, 0, 1]), Q([1]), d.fz.make(ctx, [C(-1), C(1)]))).toThrow();
  });
  it('embeds the rational root-log primitive preserving norms and exact coefficients', () => {
    const s = fixture(), source = new FormalPrimitiveDomain('x', 'a'), input = toRationalPrimitiveInput(s.ctx, s.f, source, s.p([1], [1, 0, 1]));
    const rational = integrateRational(s.ctx, source, input), p = embedRationalPrimitive(s.ctx, s.d, rational.primitive);
    verifyRationalPrimitiveEmbedding(s.ctx, s.d, rational.primitive, p);
    verifyExponentialPrimitive(s.ctx, p, s.F.embed(s.ctx, s.p([1], [1, 0, 1])), differentiateExponentialPrimitive(s.ctx, p, bounds), bounds);
  });
  it('retains x denominators from outer numerator coefficients and norms but not powers of t', () => {
    const s = fixture(), { ctx, F, d, t, C, Q } = s;
    const v = F.exactDivide(ctx, F.embed(ctx, s.p([1], [0, 1])), t);
    const term = exponentialLogTerm(ctx, d, Q([0, 1]), Q([0]), d.fz.constant(ctx, F.add(ctx, t, C(1))));
    const p = exponentialPrimitive(ctx, d, v, [term]), proof = differentiateExponentialPrimitive(ctx, p, bounds);
    const conditions = exponentialConditions(ctx, d, proof.derivative, p);
    expect(conditions.some(c => c.category === 'log-norm')).toBe(true);
    expect(conditions.some(c => c.category === 'coefficient-denominator' && F.equal(ctx, c.value, F.embed(ctx, s.x)))).toBe(true);
    expect(conditions.some(c => c.category === 'outer-denominator')).toBe(false);
  });
  it('replays with producers disabled and rejects changed target, exponent, condition and trace', () => {
    const s = fixture(), { ctx, F, d, t, C, Q } = s;
    const term = exponentialLogTerm(ctx, d, Q([1, 0, 1]), Q([1]), d.fz.make(ctx, [t, C(-1)]));
    const p = exponentialPrimitive(ctx, d, C(9007199254740993n), [term]);
    const proof = differentiateExponentialPrimitive(ctx, p, bounds), target = proof.derivative;
    const saved = { primitive: p, derivative: proof, conditions: exponentialConditions(ctx, d, target, p) };
    const data = encodeExponentialRationalPrimitive(ctx, F, target, saved, bounds);
    const disabled = () => { throw Error('producer disabled'); };
    vi.spyOn(admission, 'buildExponential').mockImplementation(disabled);
    vi.spyOn(derivative, 'differentiate').mockImplementation(disabled);
    vi.spyOn(prs, 'subresultants').mockImplementation(disabled);
    vi.spyOn(trace, 'quotientTrace').mockImplementation(disabled);
    const fresh = () => new ExecutionContext(ctx.limits);
    const out = decodeExponentialRationalPrimitive(fresh(), F, target, structuredClone(data), bounds);
    expect(out.primitive.domain.field).toBe(F);
    expect(() => decodeExponentialRationalPrimitive(fresh(), F, C(1), data, bounds)).toThrow();
    const mutation = structuredClone(data) as { conditions: unknown[] };
    mutation.conditions.pop(); expect(() => decodeExponentialRationalPrimitive(fresh(), F, target, mutation, bounds)).toThrow();
    expect(() => decodeExponentialRationalPrimitive(fresh(), F, target, data, { ...bounds, artifactNodes: 20 })).toThrow();
    expect(() => verifyExponentialPrimitive(new ExecutionContext({ ...ctx.limits, work: 10 }), p, target, proof, bounds)).toThrow();
  });
});

describe('exponential rational proof tampering and limits', () => {
  it.each(['weight', 'argument', 'norm', 'inverse', 'modulus', 'trace', 'columns', 'field', 'target', 'coefficient', 'coverage'])('rejects altered %s evidence', mutation => {
    const { ctx, F, d, t, C, Q } = fixture();
    const term = exponentialLogTerm(ctx, d, Q([-1, 1]), Q([1]), d.fz.constant(ctx, F.add(ctx, t, C(1))));
    const p = exponentialPrimitive(ctx, d, C(0), [term]), proof = differentiateExponentialPrimitive(ctx, p, bounds);
    const altered = { ...term }, changed = { ...proof.terms[0] }, evidence = { ...proof, terms: [changed] };
    if (mutation === 'weight') altered.weight = Q([2]);
    if (mutation === 'argument') altered.argument = d.fz.constant(ctx, t);
    if (mutation === 'norm') altered.norm = C(1);
    if (mutation === 'inverse') altered.inverse = { kind: 'zero' };
    if (mutation === 'modulus') altered.modulus = Q([-2, 1]);
    if (mutation === 'trace') changed.trace = { ...changed.trace, trace: C(1) };
    if (mutation === 'columns') changed.trace = { ...changed.trace, columns: [] };
    if (mutation === 'field') evidence.field = { ...evidence.field, derivative: C(1) };
    if (mutation === 'target') evidence.derivative = C(1);
    if (mutation === 'coefficient') changed.coefficients = [{ input: term.argument.coefficients[0], derivative: C(0) }];
    if (mutation === 'coverage') evidence.terms = [];
    expect(() => verifyExponentialPrimitive(ctx, { ...p, terms: [altered] }, proof.derivative, evidence, bounds)).toThrow();
  });
  it('rejects a foreign owned field and changed exponent with the same derivative', () => {
    const a = fixture(), b = fixture([1, 1]);
    const primitive = exponentialPrimitive(a.ctx, a.d, a.t, []), proof = differentiateExponentialPrimitive(a.ctx, primitive, bounds);
    const data = encodeExponentialRationalPrimitive(a.ctx, a.F, proof.derivative,
      { primitive, derivative: proof, conditions: exponentialConditions(a.ctx, a.d, proof.derivative, primitive) }, bounds);
    expect(() => verifyExponentialPrimitive(a.ctx, primitive, b.t, proof, bounds)).toThrow();
    expect(() => decodeExponentialRationalPrimitive(b.ctx, b.F, b.t, data, bounds)).toThrow();
  });
  it('checks malformed nested artifacts and every artifact bound before reconstruction', () => {
    const s = fixture(), p = exponentialPrimitive(s.ctx, s.d, s.t, []), proof = differentiateExponentialPrimitive(s.ctx, p, bounds);
    const data = encodeExponentialRationalPrimitive(s.ctx, s.F, proof.derivative,
      { primitive: p, derivative: proof, conditions: exponentialConditions(s.ctx, s.d, proof.derivative, p) }, bounds);
    for (const b of [{ ...bounds, artifactDepth: 2 }, { ...bounds, artifactNodes: 2 }, { ...bounds, artifactBytes: 20 }])
      expect(() => decodeExponentialRationalPrimitive(new ExecutionContext(s.ctx.limits), s.F, proof.derivative, data, b)).toThrow();
    const malformed = structuredClone(data) as { primitive: unknown }; malformed.primitive = { bogus: true };
    expect(() => decodeExponentialRationalPrimitive(s.ctx, s.F, proof.derivative, malformed, bounds)).toThrow();
  });
  it('exhausts construction and coefficient differentiation without returning success', () => {
    const s = fixture(), p = exponentialPrimitive(s.ctx, s.d, s.t, []);
    expect(() => new ExponentialRationalDomain(new ExecutionContext({ ...s.ctx.limits, work: 2 }), s.F, bounds)).toThrow();
    expect(() => differentiateExponentialPrimitive(new ExecutionContext({ ...s.ctx.limits, allocation: 2 }), p, bounds)).toThrow();
  });
});
