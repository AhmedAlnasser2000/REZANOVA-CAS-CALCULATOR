import { describe, expect, it } from 'vitest';
import { context, poly, rationalRing } from './test-support';
import { rational, assertRational } from './rational';
import { OwnedValidation } from './owned-validation';

describe('exact integer validation and operation lifetime', () => {
  it('has exact sizes at signed powers of two and around the 32-bit fast boundary', () => {
    const c = context({ integerBits: 4096 });
    c.operation(() => {
      expect(c.integer(0n)).toBe(0);
      for (const k of [1, 2, 31, 32, 33, 52, 53, 54, 63, 64, 65, 511, 1023, 2047, 4094]) {
        const p = 1n << BigInt(k);
        for (const n of [p-1n,p,p+1n]) for (const sign of [1n,-1n]) {
          const value = n*sign, bits = n.toString(2).length;
          expect(c.integer(value)).toBe(bits); expect(c.integer(value)).toBe(bits);
        }
      }
    });
  });
  it('rejects both signed boundary powers and huge inputs under stricter limits', () => {
    for (const value of [256n, -256n, 257n, -257n, 1n << 10000n, -(1n << 10000n)]) {
      const c = context({ integerBits: 8 });
      expect(() => c.operation(() => c.integer(value))).toThrow(/resource-limit: integer-bits/);
      expect(c.operationToken).toBeUndefined();
    }
    const value = rational(context(), 1n << 200n), r = rationalRing(), p = r.constant(context(), value);
    const large = context(); large.operation(() => r.assert(large, p));
    const small = context({ integerBits: 32 });
    expect(() => small.operation(() => assertRational(small, value))).toThrow(/integer-bits/);
    const degree = context({ degree: 1 });
    const cubic = poly(context(), r, [1,0,0,1]);
    expect(() => degree.operation(() => r.assert(degree, cubic))).toThrow(/resource-limit: degree/);
  });
  it('starts new operations cold, including nested entries and the same reused context', () => {
    const c = context(), n = (1n << 300n) + 1n;
    let token: object | undefined, cold = 0, warm = 0;
    c.operation(() => {
      token = c.operationToken;
      let before = c.usage.allocation; c.integer(n); cold = c.usage.allocation-before;
      before = c.usage.allocation; c.integer(n); warm = c.usage.allocation-before;
      expect(warm).toBeLessThan(cold);
      c.operation(() => { expect(c.operationToken).not.toBe(token); });
      expect(c.operationToken).toBe(token);
    });
    expect(c.operationToken).toBeUndefined();
    c.operation(() => {
      expect(c.operationToken).not.toBe(token);
      const before = c.usage.allocation; c.integer(n); expect(c.usage.allocation-before).toBe(cold);
    });
    expect(() => c.operation(() => { throw new Error('failed operation'); })).toThrow('failed operation');
    expect(c.operationToken).toBeUndefined();
  });
  it('charges hits, cache storage, conversion scratch and arithmetic outputs', () => {
    const c = context({ work: 1000 });
    c.operation(() => {
      c.integer(123n); c.tick(c.limits.work-c.usage.work);
      expect(() => c.integer(123n)).toThrow(/resource-limit: work/);
    });
    const a = context({ allocation: 10000 });
    a.operation(() => {
      const n = 1n << 100n; a.integer(n); a.allocate(a.limits.allocation-a.usage.allocation);
      expect(() => a.multiply(n,1n)).toThrow(/resource-limit: allocation/);
      expect(() => a.integer(n)).toThrow(/resource-limit: allocation/);
    });
    const scratch = context({ allocation: 6 });
    expect(() => scratch.operation(() => scratch.integer(1n << 500n))).toThrow(/resource-limit/);
  });
  it('evicts integer memo entries without imposing a mathematical limit', () => {
    const c = context(); c.operation(() => {
      for (let i=0; i<4200; i++) expect(c.integer(BigInt(i))).toBe(i === 0 ? 0 : BigInt(i).toString(2).length);
      expect(c.integer(4096n)).toBe(13);
    });
  });
});

describe('private owned-value validation', () => {
  it('registers only successful immutable values within one operation', () => {
    const c = context(), cache = new OwnedValidation(), value = Object.freeze({}), mutable = {};
    let checks = 0;
    c.operation(() => {
      expect(() => cache.check(c,value,() => { checks++; throw new Error('invalid'); })).toThrow('invalid');
      cache.check(c,value,() => { checks++; }); cache.check(c,value,() => { checks++; });
      cache.check(c,mutable,() => { checks++; }); cache.check(c,mutable,() => { checks++; });
      expect(checks).toBe(4);
    });
    c.operation(() => cache.check(c,value,() => { checks++; })); expect(checks).toBe(5);
    const other = new OwnedValidation(); c.operation(() => other.check(c,value,() => { checks++; })); expect(checks).toBe(6);
  });
  it('does not cache a successful check if its cache allocation fails', () => {
    const c = context({ allocation: 4 }), cache = new OwnedValidation(), value = Object.freeze({});
    expect(() => c.operation(() => cache.check(c,value,() => {}))).toThrow(/resource-limit: allocation/);
    expect(() => cache.check(c,value,() => {})).toThrow(/resource-limit/);
  });
});
