/** Checked C(T) presentations; the supplied native field and full constants stay owned. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, type Polynomial} from './polynomial';
import {RationalFunctionField, assertRationalFunctionFieldOwner} from './rational-function';
import {exactDivide} from './polynomial-division';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant, CurveScalar} from './algebraic-curve-coordinates';
import {differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative} from './algebraic-derivative';
import {ScopedProof} from './scoped-proof';

export interface RationalCurveParametrization<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly field: RationalFunctionField<CurveConstant>;
  readonly kind: 'degree-one' | 'linear-x';
  readonly denominator: Polynomial<CurveConstant>;
  readonly quotients: readonly Polynomial<CurveConstant>[];
  readonly cleared: readonly Polynomial<CurveConstant>[];
  readonly A: Polynomial<CurveConstant>;
  readonly B: Polynomial<CurveConstant>;
  readonly xImage: CurveScalar;
  readonly parameter: E;
  readonly parameterDerivative: AlgebraicDerivative<E>;
  readonly basisImages: readonly CurveScalar[];
}
const parameterizations = new WeakSet<object>(), proofs = new ScopedProof();
function generator(ctx: ExecutionContext, field: RationalFunctionField<CurveConstant>): CurveScalar {
  const c = field.ring.domain; return field.make(ctx, field.ring.make(ctx, [c.fromInteger(ctx, 0n), c.fromInteger(ctx, 1n)]), field.ring.one(ctx));
}
function nativeX<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>): E {
  return curve.coordinates.scalarNative(ctx, generator(ctx, curve.coordinates.scalar));
}
function evaluate(ctx: ExecutionContext, field: RationalFunctionField<CurveConstant>, p: Polynomial<CurveConstant>, value: CurveScalar): CurveScalar {
  p.ring.assert(ctx, p); field.assert(ctx, value); let result = field.fromInteger(ctx, 0n);
  for (let i = p.coefficients.length - 1; i >= 0; i--) result = field.add(ctx, field.multiply(ctx, result, value), field.fromCoefficient(ctx, p.coefficients[i]));
  return result;
}
export function rationalCurveForwardWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, p: RationalCurveParametrization<E>, value: E): CurveScalar {
  curve.owner.assert(ctx, value); const coefficients = curve.coordinates.coordinates(ctx, value), f = p.field, t = generator(ctx, f);
  let result = f.fromInteger(ctx, 0n);
  for (let i = coefficients.length - 1; i >= 0; i--) {
    const a = coefficients[i], converted = f.exactDivide(ctx, evaluate(ctx, f, a.numerator, p.xImage), evaluate(ctx, f, a.denominator, p.xImage));
    result = f.add(ctx, f.multiply(ctx, result, t), converted);
  }
  return result;
}
export function rationalCurveBackwardWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, p: RationalCurveParametrization<E>, value: CurveScalar): E {
  const f = p.field, owner = curve.owner; f.assert(ctx, value);
  const polynomial = (q: Polynomial<CurveConstant>) => {
    let result = owner.fromInteger(ctx, 0n);
    for (let i = q.coefficients.length - 1; i >= 0; i--) result = owner.add(ctx, owner.multiply(ctx, result, p.parameter),
      curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, q.coefficients[i])));
    return result;
  };
  const numerator = polynomial(value.numerator), denominator = polynomial(value.denominator);
  demand(!owner.isZero(ctx, denominator), 'verification-failed', 'parametrization inverse denominator unit');
  return owner.exactDivide(ctx, numerator, denominator);
}
function check<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, p: RationalCurveParametrization<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  demand(p !== null && typeof p === 'object' && p.curve === curve && p.field instanceof RationalFunctionField
    && Object.getPrototypeOf(p.field) === RationalFunctionField.prototype,
    'domain-mismatch', 'rational parametrization owners');
  assertRationalFunctionFieldOwner(ctx, p.field);
  const c = curve.coordinates, f = p.field, r = f.ring, source = c.scalar.ring;
  demand(r.domain === c.constantOwner, 'domain-mismatch', 'rational parametrization actual constants');
  const n = c.basis.length, t = generator(ctx, f), zero = r.domain.fromInteger(ctx, 0n), one = r.domain.fromInteger(ctx, 1n);
  if (p.kind === 'degree-one') {
    demand(n === 1 && p.quotients.length === 0 && p.cleared.length === 0 && source.equal(ctx, p.denominator, source.one(ctx))
      && r.equal(ctx, p.A, r.one(ctx)) && r.equal(ctx, p.B, r.make(ctx, [zero, r.domain.negate(ctx, one)])),
      'verification-failed', 'degree-one rational curve presentation');
    demand(curve.owner.equal(ctx, p.parameter, nativeX(ctx, curve)) && f.equal(ctx, p.xImage, t), 'verification-failed', 'degree-one parameter mapping');
  } else {
    demand(p.kind === 'linear-x' && n > 1 && p.quotients.length === c.relation.coefficients.length
      && p.cleared.length === p.quotients.length && !source.isZero(ctx, p.denominator), 'verification-failed', 'linear-x coefficient coverage');
    ctx.allocate(p.cleared.length * 2); const a: CurveConstant[] = [], b: CurveConstant[] = [];
    for (let i = 0; i < p.cleared.length; i++) {
      const value = c.relation.coefficients[i], cleared = p.cleared[i];
      demand(source.equal(ctx, source.multiply(ctx, value.denominator, p.quotients[i]), p.denominator)
        && source.equal(ctx, source.multiply(ctx, value.numerator, p.quotients[i]), cleared)
        && source.degree(ctx, cleared) <= 1, 'verification-failed', 'linear-x checked clearing/reconstruction');
      b.push(cleared.coefficients[0] ?? zero); a.push(cleared.coefficients[1] ?? zero);
    }
    demand(r.equal(ctx, p.A, r.make(ctx, a)) && r.equal(ctx, p.B, r.make(ctx, b)) && !r.isZero(ctx, p.A)
      && f.equal(ctx, p.xImage, f.make(ctx, r.negate(ctx, p.B), p.A)), 'verification-failed', 'linear-x rational parameter');
    demand(curve.owner.equal(ctx, p.parameter, c.basis[1]), 'verification-failed', 'native parameter preserves supplied presentation');
    let relation = f.fromInteger(ctx, 0n);
    for (let i = c.relation.coefficients.length - 1; i >= 0; i--) {
      const value = c.relation.coefficients[i];
      relation = f.add(ctx, f.multiply(ctx, relation, t), f.exactDivide(ctx,
        evaluate(ctx, f, value.numerator, p.xImage), evaluate(ctx, f, value.denominator, p.xImage)));
    }
    demand(f.isZero(ctx, relation), 'verification-failed', 'parametrization defining relation');
  }
  const xDerivative = f.derivative(ctx, p.xImage);
  demand(!f.isZero(ctx, xDerivative), 'verification-failed', 'nonconstant rational base coordinate');
  verifyAlgebraicDerivativeWithin(ctx, curve.owner, p.parameter, p.parameterDerivative, bounds);
  demand(curve.owner.equal(ctx, rationalCurveBackwardWithin(ctx, curve, p, p.xImage), nativeX(ctx, curve))
    && f.equal(ctx, rationalCurveForwardWithin(ctx, curve, p, p.parameter), t)
    && curve.owner.equal(ctx, curve.owner.multiply(ctx, p.parameterDerivative.derivative,
      rationalCurveBackwardWithin(ctx, curve, p, xDerivative)), curve.owner.fromInteger(ctx, 1n)),
    'verification-failed', 'parametrization inverse and selected derivation');
  demand(p.basisImages.length === n, 'verification-failed', 'parametrization complete native basis coverage');
  let power = f.fromInteger(ctx, 1n);
  for (let i = 0; i < n; i++) {
    demand(f.equal(ctx, p.basisImages[i], power) && f.equal(ctx, p.basisImages[i], rationalCurveForwardWithin(ctx, curve, p, c.basis[i]))
      && curve.owner.equal(ctx, rationalCurveBackwardWithin(ctx, curve, p, p.basisImages[i]), c.basis[i]),
      'verification-failed', 'parametrization complete forward/inverse basis');
    power = f.multiply(ctx, power, t);
  }
}
export function verifyRationalCurveParametrizationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, p: RationalCurveParametrization<E>, bounds: DifferentialBounds): void {
  // Exclusion requires private registration; foreign mutable certificates always receive full checks.
  if (parameterizations.has(p)) proofs.check(ctx, [curve, p, bounds], () => check(ctx, curve, p, bounds), [curve, p]);
  else check(ctx, curve, p, bounds);
}
/** Returns null only for absence of this certified presentation shape, never for a failed computation. */
export function tryRationalCurveParametrizationWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): RationalCurveParametrization<E> | null {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const c = curve.coordinates, source = c.scalar.ring, field = new RationalFunctionField(new PolynomialRing(c.constantOwner, 'parameter'));
  const r = field.ring, n = c.basis.length, zero = r.domain.fromInteger(ctx, 0n), one = r.domain.fromInteger(ctx, 1n);
  let denominator = source.one(ctx), quotients: readonly Polynomial<CurveConstant>[], cleared: readonly Polynomial<CurveConstant>[];
  let A: Polynomial<CurveConstant>, B: Polynomial<CurveConstant>, parameter: E;
  if (n === 1) {quotients = Object.freeze([]); cleared = Object.freeze([]); A = r.one(ctx); B = r.make(ctx, [zero, r.domain.negate(ctx, one)]); parameter = nativeX(ctx, curve);}
  else {
    for (const coefficient of c.relation.coefficients) denominator = source.multiply(ctx, denominator, coefficient.denominator);
    ctx.allocate(c.relation.coefficients.length * 4);
    quotients = Object.freeze(c.relation.coefficients.map(v => exactDivide(ctx, source, denominator, v.denominator)));
    cleared = Object.freeze(c.relation.coefficients.map((v, i) => source.multiply(ctx, v.numerator, quotients[i])));
    if (cleared.some(v => source.degree(ctx, v) > 1)) return null;
    A = r.make(ctx, cleared.map(v => v.coefficients[1] ?? zero)); B = r.make(ctx, cleared.map(v => v.coefficients[0] ?? zero));
    if (r.isZero(ctx, A)) return null; parameter = c.basis[1];
  }
  const xImage = field.make(ctx, r.negate(ctx, B), A), parameterDerivative = differentiateAlgebraicWithin(ctx, curve.owner, parameter, bounds), basisImages: CurveScalar[] = [];
  let power = field.fromInteger(ctx, 1n); const t = generator(ctx, field); ctx.allocate(n);
  for (let i = 0; i < n; i++) {basisImages.push(power); power = field.multiply(ctx, power, t);}
  ctx.allocate(12); const proof = Object.freeze({curve, field, kind: n === 1 ? 'degree-one' as const : 'linear-x' as const,
    denominator, quotients, cleared, A, B, xImage, parameter, parameterDerivative, basisImages: Object.freeze(basisImages)});
  // Registration is ownership of this producer-built immutable graph, never
  // a verification flag. The first scoped check still proves every identity.
  parameterizations.add(proof); verifyRationalCurveParametrizationWithin(ctx, curve, proof, bounds); return proof;
}
export function verifyRationalCurveParametrization<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, p: RationalCurveParametrization<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRationalCurveParametrizationWithin(ctx, curve, p, bounds));
}
export function tryRationalCurveParametrization<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => tryRationalCurveParametrizationWithin(ctx, curve, bounds));
}
