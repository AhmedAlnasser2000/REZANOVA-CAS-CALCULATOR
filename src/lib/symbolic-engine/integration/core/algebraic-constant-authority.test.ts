import { describe, expect, it } from 'vitest';
import { base, bounds, fresh, quadratic } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField, verifyAlgebraicConstantField, algebraicConstantCoordinates } from './algebraic-constant-field';
import { encodeAlgebraicConstantField, decodeAlgebraicConstantField } from './algebraic-constant-wire';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension, type AlgebraicField } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { algebraicCoordinates, algebraicPrimitivePresentationWithin } from './algebraic-presentation';
import { algebraicIntegralModelWithin } from './algebraic-integral-model';
import { algebraicIntegralBasisWithin, verifyAlgebraicIntegralBasisWithin } from './algebraic-integral-basis';
import { ExecutionContext } from './execution';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { verifyAlgebraicConstantFieldWithin } from './algebraic-constant-field';

describe('constant completeness authority', () => {
  it('normalizes a repeated irreducible prime through a genuine number residue field', () => {
    const s = quadratic([0n, 1n, 0n, 2n, 0n, 1n]), c = s.ctx, proof = certifyAlgebraicConstantField(c, s.owner, bounds);
    expect(proof.basis.length).toBe(1);
    const residues = proof.finiteClosure.rounds.flatMap(round => round.attempts.map(a => a.idealizer.residue));
    expect(residues.some(r => r.ring.degree(c, r.modulus) === 2)).toBe(true);
    const wire = encodeAlgebraicConstantField(fresh(), s.owner, proof, bounds); decodeAlgebraicConstantField(fresh(), s.owner, wire, bounds);
  }, 60_000);
  it('covers a cubic function field and a nontrivial infinity order', () => {
    const b = base(), c = b.ctx, r = new PolynomialRing(b.field, 'a'), p = r.make(c, [b.field.negate(c, b.x), b.field.fromInteger(c, -1n), b.field.fromInteger(c, 0n), b.field.fromInteger(c, 1n)]);
    const owner = constructAlgebraicExtension(c, r, p, bounds), proof = certifyAlgebraicConstantField(c, owner, bounds);
    expect(proof.basis.length).toBe(1); expect(proof.infinityClosure.rounds.length).toBeGreaterThan(1);
    const wire = encodeAlgebraicConstantField(fresh(), owner, proof, bounds); decodeAlgebraicConstantField(fresh(), owner, wire, bounds);
  });
  it('certifies successive constant-field growth', () => {
    const s = quadratic([0n, 0n, 2n]), c = s.ctx, r = new PolynomialRing(s.owner, 'b'), xx = s.field.multiply(c, s.x, s.x);
    const p = r.make(c, [s.owner.embed(c, s.field.negate(c, s.field.multiply(c, s.field.fromInteger(c, 3n), xx))), s.owner.fromInteger(c, 0n), s.owner.fromInteger(c, 1n)]);
    const owner = constructAlgebraicExtension(c, r, p, bounds), proof = certifyAlgebraicConstantField(c, owner, bounds);
    expect(proof.parent!.basis.length).toBe(2); expect(proof.basis.length).toBe(4);
    const v = owner.exactDivide(c, owner.generator(c), owner.embed(c, s.owner.embed(c, s.x))), q = algebraicConstantCoordinates(fresh(), owner, proof, v, bounds);
    expect(proof.numberField.equal(c, proof.numberField.multiply(c, q, q), proof.numberField.fromInteger(c, 3n))).toBe(true);
    const wire = encodeAlgebraicConstantField(fresh(), owner, proof, bounds); expect(decodeAlgebraicConstantField(fresh(), owner, wire, bounds).basis.length).toBe(4);
  }, 60_000);
  it('certifies and replays height eight with modest total degree', () => {
    const s = quadratic([0n, 0n, 2n]), c = s.ctx; let owner = s.owner as unknown as AlgebraicField<unknown>;
    for (let i = owner.height + 1; i <= 8; i++) {
      const r = new PolynomialRing(owner, `a${i}`), p = r.make(c, [owner.negate(c, owner.generator(c)), owner.fromInteger(c, 1n)]);
      owner = constructAlgebraicExtension(c, r, p, bounds) as unknown as AlgebraicField<unknown>;
    }
    const proof = certifyAlgebraicConstantField(fresh(), owner, bounds), wire = encodeAlgebraicConstantField(fresh(), owner, proof, bounds);
    expect(decodeAlgebraicConstantField(fresh(), owner, wire, bounds).basis.length).toBe(2);
    expect(proof.parent!.parent!.parent).not.toBe(null);
  }, 60_000);
  it.each(['radical', 'idealizer', 'normalization', 'denominator'])('rejects corrupted complete %s evidence', mutation => {
    const s = quadratic([0n, 0n, 2n]), c = s.ctx, coordinates = algebraicCoordinates(c, s.owner, bounds), presentation = algebraicPrimitivePresentationWithin(c, coordinates, bounds);
    const model = algebraicIntegralModelWithin(c, presentation.auxiliary, false, bounds), proof = algebraicIntegralBasisWithin(c, model, bounds), round = proof.rounds[0], attempt = round.attempts[0];
    let changed = attempt;
    if (mutation === 'radical') changed = {...attempt, idealizer: {...attempt.idealizer, traceKernel: {...attempt.idealizer.traceKernel, rank: 2}}};
    if (mutation === 'idealizer') changed = {...attempt, idealizer: {...attempt.idealizer, constraints: {...attempt.idealizer.constraints, operations: []}}};
    if (mutation === 'normalization') changed = {...attempt, order: {...attempt.order, discriminant: model.field.parent.fromInteger(c, 1n).numerator}};
    if (mutation === 'denominator') changed = {...attempt, idealizer: {...attempt.idealizer, denominators: {...attempt.idealizer.denominators, common: (model.field.parent as typeof s.field).ring.zero(c)}}};
    expect(() => verifyAlgebraicIntegralBasisWithin(fresh(), model, {...proof, rounds: [{...round, attempts: [changed]}, ...proof.rounds.slice(1)]}, bounds)).toThrow();
  });
  it('retains large exact coefficients and alternate variable names', () => {
    const b = base('u'), c = b.ctx, r = new PolynomialRing(b.field, 'a'), k = (1n << 100n) + 1n;
    const p = r.make(c, [b.field.negate(c, b.field.multiply(c, b.field.fromInteger(c, 2n * k * k), b.field.multiply(c, b.x, b.x))), b.field.fromInteger(c, 0n), b.field.fromInteger(c, 1n)]);
    const owner = constructAlgebraicExtension(c, r, p, bounds), proof = certifyAlgebraicConstantField(c, owner, bounds);
    expect(proof.basis.length).toBe(2); verifyAlgebraicConstantField(fresh(), owner, proof, bounds);
    const map = AlgebraicEmbedding.extension(c, proof.numberField, owner, AlgebraicEmbedding.rationals(c, owner, bounds), proof.primitive, bounds);
    expect(owner.equal(c, map.map(c, proof.numberField.generator(c)), proof.primitive)).toBe(true);
  }, 60_000);
  it('starts fresh proof state and keeps cumulative exhaustion sticky', () => {
    const s = quadratic(), c = fresh(), proof = certifyAlgebraicConstantField(c, s.owner, bounds), first = c.usage.work;
    verifyAlgebraicConstantField(c, s.owner, proof, bounds); expect(c.usage.work).toBeGreaterThan(first);
    for (const limits of [{work: 500}, {allocation: 500}, {degree: 0}, {integerBits: 1}]) {
      const exhausted = new ExecutionContext({...fresh().limits, ...limits});
      expect(() => verifyAlgebraicConstantField(exhausted, s.owner, proof, bounds)).toThrow('resource-limit');
      expect(() => exhausted.tick()).toThrow('resource-limit');
    }
  });
  it('never reuses construction authority as constant completeness or mutable evidence', () => {
    const s = quadratic(), proof = certifyAlgebraicConstantField(fresh(), s.owner, bounds), c = fresh();
    c.operation(() => {
      verifyAlgebraicChainWithin(c, s.owner, bounds);
      expect(() => verifyAlgebraicConstantFieldWithin(c, s.owner, s.owner as unknown as typeof proof, bounds)).toThrow('invalid-input');
      const mutable = {...proof}; verifyAlgebraicConstantFieldWithin(c, s.owner, mutable, bounds); mutable.basis = [];
      expect(() => verifyAlgebraicConstantFieldWithin(c, s.owner, mutable, bounds)).toThrow('verification-failed');
    });
  });
});
