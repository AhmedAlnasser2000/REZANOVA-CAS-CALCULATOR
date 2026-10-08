import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { buildExponential } from './differential-admission';
import * as admission from './differential-admission';
import { CertifiedTowerView, verifyCertifiedTower, verifyCertifiedTowerWithin } from './recursive-certified-tower';

function fixture() {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), a = buildExponential(s.ctx, s.f, 't', [s.p([0, 2])], bounds);
  if (a.status !== 'supported') throw Error('fixture');
  return {...s, view: CertifiedTowerView.firstLevel(s.ctx, root, a.field, a.field.admission!, bounds)};
}
describe('scoped successful certified-tower verification', () => {
  it('reverifies obligations after scoped retention is evicted', () => {
    const s = fixture(), spy = vi.spyOn(admission, 'verifyAdmission');
    try {
      s.ctx.operation(() => {
        verifyCertifiedTowerWithin(s.ctx, s.view, bounds);
        for (let i = 0; i < 130; i++) verifyCertifiedTowerWithin(s.ctx, s.view, Object.freeze({...bounds}));
        const count = spy.mock.calls.length; verifyCertifiedTowerWithin(s.ctx, s.view, bounds);
        expect(spy.mock.calls.length).toBeGreaterThan(count);
      });
    } finally { vi.restoreAllMocks(); }
  });
  it('reuses an identical immutable obligation only inside its enclosing operation', () => {
    const s = fixture(), spy = vi.spyOn(admission, 'verifyAdmission');
    try {
      s.ctx.operation(() => {
        verifyCertifiedTowerWithin(s.ctx, s.view, bounds); const count = spy.mock.calls.length;
        expect(count).toBeGreaterThan(0); verifyCertifiedTowerWithin(s.ctx, s.view, bounds); expect(spy.mock.calls.length).toBe(count);
      });
      const count = spy.mock.calls.length; verifyCertifiedTower(s.ctx, s.view, bounds); expect(spy.mock.calls.length).toBeGreaterThan(count);
      const again = spy.mock.calls.length; verifyCertifiedTower(s.ctx, s.view, bounds); expect(spy.mock.calls.length).toBeGreaterThan(again);
    } finally { vi.restoreAllMocks(); }
  });
  it('keeps mutable bounds uncached and bounds changes distinct', () => {
    const s = fixture(), mutable = {...bounds}, spy = vi.spyOn(admission, 'verifyAdmission');
    try {
      s.ctx.operation(() => {
        verifyCertifiedTowerWithin(s.ctx, s.view, mutable); const count = spy.mock.calls.length;
        verifyCertifiedTowerWithin(s.ctx, s.view, mutable); expect(spy.mock.calls.length).toBeGreaterThan(count);
        expect(() => verifyCertifiedTowerWithin(s.ctx, s.view, {...bounds, towerHeight: 1})).toThrow('resource-limit');
      });
    } finally { vi.restoreAllMocks(); }
  });
  it('reverifies native values under stricter external arithmetic contexts', () => {
    const s = fixture();
    for (const limits of [{...s.ctx.limits, degree: 0}, {...s.ctx.limits, integerBits: 1}, {...s.ctx.limits, work: 1}, {...s.ctx.limits, allocation: 1}])
      expect(() => verifyCertifiedTower(new ExecutionContext(limits), s.view, bounds)).toThrow('resource-limit');
    const fake = Object.freeze(Object.create(CertifiedTowerView.prototype));
    expect(() => verifyCertifiedTower(s.ctx, fake, bounds)).toThrow('domain-mismatch');
  });
});
