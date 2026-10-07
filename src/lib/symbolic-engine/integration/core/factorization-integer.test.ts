import { describe, expect, it } from 'vitest';
import { setup } from './differential-test-support';
import { FactorPrimeField } from './factorization-modular';
import { factorFinitePolynomial, verifyFiniteDecomposition } from './factorization-finite';
import { factorIntegerPolynomial, integerFactorLeaves, verifyIntegerFactorTree } from './factorization-integer';

describe('checked modular and integer factorization', () => {
  it.each([
    { input: [1n, 0n, 0n, 0n, 1n], factors: 1 },
    { input: [6n, 0n, -5n, 0n, 1n], factors: 2 },
    { input: [-1n, 1n, -1n, 1n], factors: 2 },
    { input: [-3n, 5n, 2n], factors: 2 },
    { input: [1n, 0n, 1n], factors: 1 },
    { input: [-9007199254740993n, 1n], factors: 1 },
  ])('factors $input with complete terminal proofs', ({input, factors}) => {
    const { ctx } = setup(), proof = factorIntegerPolynomial(ctx, input);
    verifyIntegerFactorTree(ctx, input, proof);
    expect(integerFactorLeaves(ctx, proof)).toHaveLength(factors);
    expect(Object.isFrozen(proof)).toBe(true);
  });
  it('does not equate modular reducibility with rational reducibility', () => {
    const { ctx } = setup(), f = [1n, 0n, 0n, 0n, 1n], proof = factorIntegerPolynomial(ctx, f);
    if (proof.kind !== 'irreducible') throw Error('fixture');
    expect(proof.proof.finite.factors.length).toBeGreaterThan(1);
    expect(proof.proof.rejected).toHaveLength(2 ** proof.proof.finite.factors.length - 2);
    expect(() => verifyIntegerFactorTree(ctx, f, {...proof, proof: {...proof.proof, rejected: proof.proof.rejected.slice(1)}})).toThrow('verification-failed');
    expect(() => verifyIntegerFactorTree(ctx, f, {...proof, proof: {...proof.proof, bound: 1n}})).toThrow('verification-failed');
    expect(() => verifyIntegerFactorTree(ctx, f, {...proof, proof: {...proof.proof, lifts: proof.proof.lifts.slice(0, 1)}})).toThrow('verification-failed');
  });
  it('verifies modular Frobenius irreducibility and rejects changed evidence', () => {
    const { ctx } = setup(), field = new FactorPrimeField(ctx, 3n), f = field.make(ctx, [1n, 0n, 0n, 0n, 1n]);
    const proof = factorFinitePolynomial(ctx, field, f); verifyFiniteDecomposition(ctx, field, f, proof);
    expect(proof.factors).toHaveLength(2);
    expect(() => verifyFiniteDecomposition(ctx, field, f, {...proof, factors: proof.factors.slice(1)})).toThrow('verification-failed');
    expect(() => new FactorPrimeField(ctx, 9n)).toThrow('verification-failed');
  });
});
