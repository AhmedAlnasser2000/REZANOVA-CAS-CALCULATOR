import { afterEach, describe, expect, it, vi } from 'vitest';
import { logarithmicSetup } from './__tests__/logarithmic-rational-fixtures';
import { bounds } from './differential-test-support';
import { AlgebraError, ExecutionContext } from './execution';
import { integrateLogarithmicRational, verifyLogarithmicRationalDecision } from './logarithmic-rational-decision';
import { encodeLogarithmicRationalDecision, decodeLogarithmicRationalDecision } from './logarithmic-rational-wire';
import { differentialValueCodec } from './first-level-rational-primitive-codecs';
import { logarithmicPrimitiveCodecs } from './logarithmic-rational-primitive-wire';
import * as integration from './logarithmic-rational-decision';
import * as polynomial from './logarithmic-rational-polynomial';
import * as hermite from './logarithmic-rational-hermite';
import * as residues from './logarithmic-rational-residue';
import * as selection from './logarithmic-rational-selection';
import * as sharedHermite from './first-level-rational-hermite';
import * as sharedResidues from './first-level-rational-residue';
import * as sharedSelection from './first-level-rational-selection';
import * as limited from './rational-limited-integration';
import * as linear from './linear-system';
import * as rational from './rational-decision';
import * as rationalHermite from './hermite-reduction';
import * as admission from './differential-admission';
import * as derivative from './differential-derivative';
import * as prs from './subresultant';
import * as traces from './quotient-trace';
import * as primitive from './logarithmic-rational-primitive';
import { rational as Q } from './rational';
import * as w from './decision-wire-algebra';

