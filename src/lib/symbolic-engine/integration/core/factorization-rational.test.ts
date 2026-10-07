import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { rationalField } from './field';
import { rational } from './rational';
import { PolynomialRing } from './polynomial';
import { factorRationalPolynomial, verifyRationalFactorization } from './factorization-rational';
import { rationalFactorizationCodec } from './factorization-codecs';
import { inspectExactArtifact } from './artifact-bounds';
import * as integers from './factorization-integer';
import * as finite from './factorization-finite';
import * as squareFree from './polynomial-square-free';

describe('rational factorization checkpoint', () => {
  it.each([[[], 0], [[7], 0], [[1, 0, 0, 0, 1], 1], [[6, 0, -5, 0, 1], 2]] as const)('handles %s', (cs, count) => {
    const { ctx } = setup(), ring = new PolynomialRing(rationalField, 'z'), p = ring.make(ctx, cs.map(n => rational(ctx, n)));
    const result = ctx.operation(() => factorRationalPolynomial(ctx, ring, p));
    ctx.operation(() => verifyRationalFactorization(ctx, ring, p, result));
    if (result.kind !== 'zero') expect(result.factors).toHaveLength(count);
  });
  it('reconstructs nonmonic repeated factors, exact unit and multiplicities', () => {
    const { ctx } = setup(), ring = new PolynomialRing(rationalField, 'z'), p = (ns: number[]) => ring.make(ctx, ns.map(n => rational(ctx, n)));
    const input = ring.scale(ctx, ring.multiply(ctx, ring.power(ctx, p([-1, 2]), 3), ring.power(ctx, p([1, 0, 1]), 2)), rational(ctx, -7, 11));
    const result = ctx.operation(() => factorRationalPolynomial(ctx, ring, input)); if (result.kind !== 'factorization') throw Error('fixture');
    expect(result.unit).toEqual(rational(ctx, -56, 11));
    expect(result.factors.map(f => f.multiplicity)).toEqual([2n, 3n]);
    expect(() => verifyRationalFactorization(ctx, ring, input, {...result, factors: result.factors.slice(1)})).toThrow('verification-failed');
    expect(() => verifyRationalFactorization(ctx, ring, input, {...result, unit: rational(ctx, 1)})).toThrow('verification-failed');
  });
  it('replays rational evidence with producers disabled', () => {
    const { ctx } = setup(), ring = new PolynomialRing(rationalField, 'z'), input = ring.make(ctx, [1, 0, 0, 0, 1].map(n => rational(ctx, n)));
    const proof = factorRationalPolynomial(ctx, ring, input), codec = rationalFactorizationCodec(ctx, ring), wire = codec.encode(proof);
    inspectExactArtifact(ctx, bounds, wire);
    const disabled = () => { throw Error('producer called'); };
    const spies = [vi.spyOn(integers, 'factorIntegerPolynomial').mockImplementation(disabled),
      vi.spyOn(finite, 'factorFinitePolynomial').mockImplementation(disabled), vi.spyOn(squareFree, 'squareFree').mockImplementation(disabled)];
    try { const restored = codec.decode(JSON.parse(JSON.stringify(wire))); verifyRationalFactorization(ctx, ring, input, restored); }
    finally { spies.forEach(s => s.mockRestore()); }
  });
});
