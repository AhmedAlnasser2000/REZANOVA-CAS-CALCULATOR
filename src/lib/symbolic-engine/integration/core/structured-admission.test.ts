import {describe, expect, it, vi} from 'vitest';
import {setup, bounds} from './differential-test-support';
import {ExecutionContext} from './execution';
import {DifferentialField, type DifferentialElement as E} from './differential-field';
import {CertifiedTowerView, verifyCertifiedTower} from './recursive-certified-tower';
import {differentiate} from './differential-derivative';
import {certifyStructuredDifferentialExtension as certify, verifyStructuredDifferentialExtension as verify, type TaggedConstruction} from './structured-differential-admission';
import * as relations from './recursive-logarithmic-membership';
import * as limited from './recursive-limited-integration';

function proposed(ctx: ExecutionContext, parent: CertifiedTowerView, kind: TaggedConstruction['kind'], argument: E, name = 't') {
  const derivative = differentiate(ctx, parent.owner, argument).derivative;
  const eta = kind === 'logarithm' ? parent.owner.exactDivide(ctx, derivative, argument) : derivative;
  return DifferentialField.formal(ctx, parent.owner, name, kind === 'logarithm' ? [eta] : [parent.owner.fromInteger(ctx, 0n), eta], bounds);
}
function extension(ctx: ExecutionContext, parent: CertifiedTowerView, kind: TaggedConstruction['kind'], argument: E, name = 't') {
  const owner = proposed(ctx, parent, kind, argument, name), construction = Object.freeze({kind, argument});
  return {owner, construction, decision: certify(ctx, parent, owner, construction, bounds)};
}
function root() {const s = setup(); return {...s, view: CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds)};}
function admitted(e: ReturnType<typeof extension>) {if (e.decision.kind !== 'admitted') throw Error('expected admitted fixture'); return e.decision.view;}

