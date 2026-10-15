/** Checked Weierstrass transport. Supplied owners and generator order remain. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, assertPolynomialRingOwner, type Polynomial} from './polynomial';
import {extendedGcd, verifyBezout, type Bezout} from './polynomial-division';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import {ScopedProof} from './scoped-proof';

export interface EllipticCurveModel<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly b: CurveScalar;
  readonly c: CurveScalar;
  readonly square: CurveScalar;
  readonly squareFree: Bezout<CurveConstant>;
  readonly leading: CurveConstant;
  readonly polynomial: Polynomial<CurveConstant>;
  readonly x: E;
  readonly y: E;
  readonly inverseGenerator: E;
}
const models = new WeakSet<object>(), checks = new ScopedProof();
export function assertEllipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: EllipticCurveModel<E>): void {
  ctx.tick(); demand(model !== null && typeof model === 'object' && models.has(model) && model.curve === curve, 'domain-mismatch', 'owned elliptic model');
}
export function evaluateEllipticPolynomial(ctx: ExecutionContext, p: Polynomial<CurveConstant>, x: CurveConstant): CurveConstant {
  p.ring.assert(ctx, p); const c = p.ring.domain; c.assert(ctx, x); let value = c.fromInteger(ctx, 0n);
  for (let i = p.coefficients.length - 1; i >= 0; i--) value = c.add(ctx, c.multiply(ctx, value, x), p.coefficients[i]); return value;
}
export function ellipticNativeConstant<E>(ctx: ExecutionContext, model: EllipticCurveModel<E>, value: CurveConstant): E {
  return ellipticNativeConstantInCurveWithin(ctx, model.curve, value);
}
export function ellipticNativeConstantInCurveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, value: CurveConstant): E {
  const c = curve.coordinates; c.constantOwner.assert(ctx, value); return c.scalarNative(ctx, c.scalar.fromCoefficient(ctx, value));
}
function verifyModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, m: EllipticCurveModel<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  const c = curve.coordinates, f = c.scalar, k = c.constantOwner, r = f.ring, owner = curve.owner;
  assertPolynomialRingOwner(ctx, m.polynomial.ring);
  demand(c.basis.length === 2 && c.relation.coefficients.length === 3 && m.polynomial.ring.domain === k, 'verification-failed', 'quadratic elliptic basis/constant owner');
  demand(f.equal(ctx, m.b, c.relation.coefficients[1] ?? f.fromInteger(ctx, 0n)) && f.equal(ctx, m.c, c.relation.coefficients[0] ?? f.fromInteger(ctx, 0n))
    && f.equal(ctx, c.relation.coefficients[2], f.fromInteger(ctx, 1n)), 'verification-failed', 'original elliptic relation');
  const square = f.subtract(ctx, f.multiply(ctx, m.b, m.b), f.multiply(ctx, f.fromInteger(ctx, 4n), m.c));
  demand(f.equal(ctx, m.square, square) && r.degree(ctx, square.denominator) === 0 && r.degree(ctx, square.numerator) === 3, 'verification-failed', 'polynomial cubic discriminant');
  verifyBezout(ctx, r, square.numerator, r.derivative(ctx, square.numerator), m.squareFree);
  demand(r.equal(ctx, m.squareFree.gcd, r.one(ctx)) && k.equal(ctx, m.leading, r.leading(ctx, square.numerator)) && !k.isZero(ctx, m.leading), 'verification-failed', 'smooth elliptic leading coefficient');
  const h = square.numerator.coefficients, d = m.leading, d2 = k.multiply(ctx, d, d), pr = m.polynomial.ring;
  const expected = pr.make(ctx, [k.multiply(ctx, d2, h[0] ?? k.fromInteger(ctx, 0n)), k.multiply(ctx, d, h[1] ?? k.fromInteger(ctx, 0n)), h[2] ?? k.fromInteger(ctx, 0n), k.fromInteger(ctx, 1n)]);
  demand(pr.equal(ctx, expected, m.polynomial), 'verification-failed', 'complete Weierstrass coefficients');
  const originalX = c.scalarNative(ctx, f.make(ctx, r.make(ctx, [k.fromInteger(ctx, 0n), k.fromInteger(ctx, 1n)]), r.one(ctx))), scale = c.scalarNative(ctx, f.fromCoefficient(ctx, d));
  const x = owner.multiply(ctx, scale, originalX), y = owner.multiply(ctx, scale, owner.add(ctx, owner.multiply(ctx, owner.fromInteger(ctx, 2n), c.basis[1]), c.scalarNative(ctx, m.b)));
  demand(owner.equal(ctx, x, m.x) && owner.equal(ctx, y, m.y), 'verification-failed', 'native Weierstrass map');
  let value = owner.fromInteger(ctx, 0n);
  for (let i = 3; i >= 0; i--) value = owner.add(ctx, owner.multiply(ctx, value, x), ellipticNativeConstant(ctx, m, expected.coefficients[i] ?? k.fromInteger(ctx, 0n)));
  const inverse = owner.exactDivide(ctx, owner.subtract(ctx, owner.exactDivide(ctx, y, scale), c.scalarNative(ctx, m.b)), owner.fromInteger(ctx, 2n));
  demand(owner.equal(ctx, owner.multiply(ctx, y, y), value) && owner.equal(ctx, inverse, m.inverseGenerator)
    && owner.equal(ctx, inverse, c.basis[1]) && owner.equal(ctx, owner.exactDivide(ctx, x, scale), originalX)
    && owner.equal(ctx, c.basis[0], owner.fromInteger(ctx, 1n)), 'verification-failed', 'Weierstrass inverse/full basis correspondence');
}
/** Replay-only registration after all stored transport identities are checked. */
export function reconstructEllipticCurveModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, evidence: Omit<EllipticCurveModel<E>, 'curve'>, bounds: DifferentialBounds): EllipticCurveModel<E> {
  demand(evidence.squareFree !== null && typeof evidence.squareFree === 'object' && Object.isFrozen(evidence.squareFree), 'invalid-input', 'immutable elliptic square-free evidence');
  ctx.allocate(3); demand(Reflect.ownKeys(evidence.squareFree).length === 3, 'invalid-input', 'elliptic square-free evidence keys');
  for (const key of ['gcd', 's', 't']) {const property = Object.getOwnPropertyDescriptor(evidence.squareFree, key); demand(property !== undefined && 'value' in property, 'invalid-input', 'elliptic square-free evidence accessor');}
  ctx.allocate(11); const model = Object.freeze({curve, ...evidence}); verifyModel(ctx, curve, model, bounds); models.add(model); return model;
}
export function verifyEllipticCurveModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: EllipticCurveModel<E>, bounds: DifferentialBounds): void {
  assertEllipticModel(ctx, curve, model);
  // Producer-built registered models contain only immutable owned values and
  // frozen arithmetic evidence. Exclusion grants eligibility, never authority:
  // the first check in every operation still verifies the complete transport.
  checks.check(ctx, [model, bounds], () => verifyModel(ctx, curve, model, bounds), [curve, model]);
}
export function tryEllipticCurveModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): EllipticCurveModel<E> | null {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const c = curve.coordinates, f = c.scalar, k = c.constantOwner, r = f.ring, owner = curve.owner;
  if (c.basis.length !== 2 || c.relation.coefficients.length !== 3) return null;
  const b = c.relation.coefficients[1] ?? f.fromInteger(ctx, 0n), coefficient = c.relation.coefficients[0] ?? f.fromInteger(ctx, 0n);
  const square = f.subtract(ctx, f.multiply(ctx, b, b), f.multiply(ctx, f.fromInteger(ctx, 4n), coefficient));
  if (r.degree(ctx, square.denominator) !== 0 || r.degree(ctx, square.numerator) !== 3) return null;
  const squareFree = extendedGcd(ctx, r, square.numerator, r.derivative(ctx, square.numerator));
  if (!r.equal(ctx, squareFree.gcd, r.one(ctx))) return null;
  const h = square.numerator.coefficients, leading = r.leading(ctx, square.numerator), d2 = k.multiply(ctx, leading, leading), pr = new PolynomialRing(k, 'X');
  const polynomial = pr.make(ctx, [k.multiply(ctx, d2, h[0] ?? k.fromInteger(ctx, 0n)), k.multiply(ctx, leading, h[1] ?? k.fromInteger(ctx, 0n)), h[2] ?? k.fromInteger(ctx, 0n), k.fromInteger(ctx, 1n)]);
  const scale = c.scalarNative(ctx, f.fromCoefficient(ctx, leading)), x = owner.multiply(ctx, scale, c.scalarNative(ctx, f.make(ctx, r.make(ctx, [k.fromInteger(ctx, 0n), k.fromInteger(ctx, 1n)]), r.one(ctx))));
  const y = owner.multiply(ctx, scale, owner.add(ctx, owner.multiply(ctx, owner.fromInteger(ctx, 2n), c.basis[1]), c.scalarNative(ctx, b)));
  const inverseGenerator = owner.exactDivide(ctx, owner.subtract(ctx, owner.exactDivide(ctx, y, scale), c.scalarNative(ctx, b)), owner.fromInteger(ctx, 2n));
  ctx.allocate(11); const proof = Object.freeze({curve, b, c: coefficient, square, squareFree, leading, polynomial, x, y, inverseGenerator});
  models.add(proof); verifyEllipticCurveModelWithin(ctx, curve, proof, bounds); return proof;
}
export function tryEllipticCurveModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => tryEllipticCurveModelWithin(ctx, curve, bounds));
}
export function verifyEllipticCurveModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: EllipticCurveModel<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyEllipticCurveModelWithin(ctx, curve, model, bounds));
}
