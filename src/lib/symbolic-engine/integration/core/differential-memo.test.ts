import {describe, expect, it} from 'vitest';
import {setup, bounds} from './differential-test-support';
import {DifferentialField} from './differential-field';
import {ExecutionContext} from './execution';

describe('operation-local owned constants and ancestor embeddings', () => {
  it('reuses exact native constants and embeddings only in the current scope', () => {
    const s = setup(), f = DifferentialField.formal(s.ctx, s.f, 't', [s.p([1])], bounds);
    let retained: ReturnType<typeof f.fromInteger>;
    s.ctx.operation(() => {
      retained = f.fromInteger(s.ctx, 1n); const before = s.ctx.usage;
      expect(f.fromInteger(s.ctx, 1n)).toBe(retained);
      const a = f.embed(s.ctx, s.x); expect(f.embed(s.ctx, s.x)).toBe(a);
      expect(s.ctx.usage.work).toBeGreaterThan(before.work);
      s.ctx.operation(() => expect(f.fromInteger(s.ctx, 1n)).not.toBe(retained));
      expect(f.fromInteger(s.ctx, 1n)).toBe(retained);
    });
    s.ctx.operation(() => expect(f.fromInteger(s.ctx, 1n)).not.toBe(retained));
    expect(f.equal(s.ctx, f.fromInteger(s.ctx, 1n), retained!)).toBe(true);
  });
  it('rejects foreign and forged values before lookup, and rechecks stricter cold limits', () => {
    const s = setup(), f = DifferentialField.formal(s.ctx, s.f, 't', [s.p([1])], bounds), other = setup();
    s.ctx.operation(() => {
      f.embed(s.ctx, s.x);
      expect(() => f.embed(s.ctx, other.x)).toThrow('domain-mismatch');
      expect(() => f.embed(s.ctx, {...s.x})).toThrow('domain-mismatch');
    });
    const large = s.p([1n << 100n]); s.ctx.operation(() => f.embed(s.ctx, large));
    const cold = new ExecutionContext({...s.ctx.limits, integerBits: 32});
    expect(() => cold.operation(() => f.embed(cold, large))).toThrow('resource-limit');
  });
  it('charges retained storage and never revives a stopped context on a memo hit', () => {
    const s = setup(); s.ctx.operation(() => {
      s.f.fromInteger(s.ctx, 1n); s.f.embed(s.ctx, s.c(1));
      s.ctx.tick(s.ctx.limits.work - s.ctx.usage.work);
      expect(() => s.f.fromInteger(s.ctx, 1n)).toThrow('resource-limit');
      expect(() => s.f.embed(s.ctx, s.x)).toThrow('resource-limit');
    });
    const stopped = new ExecutionContext({...setup().ctx.limits, allocation: 10});
    expect(() => stopped.operation(() => s.f.fromInteger(stopped, 1n))).toThrow('resource-limit');
    expect(stopped.operationToken).toBeUndefined();
  });
});
