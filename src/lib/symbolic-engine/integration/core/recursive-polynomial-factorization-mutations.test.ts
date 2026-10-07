import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { PolynomialRing } from './polynomial';
import { factorRecursivePolynomial as factor, verifyRecursivePolynomialFactorization as verify } from './recursive-polynomial-factorization';
import { encodeRecursivePolynomialFactorization as encode, decodeRecursivePolynomialFactorization as decode } from './recursive-polynomial-factorization-wire';
import * as conversion from './factorization-conversion';
import * as modular from './factorization-modular';
import * as finite from './factorization-finite';
import * as integers from './factorization-integer';
import * as local from './factorization-local';
import * as multi from './factorization-multivariate';

function fixture() {
  const {ctx, f, p} = setup(), ring = new PolynomialRing(f, 'z'), input = ring.make(ctx, [p([-1, 0, -1]), p([]), p([1])]);
  const proof = factor(ctx, ring, input, bounds); if (proof.kind !== 'factorization' || proof.route !== 'recursive') throw Error('fixture');
  const data = encode(ctx, ring, input, proof, bounds); return {ctx, ring, input, proof, data, fresh: () => new ExecutionContext(ctx.limits)};
}
describe('factorization proof mutations and limits', () => {
  it.each(['conversion', 'content', 'bound', 'degrees', 'point', 'prime', 'frobenius', 'lift', 'precision', 'inverse', 'leading', 'coverage', 'recovery', 'quotient'])('rejects mutated %s', kind => {
    const v = fixture(), bad = JSON.parse(JSON.stringify(v.data)), c = bad.decision.components[0], proof = c.tree.proof;
    if (kind === 'conversion') bad.decision.conversion.coefficients = bad.decision.conversion.coefficients.slice(1);
    if (kind === 'content') bad.decision.conversion.content.chain = [];
    if (kind === 'bound') proof.bound = '1';
    if (kind === 'degrees') proof.degrees[1]++;
    if (kind === 'point') proof.points[0] = '1';
    if (kind === 'prime') proof.modular.finite.prime = '9';
    if (kind === 'frobenius') proof.modular.finite.factors[0].irreducibility.frobenius = [];
    if (kind === 'lift') proof.modular.lifts.at(-1).factors[0][0] = '0';
    if (kind === 'precision') proof.modular.lifts = proof.modular.lifts.slice(0, 1);
    if (kind === 'inverse') proof.inverses[0] = ['0'];
    if (kind === 'leading') proof.leadingInverse = [];
    if (kind === 'coverage') proof.rejected = [];
    if (kind === 'recovery') proof.rejected[0].recovery.scale.value.numerator = '0';
    if (kind === 'quotient') proof.rejected[0].division.quotient = [];
    expect(() => decode(v.fresh(), v.ring, v.input, bad, bounds)).toThrow();
  });
  it.each([{work: 1}, {allocation: 1}, {degree: 0}, {integerBits: 1}])('preserves sticky arithmetic exhaustion %s', limits => {
    const v = fixture(), ctx = new ExecutionContext({...v.ctx.limits, ...limits});
    expect(() => factor(ctx, v.ring, v.input, bounds)).toThrow('resource-limit');
    expect(() => ctx.tick()).toThrow('resource-limit');
    const verification = new ExecutionContext({...v.ctx.limits, ...limits}); expect(() => verify(verification, v.ring, v.input, v.proof, bounds)).toThrow('resource-limit');
    const decoding = new ExecutionContext({...v.ctx.limits, ...limits}); expect(() => decode(decoding, v.ring, v.input, v.data, bounds)).toThrow('resource-limit');
  });
  it.each(['conversion', 'modular', 'finite', 'lifting', 'local', 'recombination'])('returns no result on exhaustion during %s', stage => {
    const v = fixture(), stop = (ctx: ExecutionContext): never => ctx.exhaust(`test-${stage}`); let spy;
    if (stage === 'conversion') spy = vi.spyOn(conversion, 'convertFactorPolynomial').mockImplementation(stop);
    if (stage === 'modular') spy = vi.spyOn(modular, 'modularBezout').mockImplementation(stop);
    if (stage === 'finite') spy = vi.spyOn(finite, 'factorFinitePolynomial').mockImplementation(stop);
    if (stage === 'lifting') spy = vi.spyOn(integers, 'liftIntegerModularFactors').mockImplementation(stop);
    if (stage === 'local') spy = vi.spyOn(local.FactorLocalRing.prototype, 'make').mockImplementation(stop);
    if (stage === 'recombination') spy = vi.spyOn(multi, 'factorMultivariatePolynomial').mockImplementation(stop);
    const ctx = v.fresh(); try { expect(() => factor(ctx, v.ring, v.input, bounds)).toThrow(`test-${stage}`); expect(() => ctx.tick()).toThrow('resource-limit'); }
    finally { spy?.mockRestore(); }
  });
  it('external verification starts fresh and ignores mutable surrounding flags', () => {
    const v = fixture(), ctx = v.fresh(); verify(ctx, v.ring, v.input, v.proof, bounds); const work = ctx.usage.work;
    verify(ctx, v.ring, v.input, v.proof, bounds); expect(ctx.usage.work - work).toBe(work);
    const mutable = {...v.proof, factors: [...v.proof.factors]}; verify(ctx, v.ring, v.input, mutable, bounds);
    mutable.factors[0] = {...mutable.factors[0], multiplicity: 2n}; expect(() => verify(ctx, v.ring, v.input, Object.freeze(mutable), bounds)).toThrow('verification-failed');
  });
  it.each(['artifactDepth', 'artifactNodes', 'artifactBytes', 'towerHeight'] as const)('enforces %s independently', key => {
    const v = fixture(), b = {...bounds, [key]: 1};
    const expected = key === 'towerHeight' ? 'factorization' : 'resource-limit';
    if (key === 'towerHeight') expect(decode(v.fresh(), v.ring, v.input, v.data, b).kind).toBe(expected);
    else expect(() => decode(v.fresh(), v.ring, v.input, v.data, b)).toThrow(expected);
  });
});
