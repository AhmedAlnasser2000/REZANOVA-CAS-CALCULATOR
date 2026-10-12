import { describe, expect, it, vi } from 'vitest';
import { base, bounds, fresh, quadratic } from './__tests__/algebraic-support';
import * as constants from './algebraic-constant-field';
import * as normal from './algebraic-integral-basis';
import * as modules from './polynomial-module';
import * as linear from './linear-system';
import * as derivative from './algebraic-derivative';
import * as factor from './algebraic-factorization';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';

describe('full algebraic constant fields', () => {
  it('certifies the rational base', () => {
    const b = base(), proof = constants.certifyAlgebraicConstantField(b.ctx, b.field, bounds);
    expect(proof.basis.length).toBe(1); constants.verifyAlgebraicConstantField(fresh(), b.field, proof, bounds);
    expect(() => constants.algebraicConstantCoordinates(fresh(), b.field, proof, b.x, bounds)).toThrow();
  });
  it.each([[0n, 1n], [0n, 0n, 0n, 1n]])('certifies unchanged constants in %s', (...polynomial) => {
    const s = quadratic(polynomial), proof = constants.certifyAlgebraicConstantField(s.ctx, s.owner, bounds);
    expect(proof.basis.length).toBe(1); expect(proof.parent!.basis.length).toBe(1);
    constants.verifyAlgebraicConstantField(fresh(), s.owner, proof, bounds);
  });
  it('finds sqrt(2) as a hidden scaled root', () => {
    const s = quadratic([0n, 0n, 2n]), c = s.ctx, proof = constants.certifyAlgebraicConstantField(c, s.owner, bounds);
    expect(proof.basis.length).toBe(2);
    const v = s.owner.exactDivide(c, s.a, s.owner.embed(c, s.x)), q = constants.algebraicConstantCoordinates(fresh(), s.owner, proof, v, bounds);
    expect(proof.numberField.equal(c, proof.numberField.multiply(c, q, q), proof.numberField.fromInteger(c, 2n))).toBe(true);
    const embedding = constants.algebraicConstantEmbedding(fresh(), s.owner, proof, bounds);
    expect(s.owner.equal(c, embedding.map(c, q), v)).toBe(true);
    const spies = [vi.spyOn(constants, 'certifyAlgebraicConstantFieldWithin'), vi.spyOn(normal, 'algebraicIntegralBasisWithin'),
      vi.spyOn(normal, 'algebraicIdealizerWithin'), vi.spyOn(modules, 'polynomialModuleHermite'), vi.spyOn(linear, 'solveLinearSystem'),
      vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin')];
    for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
    try { constants.verifyAlgebraicConstantField(fresh(), s.owner, proof, bounds); } finally { for (const spy of spies) spy.mockRestore(); }
    expect(() => constants.verifyAlgebraicConstantField(fresh(), s.owner, {...proof, parentCoordinates: []}, bounds)).toThrow('verification-failed');
  });
  it('finds b/a in a nested field without replacing owners', () => {
    const s = quadratic(), c = s.ctx, r = new PolynomialRing(s.owner, 'b');
    const p = r.make(c, [s.owner.negate(c, s.owner.multiply(c, s.owner.fromInteger(c, 2n), s.owner.embed(c, s.x))), s.owner.fromInteger(c, 0n), s.owner.fromInteger(c, 1n)]);
    const owner = constructAlgebraicExtension(c, r, p, bounds), proof = constants.certifyAlgebraicConstantField(c, owner, bounds);
    expect(proof.parent!.basis.length).toBe(1); expect(proof.basis.length).toBe(2); expect(owner.parent).toBe(s.owner);
    const v = owner.exactDivide(c, owner.generator(c), owner.embed(c, s.a)), q = constants.algebraicConstantCoordinates(fresh(), owner, proof, v, bounds);
    expect(proof.numberField.equal(c, proof.numberField.multiply(c, q, q), proof.numberField.fromInteger(c, 2n))).toBe(true);
  }, 60_000);
});
