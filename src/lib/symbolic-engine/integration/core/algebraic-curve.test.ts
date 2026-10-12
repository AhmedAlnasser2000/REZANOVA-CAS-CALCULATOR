import { describe, it, expect, vi } from 'vitest';
import { base, quadratic, bounds, fresh } from './__tests__/algebraic-support';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension } from './algebraic-field';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve, verifyAlgebraicCurve, assertAlgebraicCurveOwner } from './algebraic-curve';
import { solveHessLatticeSpace, verifyHessLatticeSpace } from './algebraic-hess-lattice';
import { constructCurveLattice, intersectCurveLattices, preimageCurveLattice, curveLatticeCoordinates } from './algebraic-curve-lattice';
import * as linear from './linear-system';

describe('actual-constant curve presentations and Hess lattices', () => {
  it('retains Q(x) and complete L(0), including infinity-local units', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), view = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    expect(view.owner).toBe(b.field); expect(view.coordinates.basis).toHaveLength(1);
    verifyAlgebraicCurve(fresh(), b.field, view, bounds);
    const ctx = fresh(), space = solveHessLatticeSpace(ctx, view.finite.lattice, view.infinity.lattice);
    expect(space.basis).toHaveLength(1); expect(space.weights).toEqual([0]);
    const u = view.infinity.lattice.scalar, r = u.ring, c = r.domain;
    const unit = u.make(ctx, r.one(ctx), r.make(ctx, [c.fromInteger(ctx, 1n), c.fromInteger(ctx, 1n)]));
    const local = constructCurveLattice(ctx, u, [[unit]], 1);
    // 1/(1+u) is a unit at the one infinity place. Its other pole is irrelevant.
    expect(solveHessLatticeSpace(ctx, view.finite.lattice, local).basis).toHaveLength(1);
  });
  it.each([[0n, 1n], [0n, 0n, 0n, 1n], [0n, -1n, 0n, 1n]].map(polynomial => ({polynomial})))('derives complete C-polynomial orders for y²=P(x): $polynomial', ({polynomial}) => {
    const b = quadratic(polynomial), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), view = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    expect(view.coordinates.basis).toHaveLength(2); expect(view.coordinates.constantOwner.ring.degree(b.ctx, view.coordinates.constantOwner.modulus)).toBe(1);
    const back = view.coordinates.native(b.ctx, view.coordinates.coordinates(b.ctx, b.a)); expect(b.owner.equal(b.ctx, back, b.a)).toBe(true);
    const space = solveHessLatticeSpace(b.ctx, view.finite.lattice, view.infinity.lattice);
    expect(space.basis).toHaveLength(1); verifyHessLatticeSpace(fresh(), view.finite.lattice, view.infinity.lattice, space);
  });
  it('uses hidden sqrt(2) constants and the relative function-field degree', () => {
    const b = quadratic(), r = new PolynomialRing(b.owner, 'b'), zero = b.owner.fromInteger(b.ctx, 0n), two = b.owner.fromInteger(b.ctx, 2n);
    const xx = b.owner.embed(b.ctx, b.x), owner = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [b.owner.negate(b.ctx, b.owner.multiply(b.ctx, two, xx)), zero, b.owner.fromInteger(b.ctx, 1n)]), bounds);
    const constants = certifyAlgebraicConstantField(b.ctx, owner, bounds), view = certifyAlgebraicCurve(b.ctx, owner, constants, bounds);
    expect(view.coordinates.rational.basis).toHaveLength(4); expect(constants.powers).toHaveLength(2); expect(view.coordinates.basis).toHaveLength(2);
    expect(solveHessLatticeSpace(b.ctx, view.finite.lattice, view.infinity.lattice).basis).toHaveLength(1);
    for (const value of constants.basis) expect(owner.equal(b.ctx, value, view.coordinates.native(b.ctx, view.coordinates.coordinates(b.ctx, value)))).toBe(true);
  });
  it('has relative degree one for y²=2x² and rejects forged curve authority', () => {
    const b = quadratic([0n, 0n, 2n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), view = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    expect(view.coordinates.basis).toHaveLength(1); expect(constants.powers).toHaveLength(2);
    expect(solveHessLatticeSpace(b.ctx, view.finite.lattice, view.infinity.lattice).basis).toHaveLength(1);
    expect(() => assertAlgebraicCurveOwner(fresh(), Object.freeze({...view}))).toThrow(/domain-mismatch/);
    expect(() => verifyAlgebraicCurve(fresh(), quadratic([0n, 0n, 2n]).owner, view, bounds)).toThrow(/domain-mismatch/);
  });
  it('handles a nonradical cubic presentation', () => {
    const b = base(), r = new PolynomialRing(b.field, 'y'), owner = constructAlgebraicExtension(b.ctx, r,
      r.make(b.ctx, [b.field.negate(b.ctx, b.x), b.field.fromInteger(b.ctx, -1n), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]), bounds);
    const constants = certifyAlgebraicConstantField(b.ctx, owner, bounds), view = certifyAlgebraicCurve(b.ctx, owner, constants, bounds);
    expect(view.coordinates.basis).toHaveLength(3); expect(solveHessLatticeSpace(b.ctx, view.finite.lattice, view.infinity.lattice).basis).toHaveLength(1);
  });
  it('replays Hess completeness with the linear producer disabled and rejects missing coverage', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), view = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const f = view.coordinates.scalar, r = f.ring, c = r.domain, ctx = fresh();
    const x = f.make(ctx, r.make(ctx, [c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]), r.one(ctx));
    const finite = constructCurveLattice(ctx, f, [[f.inverse(ctx, f.multiply(ctx, x, x))]], 1), space = solveHessLatticeSpace(ctx, finite, view.infinity.lattice);
    expect(space.basis).toHaveLength(3);
    const spy = vi.spyOn(linear, 'solveLinearSystem').mockImplementation(() => { throw new Error('producer disabled'); });
    try {
      verifyHessLatticeSpace(fresh(), finite, view.infinity.lattice, space);
      expect(() => verifyHessLatticeSpace(fresh(), finite, view.infinity.lattice, {...space, indices: space.indices.slice(1)})).toThrow(/coverage/);
      expect(() => verifyHessLatticeSpace(fresh(), finite, view.infinity.lattice, {...space, weights: [-1]})).toThrow(/weights/);
    } finally { spy.mockRestore(); }
  });
  it('checks full lattice intersection and inverse-image coordinates', () => {
    const b = base(), constants = certifyAlgebraicConstantField(b.ctx, b.field, bounds), view = certifyAlgebraicCurve(b.ctx, b.field, constants, bounds);
    const f = view.coordinates.scalar, r = f.ring, c = r.domain, ctx = fresh();
    const x = f.make(ctx, r.make(ctx, [c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]), r.one(ctx)), one = f.fromInteger(ctx, 1n);
    const a = constructCurveLattice(ctx, f, [[x]], 1), bL = constructCurveLattice(ctx, f, [[f.subtract(ctx, x, one)]], 1);
    const intersection = intersectCurveLattices(ctx, a, bL).result;
    expect(f.equal(ctx, intersection.basis[0][0], f.multiply(ctx, x, f.subtract(ctx, x, one)))).toBe(true);
    const preimage = preimageCurveLattice(ctx, f, [[x]], 1).result;
    expect(f.equal(ctx, preimage.basis[0][0], f.inverse(ctx, x))).toBe(true);
    expect(f.equal(ctx, curveLatticeCoordinates(ctx, preimage, [f.inverse(ctx, x)])[0], one)).toBe(true);
  });
});
