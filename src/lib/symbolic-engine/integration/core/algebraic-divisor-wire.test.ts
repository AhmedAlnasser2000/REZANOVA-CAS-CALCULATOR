import { describe, it, expect, vi } from 'vitest';
import { base, quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { encodeAlgebraicCurve, decodeAlgebraicCurve } from './algebraic-curve-wire';
import { constructAlgebraicDivisor, principalAlgebraicDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRoch } from './algebraic-riemann-roch';
import { decideAlgebraicPrincipality } from './algebraic-principality';
import { decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral } from './algebraic-place';
import { encodeAlgebraicDivisor, decodeAlgebraicDivisor, encodeAlgebraicRiemannRoch, decodeAlgebraicRiemannRoch,
  encodeAlgebraicPrincipality, decodeAlgebraicPrincipality, encodeAlgebraicPlaceDecomposition, decodeAlgebraicPlaceDecomposition } from './algebraic-divisor-wire';
import * as constants from './algebraic-constant-field';
import * as factoring from './algebraic-factorization';
import * as linear from './linear-system';
import * as modules from './polynomial-module';
import * as places from './algebraic-place';
import * as rr from './algebraic-riemann-roch';
import * as ideals from './algebraic-fractional-ideal';
import { unpackRecursiveArtifactGraph, packRecursiveArtifactGraph } from './recursive-artifact-graph';

function disable() {
  const spies = [vi.spyOn(constants, 'certifyAlgebraicConstantFieldWithin'), vi.spyOn(factoring, 'factorAlgebraicPolynomialWithin'),
    vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(modules, 'polynomialModuleHermite'), vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'),
    vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(ideals, 'constructCurveIdeal')];
  for (const s of spies) s.mockImplementation(() => { throw new Error('producer disabled'); }); return () => spies.forEach(s => s.mockRestore());
}
describe('bounded divisor and Riemann–Roch replay', () => {
  it('reconstructs native curve evidence without producers', () => {
    const b = quadratic(), c = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, c, bounds);
    const data = encodeAlgebraicCurve(fresh(), curve, bounds), restore = disable();
    try { const decoded = decodeAlgebraicCurve(fresh(), curve, structuredClone(data), bounds); expect(decoded.owner).toBe(curve.owner); } finally { restore(); }
  });
  it('replays ordered divisors and complete spaces, rejecting changed requests', () => {
    const b = base(), c = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, c, bounds);
    const pd = principalAlgebraicDivisor(b.ctx, curve, b.x, bounds), d = pd.divisor, space = solveAlgebraicRiemannRoch(b.ctx, curve, d, bounds);
    const data = encodeAlgebraicDivisor(fresh(), curve, d.input, d, bounds), rd = encodeAlgebraicRiemannRoch(fresh(), curve, d, space, bounds), restore = disable();
    try {
      expect(decodeAlgebraicDivisor(fresh(), curve, d.input, data, bounds).degree).toBe(0n);
      expect(decodeAlgebraicRiemannRoch(fresh(), curve, d, rd, bounds).dimension).toBe(space.dimension);
      expect(() => decodeAlgebraicDivisor(fresh(), curve, d.input.slice().reverse(), data, bounds)).toThrow(/ordered input/);
    } finally { restore(); }
  });
  it('replays positive and negative elliptic principality with producers disabled', () => {
    const b = quadratic([1n, 0n, 0n, 1n]), c = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, c, bounds);
    const r = curve.finite.lattice.scalar.ring, ur = curve.infinity.lattice.scalar.ring;
    const decomposition = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), false, bounds);
    const point = decomposition.places.find(p => p.residue.equal(b.ctx, evaluateAlgebraicPlaceIntegral(b.ctx, curve, p, b.a), p.residue.fromInteger(b.ctx, 1n)))!;
    const infinity = decomposeAlgebraicPlaces(b.ctx, curve, ur.make(b.ctx, [ur.domain.fromInteger(b.ctx, 0n), ur.domain.fromInteger(b.ctx, 1n)]), true, bounds).places[0];
    for (const coefficient of [1n, 3n]) {
      const d = constructAlgebraicDivisor(b.ctx, curve, [{place: point, coefficient}, {place: infinity, coefficient: -coefficient}], bounds);
      const decision = decideAlgebraicPrincipality(b.ctx, curve, d, bounds), data = encodeAlgebraicPrincipality(fresh(), curve, d, decision, bounds), restore = disable();
      try { expect(decodeAlgebraicPrincipality(fresh(), curve, d, structuredClone(data), bounds).kind).toBe(decision.kind); } finally { restore(); }
    }
  });
  it('replays ramified complete place decompositions and rejects malformed envelopes', () => {
    const b = quadratic(), c = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, c, bounds);
    const r = curve.finite.lattice.scalar.ring, x = r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), proof = decomposeAlgebraicPlaces(b.ctx, curve, x, false, bounds);
    const data = encodeAlgebraicPlaceDecomposition(fresh(), curve, x, false, proof, bounds), restore = disable();
    try {
      expect(decodeAlgebraicPlaceDecomposition(fresh(), curve, x, false, data, bounds).places[0].ramification).toBe(2n);
      expect(() => decodeAlgebraicPlaceDecomposition(fresh(), curve, x, false, {...data as object, version: 2}, bounds)).toThrow(/tag\/version/);
      const envelope = data as {tag: string; version: number; payload: unknown}, body = unpackRecursiveArtifactGraph(fresh(), envelope.payload, bounds) as {curve: unknown};
      const malformed = {...envelope, payload: packRecursiveArtifactGraph(fresh(), {curve: body.curve, evidence: null}, bounds)};
      expect(() => decodeAlgebraicPlaceDecomposition(fresh(), curve, x, false, malformed, bounds)).toThrow(/invalid-input/);
    } finally { restore(); }
  });
});
