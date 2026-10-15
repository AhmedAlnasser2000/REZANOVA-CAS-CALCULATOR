/** Native transport for certified split, monic, even-degree hyperelliptic models. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {Polynomial, PolynomialRing} from './polynomial';
import {extendedGcd, type Bezout} from './polynomial-division';
import type {AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import {ScopedProof} from './scoped-proof';
import {quadraticCurveEquationWithin, quadraticCurveNativeBasis, verifyQuadraticCurvePresentationWithin, quadraticNativePolynomial} from './quadratic-curve-presentation';

export interface SplitHyperellipticModel<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly b: CurveScalar;
  readonly c: CurveScalar;
  readonly polynomial: Polynomial<CurveConstant>;
  readonly squareFree: Bezout<CurveConstant>;
  readonly halfDegree: number;
  readonly x: E;
  readonly y: E;
  readonly inverseGenerator: E;
}
const models = new WeakSet<object>(), checks = new ScopedProof();
export function assertSplitHyperellipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: SplitHyperellipticModel<E>): void {
  ctx.tick(); demand(model !== null && typeof model === 'object' && models.has(model) && model.curve === curve, 'domain-mismatch', 'owned split hyperelliptic model');
}
export function hyperellipticNativePolynomial<E>(ctx: ExecutionContext, model: SplitHyperellipticModel<E>, p: Polynomial<CurveConstant>): E {
  assertSplitHyperellipticModel(ctx, model.curve, model); return quadraticNativePolynomial(ctx, model, p);
}
function verifyModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: SplitHyperellipticModel<E>, bounds: DifferentialBounds): void {
  const degree = verifyQuadraticCurvePresentationWithin(ctx, curve, model, bounds), c = curve.coordinates, r = c.scalar.ring, k = c.constantOwner;
  demand(degree >= 2 && degree % 2 === 0
    && k.equal(ctx, r.leading(ctx, model.polynomial), k.fromInteger(ctx, 1n)) && model.halfDegree === degree / 2, 'verification-failed', 'monic split even-degree hyperelliptic equation');
}
export function verifySplitHyperellipticModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: SplitHyperellipticModel<E>, bounds: DifferentialBounds): void {
  assertSplitHyperellipticModel(ctx, curve, model); checks.check(ctx, [model, bounds], () => verifyModel(ctx, curve, model, bounds), [curve, model]);
}
export function reconstructSplitHyperellipticModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, evidence: Omit<SplitHyperellipticModel<E>, 'curve'>, bounds: DifferentialBounds): SplitHyperellipticModel<E> {
  demand(evidence.squareFree !== null && typeof evidence.squareFree === 'object' && Object.isFrozen(evidence.squareFree), 'invalid-input', 'immutable hyperelliptic square-free evidence');
  ctx.allocate(3); demand(Reflect.ownKeys(evidence.squareFree).length === 3, 'invalid-input', 'hyperelliptic square-free keys');
  for (const key of ['gcd', 's', 't']) {const property = Object.getOwnPropertyDescriptor(evidence.squareFree, key); demand(property !== undefined && 'value' in property, 'invalid-input', 'hyperelliptic square-free accessor');}
  ctx.allocate(9); const model = Object.freeze({curve, ...evidence}); verifyModel(ctx, curve, model, bounds); models.add(model); return model;
}
export function trySplitHyperellipticModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): SplitHyperellipticModel<E> | null {
  const equation = quadraticCurveEquationWithin(ctx, curve, bounds); if (equation === null) return null;
  const c = curve.coordinates, r = c.scalar.ring, k = c.constantOwner, {b, c: coefficient, square} = equation;
  const degree = r.degree(ctx, square.numerator);
  if (r.degree(ctx, square.denominator) !== 0 || degree < 2 || degree % 2 || !k.equal(ctx, r.leading(ctx, square.numerator), k.fromInteger(ctx, 1n))) return null;
  const squareFree = extendedGcd(ctx, r, square.numerator, r.derivative(ctx, square.numerator)); if (!r.equal(ctx, squareFree.gcd, r.one(ctx))) return null;
  const basis = quadraticCurveNativeBasis(ctx, curve, b);
  ctx.allocate(9); const model = Object.freeze({curve, b, c: coefficient, polynomial: square.numerator, squareFree, halfDegree: degree / 2, ...basis});
  models.add(model); verifySplitHyperellipticModelWithin(ctx, curve, model, bounds); return model;
}
export function trySplitHyperellipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => trySplitHyperellipticModelWithin(ctx, curve, bounds));
}
export function verifySplitHyperellipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: SplitHyperellipticModel<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifySplitHyperellipticModelWithin(ctx, curve, model, bounds));
}
export type HyperellipticPolynomialRing = PolynomialRing<CurveConstant>;
