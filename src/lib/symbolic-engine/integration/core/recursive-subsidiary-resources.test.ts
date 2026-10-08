import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { DifferentialField } from './differential-field';
import { buildExponential, buildLogarithm } from './differential-admission';
import { CertifiedTowerView } from './recursive-certified-tower';
import { solveRecursiveParametricRde, verifyRecursiveParametricRde } from './recursive-rde';
import { solveRecursiveLimitedIntegration, verifyRecursiveLimitedIntegration } from './recursive-limited-integration';
import { solveRecursiveLogarithmicDerivativeRelations, verifyRecursiveLogarithmicDerivativeRelations } from './recursive-logarithmic-relations';
import { certifyRecursiveDifferentialExtension, verifyRecursiveDifferentialExtension } from './recursive-differential-admission';
import { encodeRecursiveParametricRde, decodeRecursiveParametricRde } from './recursive-rde-wire';
import { encodeRecursiveDifferentialAdmission, decodeRecursiveDifferentialAdmission } from './recursive-differential-admission-wire';
import { differentiate } from './differential-derivative';

function fixture(hyper = true) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), a = hyper ? buildExponential(s.ctx, s.f, 't', [s.x], bounds) : buildLogarithm(s.ctx, s.f, 't', s.x, bounds);
  if (a.status !== 'supported') throw Error('fixture');
  const owner = a.field, view = CertifiedTowerView.firstLevel(s.ctx, root, owner, owner.admission!, bounds);
  return {...s, root, owner, view, t: owner.generator(s.ctx)};
}
describe('recursive execution and artifact limits never authorize a mathematical decision', () => {
  it.each([{work: 1}, {allocation: 1}, {degree: 0}, {integerBits: 1}])('enforces all four categories through the recursive entry points: %j', restriction => {
    const s = fixture(), o = s.owner, one = o.fromInteger(s.ctx, 17n), a = o.fromInteger(s.ctx, -1n), zero = o.fromInteger(s.ctx, 0n);
    const force = o.multiply(s.ctx, one, s.t);
    const e = solveRecursiveParametricRde(s.ctx, s.view, a, zero, [force], bounds), data = encodeRecursiveParametricRde(s.ctx, s.view, a, zero, [force], e, bounds);
    const input = o.embed(s.ctx, s.p([17], [0, 1])), relation = solveRecursiveLogarithmicDerivativeRelations(s.ctx, s.view, [input], bounds);
    const limited = solveRecursiveLimitedIntegration(s.ctx, s.view, one, [], bounds);
    const extension = DifferentialField.formal(s.ctx, o, 'u', [zero, one], bounds), construction = {kind: 'hyperexponential' as const, integrand: one};
    const admitted = certifyRecursiveDifferentialExtension(s.ctx, s.view, extension, construction, bounds);
    const make = () => new ExecutionContext({...s.ctx.limits, ...restriction});
    for (const [index, operation] of [
      (ctx: ExecutionContext) => solveRecursiveParametricRde(ctx, s.view, a, zero, [force], bounds),
      (ctx: ExecutionContext) => verifyRecursiveParametricRde(ctx, s.view, a, zero, [force], e, bounds),
      (ctx: ExecutionContext) => encodeRecursiveParametricRde(ctx, s.view, a, zero, [force], e, bounds),
      (ctx: ExecutionContext) => decodeRecursiveParametricRde(ctx, s.view, a, zero, [force], data, bounds),
      (ctx: ExecutionContext) => solveRecursiveLimitedIntegration(ctx, s.view, one, [], bounds),
      (ctx: ExecutionContext) => verifyRecursiveLimitedIntegration(ctx, s.view, one, [], limited, bounds),
      (ctx: ExecutionContext) => solveRecursiveLogarithmicDerivativeRelations(ctx, s.view, [input], bounds),
      (ctx: ExecutionContext) => verifyRecursiveLogarithmicDerivativeRelations(ctx, s.view, [input], relation, bounds),
      (ctx: ExecutionContext) => certifyRecursiveDifferentialExtension(ctx, s.view, extension, construction, bounds),
      (ctx: ExecutionContext) => verifyRecursiveDifferentialExtension(ctx, s.view, extension, construction, admitted, bounds),
    ].entries()) {
      const ctx = make(); expect(() => operation(ctx), `operation ${index}`).toThrow('resource-limit'); expect(() => ctx.tick()).toThrow('resource-limit');
      expect(ctx.operationToken).toBeUndefined();
    }
  });
  it('checks actual constructed degrees, allowing an unused theoretical leading coefficient', () => {
    const s = fixture(false), o = s.owner, value = o.multiply(s.ctx, s.t, s.t), a = o.fromInteger(s.ctx, 1n);
    const input = o.add(s.ctx, differentiate(s.ctx, o, value).derivative, value), ctx = new ExecutionContext({...s.ctx.limits, degree: 2});
    const e = solveRecursiveParametricRde(ctx, s.view, a, input, [], bounds);
    expect(e.kind).toBe('solutions'); expect(o.equal(s.ctx, e.family!.particular.value, value)).toBe(true);
    if (e.homogeneous.route !== 'recursive') throw Error('fixture'); expect(e.homogeneous.degree.bound).toBe(3n);
    verifyRecursiveParametricRde(new ExecutionContext({...s.ctx.limits, degree: 2}), s.view, a, input, [], e, bounds);
  });
  it('exhausts for a genuine constructed resonance and keeps its exact exponent', () => {
    const s = fixture(), a = s.owner.fromInteger(s.ctx, -3n), zero = s.owner.fromInteger(s.ctx, 0n), ctx = new ExecutionContext({...s.ctx.limits, degree: 2});
    expect(() => solveRecursiveParametricRde(ctx, s.view, a, zero, [], bounds)).toThrow('resource-limit: degree');
    expect(() => ctx.tick()).toThrow('resource-limit');
  });
  it('checks all artifact dimensions and construction height before granting admission authority', () => {
    const s = fixture(), zero = s.owner.fromInteger(s.ctx, 0n), eta = s.owner.multiply(s.ctx, s.t, s.owner.fromInteger(s.ctx, 2n));
    const owner = DifferentialField.formal(s.ctx, s.owner, 'u', [zero, eta], bounds), construction = {kind: 'hyperexponential' as const, integrand: eta};
    const e = certifyRecursiveDifferentialExtension(s.ctx, s.view, owner, construction, bounds), data = encodeRecursiveDifferentialAdmission(s.ctx, s.view, owner, construction, e, bounds);
    for (const stricter of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}, {towerHeight: 2}]) {
      const ctx = new ExecutionContext(s.ctx.limits);
      expect(() => decodeRecursiveDifferentialAdmission(ctx, s.view, owner, construction, data, {...bounds, ...stricter})).toThrow('resource-limit');
      expect(() => ctx.tick()).toThrow('resource-limit');
    }
  });
  it('keeps standalone verification fresh even when the execution context is reused', () => {
    const s = fixture(false), input = s.owner.exactDivide(s.ctx, s.t, s.owner.embed(s.ctx, s.x)), e = solveRecursiveLimitedIntegration(s.ctx, s.view, input, [], bounds);
    const ctx = new ExecutionContext(s.ctx.limits); verifyRecursiveLimitedIntegration(ctx, s.view, input, [], e, bounds); const first = ctx.usage;
    verifyRecursiveLimitedIntegration(ctx, s.view, input, [], e, bounds);
    expect(ctx.usage.work - first.work).toBe(first.work); expect(ctx.usage.allocation - first.allocation).toBe(first.allocation);
    expect(() => verifyRecursiveLimitedIntegration(ctx, s.view, input, [], {...e, conditions: []}, bounds)).toThrow('verification-failed');
  });
});
