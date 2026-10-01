import { afterEach, describe, expect, it, vi } from 'vitest';
import { bounds } from './differential-test-support';
import { exponentialSetup } from './__tests__/exponential-rational-fixtures';
import { ExecutionContext } from './execution';
import { integrateExponentialRational, verifyExponentialRationalDecision } from './exponential-rational-decision';
import { encodeExponentialRationalDecision, decodeExponentialRationalDecision } from './exponential-rational-wire';
import * as integration from './exponential-rational-decision';
import * as hermite from './exponential-rational-hermite';
import * as residues from './exponential-rational-residue';
import * as selection from './exponential-rational-selection';
import * as sum from './exponential-sum-decision';
import * as rde from './rational-rde';
import * as rational from './rational-decision';
import * as admission from './differential-admission';
import * as derivative from './differential-derivative';
import * as prs from './subresultant';
import * as traces from './quotient-trace';
afterEach(() => vi.restoreAllMocks());
describe('exponential rational decision replay', () => {
  it.each(['elementary', 'nonconstant-residue', 'laurent', 'rational', 'rebased', 'quadratic', 'repeated'])('replays %s with producers disabled', kind => {
    const s = exponentialSetup();
    const input = kind === 'quadratic' ? s.v([0, 1], [1, 0, 1]) : kind === 'repeated' ? s.v([1], [1, 2, 1]) : kind === 'elementary' ? s.v([1], [1, 1]) : kind === 'nonconstant-residue' ? s.F.make(s.ctx, [s.c(1)], [s.x, s.c(1)])
      : kind === 'laurent' ? s.F.add(s.ctx, s.v([1], [1, 1]), s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [0, 1])), s.t))
      : kind === 'rational' ? s.F.embed(s.ctx, s.p([1], [1, 0, 1])) : s.v([1, 0, 0, 0, 1], [0, 0, 1]);
    const decision = integrateExponentialRational(s.ctx, s.F, input, bounds);
    const fresh = () => new ExecutionContext(s.ctx.limits), data = encodeExponentialRationalDecision(fresh(), s.F, input, decision, bounds);
    const disabled = () => { throw Error('producer disabled'); };
    vi.spyOn(integration, 'integrateExponentialRational').mockImplementation(disabled);
    vi.spyOn(hermite, 'differentialHermite').mockImplementation(disabled);
    vi.spyOn(residues, 'exponentialResidues').mockImplementation(disabled);
    vi.spyOn(selection, 'selectExponentialResidues').mockImplementation(disabled);
    vi.spyOn(sum, 'integrateExponentialSum').mockImplementation(disabled);
    vi.spyOn(rde, 'solveRationalRde').mockImplementation(disabled);
    vi.spyOn(rational, 'integrateRational').mockImplementation(disabled);
    vi.spyOn(admission, 'buildExponential').mockImplementation(disabled);
    vi.spyOn(derivative, 'differentiate').mockImplementation(disabled);
    vi.spyOn(prs, 'subresultants').mockImplementation(disabled);
    vi.spyOn(traces, 'quotientTrace').mockImplementation(disabled);
    const replay = decodeExponentialRationalDecision(fresh(), s.F, input, structuredClone(data), bounds);
    expect(replay.kind).toBe(decision.kind); expect(replay.obstruction).toBe(decision.obstruction);
    expect(replay.domain.field).toBe(s.F);
    expect(encodeExponentialRationalDecision(fresh(), s.F, input, replay, bounds)).toEqual(data);
    verifyExponentialRationalDecision(fresh(), s.F, input, replay, bounds);
  });
  it('rejects wrong input, same-derivative shifted construction, malformed records and missing conditions', () => {
    const s = exponentialSetup(), input = s.v([1], [1, 1]), decision = integrateExponentialRational(s.ctx, s.F, input, bounds);
    const data = encodeExponentialRationalDecision(s.ctx, s.F, input, decision, bounds), other = exponentialSetup([1, 1]);
    expect(() => decodeExponentialRationalDecision(s.ctx, s.F, s.t, data, bounds)).toThrow();
    expect(() => decodeExponentialRationalDecision(other.ctx, other.F, other.v([1], [1, 1]), data, bounds)).toThrow();
    const bad = structuredClone(data) as { conditions: unknown[]; hermite: unknown };
    bad.conditions.pop(); expect(() => decodeExponentialRationalDecision(s.ctx, s.F, input, bad, bounds)).toThrow();
    bad.hermite = { forged: true }; expect(() => decodeExponentialRationalDecision(s.ctx, s.F, input, bad, bounds)).toThrow();
    for (const b of [{ ...bounds, artifactDepth: 3 }, { ...bounds, artifactNodes: 10 }, { ...bounds, artifactBytes: 40 }])
      expect(() => decodeExponentialRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, data, b)).toThrow();
  });
});
