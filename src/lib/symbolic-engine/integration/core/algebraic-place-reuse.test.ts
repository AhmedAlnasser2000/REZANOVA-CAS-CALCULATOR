import {describe, it, expect, vi} from 'vitest';
import {fresh, bounds} from './__tests__/algebraic-support';
import {hyperellipticInfinityDivisor} from './__tests__/hyperelliptic-support';
import {verifyAlgebraicPlaceWithin, reconstructAlgebraicPlaceWithin} from './algebraic-place';
import {certifyAlgebraicGoodReduction, verifyAlgebraicGoodReductionWithin} from './algebraic-good-reduction';
import {ExecutionContext} from './execution';
import {verifyReducedCurveModel} from './reduced-model';
import * as residue from './algebraic-residue-algebra';
import * as geometry from './algebraic-curve-geometry';
import * as maximality from './reduced-normality';
import * as rr from './algebraic-riemann-roch';

describe('exact operation-local native place and good-reduction reuse', () => {
  it('reuses only the complete immutable place obligation, then checks again after operation exit', () => {
    const b = hyperellipticInfinityDivisor(), place = b.divisor.entries[0].place, ctx = fresh(), calls = vi.spyOn(residue, 'verifyCurveResidueAlgebra');
    try {
      ctx.operation(() => {verifyAlgebraicPlaceWithin(ctx, b.curve, place, bounds); const count = calls.mock.calls.length; verifyAlgebraicPlaceWithin(ctx, b.curve, place, bounds); expect(calls.mock.calls.length).toBe(count);});
      const count = calls.mock.calls.length; ctx.operation(() => verifyAlgebraicPlaceWithin(ctx, b.curve, place, bounds)); expect(calls.mock.calls.length).toBeGreaterThan(count);
      const mutableKernel = {...place.kernel}, other = reconstructAlgebraicPlaceWithin(b.ctx, b.curve, place.order, place.prime, place.algebra, place.index, {...place, kernel: mutableKernel}, bounds);
      ctx.operation(() => {verifyAlgebraicPlaceWithin(ctx, b.curve, other, bounds); if (mutableKernel.kind !== 'consistent') throw Error('known homogeneous kernel'); mutableKernel.rank++;
        expect(() => verifyAlgebraicPlaceWithin(ctx, b.curve, other, bounds)).toThrow('verification-failed');});
    } finally {calls.mockRestore();}
  });
  it('reuses complete good reduction, while altered/mutable premises and stricter fresh budgets remain checked', () => {
    const b = hyperellipticInfinityDivisor(), proof = certifyAlgebraicGoodReduction(fresh(), b.curve, bounds), ctx = fresh(), calls = vi.spyOn(geometry, 'verifyAlgebraicCurveGeometryWithin');
    try {
      ctx.operation(() => {verifyAlgebraicGoodReductionWithin(ctx, b.curve, proof, bounds); const count = calls.mock.calls.length; verifyAlgebraicGoodReductionWithin(ctx, b.curve, proof, bounds); expect(calls.mock.calls.length).toBe(count);});
      const count = calls.mock.calls.length; ctx.operation(() => verifyAlgebraicGoodReductionWithin(ctx, b.curve, proof, bounds)); expect(calls.mock.calls.length).toBeGreaterThan(count);
      const mutableGeometry = {...proof.geometry}, mutable = Object.freeze({...proof, geometry: mutableGeometry});
      ctx.operation(() => {verifyAlgebraicGoodReductionWithin(ctx, b.curve, mutable, bounds); mutableGeometry.genus++;
        expect(() => verifyAlgebraicGoodReductionWithin(ctx, b.curve, mutable, bounds)).toThrow('verification-failed');});
      expect(() => ctx.operation(() => verifyAlgebraicGoodReductionWithin(ctx, b.curve, proof, {...bounds, towerHeight: 1}))).toThrow('resource-limit');
      const stopped = new ExecutionContext({...fresh().limits, work: 1}); expect(() => stopped.operation(() => verifyAlgebraicGoodReductionWithin(stopped, b.curve, proof, bounds))).toThrow('resource-limit'); expect(() => stopped.tick()).toThrow('resource-limit');
    } finally {calls.mockRestore();}
  });
  it('checks decoded geometry and reduced models once per exact immutable operation, without trusting mutations', () => {
    const b = hyperellipticInfinityDivisor(), proof = certifyAlgebraicGoodReduction(fresh(), b.curve, bounds), ctx = fresh();
    // An immutable copy has no producer registration, as with decoded evidence.
    const decodedGeometry = Object.freeze({...proof.geometry}), model = Object.freeze({...proof.model});
    const geometryChecks = vi.spyOn(rr, 'verifyAlgebraicRiemannRochWithin'), modelChecks = vi.spyOn(maximality, 'verifyReducedOrderMaximality');
    try {
      const check = () => {geometry.verifyAlgebraicCurveGeometryWithin(ctx, b.curve, decodedGeometry, bounds); verifyReducedCurveModel(ctx, proof.curve.algebra, model);};
      ctx.operation(() => {check(); const counts = [geometryChecks.mock.calls.length, modelChecks.mock.calls.length]; check(); expect([geometryChecks.mock.calls.length, modelChecks.mock.calls.length]).toEqual(counts);});
      const counts = [geometryChecks.mock.calls.length, modelChecks.mock.calls.length]; ctx.operation(check);
      expect(geometryChecks.mock.calls.length).toBeGreaterThan(counts[0]); expect(modelChecks.mock.calls.length).toBeGreaterThan(counts[1]);
      const mutableGeometry = {...decodedGeometry}, mutableModel = {...model};
      ctx.operation(() => {
        geometry.verifyAlgebraicCurveGeometryWithin(ctx, b.curve, mutableGeometry, bounds); verifyReducedCurveModel(ctx, proof.curve.algebra, mutableModel);
        mutableGeometry.genus++; mutableModel.genus++;
        expect(() => geometry.verifyAlgebraicCurveGeometryWithin(ctx, b.curve, mutableGeometry, bounds)).toThrow('verification-failed');
        expect(() => verifyReducedCurveModel(ctx, proof.curve.algebra, mutableModel)).toThrow('verification-failed');
      });
      expect(() => ctx.operation(() => verifyReducedCurveModel(ctx, proof.curve.algebra, Object.freeze({...model, genus: model.genus + 1n})))).toThrow('verification-failed');
    } finally {geometryChecks.mockRestore(); modelChecks.mockRestore();}
  });
});
