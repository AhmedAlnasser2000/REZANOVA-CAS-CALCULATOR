import { demand, type ExecutionContext } from './execution';
import { rationalField } from './field';
import { assertRational, rational, type Rational } from './rational';
import type { Polynomial, PolynomialRing } from './polynomial';

interface RationalWire { readonly numerator: string; readonly denominator: string }
export type ExactWire =
  | { readonly version: 1; readonly kind: 'rational'; readonly domain: 'Q'; readonly value: RationalWire }
  | { readonly version: 1; readonly kind: 'polynomial'; readonly domain: 'Q'; readonly variable: string; readonly coefficients: readonly RationalWire[] };

function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  demand(typeof input === 'object' && input !== null && !Array.isArray(input)
    && (Object.getPrototypeOf(input) === Object.prototype || Object.getPrototypeOf(input) === null), 'invalid-input', 'wire record');
  const value = input as Record<string, unknown>;
  demand(Reflect.ownKeys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)), 'invalid-input', 'wire keys');
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    demand(descriptor !== undefined && Object.hasOwn(descriptor, 'value') && descriptor.enumerable === true,
      'invalid-input', 'wire accessor or nonenumerable property');
  }
  return value;
}
function encodeScalar(ctx: ExecutionContext, value: Rational): RationalWire {
  assertRational(ctx, value);
  // Decimal output has no more characters than the checked binary bit bound plus sign.
  ctx.allocate(ctx.integer(value.numerator) + ctx.integer(value.denominator) + 2);
  return Object.freeze({ numerator: value.numerator.toString(), denominator: value.denominator.toString() });
}
function decodeScalar(ctx: ExecutionContext, input: unknown): Rational {
  ctx.allocate(2); const raw = record(input, ['numerator', 'denominator']);
  demand(typeof raw.numerator === 'string' && typeof raw.denominator === 'string', 'invalid-input', 'wire integer strings');
  const value = rational(ctx, raw.numerator, raw.denominator);
  const canonical = encodeScalar(ctx, value);
  demand(canonical.numerator === raw.numerator && canonical.denominator === raw.denominator, 'invalid-input', 'noncanonical rational wire');
  return value;
}

export function encodeRational(ctx: ExecutionContext, value: Rational): ExactWire {
  ctx.allocate(4);
  return Object.freeze({ version: 1, kind: 'rational', domain: 'Q', value: encodeScalar(ctx, value) });
}
export function decodeRational(ctx: ExecutionContext, input: unknown): Rational {
  ctx.allocate(4); const raw = record(input, ['version', 'kind', 'domain', 'value']);
  demand(raw.version === 1 && raw.kind === 'rational' && raw.domain === 'Q', 'domain-mismatch', 'rational wire version/domain');
  return decodeScalar(ctx, raw.value);
}
export function encodePolynomial(ctx: ExecutionContext, ring: PolynomialRing<Rational>, value: Polynomial<Rational>): ExactWire {
  demand(ring.domain === rationalField, 'domain-mismatch', 'wire supports Q coefficients only');
  ring.assert(ctx, value); ctx.allocate(value.coefficients.length + ring.variable.length + 5);
  return Object.freeze({ version: 1, kind: 'polynomial', domain: 'Q', variable: ring.variable,
    coefficients: Object.freeze(value.coefficients.map(c => encodeScalar(ctx, c))) });
}
export function decodePolynomial(ctx: ExecutionContext, ring: PolynomialRing<Rational>, input: unknown): Polynomial<Rational> {
  demand(ring.domain === rationalField, 'domain-mismatch', 'wire supports Q coefficients only');
  ctx.allocate(5); const raw = record(input, ['version', 'kind', 'domain', 'variable', 'coefficients']);
  demand(raw.version === 1 && raw.kind === 'polynomial' && raw.domain === 'Q' && raw.variable === ring.variable,
    'domain-mismatch', 'polynomial wire version/domain/variable');
  demand(Array.isArray(raw.coefficients), 'invalid-input', 'wire coefficient array');
  ctx.degree(raw.coefficients.length - 1); ctx.allocate(raw.coefficients.length);
  demand(Reflect.ownKeys(raw.coefficients).length === raw.coefficients.length + 1, 'invalid-input', 'extra wire array keys');
  const coefficients: Rational[] = [];
  for (let i = 0; i < raw.coefficients.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(raw.coefficients, i);
    demand(descriptor !== undefined && Object.hasOwn(descriptor, 'value') && descriptor.enumerable === true, 'invalid-input', 'sparse or accessor wire array');
    coefficients.push(decodeScalar(ctx, descriptor.value));
  }
  demand(!coefficients.length || !rationalField.isZero(ctx, coefficients[coefficients.length - 1]), 'invalid-input', 'trailing zero wire coefficient');
  return ring.make(ctx, coefficients);
}
