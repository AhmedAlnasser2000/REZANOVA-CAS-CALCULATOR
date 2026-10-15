/** Reduced quadratic coordinates. No field registration or capability flag. */
import {demand, type ExecutionContext} from './execution';
import {assertGenusOneCoordinates, verifyGenusOneNativeCoordinateWithin, type GenusOneCoordinates, type GenusOneCoordinate} from './genus-one-coordinates';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {Polynomial} from './polynomial';

function pair<E>(ctx: ExecutionContext, m: GenusOneCoordinates<E>, p: GenusOneCoordinate) {
  m.ring.assert(ctx, p); demand(p.coefficients.length <= 2, 'domain-mismatch', 'reduced quadratic coordinates');
  return [p.coefficients[0] ?? m.field.fromInteger(ctx, 0n), p.coefficients[1] ?? m.field.fromInteger(ctx, 0n)] as const;
}
export function multiplyGenusOneCoordinates<E>(ctx: ExecutionContext, m: GenusOneCoordinates<E>, a: GenusOneCoordinate, b: GenusOneCoordinate): GenusOneCoordinate {
  assertGenusOneCoordinates(ctx, m.presentation, m); const [a0, a1] = pair(ctx, m, a), [b0, b1] = pair(ctx, m, b), f = m.field;
  return m.ring.make(ctx, [f.add(ctx, f.multiply(ctx, a0, b0), f.multiply(ctx, f.multiply(ctx, a1, b1), f.make(ctx, m.polynomial, f.ring.one(ctx)))), f.add(ctx, f.multiply(ctx, a0, b1), f.multiply(ctx, a1, b0))]);
}
export function inverseGenusOneCoordinates<E>(ctx: ExecutionContext, m: GenusOneCoordinates<E>, p: GenusOneCoordinate): GenusOneCoordinate {
  assertGenusOneCoordinates(ctx, m.presentation, m); const [a, b] = pair(ctx, m, p), f = m.field,
    norm = f.subtract(ctx, f.multiply(ctx, a, a), f.multiply(ctx, f.multiply(ctx, b, b), f.make(ctx, m.polynomial, f.ring.one(ctx))));
  demand(!f.isZero(ctx, norm), 'division-by-zero', 'quadratic coordinate unit norm');
  const result = m.ring.make(ctx, [f.exactDivide(ctx, a, norm), f.negate(ctx, f.exactDivide(ctx, b, norm))]);
  demand(m.ring.equal(ctx, multiplyGenusOneCoordinates(ctx, m, p, result), m.ring.one(ctx)), 'verification-failed', 'quadratic coordinate inverse identity'); return result;
}
function evaluate<E>(ctx: ExecutionContext, m: GenusOneCoordinates<E>, p: Polynomial<CurveConstant>): GenusOneCoordinate {
  p.ring.assert(ctx, p); demand(p.ring.domain === m.curve.coordinates.constantOwner, 'domain-mismatch', 'native coefficient constant owner');
  let value = m.ring.zero(ctx);
  for (let i = p.coefficients.length - 1; i >= 0; i--) value = m.ring.add(ctx, multiplyGenusOneCoordinates(ctx, m, value, m.baseImage), m.ring.constant(ctx, m.field.fromCoefficient(ctx, p.coefficients[i])));
  return value;
}
export function convertGenusOneNativeWithin<E>(ctx: ExecutionContext, m: GenusOneCoordinates<E>, value: E): GenusOneCoordinate {
  assertGenusOneCoordinates(ctx, m.presentation, m); m.curve.owner.assert(ctx, value);
  const coefficients = m.curve.coordinates.coordinates(ctx, value); demand(coefficients.length === m.basisImages.length, 'verification-failed', 'full native basis conversion');
  let result = m.ring.zero(ctx);
  for (let i = 0; i < coefficients.length; i++) {
    const a = coefficients[i], numerator = evaluate(ctx, m, a.numerator), denominator = evaluate(ctx, m, a.denominator), coefficient = multiplyGenusOneCoordinates(ctx, m, numerator, inverseGenusOneCoordinates(ctx, m, denominator));
    result = m.ring.add(ctx, result, multiplyGenusOneCoordinates(ctx, m, coefficient, m.basisImages[i]));
  }
  verifyGenusOneNativeCoordinateWithin(ctx, m, value, result); return result;
}
