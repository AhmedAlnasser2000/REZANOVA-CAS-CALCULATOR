import {it, expect} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {FactorPrimeField} from './factorization-modular';
import {numberFieldModularDescriptor, numberFieldModularImage} from './number-field-modular-image';
import {ExecutionContext} from './execution';
import {checkedRationalGcdPrimeField, recordRationalGcdEvidence, rationalGcdPrimeFields} from './rational-gcd-evidence';

function fixture() {
  const ctx = fresh(), ring = new PolynomialRing(Q, 'a'), owner = constructAlgebraicExtension(ctx, ring, ring.make(ctx, [-2n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds);
  return {ctx, owner};
}
it('shares only exact registered coefficient and prime owners within one live operation', () => {
  const {owner} = fixture(), ctx = fresh();
  const first = ctx.operation(() => {
    const d = numberFieldModularDescriptor(ctx, owner), before = ctx.usage.allocation;
    expect(numberFieldModularDescriptor(ctx, owner)).toBe(d); expect(ctx.usage.allocation).toBe(before);
    const value = owner.generator(ctx), coordinates = d.coordinates(ctx, value);
    expect(d.coordinates(ctx, value)).toBe(coordinates); expect(Object.isFrozen(coordinates)).toBe(true);
    expect(() => d.coordinates(ctx, {...value})).toThrow('domain-mismatch');
    const p = new FactorPrimeField(ctx, 7n), image = numberFieldModularImage(ctx, d, p)!;
    const q = numberFieldModularImage(ctx, d, p); expect(q).toBe(image); expect(image.coefficients).toMatchObject({capability: 'ring'});
    const other = numberFieldModularImage(ctx, d, new FactorPrimeField(ctx, 7n))!; expect(other).not.toBe(image);
    expect(() => image.coefficients.add(ctx, image.coefficients.one(ctx), other.coefficients.one(ctx))).toThrow('domain-mismatch');
    const supplied = Object.freeze({...d}); expect(numberFieldModularImage(ctx, supplied, p)).not.toBe(numberFieldModularImage(ctx, supplied, p));
    return {d, p, image};
  });
  ctx.operation(() => {expect(numberFieldModularDescriptor(ctx, owner)).not.toBe(first.d); expect(numberFieldModularImage(ctx, first.d, first.p)).not.toBe(first.image);});
  const foreign = fixture(); ctx.operation(() => expect(numberFieldModularDescriptor(ctx, foreign.owner)).not.toBe(numberFieldModularDescriptor(ctx, owner)));
});
it('does not cache rejected modulus images or bypass stricter budgets and sticky exhaustion', () => {
  const ctx = fresh(), ring = new PolynomialRing(Q, 'a'), owner = constructAlgebraicExtension(ctx, ring, ring.make(ctx, [Q.exactDivide(ctx, Q.fromInteger(ctx, -1n), Q.fromInteger(ctx, 5n)), Q.fromInteger(ctx, 0n), Q.fromInteger(ctx, 1n)]), bounds);
  ctx.operation(() => {const d = numberFieldModularDescriptor(ctx, owner), p = new FactorPrimeField(ctx, 5n);
    expect(numberFieldModularImage(ctx, d, p)).toBeNull(); const work = ctx.usage.work;
    expect(numberFieldModularImage(ctx, d, p)).toBeNull(); expect(ctx.usage.work).toBeGreaterThan(work);
  });
  const exhausted = new ExecutionContext({...fresh().limits, allocation: 1}); expect(() => exhausted.operation(() => numberFieldModularDescriptor(exhausted, owner))).toThrow('resource-limit'); expect(() => exhausted.tick()).toThrow('resource-limit');
  const limited = new ExecutionContext({...fresh().limits, degree: 0}); expect(() => limited.operation(() => {
    const d = numberFieldModularDescriptor(limited, owner); numberFieldModularImage(limited, d, new FactorPrimeField(limited, 7n));
  })).toThrow('resource-limit');
});
it('shares checked reconstructed prime domains without equating supplied owners or caching failures', () => {
  const ctx = fresh(), first = ctx.operation(() => {
    const p = checkedRationalGcdPrimeField(ctx, 7n); expect(checkedRationalGcdPrimeField(ctx, 7n)).toBe(p);
    expect(new FactorPrimeField(ctx, 7n)).not.toBe(p);
    for (let i = 0; i < 2; i++) expect(() => checkedRationalGcdPrimeField(ctx, 4n)).toThrow('verification-failed');
    const record = recordRationalGcdEvidence(ctx, () => {const primes = rationalGcdPrimeFields(ctx); const p2 = primes.next().value as FactorPrimeField; expect(p2).toBe(checkedRationalGcdPrimeField(ctx, 2n)); return p2;});
    expect(record.evidence.primes).toEqual([2n]); return p;
  });
  ctx.operation(() => expect(checkedRationalGcdPrimeField(ctx, 7n)).not.toBe(first));
  const limited = new ExecutionContext({...fresh().limits, integerBits: 2}); expect(() => limited.operation(() => checkedRationalGcdPrimeField(limited, 7n))).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
