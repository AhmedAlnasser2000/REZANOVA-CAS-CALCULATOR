import { expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { DifferentialField } from './differential-field';
import { CertifiedTowerView } from './recursive-certified-tower';
import { certifyRecursiveDifferentialExtension } from './recursive-differential-admission';
import { solveRecursiveLimitedIntegration, verifyRecursiveLimitedIntegration } from './recursive-limited-integration';
import { encodeRecursiveLimitedIntegration, decodeRecursiveLimitedIntegration } from './recursive-rde-wire';
import { disableRecursiveProducers } from './__tests__/recursive-replay-support';
import { ExecutionContext } from './execution';

it('constructs, solves, independently verifies and replays a height-eight certified tower under the unchanged profile', () => {
  const s = setup(); let view = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  for (let k = 1; k < bounds.towerHeight; k++) {
    const cs = Array<bigint>(k).fill(0n); cs[k - 1] = BigInt(k);
    const eta = view.owner.embed(s.ctx, s.p(cs)), owner = DifferentialField.formal(s.ctx, view.owner, `t${k}`, [view.owner.fromInteger(s.ctx, 0n), eta], bounds);
    const e = certifyRecursiveDifferentialExtension(s.ctx, view, owner, {kind: 'hyperexponential', integrand: eta}, bounds);
    expect(e.kind).toBe('admitted'); if (e.kind !== 'admitted') throw Error('fixture independence'); view = e.view;
  }
  expect(view.owner.height).toBe(8); const input = view.owner.fromInteger(s.ctx, 1n), e = solveRecursiveLimitedIntegration(s.ctx, view, input, [], bounds);
  expect(e.kind).toBe('solutions'); expect(e.family!.directions).toHaveLength(0);
  expect(view.owner.equal(s.ctx, e.family!.particular.value, view.owner.embed(s.ctx, s.x))).toBe(true);
  verifyRecursiveLimitedIntegration(new ExecutionContext(s.ctx.limits), view, input, [], e, bounds);
  const data = encodeRecursiveLimitedIntegration(s.ctx, view, input, [], e, bounds);
  disableRecursiveProducers(); try {
    const decoded = decodeRecursiveLimitedIntegration(s.ctx, view, input, [], structuredClone(data), bounds);
    expect(decoded.kind).toBe('solutions'); expect(view.owner.equal(s.ctx, decoded.family!.particular.value, e.family!.particular.value)).toBe(true);
    expect(s.ctx.usage.work).toBeLessThan(s.ctx.limits.work); expect(s.ctx.usage.allocation).toBeLessThan(s.ctx.limits.allocation);
  } finally { vi.restoreAllMocks(); }
}, 180_000);
