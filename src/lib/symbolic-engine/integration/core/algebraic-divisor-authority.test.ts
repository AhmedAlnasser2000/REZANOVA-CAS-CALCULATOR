import { describe, it, expect } from 'vitest';
import { quadratic, base, bounds, fresh } from './__tests__/algebraic-support';
import { ExecutionContext } from './execution';
import type { ExactField } from './field';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension, type AlgebraicField } from './algebraic-field';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { decomposeAlgebraicPlaces } from './algebraic-place';
import { principalAlgebraicDivisor, constructAlgebraicDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRoch, verifyAlgebraicRiemannRoch } from './algebraic-riemann-roch';
import { certifyAlgebraicCurveGeometry } from './algebraic-curve-geometry';
import { encodeAlgebraicRiemannRoch, decodeAlgebraicRiemannRoch, encodeAlgebraicPlaceDecomposition, decodeAlgebraicPlaceDecomposition } from './algebraic-divisor-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';

function change(root: unknown, path: readonly (string | number)[], value: unknown) {
  let current = root as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) current = current[key] as Record<string | number, unknown>;
  current[path[path.length - 1]] = value;
}

describe('divisor completeness and authority boundaries', () => {
  it.each(['dimension', 'slots', 'weights', 'basis', 'inverse', 'conditions', 'power', 'flag'])('rejects altered Riemann–Roch %s', mutation => {
    const b = base(), c = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, c, bounds);
    const d = principalAlgebraicDivisor(b.ctx, curve, b.x, bounds).divisor, proof = solveAlgebraicRiemannRoch(b.ctx, curve, d, bounds);
    const data = encodeAlgebraicRiemannRoch(fresh(), curve, d, proof, bounds) as {tag: string; version: number; payload: unknown};
    const body = structuredClone(unpackRecursiveArtifactGraph(fresh(), data.payload, bounds));
    if (mutation === 'dimension') change(body, ['evidence', 'dimension'], proof.dimension + 1);
    if (mutation === 'slots') change(body, ['evidence', 'hess', 'indices'], []);
    if (mutation === 'weights') change(body, ['evidence', 'hess', 'weights', 0], proof.hess.weights[0] + 1);
    if (mutation === 'basis') change(body, ['evidence', 'basis'], []);
    if (mutation === 'inverse') change(body, ['evidence', 'inverse', 'inverse'], []);
    if (mutation === 'conditions') change(body, ['evidence', 'conditions'], []);
    if (mutation === 'power') change(body, ['evidence', 'finite', 'components', 0, 'power', 'exponent'], '0');
    if (mutation === 'flag') change(body, ['evidence', 'verified'], true);
    expect(() => decodeAlgebraicRiemannRoch(fresh(), curve, d, {...data, payload: packRecursiveArtifactGraph(fresh(), body, bounds)}, bounds)).toThrow();
  });
  it.each(['prime', 'seed', 'residue', 'ramification', 'product', 'kernel'])('rejects altered maximal-place %s', mutation => {
    const b = quadratic(), c = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, c, bounds), r = curve.finite.lattice.scalar.ring;
    const x = r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), proof = decomposeAlgebraicPlaces(b.ctx, curve, x, false, bounds);
    const data = encodeAlgebraicPlaceDecomposition(fresh(), curve, x, false, proof, bounds) as {tag: string; version: number; payload: unknown};
    const body = structuredClone(unpackRecursiveArtifactGraph(fresh(), data.payload, bounds));
    if (mutation === 'prime') change(body, ['evidence', 'prime', 'coefficients'], []);
    if (mutation === 'seed') change(body, ['evidence', 'algebra', 'evidence', 'seed'], '0');
    if (mutation === 'residue') change(body, ['evidence', 'places', 0, 'residue', 'construction', 'monic', 'coefficients'], []);
    if (mutation === 'ramification') change(body, ['evidence', 'places', 0, 'evidence', 'ramification'], '1');
    if (mutation === 'product') change(body, ['evidence', 'products'], []);
    if (mutation === 'kernel') change(body, ['evidence', 'places', 0, 'evidence', 'kernel', 'nullspace'], []);
    expect(() => decodeAlgebraicPlaceDecomposition(fresh(), curve, x, false, {...data, payload: packRecursiveArtifactGraph(fresh(), body, bounds)}, bounds)).toThrow();
  });
  it('keeps full spaces over hidden constants, large coefficients and height eight', () => {
    const b = quadratic([0n, 0n, 2n]); let owner = b.owner as unknown as AlgebraicField<unknown>;
    for (let i = owner.height + 1; i <= 8; i++) {
      const r = new PolynomialRing(owner, `a${i}`); owner = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx,
        [owner.negate(b.ctx, owner.generator(b.ctx)), owner.fromInteger(b.ctx, 1n)]), bounds) as unknown as AlgebraicField<unknown>;
    }
    const c = certifyAlgebraicConstantField(fresh(), owner, bounds), curve = certifyAlgebraicCurve(fresh(), owner as ExactField<unknown>, c, bounds);
    const d = constructAlgebraicDivisor(fresh(), curve, [], bounds), proof = solveAlgebraicRiemannRoch(fresh(), curve, d, bounds);
    expect(proof.dimension).toBe(1); expect(curve.coordinates.constantOwner.ring.degree(b.ctx, curve.coordinates.constantOwner.modulus)).toBe(2);
    const data = encodeAlgebraicRiemannRoch(fresh(), curve, d, proof, bounds); expect(decodeAlgebraicRiemannRoch(fresh(), curve, d, data, bounds).dimension).toBe(1);
    const large = owner.fromInteger(b.ctx, (1n << 120n) + 1n), p = principalAlgebraicDivisor(fresh(), curve, large, bounds); expect(p.divisor.entries).toHaveLength(0);
    expect(Object.isFrozen(proof.finite.components)).toBe(true);
  });
  it('supports genus three without a genus-specific reduction', () => {
    const b = quadratic([-1n, 0n, 0n, 0n, 0n, 0n, 0n, 1n]), c = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, c, bounds);
    const geometry = certifyAlgebraicCurveGeometry(fresh(), curve, bounds); expect(geometry.genus).toBe(3n);
    const d = constructAlgebraicDivisor(b.ctx, curve, geometry.infinity.places.map(place => ({place, coefficient: 8n})), bounds);
    expect(solveAlgebraicRiemannRoch(fresh(), curve, d, bounds).dimension).toBe(6);
  });
  it('preserves fresh scopes and sticky work/allocation/artifact exhaustion', () => {
    const b = base(), c = certifyAlgebraicConstantField(b.ctx, b.field, bounds), curve = certifyAlgebraicCurve(b.ctx, b.field, c, bounds), d = constructAlgebraicDivisor(b.ctx, curve, [], bounds);
    const p = solveAlgebraicRiemannRoch(fresh(), curve, d, bounds), data = encodeAlgebraicRiemannRoch(fresh(), curve, d, p, bounds), reused = fresh();
    verifyAlgebraicRiemannRoch(reused, curve, d, p, bounds); const first = reused.usage.work; verifyAlgebraicRiemannRoch(reused, curve, d, p, bounds); expect(reused.usage.work).toBe(2 * first);
    for (const patch of [{work: 1}, {allocation: 1}]) { const ctx = new ExecutionContext({...fresh().limits, ...patch});
      expect(() => solveAlgebraicRiemannRoch(ctx, curve, d, bounds)).toThrow(/resource-limit/); expect(() => ctx.tick()).toThrow(/resource-limit/); }
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeAlgebraicRiemannRoch(fresh(), curve, d, data, {...bounds, ...patch})).toThrow(/resource-limit/);
    expect(() => constructAlgebraicDivisor(fresh(), curve, [{place: {...principalAlgebraicDivisor(b.ctx, curve, b.x, bounds).divisor.entries[0].place}, coefficient: 1n}], bounds)).toThrow(/domain-mismatch/);
  });
});
