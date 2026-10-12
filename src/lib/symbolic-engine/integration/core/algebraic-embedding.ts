import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { factorCoefficientDomain } from './factorization-domain';
import type { DifferentialBounds } from './differential-field';
import { algebraicHeight, isAlgebraicField, type AlgebraicElement, type AlgebraicField } from './algebraic-field';

const key = Symbol('algebraic embedding'), embeddings = new WeakSet<object>();
/** Embeddings carry exact generator images; names and equal derivatives grant no
 * compatibility. A parent embedding is part of each extension map. */
export class AlgebraicEmbedding<S, T> {
  readonly source: ExactField<S>;
  readonly target: ExactField<T>;
  readonly kind: 'identity' | 'extension' | 'lift' | 'rational';
  readonly parent: AlgebraicEmbedding<unknown, T> | null;
  readonly basis: readonly T[];
  private constructor(token: symbol, source: ExactField<S>, target: ExactField<T>, parent: AlgebraicEmbedding<unknown, T> | null, basis: readonly T[], kind: 'identity' | 'extension' | 'lift' | 'rational') {
    demand(token === key, 'domain-mismatch', 'private algebraic embedding');
    this.source = source; this.target = target; this.parent = parent; this.basis = basis; this.kind = kind; embeddings.add(this); Object.freeze(this);
  }
  static identity<S>(ctx: ExecutionContext, owner: ExactField<S>, bounds: DifferentialBounds): AlgebraicEmbedding<S, S> {
    algebraicHeight(ctx, owner, bounds); ctx.allocate(6); return new AlgebraicEmbedding(key, owner, owner, null, Object.freeze([]), 'identity');
  }
  static rationals<T>(ctx: ExecutionContext, target: ExactField<T>, bounds: DifferentialBounds): AlgebraicEmbedding<Rational, T> {
    algebraicHeight(ctx, target, bounds);
    if (isAlgebraicField(target)) {
      const parent = AlgebraicEmbedding.rationals(ctx, target.parent, bounds); ctx.allocate(6);
      return new AlgebraicEmbedding<Rational, T>(key, Q, target, parent as unknown as AlgebraicEmbedding<unknown, T>, Object.freeze([]), 'lift');
    }
    factorCoefficientDomain(ctx, target, bounds.towerHeight); ctx.allocate(6);
    return new AlgebraicEmbedding<Rational, T>(key, Q, target, null, Object.freeze([]), 'rational');
  }
  static ancestor<S, T>(ctx: ExecutionContext, source: ExactField<S>, target: ExactField<T>, bounds: DifferentialBounds): AlgebraicEmbedding<S, T> {
    if (source === target as unknown as ExactField<S>) return AlgebraicEmbedding.identity(ctx, source, bounds) as unknown as AlgebraicEmbedding<S, T>;
    algebraicHeight(ctx, source, bounds); algebraicHeight(ctx, target, bounds);
    demand(isAlgebraicField(target), 'domain-mismatch', 'embedding requires actual ancestor');
    const parent = AlgebraicEmbedding.ancestor(ctx, source, target.parent, bounds); ctx.allocate(6);
    return new AlgebraicEmbedding<S, T>(key, source, target, parent as unknown as AlgebraicEmbedding<unknown, T>, Object.freeze([]), 'lift');
  }
  static extension<E, T>(ctx: ExecutionContext, source: AlgebraicField<E>, target: ExactField<T>,
    parent: AlgebraicEmbedding<E, T>, image: T, bounds: DifferentialBounds): AlgebraicEmbedding<AlgebraicElement<E>, T> {
    algebraicHeight(ctx, source, bounds); algebraicHeight(ctx, target, bounds);
    demand(embeddings.has(parent) && parent.source === source.parent && parent.target === target, 'domain-mismatch', 'embedding parent'); target.assert(ctx, image);
    const n = source.ring.degree(ctx, source.modulus); ctx.allocate(n + 5);
    const basis: T[] = []; let power = target.fromInteger(ctx, 1n), sum = target.fromInteger(ctx, 0n);
    for (let i = 0; i <= n; i++) {
      if (i < n) basis.push(power);
      sum = target.add(ctx, sum, target.multiply(ctx, parent.map(ctx, source.modulus.coefficients[i]), power));
      power = target.multiply(ctx, power, image);
    }
    demand(target.isZero(ctx, sum), 'verification-failed', 'embedding defining relation');
    // Irreducibility over the injected parent proves power-basis independence.
    return new AlgebraicEmbedding(key, source, target, parent as unknown as AlgebraicEmbedding<unknown, T>, Object.freeze(basis), 'extension');
  }
  map(ctx: ExecutionContext, value: S): T {
    demand(embeddings.has(this), 'domain-mismatch', 'embedding owner'); this.source.assert(ctx, value);
    if (this.parent === null) {
      if (this.kind === 'rational') { demand(this.source === Q as unknown as ExactField<S>, 'domain-mismatch', 'rational embedding source');
        return factorCoefficientDomain(ctx, this.target, 1).fromRational(ctx, value as unknown as Rational); }
      demand(this.source === this.target as unknown as ExactField<S>, 'domain-mismatch', 'identity embedding'); return value as unknown as T;
    }
    if (this.kind === 'lift') {
      demand(isAlgebraicField(this.target), 'domain-mismatch', 'ancestor embedding target');
      return this.target.embed(ctx, this.parent.map(ctx, value)) as unknown as T;
    }
    demand(isAlgebraicField(this.source), 'domain-mismatch', 'embedding extension source');
    const p = (value as unknown as AlgebraicElement<unknown>).representative; let sum = this.target.fromInteger(ctx, 0n);
    for (let i = 0; i < p.coefficients.length; i++) sum = this.target.add(ctx, sum, this.target.multiply(ctx, this.parent.map(ctx, p.coefficients[i]), this.basis[i]));
    return sum;
  }
}
