import {describe, expect, it, vi} from 'vitest';
import {setup, bounds} from './differential-test-support';
import {ExecutionContext} from './execution';
import {DifferentialField, type DifferentialElement as E} from './differential-field';
import {CertifiedTowerView} from './recursive-certified-tower';
import * as derivative from './differential-derivative';
import * as admission from './structured-differential-admission';
import * as originalAdmission from './recursive-differential-admission';
import * as linear from './linear-system';
import * as descent from './recursive-coefficient-system';
import * as membership from './recursive-logarithmic-membership';
import * as limited from './recursive-limited-integration';
import * as factorization from './recursive-polynomial-factorization';
import {encodeStructuredDifferentialAdmission as encode, decodeStructuredDifferentialAdmission as decode} from './structured-differential-admission-wire';
import {decodeRecursiveDifferentialAdmission} from './recursive-differential-admission-wire';

function extend(ctx: ExecutionContext, parent: CertifiedTowerView, kind: 'logarithm' | 'exponential', argument: E, name = 't') {
  const d = derivative.differentiate(ctx, parent.owner, argument).derivative;
  const rate = kind === 'logarithm' ? parent.owner.exactDivide(ctx, d, argument) : d;
  const owner = DifferentialField.formal(ctx, parent.owner, name, kind === 'logarithm' ? [rate] : [parent.owner.fromInteger(ctx, 0n), rate], bounds);
  const construction = Object.freeze({kind, argument});
  return {owner, construction, decision: admission.certifyStructuredDifferentialExtension(ctx, parent, owner, construction, bounds)};
}
function fixture(kind: 'exponential' | 'logarithm', dependent: boolean) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), first = extend(s.ctx, root, kind, s.x, 's');
  if (first.decision.kind !== 'admitted') throw Error('fixture'); const parent = first.decision.view;
  const argument = parent.owner.embed(s.ctx, kind === 'exponential' ? s.p([0, dependent ? 2 : 0, dependent ? 0 : 1]) : dependent ? s.p([0, 2]) : s.p([1, 1]));
  const top = extend(s.ctx, parent, kind, argument); return {...s, root, parent, ...top};
}
const off = () => {throw Error('producer disabled');};
function disable() {
  return [vi.spyOn(admission, 'certifyStructuredDifferentialExtension').mockImplementation(off),
    vi.spyOn(admission, 'certifyStructuredDifferentialExtensionWithin').mockImplementation(off),
    vi.spyOn(originalAdmission, 'certifyRecursiveDifferentialExtension').mockImplementation(off),
    vi.spyOn(derivative, 'differentiate').mockImplementation(off), vi.spyOn(derivative, 'differentiateWithin').mockImplementation(off),
    vi.spyOn(linear, 'solveLinearSystem').mockImplementation(off),
    vi.spyOn(descent, 'descendCoefficientSystem').mockImplementation(off), vi.spyOn(descent, 'descendCoefficientSystemWithin').mockImplementation(off),
    vi.spyOn(membership, 'solveRecursiveLogarithmicMembershipWithin').mockImplementation(off),
    vi.spyOn(limited, 'solveRecursiveLimitedIntegrationWithin').mockImplementation(off),
    vi.spyOn(factorization, 'factorRecursivePolynomial').mockImplementation(off)];
}
describe('versioned structure-admission replay', () => {
  it.each([['exponential', false], ['exponential', true], ['logarithm', false], ['logarithm', true]] as const)('replays %s dependent=%s with all relevant producers disabled', (kind, dependent) => {
    const s = fixture(kind, dependent), data = JSON.parse(JSON.stringify(encode(s.ctx, s.parent, s.owner, s.construction, s.decision, bounds)));
    expect(data.version).toBe(2); const spies = disable();
    try {
      const cold = new ExecutionContext(s.ctx.limits), result = decode(cold, s.parent, s.owner, s.construction, data, bounds);
      expect(result.kind).toBe(dependent ? 'dependent' : 'admitted');
      expect(result.evidence.comparison.auxiliary).not.toBe(s.decision.evidence.comparison.auxiliary);
      admission.verifyStructuredDifferentialExtension(cold, s.parent, s.owner, s.construction, result, bounds);
    } finally {for (const spy of spies) spy.mockRestore();}
  });
  it('binds complete equal-derivative shifts and rejects mismatched tags, coverage and trusted fields', () => {
    const s = fixture('exponential', false), data = encode(s.ctx, s.parent, s.owner, s.construction, s.decision, bounds);
    const changed = {...s.construction, argument: s.parent.owner.add(s.ctx, s.construction.argument, s.parent.owner.fromInteger(s.ctx, 1n))};
    expect(() => decode(s.ctx, s.parent, s.owner, changed, data, bounds)).toThrow('verification-failed');
    const wrong = {...data as Record<string, unknown>, version: 1};
    expect(() => decode(s.ctx, s.parent, s.owner, s.construction, wrong, bounds)).toThrow('invalid-input');
    expect(() => decodeRecursiveDifferentialAdmission(s.ctx, s.parent, s.owner, s.construction, data, bounds)).toThrow('invalid-input');
    expect(() => decode(s.ctx, s.parent, s.owner, s.construction, {...data as object, trusted: true}, bounds)).toThrow('invalid-input');
    expect(() => decode(s.ctx, s.parent, s.owner, s.construction, data, {...bounds, artifactBytes: 20})).toThrow('resource-limit');
    const stopped = new ExecutionContext({...s.ctx.limits, work: 10});
    expect(() => decode(stopped, s.parent, s.owner, s.construction, data, bounds)).toThrow('resource-limit');
    expect(() => stopped.tick(0)).toThrow('resource-limit');
  });
});
