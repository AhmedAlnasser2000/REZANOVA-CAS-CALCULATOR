/** Fixed-depth, exact-schema codecs for private derivation evidence. No context is serialized. */
import { demand, type ExecutionContext } from './execution';
import type { ExactIntegralDomain, ExactRing } from './field';
import { decodeRational, encodeRational } from './exact-wire';
import type { Rational } from './rational';
import type { Polynomial, PolynomialRing } from './polynomial';
import type { RationalFunction, RationalFunctionField } from './rational-function';
import type { Bezout } from './polynomial-division';
import type { SquareFreeDecomposition } from './polynomial-square-free';
import type { SubresultantCertificate } from './subresultant';
import type { QuotientElement, SquareFreeQuotientAlgebra, UnitAnalysis } from './quotient-algebra';

export interface EvidenceCodec<T> { encode(value: T): unknown; decode(value: unknown): T }
export function record(ctx: ExecutionContext, value: unknown, keys: readonly string[]): Record<string, unknown> {
  ctx.allocate(keys.length);
  demand(typeof value === 'object' && value !== null && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), 'invalid-input', 'decision record');
  demand(Reflect.ownKeys(value).length === keys.length, 'invalid-input', 'decision record keys');
  for (const key of keys) {
    ctx.tick(); const property = Object.getOwnPropertyDescriptor(value, key);
    demand(property !== undefined && Object.hasOwn(property, 'value') && property.enumerable === true, 'invalid-input', 'decision record accessor/key');
  }
  return value as Record<string, unknown>;
}
export function array(ctx: ExecutionContext, value: unknown): readonly unknown[] {
  demand(Array.isArray(value), 'invalid-input', 'decision array'); ctx.allocate(value.length);
  demand(Reflect.ownKeys(value).length === value.length + 1, 'invalid-input', 'decision array keys');
  for (let i = 0; i < value.length; i++) {
    ctx.tick(); const property = Object.getOwnPropertyDescriptor(value, i);
    demand(property !== undefined && Object.hasOwn(property, 'value') && property.enumerable === true, 'invalid-input', 'decision sparse/accessor array');
  }
  return value;
}
export function list<T>(ctx: ExecutionContext, codec: EvidenceCodec<T>): EvidenceCodec<readonly T[]> {
  return {
    encode(values) { ctx.allocate(values.length); return Object.freeze(values.map(v => codec.encode(v))); },
    decode(value) { return Object.freeze(array(ctx, value).map(v => codec.decode(v))); },
  };
}
export function structure<T extends object>(ctx: ExecutionContext, fields: { [K in keyof T]: EvidenceCodec<T[K]> }): EvidenceCodec<T> {
  const keys = Object.keys(fields) as (keyof T & string)[];
  return {
    encode(value) {
      ctx.allocate(keys.length); const out: Record<string, unknown> = {};
      for (const key of keys) { ctx.tick(); out[key] = fields[key].encode(value[key]); }
      return Object.freeze(out);
    },
    decode(value) {
      const raw = record(ctx, value, keys), out = {} as T;
      for (const key of keys) { ctx.tick(); out[key] = fields[key].decode(raw[key]); }
      return Object.freeze(out);
    },
  };
}
export function integer(ctx: ExecutionContext, minimum = 0): EvidenceCodec<number> {
  function check(value: unknown): number { ctx.tick(); demand(typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum, 'invalid-input', 'decision integer'); return value; }
  return { encode: check, decode: check };
}
export function literal<T extends string | number | boolean>(ctx: ExecutionContext, ...values: T[]): EvidenceCodec<T> {
  function check(value: unknown): T { ctx.tick(); demand(values.includes(value as T), 'invalid-input', 'decision literal'); return value as T; }
  return { encode: check, decode: check };
}
export function optional<T>(codec: EvidenceCodec<T>): EvidenceCodec<T | null> {
  return { encode: value => value === null ? null : codec.encode(value), decode: value => value === null ? null : codec.decode(value) };
}
export function scalar(ctx: ExecutionContext): EvidenceCodec<Rational> {
  return { encode: v => encodeRational(ctx, v), decode: v => decodeRational(ctx, v) };
}
export function polynomial<E, D extends ExactRing<E>>(ctx: ExecutionContext, ring: PolynomialRing<E, D>, coefficient: EvidenceCodec<E>): EvidenceCodec<Polynomial<E, D>> {
  const coefficients = list(ctx, coefficient);
  return {
    encode(value) { ring.assert(ctx, value); ctx.allocate(2 + ring.variable.length); return Object.freeze({ variable: ring.variable, coefficients: coefficients.encode(value.coefficients) }); },
    decode(value) {
      const raw = record(ctx, value, ['variable', 'coefficients']); demand(raw.variable === ring.variable, 'domain-mismatch', 'decision polynomial variable');
      demand(Array.isArray(raw.coefficients), 'invalid-input', 'decision coefficients'); ctx.degree(raw.coefficients.length - 1);
      const decoded = coefficients.decode(raw.coefficients), result = ring.make(ctx, decoded);
      demand(result.coefficients.length === decoded.length, 'invalid-input', 'noncanonical decision polynomial'); return result;
    },
  };
}
export function fraction<E>(ctx: ExecutionContext, field: RationalFunctionField<E>, coefficient: EvidenceCodec<E>): EvidenceCodec<RationalFunction<E>> {
  const p = polynomial(ctx, field.ring, coefficient), parts = structure(ctx, { numerator: p, denominator: p });
  return {
    encode(value) { field.assert(ctx, value); return parts.encode(value); },
    decode(value) {
      const { numerator, denominator } = parts.decode(value), result = field.make(ctx, numerator, denominator);
      demand(field.ring.equal(ctx, numerator, result.numerator) && field.ring.equal(ctx, denominator, result.denominator), 'invalid-input', 'noncanonical decision fraction'); return result;
    },
  };
}
export function division<P>(ctx: ExecutionContext, p: EvidenceCodec<P>): EvidenceCodec<{ readonly quotient: P; readonly remainder: P }> {
  return structure(ctx, { quotient: p, remainder: p });
}
export function bezout<E>(ctx: ExecutionContext, p: EvidenceCodec<Polynomial<E>>): EvidenceCodec<Bezout<E>> {
  return structure(ctx, { gcd: p, s: p, t: p });
}
export function squareFreeEvidence<E>(ctx: ExecutionContext, p: EvidenceCodec<Polynomial<E>>, c: EvidenceCodec<E>): EvidenceCodec<SquareFreeDecomposition<E>> {
  return structure(ctx, { scalar: c, factors: list(ctx, structure(ctx, { factor: p, multiplicity: integer(ctx, 1) })) });
}
export function prsEvidence<E, D extends ExactIntegralDomain<E>>(ctx: ExecutionContext, p: EvidenceCodec<Polynomial<E, D>>, c: EvidenceCodec<E>): EvidenceCodec<SubresultantCertificate<E, D>> {
  const ints = list(ctx, integer(ctx, -1));
  const degrees: EvidenceCodec<readonly [number, number]> = {
    encode: v => ints.encode(v), decode(v) { const a = ints.decode(v); demand(a.length === 2, 'invalid-input', 'PRS degree pair'); return Object.freeze([a[0], a[1]] as const); },
  };
  return structure(ctx, {
    inputDegrees: degrees, swapped: literal(ctx, false, true),
    steps: list(ctx, structure(ctx, { pseudo: structure(ctx, { ...{ quotient: p, remainder: p }, exponent: integer(ctx), multiplier: c }),
      divisor: c, next: p, negativePrincipal: optional(c) })),
    indexed: list(ctx, structure(ctx, { index: integer(ctx), kind: literal(ctx, 'ordinary', 'highest-boundary'), polynomial: p, degree: integer(ctx, -1), principal: c })),
    resultant: c,
  });
}
export function quotientElement<E>(ctx: ExecutionContext, algebra: SquareFreeQuotientAlgebra<E>, p: EvidenceCodec<Polynomial<E>>): EvidenceCodec<QuotientElement<E>> {
  return {
    encode(value) { algebra.assert(ctx, value); return p.encode(value.representative); },
    decode(value) {
      const representative = p.decode(value), result = algebra.make(ctx, representative);
      demand(algebra.ring.equal(ctx, representative, result.representative), 'invalid-input', 'unreduced decision quotient'); return result;
    },
  };
}
export function unitEvidence<E>(ctx: ExecutionContext, algebra: SquareFreeQuotientAlgebra<E>, p: EvidenceCodec<Polynomial<E>>): EvidenceCodec<UnitAnalysis<E>> {
  const b = bezout(ctx, p), element = quotientElement(ctx, algebra, p);
  const zero = structure(ctx, { kind: literal(ctx, 'zero') });
  const unit = structure(ctx, { kind: literal(ctx, 'unit'), inverse: element, bezout: b });
  const nonunit = structure(ctx, { kind: literal(ctx, 'nonunit'), bezout: b, split: structure(ctx, { factor: p, complement: p, coprime: b }) });
  return {
    encode(value) { return value.kind === 'zero' ? zero.encode(value) : value.kind === 'unit' ? unit.encode(value) : nonunit.encode(value); },
    decode(value) {
      demand(typeof value === 'object' && value !== null, 'invalid-input', 'unit evidence');
      const descriptor = Object.getOwnPropertyDescriptor(value, 'kind');
      demand(descriptor !== undefined && Object.hasOwn(descriptor, 'value'), 'invalid-input', 'unit kind accessor');
      if (descriptor.value === 'zero') return zero.decode(value);
      if (descriptor.value === 'unit') return unit.decode(value);
      demand(descriptor.value === 'nonunit', 'invalid-input', 'unit kind'); return nonunit.decode(value);
    },
  };
}