describe('complete tagged structure-theorem admission', () => {
  it.each(['logarithm', 'exponential'] as const)('admits a first %s without recursive subsidiary searches', kind => {
    const s = root(), a = vi.spyOn(relations, 'solveRecursiveLogarithmicMembershipWithin'), b = vi.spyOn(limited, 'solveRecursiveLimitedIntegrationWithin');
    try {
      const e = extension(s.ctx, s.view, kind, s.x); expect(e.decision.kind).toBe('admitted');
      verify(s.ctx, s.view, e.owner, e.construction, e.decision, bounds); verifyCertifiedTower(s.ctx, admitted(e), bounds);
      expect(a).not.toHaveBeenCalled(); expect(b).not.toHaveBeenCalled();
      expect(e.decision.evidence.linear.kind).toBe('inconsistent');
    } finally {a.mockRestore(); b.mockRestore();}
  });
  it.each([true, false])('retains both mixed extension orders (log first=%s)', logFirst => {
    const s = root(), first = admitted(extension(s.ctx, s.view, logFirst ? 'logarithm' : 'exponential', s.x, 's'));
    const last = extension(s.ctx, first, logFirst ? 'exponential' : 'logarithm', first.owner.embed(s.ctx, s.x));
    expect(last.decision.kind).toBe('admitted'); expect(admitted(last).owner.parent).toBe(first.owner);
  });
  it('admits nested exp/log arguments and checks complete native rules', () => {
    const s = root(), first = admitted(extension(s.ctx, s.view, 'exponential', s.x, 's'));
    const nested = admitted(extension(s.ctx, first, 'exponential', first.owner.generator(s.ctx), 'u'));
    const argument = nested.owner.add(s.ctx, nested.owner.generator(s.ctx), nested.owner.fromInteger(s.ctx, 1n));
    const last = extension(s.ctx, nested, 'logarithm', argument);
    expect(last.decision.kind).toBe('admitted'); verifyCertifiedTower(s.ctx, admitted(last), bounds);
  });
  it('returns shifted additive dependencies without assigning their constant', () => {
    const s = root(), first = admitted(extension(s.ctx, s.view, 'logarithm', s.x, 's'));
    const argument = first.owner.embed(s.ctx, s.f.multiply(s.ctx, s.p([2]), s.x));
    const last = extension(s.ctx, first, 'logarithm', argument);
    expect(last.decision.kind).toBe('dependent');
    if (last.decision.kind !== 'dependent' || last.decision.invariant.kind !== 'additive') throw Error('fixture invariant');
    expect(first.owner.equal(s.ctx, last.decision.invariant.representative, first.owner.generator(s.ctx))).toBe(true);
    expect(() => verify(s.ctx, first, last.owner, {...last.construction, argument: first.owner.embed(s.ctx, s.x)}, last.decision, bounds)).toThrow('verification-failed');
  });
  it.each([2, 0.5])('retains least radical indices for exponent multiplier %s', multiplier => {
    const s = root(), first = admitted(extension(s.ctx, s.view, 'exponential', s.x, 's'));
    const argument = first.owner.embed(s.ctx, s.p([0, multiplier === 2 ? 2 : 1], multiplier === 2 ? [1] : [2]));
    const e = extension(s.ctx, first, 'exponential', argument);
    expect(e.decision.kind).toBe('dependent');
    if (e.decision.kind !== 'dependent' || e.decision.invariant.kind !== 'multiplicative') throw Error('fixture invariant');
    expect(e.decision.invariant.index).toBe(multiplier === 2 ? 1n : 2n);
    verify(s.ctx, first, e.owner, e.construction, e.decision, bounds);
  });
  it('does not confuse relation denominators with the least radical index', () => {
    const s = root(), first = admitted(extension(s.ctx, s.view, 'logarithm', s.p([0, 0, 1]), 's'));
    const argument = first.owner.multiply(s.ctx, first.owner.generator(s.ctx), first.owner.embed(s.ctx, s.p([1], [2])));
    const e = extension(s.ctx, first, 'exponential', argument);
    if (e.decision.kind !== 'dependent' || e.decision.invariant.kind !== 'multiplicative') throw Error('fixture invariant');
    expect(e.decision.invariant.index).toBe(1n);
  });
  it.each(['logarithm', 'exponential'] as const)('preserves constant %s dependence and zero-column systems', kind => {
    const s = root(), e = extension(s.ctx, s.view, kind, s.p([2]));
    expect(e.decision.kind).toBe('dependent');
    expect(e.decision.evidence.comparison.system.columns).toBe(kind === 'logarithm' ? 0 : 1);
  });
  it('rejects altered constructions, rates, support, linear outcomes and source conditions', () => {
    const s = root(), e = extension(s.ctx, s.view, 'exponential', s.x);
    const evidence = e.decision.evidence;
    const mutations = [
      {...evidence, rate: s.p([2])}, {...evidence, outcome: 'dependent' as const},
      {...evidence, construction: {...evidence.construction, argument: s.p([1, 1])}},
      {...evidence, comparison: {...evidence.comparison, rows: []}},
      {...evidence, conditions: []},
      {...evidence, derivative: {...evidence.derivative, derivative: s.p([2])}},
    ];
    for (const m of mutations) expect(() => verify(s.ctx, s.view, e.owner, e.construction, {...e.decision, evidence: m}, bounds)).toThrow('verification-failed');
    expect(() => certify(s.ctx, root().view, e.owner, e.construction, bounds)).toThrow('domain-mismatch');
  });
  it('rejects a mutable retained certificate, stays cold and preserves sticky exhaustion', () => {
    const s = root(), e = extension(s.ctx, s.view, 'exponential', s.x);
    expect(() => s.ctx.operation(() => CertifiedTowerView.structured(s.ctx, {...e.decision.evidence}, bounds))).toThrow('invalid-input');
    const cold = new ExecutionContext(s.ctx.limits); verify(cold, s.view, e.owner, e.construction, e.decision, bounds);
    const before = cold.usage; verify(cold, s.view, e.owner, e.construction, e.decision, bounds); expect(cold.usage.work).toBeGreaterThan(before.work);
    const stopped = new ExecutionContext({...s.ctx.limits, work: 10});
    expect(() => verify(stopped, s.view, e.owner, e.construction, e.decision, bounds)).toThrow('resource-limit');
    expect(() => stopped.tick(0)).toThrow('resource-limit');
  });
});
