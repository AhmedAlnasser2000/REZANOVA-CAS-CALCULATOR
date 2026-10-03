import { describe, expect, it } from 'vitest';
import { EquationAlgebraError, ExecutionContext } from './execution';
import { context } from './test-support';

function stopOf(run: () => void) {
  try { run(); } catch (e) { return e instanceof EquationAlgebraError ? { code: e.code, stop: e.stop } : 'other'; }
  return 'none';
}

describe('execution context', () => {
  it('rejects invalid budgets', () => {
    expect(() => new ExecutionContext({ work: -1, allocation: 1 })).toThrow(EquationAlgebraError);
    expect(() => new ExecutionContext({ work: 1.5, allocation: 1 })).toThrow(EquationAlgebraError);
  });

  it('stops on work and allocation, and the stop is sticky', () => {
    const ctx = context({ work: 3 });
    ctx.tick(); ctx.tick(); ctx.tick();
    expect(stopOf(() => ctx.tick())).toEqual({ code: 'resource', stop: 'work' });
    expect(ctx.stopped).toBe('work');
    expect(stopOf(() => ctx.tick(0))).toEqual({ code: 'resource', stop: 'work' });
    const a = context({ allocation: 10 });
    a.allocate(10);
    expect(stopOf(() => a.allocate(1))).toEqual({ code: 'resource', stop: 'allocation' });
  });

  it('cancels cooperatively through cancel() and the hook', () => {
    const ctx = context();
    ctx.tick(); ctx.cancel();
    expect(stopOf(() => ctx.tick())).toEqual({ code: 'resource', stop: 'cancelled' });
    let flag = false;
    const hooked = context({}, () => flag);
    hooked.tick(); flag = true;
    expect(stopOf(() => hooked.tick())).toEqual({ code: 'resource', stop: 'cancelled' });
  });

  it('exposes usage and freezes budget', () => {
    const ctx = context();
    ctx.charge(10, 3);
    expect(ctx.usage.work).toBeGreaterThanOrEqual(11);
    expect(ctx.usage.allocation).toBe(3);
    expect(Object.isFrozen(ctx.budget)).toBe(true);
  });
});
