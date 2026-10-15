/** Shared completion of the square and complete native basis correspondence.
 * Odd/even/elliptic callers retain their separate registrations and guards. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import type {Polynomial} from './polynomial';
import {verifyBezout, type Bezout} from './polynomial-division';

export interface QuadraticCurvePresentation<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly b: CurveScalar;
  readonly c: CurveScalar;
  readonly polynomial: Polynomial<CurveConstant>;
  readonly squareFree: Bezout<CurveConstant>;
  readonly x: E;
  readonly y: E;
  readonly inverseGenerator: E;
}
export function quadraticCurveEquationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const c = curve.coordinates, f = c.scalar;
  if (c.basis.length !== 2 || c.relation.coefficients.length !== 3) return null;
  demand(f.equal(ctx, c.relation.coefficients[2], f.fromInteger(ctx, 1n)), 'verification-failed', 'quadratic monic native relation');
  const b = c.relation.coefficients[1] ?? f.fromInteger(ctx, 0n), coefficient = c.relation.coefficients[0] ?? f.fromInteger(ctx, 0n);
  ctx.allocate(3); return Object.freeze({b, c: coefficient, square: f.subtract(ctx, f.exactDivide(ctx, f.multiply(ctx, b, b), f.fromInteger(ctx, 4n)), coefficient)});
}
export function quadraticCurveNativeBasis<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, b: CurveScalar) {
  const c = curve.coordinates, f = c.scalar, r = f.ring, k = c.constantOwner, owner = curve.owner;
  demand(c.basis.length === 2, 'invalid-input', 'quadratic complete basis'); f.assert(ctx, b);
  const x = c.scalarNative(ctx, f.make(ctx, r.make(ctx, [k.fromInteger(ctx, 0n), k.fromInteger(ctx, 1n)]), r.one(ctx))),
    halfB = c.scalarNative(ctx, f.exactDivide(ctx, b, f.fromInteger(ctx, 2n))), y = owner.add(ctx, c.basis[1], halfB);
  ctx.allocate(3); return Object.freeze({x, y, inverseGenerator: owner.subtract(ctx, y, halfB)});
}
export function verifyQuadraticCurvePresentationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: QuadraticCurvePresentation<E>, bounds: DifferentialBounds): number {
  const equation = quadraticCurveEquationWithin(ctx, curve, bounds), c = curve.coordinates, f = c.scalar, r = f.ring, owner = curve.owner;
  demand(equation !== null && model.curve === curve && model.polynomial.ring === r && f.equal(ctx, model.b, equation.b) && f.equal(ctx, model.c, equation.c),
    'verification-failed', 'original quadratic relation/full native basis');
  demand(r.degree(ctx, equation.square.denominator) === 0 && r.equal(ctx, equation.square.numerator, model.polynomial) && r.degree(ctx, model.polynomial) > 0,
    'verification-failed', 'polynomial completed-square equation');
  verifyBezout(ctx, r, model.polynomial, r.derivative(ctx, model.polynomial), model.squareFree);
  demand(r.equal(ctx, model.squareFree.gcd, r.one(ctx)), 'verification-failed', 'smooth square-free quadratic model');
  const basis = quadraticCurveNativeBasis(ctx, curve, model.b);
  demand(owner.equal(ctx, model.x, basis.x) && owner.equal(ctx, model.y, basis.y) && owner.equal(ctx, model.inverseGenerator, basis.inverseGenerator)
    && owner.equal(ctx, model.inverseGenerator, c.basis[1]) && owner.equal(ctx, c.basis[0], owner.fromInteger(ctx, 1n))
    && owner.equal(ctx, owner.multiply(ctx, model.y, model.y), c.scalarNative(ctx, equation.square)), 'verification-failed', 'quadratic forward/inverse native correspondence');
  return r.degree(ctx, model.polynomial);
}
export function quadraticNativePolynomial<E>(ctx: ExecutionContext, model: QuadraticCurvePresentation<E>, p: Polynomial<CurveConstant>): E {
  const c = model.curve.coordinates, f = c.scalar; demand(p.ring === model.polynomial.ring, 'domain-mismatch', 'quadratic polynomial owner');
  p.ring.assert(ctx, p); return c.scalarNative(ctx, f.make(ctx, p, p.ring.one(ctx)));
}
