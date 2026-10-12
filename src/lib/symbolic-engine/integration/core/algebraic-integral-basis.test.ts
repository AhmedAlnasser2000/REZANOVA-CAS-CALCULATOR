import { describe, expect, it, vi } from 'vitest';
import { bounds, fresh, quadratic } from './__tests__/algebraic-support';
import { algebraicCoordinates, algebraicPrimitivePresentationWithin, verifyAlgebraicPresentationWithin, presentationValue } from './algebraic-presentation';
import { algebraicConstantSpaceWithin, verifyAlgebraicConstantSpaceWithin } from './algebraic-constant-space';
import { differentiateAlgebraic } from './algebraic-derivative';
import { algebraicIntegralModelWithin, verifyAlgebraicIntegralModelWithin } from './algebraic-integral-model';
import * as normalization from './algebraic-integral-basis';
import * as module from './polynomial-module';
import * as linear from './linear-system';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';

describe('complete algebraic integral closures', () => {
  it.each([[0n, 1n], [0n, 0n, 2n], [0n, 0n, 0n, 1n]])('normalizes finite and infinity models %s', (...polynomial) => {
    const s = quadratic(polynomial), c = s.ctx, coordinates = algebraicCoordinates(c, s.owner, bounds), presentation = algebraicPrimitivePresentationWithin(c, coordinates, bounds);
    verifyAlgebraicPresentationWithin(fresh(), coordinates, presentation, bounds);
    for (const infinity of [false, true]) {
      const model = algebraicIntegralModelWithin(c, presentation.auxiliary, infinity, bounds), proof = normalization.algebraicIntegralBasisWithin(c, model, bounds);
      verifyAlgebraicIntegralModelWithin(fresh(), presentation.auxiliary, infinity, model, bounds);
      normalization.verifyAlgebraicIntegralBasisWithin(fresh(), model, proof, bounds);
      expect(proof.final.basis.length).toBe(2);
      if (polynomial.length >= 3) expect(proof.rounds.length).toBeGreaterThan(1);
      const solvers = [vi.spyOn(normalization, 'algebraicIntegralBasisWithin'), vi.spyOn(normalization, 'algebraicIdealizerWithin'),
        vi.spyOn(module, 'polynomialModuleHermite'), vi.spyOn(linear, 'solveLinearSystem')];
      for (const spy of solvers) spy.mockImplementation(() => { throw Error('producer disabled'); });
      try { normalization.verifyAlgebraicIntegralBasisWithin(fresh(), model, proof, bounds); } finally { for (const spy of solvers) spy.mockRestore(); }
      const last = proof.rounds.at(-1)!;
      expect(() => normalization.verifyAlgebraicIntegralBasisWithin(fresh(), model, {...proof, rounds: [...proof.rounds, last]}, bounds)).toThrow('verification-failed');
    }
  });
  it('retains both directions for a nested primitive-element presentation', () => {
    const s = quadratic(), c = s.ctx, r = new PolynomialRing(s.owner, 'b');
    const p = r.make(c, [s.owner.negate(c, s.owner.multiply(c, s.owner.fromInteger(c, 2n), s.owner.embed(c, s.x))), s.owner.fromInteger(c, 0n), s.owner.fromInteger(c, 1n)]);
    const owner = constructAlgebraicExtension(c, r, p, bounds), coordinates = algebraicCoordinates(c, owner, bounds), proof = algebraicPrimitivePresentationWithin(c, coordinates, bounds);
    expect(proof.powers.length).toBe(4); verifyAlgebraicPresentationWithin(fresh(), coordinates, proof, bounds);
    expect(() => verifyAlgebraicPresentationWithin(fresh(), coordinates, {...proof, generatorCoordinates: proof.generatorCoordinates.slice(1)}, bounds)).toThrow('verification-failed');
  });
  it.each([[0n, 1n], [0n, 0n, 2n], [0n, 0n, 0n, 1n]])('determines the complete two-order intersection %s', (...polynomial) => {
    const s = quadratic(polynomial), c = s.ctx, coordinates = algebraicCoordinates(c, s.owner, bounds), presentation = algebraicPrimitivePresentationWithin(c, coordinates, bounds);
    const finite = algebraicIntegralModelWithin(c, presentation.auxiliary, false, bounds), infinity = algebraicIntegralModelWithin(c, presentation.auxiliary, true, bounds);
    const a = normalization.algebraicIntegralBasisWithin(c, finite, bounds), b = normalization.algebraicIntegralBasisWithin(c, infinity, bounds);
    const constants = algebraicConstantSpaceWithin(c, presentation.auxiliary, finite, a.final, infinity, b.final);
    verifyAlgebraicConstantSpaceWithin(fresh(), presentation.auxiliary, finite, a.final, infinity, b.final, constants);
    expect(constants.basis.length).toBe(polynomial.length === 3 ? 2 : 1);
    for (const constant of constants.basis) {
      const v = presentationValue(c, coordinates, presentation, constant); expect(s.owner.isZero(c, differentiateAlgebraic(c, s.owner, v, bounds).derivative)).toBe(true);
    }
    expect(() => verifyAlgebraicConstantSpaceWithin(fresh(), presentation.auxiliary, finite, a.final, infinity, b.final, {...constants, basis: []})).toThrow('verification-failed');
  });
});
