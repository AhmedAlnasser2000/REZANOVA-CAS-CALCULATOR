import { describe, expect, it } from 'vitest';
import { context, poly } from './test-support';
import { rational } from './rational';
import { FormalPrimitiveDomain } from './formal-primitive';
import { differentiatePrimitive, verifyPrimitiveDerivative } from './primitive-verification';
import { decodePrimitive, encodePrimitive } from './primitive-wire';

// Bounded backend profiles, not adoption defaults. Nested verified Q(x) operations
// and independent verification share this one context throughout each test.
function budget() { return context({ work: 1_000_000_000, allocation: 10_000_000_000 }); }
function quadraticFixture() {
  const ctx = budget(), owner = new FormalPrimitiveDomain('x', 'z');
  const q = owner.z.make(ctx, [rational(ctx, 1, 4), rational(ctx, 0), rational(ctx, 1)]);
  const term = owner.term(ctx, q, poly(ctx, owner.z, [0, 1]), owner.arguments.make(ctx, [poly(ctx, owner.z, [0, 2]), owner.z.one(ctx)]));
  const candidate = owner.make(ctx, owner.fractions.fromInteger(ctx, 0n), [term]);
  const target = owner.fractions.make(ctx, owner.x.one(ctx), poly(ctx, owner.x, [1, 0, 1]));
  return { ctx, owner, term, candidate, target };
}
describe('formal local complex primitives', () => {
  it('proves the quadratic weighted log sum without selecting roots', () => {
    const { ctx, owner, candidate, target, term } = quadraticFixture();
    const proof = differentiatePrimitive(ctx, candidate);
    verifyPrimitiveDerivative(ctx, candidate, target, proof);
    expect(owner.fractions.equal(ctx, proof.derivative, target)).toBe(true);
    expect(owner.x.equal(ctx, term.norm, poly(ctx, owner.x, [1, 0, 1]))).toBe(true);
  });
  it('uses each residue root once even when the residue resultant has multiplicity two', () => {
    const ctx = budget(), owner = new FormalPrimitiveDomain('x', 'z');
    const q = owner.z.make(ctx, [rational(ctx, -1, 2), rational(ctx, 1)]);
    const term = owner.term(ctx, q, poly(ctx, owner.z, [0, 1]), owner.arguments.make(ctx,
      [poly(ctx, owner.z, [-1]), owner.z.zero(ctx), owner.z.one(ctx)]));
    const candidate = owner.make(ctx, owner.fractions.fromInteger(ctx, 0n), [term]);
    const target = owner.fractions.make(ctx, poly(ctx, owner.x, [0, 1]), poly(ctx, owner.x, [-1, 0, 1]));
    verifyPrimitiveDerivative(ctx, candidate, target, differentiatePrimitive(ctx, candidate));
  });
  it('proves the degree-five root sum as q prime / q without resolving roots', () => {
    const ctx = budget(), owner = new FormalPrimitiveDomain('x', 'z');
    const q = poly(ctx, owner.z, [-1, -1, 0, 0, 0, 1]);
    const term = owner.term(ctx, q, owner.z.one(ctx), owner.arguments.make(ctx, [poly(ctx, owner.z, [0, -1]), owner.z.one(ctx)]));
    const candidate = owner.make(ctx, owner.fractions.fromInteger(ctx, 0n), [term]);
    const qx = poly(ctx, owner.x, [-1, -1, 0, 0, 0, 1]);
    const target = owner.fractions.make(ctx, poly(ctx, owner.x, [-1, 0, 0, 0, 5]), qx);
    expect(owner.x.equal(ctx, term.norm, qx)).toBe(true);
    verifyPrimitiveDerivative(ctx, candidate, target, differentiatePrimitive(ctx, candidate));
  });
  it('rejects repeated roots, component-zero arguments and mismatched contexts', () => {
    const ctx = budget(), owner = new FormalPrimitiveDomain('x', 'z');
    const argument = owner.arguments.make(ctx, [poly(ctx, owner.z, [-1, 1])]);
    expect(() => owner.term(ctx, poly(ctx, owner.z, [1, -2, 1]), owner.z.one(ctx), argument)).toThrow('invalid-input');
    expect(() => owner.term(ctx, poly(ctx, owner.z, [-1, 0, 1]), owner.z.one(ctx), argument)).toThrow('invalid-input');
    const foreign = new FormalPrimitiveDomain('x', 'z');
    expect(() => owner.term(ctx, poly(ctx, foreign.z, [-1, 0, 1]), owner.z.one(ctx), argument)).toThrow('domain-mismatch');
    expect(() => new FormalPrimitiveDomain('x', 'x')).toThrow('domain-mismatch');
  });
  it('rejects changed weights, traces, inverse witnesses and target integrands', () => {
    const { ctx, owner, candidate, target, term } = quadraticFixture(), proof = differentiatePrimitive(ctx, candidate);
    const changed = owner.make(ctx, candidate.rationalPart, [owner.term(ctx, term.modulus, owner.z.one(ctx), term.argument)]);
    expect(() => verifyPrimitiveDerivative(ctx, changed, target, proof)).toThrow('verification-failed');
    expect(() => verifyPrimitiveDerivative(ctx, candidate, owner.fractions.fromInteger(ctx, 0n), proof)).toThrow('verification-failed');
    const log = proof.terms[0];
    expect(() => verifyPrimitiveDerivative(ctx, candidate, target, { ...proof,
      terms: [{ ...log, trace: { ...log.trace, trace: owner.fractions.fromInteger(ctx, 0n) } }] })).toThrow('verification-failed');
    expect(() => verifyPrimitiveDerivative(ctx, candidate, target, { ...proof, terms: [{ ...log, inverse: { kind: 'zero' } }] })).toThrow('verification-failed');
  });
  it('retains every nonvanishing norm despite cancellation and retains the rational denominator', () => {
    const { ctx, owner, candidate, term } = quadraticFixture();
    const opposite = owner.term(ctx, term.modulus, owner.z.negate(ctx, term.weight), term.argument);
    const rationalPart = owner.fractions.make(ctx, owner.x.one(ctx), poly(ctx, owner.x, [0, 1]));
    const cancelling = owner.make(ctx, rationalPart, [term, opposite]);
    const target = owner.fractions.derivative(ctx, rationalPart), proof = differentiatePrimitive(ctx, cancelling);
    verifyPrimitiveDerivative(ctx, cancelling, target, proof);
    expect(proof.conditions.logNorms).toHaveLength(2);
    expect(proof.conditions.rationalDenominator).toBe(rationalPart.denominator);
    expect(() => verifyPrimitiveDerivative(ctx, cancelling, target, { ...proof, conditions: candidate.conditions })).toThrow('verification-failed');
  });
  it('replays an exact artifact into fresh owned domains and separately rechecks its target', () => {
    const { ctx, owner, candidate, target } = quadraticFixture();
    const encoded = encodePrimitive(ctx, candidate), replay = decodePrimitive(ctx, JSON.parse(JSON.stringify(encoded)), { variable: 'x', residueVariable: 'z' });
    expect(replay.owner).not.toBe(owner);
    expect(encodePrimitive(ctx, replay)).toEqual(encoded);
    const replayTarget = replay.owner.fractions.make(ctx, poly(ctx, replay.owner.x, target.numerator.coefficients.map(c => c.numerator)),
      poly(ctx, replay.owner.x, target.denominator.coefficients.map(c => c.numerator)));
    verifyPrimitiveDerivative(ctx, replay, replayTarget, differentiatePrimitive(ctx, replay));
  });
  it('fails distinctly on nested budget exhaustion and during final verification', () => {
    const { ctx, candidate, target } = quadraticFixture(), proof = differentiatePrimitive(ctx, candidate);
    expect(() => verifyPrimitiveDerivative(context({ work: 50 }), candidate, target, proof)).toThrow('resource-limit');
    const meter = budget(); verifyPrimitiveDerivative(meter, candidate, target, proof);
    expect(() => verifyPrimitiveDerivative(context({ work: meter.usage.work - 1, allocation: 10_000_000_000 }), candidate, target, proof)).toThrow('resource-limit');
    expect(() => decodePrimitive(context({ allocation: 10 }), encodePrimitive(ctx, candidate), { variable: 'x', residueVariable: 'z' })).toThrow('resource-limit');
  });
});
