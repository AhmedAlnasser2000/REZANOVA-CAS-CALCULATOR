import { AlgebraError, demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import { DifferentialField, assertDifferentialFieldOwner } from './differential-field';
import { fractionCoefficient, type FractionCoefficient } from './fraction-coefficient';
import { rational, type Rational } from './rational';
import type { EvidenceCodec } from './decision-wire-algebra';
import * as w from './decision-wire-algebra';

export class UnsupportedFactorizationDomain extends AlgebraError {
  constructor() { super('domain-mismatch', 'unsupported factorization coefficient domain'); this.name = 'UnsupportedFactorizationDomain'; }
}
export interface FactorCoefficientDomain<E> {
  readonly field: ExactField<E>;
  readonly height: number;
  readonly child: FactorCoefficientDomain<unknown> | null;
  readonly fraction: FractionCoefficient<E, unknown> | null;
  rational(ctx: ExecutionContext, value: E): Rational;
  fromRational(ctx: ExecutionContext, value: Rational): E;
  codec(ctx: ExecutionContext): EvidenceCodec<E>;
}
export function factorCoefficientDomain<E>(ctx: ExecutionContext, field: ExactField<E>, heightLimit: number): FactorCoefficientDomain<E> {
  ctx.tick(); demand(Number.isSafeInteger(heightLimit) && heightLimit >= 0, 'invalid-input', 'factorization tower bound');
  if (field === Q as unknown as ExactField<E>) {
    return Object.freeze({field, height: 0, child: null, fraction: null,
      rational(c: ExecutionContext, v: E) { field.assert(c, v); return v as unknown as Rational; },
      fromRational(c: ExecutionContext, v: Rational) { Q.assert(c, v); return v as unknown as E; },
      codec: w.scalar as unknown as (c: ExecutionContext) => EvidenceCodec<E>});
  }
  if (field instanceof DifferentialField && field.kind === 'rational') {
    assertDifferentialFieldOwner(ctx, field);
    const from = (c: ExecutionContext, v: Rational) => field.scalar(c, v) as E;
    const read = (c: ExecutionContext, v: E) => {
      field.assert(c, v as Parameters<typeof field.assert>[1]);
      const value = v as Parameters<typeof field.assert>[1]; demand(value.kind === 'scalar', 'domain-mismatch', 'rational wrapper'); return value.value;
    };
    return Object.freeze({field, height: 0, child: null, fraction: null, rational: read, fromRational: from,
      codec(c: ExecutionContext) { return {encode(v: E) { return w.scalar(c).encode(read(c, v)); }, decode(v: unknown) { return from(c, w.scalar(c).decode(v)); }}; }});
  }
  const fraction = fractionCoefficient(field); if (!fraction) throw new UnsupportedFactorizationDomain();
  if (heightLimit === 0) ctx.exhaust('tower-height');
  const child = factorCoefficientDomain(ctx, fraction.ring.domain, heightLimit - 1); ctx.allocate(7);
  return Object.freeze({field, height: child.height + 1, child, fraction,
    rational(c: ExecutionContext, v: E): Rational {
      const f = fraction.read(c, v);
      demand(f.numerator.coefficients.length <= 1 && f.denominator.coefficients.length === 1, 'domain-mismatch', 'nonconstant rational projection');
      return f.numerator.coefficients.length ? Q.multiply(c, child.rational(c, f.numerator.coefficients[0]), Q.inverse(c, child.rational(c, f.denominator.coefficients[0]))) : rational(c, 0n);
    },
    fromRational(c: ExecutionContext, v: Rational) { return fraction.make(c, fraction.ring.constant(c, child.fromRational(c, v)), fraction.ring.one(c)); },
    codec(c: ExecutionContext) {
      const p = w.polynomial(c, fraction.ring, child.codec(c)), parts = w.structure(c, {numerator: p, denominator: p});
      return {encode(v: E) { return parts.encode(fraction.read(c, v)); }, decode(v: unknown) {
        const f = parts.decode(v), result = fraction.make(c, f.numerator, f.denominator), back = fraction.read(c, result);
        demand(fraction.ring.equal(c, f.numerator, back.numerator) && fraction.ring.equal(c, f.denominator, back.denominator), 'invalid-input', 'noncanonical factorization coefficient'); return result;
      }};
    }});
}