afterEach(() => vi.restoreAllMocks());
type S = ReturnType<typeof logarithmicSetup>;
function fixture(kind: string, s: S): S['x'] {
  const a = s.F.embed(s.ctx, s.a);
  if (kind === 'residue') return s.v([1], [0, 1]);
  if (kind === 'polynomial') return s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [1, 1])), s.t);
  if (kind === 'prefix') return s.F.add(s.ctx, fixture('polynomial', s), s.F.multiply(s.ctx, a, s.v([0, 0, 1])));
  if (kind === 'rational') return s.F.embed(s.ctx, s.p([1], [1, 0, 1]));
  if (kind === 'quadratic') return s.F.multiply(s.ctx, a, s.v([1], [2, 0, 1]));
  if (kind === 'repeated') return s.F.multiply(s.ctx, a, s.v([1], [0, 0, 1]));
  if (kind === 'logs') return s.F.multiply(s.ctx, a, s.v([1], [0, 1]));
  if (kind === 'partition') return s.F.multiply(s.ctx, a, s.F.add(s.ctx, s.F.add(s.ctx, s.v([1], [-1, 1]), s.v([2], [-2, 1])), s.v([3], [-3, 1])));
  if (kind === 'top') return s.F.multiply(s.ctx, a, s.t);
  return s.t;
}
function artifact(kind = 'ordinary') {
  const s = logarithmicSetup(), input = fixture(kind, s), decision = integrateLogarithmicRational(s.ctx, s.F, input, bounds);
  const data = encodeLogarithmicRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, decision, bounds);
  return { s, input, decision, data, fresh: () => new ExecutionContext(s.ctx.limits) };
}
function change(data: unknown, path: (string | number)[], value: unknown) {
  const copy = structuredClone(data); let cursor = copy as Record<string, unknown>;
  for (const part of path.slice(0, -1)) cursor = cursor[String(part)] as Record<string, unknown>;
  cursor[String(path.at(-1))] = value; return copy;
}
describe('logarithmic decision independent artifact replay', () => {
  it.each(['ordinary', 'top', 'logs', 'repeated', 'quadratic', 'partition', 'rational', 'residue', 'polynomial', 'prefix'])('replays %s with all decision producers disabled', kind => {
    const { s, input, decision, data, fresh } = artifact(kind);
    const disabled = () => { throw Error('producer disabled'); };
    vi.spyOn(integration, 'integrateLogarithmicRational').mockImplementation(disabled);
    vi.spyOn(hermite, 'logarithmicHermite').mockImplementation(disabled);
    vi.spyOn(residues, 'logarithmicResidues').mockImplementation(disabled);
    vi.spyOn(selection, 'selectLogarithmicResidues').mockImplementation(disabled);
    vi.spyOn(sharedHermite, 'firstLevelHermite').mockImplementation(disabled);
    vi.spyOn(sharedResidues, 'firstLevelResidues').mockImplementation(disabled);
    vi.spyOn(sharedSelection, 'selectFirstLevelResidues').mockImplementation(disabled);
    vi.spyOn(polynomial, 'reduceLogarithmicPolynomial').mockImplementation(disabled);
    vi.spyOn(limited, 'solveRationalLimitedIntegration').mockImplementation(disabled);
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(disabled);
    vi.spyOn(rational, 'integrateRational').mockImplementation(disabled);
    vi.spyOn(rationalHermite, 'hermiteReduce').mockImplementation(disabled);
    vi.spyOn(admission, 'buildLogarithm').mockImplementation(disabled);
    vi.spyOn(derivative, 'differentiate').mockImplementation(disabled);
    vi.spyOn(prs, 'subresultants').mockImplementation(disabled);
    vi.spyOn(traces, 'quotientTrace').mockImplementation(disabled);
    const out = decodeLogarithmicRationalDecision(fresh(), s.F, input, structuredClone(data), bounds);
    expect(out.kind).toBe(decision.kind); expect(out.obstruction).toBe(decision.obstruction);
    expect(out.domain.field).toBe(s.F); expect(out.domain).not.toBe(decision.domain);
    expect(encodeLogarithmicRationalDecision(fresh(), s.F, input, out, bounds)).toEqual(data);
    verifyLogarithmicRationalDecision(fresh(), s.F, input, out, bounds);
  });
  it.each(['rule', 'power', 'fieldPart', 'stepDegree', 'stepLeading', 'stepCorrection', 'stepDerivative', 'stepNext', 'prefix', 'baseRemainder', 'rhs', 'failure', 'conditions', 'path', 'target'])('rejects mathematical tampering: %s', mutation => {
    const { s, input, data, fresh } = artifact(), c = logarithmicPrimitiveCodecs(s.ctx, s.d), base = differentialValueCodec(s.ctx, s.f), one = c.e.encode(s.C(1)), zero = c.e.encode(s.C(0));
    let bad: unknown;
    switch (mutation) {
      case 'rule': bad = change(data, ['rule'], 'different-rule'); break;
      case 'power': bad = change(data, ['hermite', 'power'], 1); break;
      case 'fieldPart': bad = change(data, ['hermite', 'fieldPart'], one); break;
      case 'stepDegree': bad = change(data, ['remainder', 'reduction', 'steps', 0, 'degree'], '2'); break;
      case 'stepLeading': bad = change(data, ['remainder', 'reduction', 'steps', 0, 'leading'], base.encode(s.a)); break;
      case 'stepCorrection': bad = change(data, ['remainder', 'reduction', 'steps', 0, 'correction'], one); break;
      case 'stepDerivative': bad = change(data, ['remainder', 'reduction', 'steps', 0, 'derivative', 'derivative'], zero); break;
      case 'stepNext': bad = change(data, ['remainder', 'reduction', 'steps', 0, 'next'], one); break;
      case 'prefix': bad = change(data, ['remainder', 'reduction', 'fieldPart'], zero); break;
      case 'baseRemainder': bad = change(data, ['remainder', 'reduction', 'remainder'], base.encode(s.x)); break;
      case 'rhs': bad = change(data, ['remainder', 'reduction', 'steps', 0, 'limited', 'decision', 'system', 'rhs', 0], w.scalar(s.ctx).encode(Q(s.ctx, 1))); break;
      case 'failure': bad = change(data, ['remainder', 'reduction', 'failure'], 0); break;
      case 'conditions': bad = change(data, ['conditions'], []); break;
      case 'path': bad = change(data, ['conditions', 0, 'path'], 'lost-origin'); break;
      case 'target': bad = change(data, ['derivative', 'derivative'], zero); break;
    }
    expect(() => decodeLogarithmicRationalDecision(fresh(), s.F, input, bad, bounds)).toThrow();
  });
  it.each(['derivative', 'index', 'partition', 'norm', 'weight', 'trace', 'columns', 'coverage'])('rejects residue/selection tampering: %s', mutation => {
    const { s, input, data, fresh } = artifact('quadratic'), c = logarithmicPrimitiveCodecs(s.ctx, s.d); let bad: unknown;
    switch (mutation) {
      case 'derivative': bad = change(data, ['residue', 'denominatorDerivative', 'derivative'], c.e.encode(s.C(0))); break;
      case 'index': bad = change(data, ['residue', 'groups', 0, 'components', 0, 'index'], 2); break;
      case 'partition': bad = change(data, ['residue', 'groups', 0, 'nodes'], []); break;
      case 'norm': bad = change(data, ['residue', 'groups', 0, 'components', 0, 'term', 'norm'], c.e.encode(s.C(0))); break;
      case 'weight': bad = change(data, ['primitive', 'terms', 0, 'weight'], c.q.encode(s.Q([2]))); break;
      case 'trace': bad = change(data, ['derivative', 'terms', 0, 'trace', 'trace'], c.e.encode(s.C(0))); break;
      case 'columns': bad = change(data, ['derivative', 'terms', 0, 'trace', 'columns'], []); break;
      case 'coverage': bad = change(data, ['residue', 'groups'], []); break;
    }
    expect(() => decodeLogarithmicRationalDecision(fresh(), s.F, input, bad, bounds)).toThrow();
  });
  it('rejects altered negative prefixes and residue authority', () => {
    const v = artifact('prefix');
    const missing = change(v.data, ['remainder', 'reduction', 'steps'], []);
    expect(() => decodeLogarithmicRationalDecision(v.fresh(), v.s.F, v.input, missing, bounds)).toThrow();
    const noFailure = change(v.data, ['remainder', 'reduction', 'failure'], null);
    expect(() => decodeLogarithmicRationalDecision(v.fresh(), v.s.F, v.input, noFailure, bounds)).toThrow();
    const r = artifact('residue'), altered = change(r.data, ['residue', 'nonconstant'], null);
    expect(() => decodeLogarithmicRationalDecision(r.fresh(), r.s.F, r.input, altered, bounds)).toThrow();
  });
  it('checks expected inputs and full logarithm construction, not just equal generator derivatives', () => {
    const v = artifact(), other = logarithmicSetup([0, 2]);
    expect(() => decodeLogarithmicRationalDecision(v.fresh(), v.s.F, v.s.C(0), v.data, bounds)).toThrow(AlgebraError);
    expect(() => decodeLogarithmicRationalDecision(other.ctx, other.F, other.t, v.data, bounds)).toThrow(AlgebraError);
    expect(() => verifyLogarithmicRationalDecision(v.fresh(), v.s.F, v.input, { ...v.decision, input: v.s.C(0) }, bounds)).toThrow(AlgebraError);
  });
  it('checks complete bounds and noncanonical degrees before nested replay', () => {
    const v = artifact();
    for (const b of [{ ...bounds, artifactDepth: 2 }, { ...bounds, artifactNodes: 10 }, { ...bounds, artifactBytes: 20 }])
      expect(() => decodeLogarithmicRationalDecision(v.fresh(), v.s.F, v.input, v.data, b)).toThrow(AlgebraError);
    for (const degree of ['01', '-1', '1.0', 1]) expect(() => decodeLogarithmicRationalDecision(v.fresh(), v.s.F, v.input,
      change(v.data, ['remainder', 'reduction', 'steps', 0, 'degree'], degree), bounds)).toThrow(AlgebraError);
    const cycle: Record<string, unknown> = {}; cycle.back = cycle;
    expect(() => decodeLogarithmicRationalDecision(v.fresh(), v.s.F, v.input, cycle, bounds)).toThrow(AlgebraError);
  });
  it('keeps repeated public verification fresh, including a frozen outer document with mutable children', () => {
    const v = artifact(), ctx = v.fresh(); verifyLogarithmicRationalDecision(ctx, v.s.F, v.input, v.decision, bounds);
    const inner = [...v.decision.conditions], mutable = Object.freeze({ ...v.decision, conditions: inner });
    verifyLogarithmicRationalDecision(ctx, v.s.F, v.input, mutable, bounds); inner.pop();
    expect(() => verifyLogarithmicRationalDecision(ctx, v.s.F, v.input, mutable, bounds)).toThrow(AlgebraError);
    expect(ctx.operationToken).toBeUndefined();
    const tiny = new ExecutionContext({ ...ctx.limits, work: 20 });
    expect(() => decodeLogarithmicRationalDecision(tiny, v.s.F, v.input, v.data, bounds)).toThrow(AlgebraError);
    expect(() => tiny.tick()).toThrow(AlgebraError);
  });
  it.each(['hermite', 'residues', 'polynomial', 'limited', 'rational', 'final'])('returns no decision on exhaustion at %s', stage => {
    const s = logarithmicSetup(), input = stage === 'residues' ? fixture('logs', s) : s.t;
    const stop = (ctx: ExecutionContext) => ctx.exhaust(`test-${stage}`);
    if (stage === 'hermite') vi.spyOn(hermite, 'logarithmicHermite').mockImplementation(stop);
    if (stage === 'residues') vi.spyOn(residues, 'logarithmicResidues').mockImplementation(stop);
    if (stage === 'polynomial') vi.spyOn(polynomial, 'reduceLogarithmicPolynomial').mockImplementation(stop);
    if (stage === 'limited') vi.spyOn(limited, 'solveRationalLimitedIntegration').mockImplementation(stop);
    if (stage === 'rational') vi.spyOn(rational, 'integrateRational').mockImplementation(stop);
    if (stage === 'final') {
      const verify = primitive.verifyLogarithmicPrimitive;
      vi.spyOn(primitive, 'verifyLogarithmicPrimitive').mockImplementation((ctx, p, target, evidence, b) => {
        if (s.F.equal(ctx, target, input)) stop(ctx); else verify(ctx, p, target, evidence, b);
      });
    }
    const ctx = new ExecutionContext(s.ctx.limits);
    expect(() => integrateLogarithmicRational(ctx, s.F, input, bounds)).toThrow(`test-${stage}`);
    expect(() => ctx.tick()).toThrow(`test-${stage}`);
  });
});
