import { demand, type ExecutionContext } from '../execution';
import { ZZ } from './domain';
import { PolynomialRing, type Polynomial } from './polynomial';
import { assertRational, rational, type Rational } from './rational';

/** Private, versioned JSON for core artifacts. Not a public result format. */
export const WIRE_VERSION = 1;

export type WireRational = readonly [string, string];
export interface WirePolynomial {
  readonly version: 1;
  readonly domain: 'ZZ' | 'QQ';
  readonly variable: string;
  readonly coefficients: readonly (string | WireRational)[];
}

const INTEGER_TEXT = /^-?(0|[1-9][0-9]*)$/;

function plainRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const own = Object.getOwnPropertyNames(value);
  return own.length === keys.length && keys.every(k => {
    const d = Object.getOwnPropertyDescriptor(value, k);
    return d !== undefined && 'value' in d && d.enumerable === true;
  });
}

function integerText(ctx: ExecutionContext, text: unknown): bigint {
  demand(typeof text === 'string' && INTEGER_TEXT.test(text) && text !== '-0', 'invalid-input', 'canonical integer text');
  ctx.charge(text.length / 16, text.length / 16);
  return BigInt(text);
}

export function encodeRational(ctx: ExecutionContext, v: Rational): WireRational {
  assertRational(ctx, v);
  return Object.freeze([v.numerator.toString(), v.denominator.toString()] as const);
}

export function decodeRational(ctx: ExecutionContext, value: unknown): Rational {
  demand(Array.isArray(value) && value.length === 2, 'invalid-input', 'rational pair');
  const n = integerText(ctx, value[0]), d = integerText(ctx, value[1]);
  demand(d > 0n, 'invalid-input', 'denominator must be positive');
  const r = rational(ctx, n, d);
  demand(r.numerator === n && r.denominator === d, 'invalid-input', 'noncanonical rational');
  return r;
}

export function encodePolynomial<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, p: Polynomial<E>): WirePolynomial {
  ring.assert(ctx, p);
  const coefficients = ring.domain === ZZ
    ? (p.coefficients as readonly bigint[]).map(c => c.toString())
    : (p.coefficients as readonly Rational[]).map(c => encodeRational(ctx, c));
  return Object.freeze({ version: 1 as const, domain: ring.domain.name, variable: ring.variable, coefficients: Object.freeze(coefficients) });
}

/** Strict decode into an explicitly supplied ring: wrong domain, variable or noncanonical data is rejected. */
export function decodePolynomial<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, value: unknown): Polynomial<E> {
  demand(plainRecord(value, ['version', 'domain', 'variable', 'coefficients']), 'invalid-input', 'polynomial record shape');
  demand(value.version === WIRE_VERSION, 'invalid-input', 'wire version');
  demand(value.domain === ring.domain.name, 'domain-mismatch', 'wire domain');
  demand(value.variable === ring.variable, 'domain-mismatch', 'wire variable');
  const raw = value.coefficients;
  demand(Array.isArray(raw), 'invalid-input', 'coefficient list');
  ctx.allocate(raw.length);
  const coefficients = (ring.domain === ZZ ? raw.map(c => integerText(ctx, c)) : raw.map(c => decodeRational(ctx, c))) as E[];
  const p = ring.make(ctx, coefficients);
  demand(p.coefficients.length === coefficients.length, 'invalid-input', 'trailing zero coefficients');
  return p;
}
