import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import { solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';
import {constructAlgebraicCanonicalGeometryWithin, verifyAlgebraicCanonicalGeometryWithin, type AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';
import {ScopedProof} from './scoped-proof';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';
const produced = new WeakSet<object>(), checks = new ScopedProof();

export interface AlgebraicCurveGeometry<E> extends AlgebraicCanonicalGeometry<E> {
  readonly zero: AlgebraicDivisor<E>;
  readonly globalFunctions: AlgebraicRiemannRoch<E>;
}
// Complete geometry is invariant under the integrand. Retain a successful
// producer result only in its exact live operation/curve/bounds scope. This
// never changes replay: fresh verifiers still check all stored evidence.
const liveGeometry = new WeakMap<object, WeakMap<object, WeakMap<object, AlgebraicCurveGeometry<unknown>>>>();
export function certifyAlgebraicCurveGeometryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): AlgebraicCurveGeometry<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); ctx.tick();
  const token = ctx.operationToken, reusable = token !== undefined && Object.isFrozen(bounds);
  if (reusable) {
    const saved = liveGeometry.get(token)?.get(curve)?.get(bounds);
    if (saved !== undefined) return saved as AlgebraicCurveGeometry<E>;
  }
  const canonical = constructAlgebraicCanonicalGeometryWithin(ctx, curve, bounds), zero = constructAlgebraicDivisorWithin(ctx, curve, []), globalFunctions = solveAlgebraicRiemannRochWithin(ctx, curve, zero, bounds);
  const proof = Object.freeze({...canonical, zero, globalFunctions});
  ctx.allocate(1); produced.add(proof);
  verifyAlgebraicCurveGeometryWithin(ctx, curve, proof, bounds);
  if (reusable) {
    let curves = liveGeometry.get(token);
    if (curves === undefined) {ctx.allocate(3); curves = new WeakMap(); liveGeometry.set(token, curves); ctx.onOperationEnd(() => liveGeometry.delete(token));}
    let values = curves.get(curve);
    if (values === undefined) {ctx.allocate(3); values = new WeakMap(); curves.set(curve, values);}
    ctx.allocate(2); values.set(bounds, proof as AlgebraicCurveGeometry<unknown>);
  }
  return proof;
}
export function verifyAlgebraicCurveGeometryWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCurveGeometry<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  if (produced.has(proof)) checks.check(ctx, [proof, bounds], () => verifyGeometry(ctx, curve, proof, bounds), [curve, proof]);
  else reuseAlgebraicVerification(ctx, 'curve-geometry', curve, proof, bounds, () => verifyGeometry(ctx, curve, proof, bounds));
}
function verifyGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCurveGeometry<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCanonicalGeometryWithin(ctx, curve, proof, bounds);
  verifyAlgebraicDivisorWithin(ctx, curve, [], proof.zero);
  verifyAlgebraicRiemannRochWithin(ctx, curve, proof.zero, proof.globalFunctions, bounds);
  demand(proof.globalFunctions.dimension === 1, 'verification-failed', 'full global functions equal actual constants');
  // A complete maximal order discriminant covers every finite ramified prime.
  // In characteristic zero the different exponent is e-1. At infinity,
  // dx=-u^{-2}du contributes -2e, giving -e-1. Thus deg(div(dx))=2g-2.
}
export function certifyAlgebraicCurveGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return certifyAlgebraicCurveGeometryWithin(ctx, curve, bounds); });
}
export function verifyAlgebraicCurveGeometry<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicCurveGeometry<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicCurveGeometryWithin(ctx, curve, proof, bounds); });
}
