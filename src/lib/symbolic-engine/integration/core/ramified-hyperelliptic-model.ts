/** Native odd-degree correspondence; independent of split/Pell authority. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {quadraticCurveEquationWithin, quadraticCurveNativeBasis, verifyQuadraticCurvePresentationWithin,
  quadraticNativePolynomial, type QuadraticCurvePresentation} from './quadratic-curve-presentation';
import {extendedGcd} from './polynomial-division';
import {reconstructCantorDomainWithin, verifyCantorDomainWithin, type CantorDomain} from './hyperelliptic-cantor';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {Polynomial} from './polynomial';
import {ScopedProof} from './scoped-proof';

export interface RamifiedHyperellipticModel<E> extends QuadraticCurvePresentation<E> {readonly domain: CantorDomain<CurveConstant>}
const models = new WeakSet<object>(), checks = new ScopedProof();
export function assertRamifiedHyperellipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: RamifiedHyperellipticModel<E>): void {
  ctx.tick(); demand(model !== null && typeof model === 'object' && models.has(model) && model.curve === curve, 'domain-mismatch', 'owned ramified hyperelliptic model');
}
function verifyModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: RamifiedHyperellipticModel<E>, bounds: DifferentialBounds): void {
  const degree = verifyQuadraticCurvePresentationWithin(ctx, curve, model, bounds); verifyCantorDomainWithin(ctx, model.domain, bounds);
  demand(degree % 2 === 1 && model.domain.ring === curve.coordinates.scalar.ring
    && model.domain.ring.equal(ctx, model.polynomial, model.domain.polynomial), 'verification-failed', 'complete native ramified-model binding');
}
export function verifyRamifiedHyperellipticModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: RamifiedHyperellipticModel<E>, bounds: DifferentialBounds): void {
  assertRamifiedHyperellipticModel(ctx, curve, model); checks.check(ctx, [model, bounds], () => verifyModel(ctx, curve, model, bounds), [curve, model]);
}
export function reconstructRamifiedHyperellipticModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, evidence: Omit<RamifiedHyperellipticModel<E>, 'curve' | 'domain'>, bounds: DifferentialBounds): RamifiedHyperellipticModel<E> {
  const domain = reconstructCantorDomainWithin(ctx, curve.coordinates.scalar.ring, evidence.polynomial, evidence.squareFree, bounds);
  ctx.allocate(10); const model = Object.freeze({curve, ...evidence, domain}); verifyModel(ctx, curve, model, bounds); models.add(model); return model;
}
export function tryRamifiedHyperellipticModelWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): RamifiedHyperellipticModel<E> | null {
  const equation = quadraticCurveEquationWithin(ctx, curve, bounds); if (equation === null) return null;
  const r = curve.coordinates.scalar.ring, {b, c, square} = equation;
  if (r.degree(ctx, square.denominator) !== 0 || r.degree(ctx, square.numerator) < 1 || r.degree(ctx, square.numerator) % 2 !== 1) return null;
  const squareFree = extendedGcd(ctx, r, square.numerator, r.derivative(ctx, square.numerator)); if (!r.equal(ctx, squareFree.gcd, r.one(ctx))) return null;
  return reconstructRamifiedHyperellipticModelWithin(ctx, curve, {b, c, polynomial: square.numerator, squareFree, ...quadraticCurveNativeBasis(ctx, curve, b)}, bounds);
}
export function ramifiedNativePolynomial<E>(ctx: ExecutionContext, model: RamifiedHyperellipticModel<E>, polynomial: Polynomial<CurveConstant>): E {
  assertRamifiedHyperellipticModel(ctx, model.curve, model); return quadraticNativePolynomial(ctx, model, polynomial);
}
export function tryRamifiedHyperellipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => tryRamifiedHyperellipticModelWithin(ctx, curve, bounds));
}
export function verifyRamifiedHyperellipticModel<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, model: RamifiedHyperellipticModel<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyRamifiedHyperellipticModelWithin(ctx, curve, model, bounds));
}
