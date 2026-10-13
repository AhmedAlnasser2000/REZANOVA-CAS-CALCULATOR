import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import type { DifferentialBounds } from './differential-field';
import { isAlgebraicField, UnsupportedAlgebraicDomain, type AlgebraicElement, type AlgebraicField } from './algebraic-field';
import { factorCoefficientDomain } from './factorization-domain';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';

/** Exact tensor power coordinates over Q. The supplied native owner is retained;
 * this is a checked conversion, not a newly trusted coefficient capability. */
export interface NumberFieldCoordinates<E> {
  readonly owner: ExactField<E>;
  readonly basis: readonly E[];
  readonly generators: readonly E[];
  coordinates(ctx: ExecutionContext, value: E): readonly Rational[];
  native(ctx: ExecutionContext, values: readonly Rational[]): E;
}
export function numberFieldCoordinatesWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds): NumberFieldCoordinates<E> {
  verifyAlgebraicChainWithin(ctx, owner, bounds);
  const parent = isAlgebraicField(owner) ? numberFieldCoordinatesWithin(ctx, owner.parent, bounds) : null;
  const scalar = parent ? null : factorCoefficientDomain(ctx, owner, bounds.towerHeight);
  if (scalar && scalar.height !== 0) throw new UnsupportedAlgebraicDomain('number-field coordinates require an owned finite extension of Q');
  const degree = isAlgebraicField(owner) ? owner.ring.degree(ctx, owner.modulus) : 1;
  const size = degree * (parent?.basis.length ?? 1);
  demand(Number.isSafeInteger(size), 'invalid-input', 'number-field coordinate dimension');
  ctx.degree(size); ctx.allocate(size + (parent?.generators.length ?? 0) + 6);
  const basis: E[] = [], generators: E[] = [];
  if (isAlgebraicField(owner)) {
    const field: AlgebraicField<unknown> = owner;
    let power = field.fromInteger(ctx, 1n);
    for (let i = 0; i < degree; i++) {
      for (const b of parent!.basis) basis.push(field.multiply(ctx, power, field.embed(ctx, b)) as E);
      power = field.multiply(ctx, power, field.generator(ctx));
    }
    for (const g of parent!.generators) generators.push(owner.embed(ctx, g) as E);
    generators.push(owner.generator(ctx) as E);
  } else basis.push(owner.fromInteger(ctx, 1n));
  function native(c: ExecutionContext, values: readonly Rational[]): E {
    demand(values.length === size, 'invalid-input', 'number-field complete coordinate coverage');
    for (const q of values) Q.assert(c, q);
    if (!parent) {
      const value = scalar!.fromRational(c, values[0]);
      demand(Q.equal(c, scalar!.rational(c, value), values[0]), 'verification-failed', 'number-field rational inverse conversion'); return value;
    }
    demand(isAlgebraicField(owner), 'domain-mismatch', 'number-field extension owner');
    c.allocate(degree); const n = parent.basis.length;
    return owner.make(c, owner.ring.make(c, Array.from({length: degree}, (_, i) => parent.native(c, values.slice(i * n, (i + 1) * n))))) as E;
  }
  function coordinates(c: ExecutionContext, value: E): readonly Rational[] {
    owner.assert(c, value); c.allocate(size);
    let out: Rational[];
    if (!parent) out = [scalar!.rational(c, value)];
    else {
      demand(isAlgebraicField(owner), 'domain-mismatch', 'number-field extension owner');
      const p = (value as unknown as AlgebraicElement<unknown>).representative;
      out = []; for (let i = 0; i < degree; i++) out.push(...parent.coordinates(c, p.coefficients[i] ?? owner.parent.fromInteger(c, 0n)));
    }
    demand(owner.equal(c, value, native(c, out)), 'verification-failed', 'number-field coordinate reconstruction');
    return Object.freeze(out);
  }
  return Object.freeze({owner, basis: Object.freeze(basis), generators: Object.freeze(generators), coordinates, native});
}
