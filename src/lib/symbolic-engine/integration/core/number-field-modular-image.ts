import {demand, type ExecutionContext} from './execution';
import {rationalField as Q, type ExactField} from './field';
import {isAlgebraicField, type AlgebraicElement, UnsupportedAlgebraicDomain} from './algebraic-field';
import {type Rational} from './rational';
import {FactorPrimeField} from './factorization-modular';
import {ModularCoefficientPolynomialRing, type ModularCoefficientRing, type ModularCoefficientPolynomial} from './modular-coefficient-polynomial';
import {NumberFieldModularRing, type NumberFieldResidue} from './number-field-modular-ring';

/** A recursive algebraic quotient of a modular ring. It never receives field
 * authority, including when its source characteristic-zero owner is a field. */
interface NestedResidue<E> {readonly owner: NestedModularRing<E>; readonly representative: ModularCoefficientPolynomial<E>}
class NestedModularRing<E> implements ModularCoefficientRing<NestedResidue<E>> {
  readonly capability = 'ring' as const;
  readonly characteristic: bigint;
  readonly polynomials: ModularCoefficientPolynomialRing<E>;
  readonly modulus: ModularCoefficientPolynomial<E>;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, polynomials: ModularCoefficientPolynomialRing<E>, modulus: ModularCoefficientPolynomial<E>) {
    polynomials.assert(ctx, modulus);
    demand(modulus.coefficients.length > 1 && polynomials.coefficients.equal(ctx, modulus.coefficients.at(-1)!, polynomials.coefficients.one(ctx)), 'invalid-input', 'monic nested modular relation');
    ctx.allocate(5); this.characteristic = polynomials.coefficients.characteristic; this.polynomials = polynomials; this.modulus = modulus; Object.freeze(this);
  }
  assert(ctx: ExecutionContext, value: NestedResidue<E>) {
    ctx.tick(); demand(value !== null && typeof value === 'object' && this.#values.has(value), 'domain-mismatch', 'owned nested modular residue');
    this.polynomials.assert(ctx, value.representative);
  }
  make(ctx: ExecutionContext, p: ModularCoefficientPolynomial<E>): NestedResidue<E> {
    this.polynomials.assert(ctx, p);
    let representative = p;
    if (p.coefficients.length >= this.modulus.coefficients.length) {
      const division = this.polynomials.divide(ctx, p, this.modulus);
      demand(division !== null, 'verification-failed', 'monic modular reduction'); representative = division.remainder;
    }
    ctx.allocate(2); const out = Object.freeze({owner: this, representative}); this.#values.add(out); return out;
  }
  zero(ctx: ExecutionContext) {return this.make(ctx, this.polynomials.make(ctx, []));}
  one(ctx: ExecutionContext) {return this.make(ctx, this.polynomials.make(ctx, [this.polynomials.coefficients.one(ctx)]));}
  isZero(ctx: ExecutionContext, value: NestedResidue<E>) {this.assert(ctx, value); return value.representative.coefficients.length === 0;}
  equal(ctx: ExecutionContext, a: NestedResidue<E>, b: NestedResidue<E>) {this.assert(ctx, a); this.assert(ctx, b); return this.polynomials.equal(ctx, a.representative, b.representative);}
  add(ctx: ExecutionContext, a: NestedResidue<E>, b: NestedResidue<E>) {this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.polynomials.add(ctx, a.representative, b.representative));}
  negate(ctx: ExecutionContext, a: NestedResidue<E>) {
    this.assert(ctx, a); return this.make(ctx, this.polynomials.scale(ctx, a.representative, this.polynomials.coefficients.negate(ctx, this.polynomials.coefficients.one(ctx))));
  }
  multiply(ctx: ExecutionContext, a: NestedResidue<E>, b: NestedResidue<E>) {
    this.assert(ctx, a); this.assert(ctx, b);
    const product = this.polynomials.multiplyMod(ctx, a.representative, b.representative, this.modulus);
    demand(product !== null, 'verification-failed', 'monic nested modular product'); return this.make(ctx, product);
  }
  inverse(ctx: ExecutionContext, value: NestedResidue<E>): NestedResidue<E> | null {
    this.assert(ctx, value);
    if (!value.representative.coefficients.length) return null;
    if (value.representative.coefficients.length === 1) {
      const inverse = this.polynomials.coefficients.inverse(ctx, value.representative.coefficients[0]);
      return inverse === null ? null : this.make(ctx, this.polynomials.make(ctx, [inverse]));
    }
    const proof = this.polynomials.bezout(ctx, value.representative, this.modulus);
    if (proof === null || proof.gcd.coefficients.length !== 1
      || !this.polynomials.coefficients.equal(ctx, proof.gcd.coefficients[0], this.polynomials.coefficients.one(ctx))) return null;
    const inverse = this.make(ctx, proof.s);
    demand(this.equal(ctx, this.multiply(ctx, value, inverse), this.one(ctx)), 'verification-failed', 'nested modular inverse identity'); return inverse;
  }
}

/** Rational tensor coordinates use the source owner's ordered power bases.
 * This conversion never rebases or identifies independently owned fields. */
export interface NumberFieldModularDescriptor<E> {
  readonly owner: ExactField<E>;
  readonly degree: number;
  readonly dimension: number;
  readonly parent: NumberFieldModularDescriptor<unknown> | null;
  readonly relation: readonly (readonly Rational[])[];
  coordinates(ctx: ExecutionContext, value: E): readonly Rational[];
  native(ctx: ExecutionContext, coefficients: readonly Rational[]): E;
}
interface ModularDomainScope {
  readonly descriptors: WeakMap<object, NumberFieldModularDescriptor<unknown>>;
  readonly images: WeakMap<object, WeakMap<object, NumberFieldModularImage>>;
  readonly coordinates: WeakMap<object, WeakMap<object, readonly Rational[]>>;
}
const scopes = new WeakMap<object, ModularDomainScope>(), descriptors = new WeakSet<object>();
function operationDomains(ctx: ExecutionContext): ModularDomainScope | null {
  ctx.tick(); const token = ctx.operationToken; if (token === undefined) return null;
  let scope = scopes.get(token);
  if (scope === undefined) {
    ctx.allocate(6); scope = {descriptors: new WeakMap(), images: new WeakMap(), coordinates: new WeakMap()}; scopes.set(token, scope);
    ctx.onOperationEnd(() => scopes.delete(token));
  }
  return scope;
}
export function numberFieldModularDescriptor<E>(ctx: ExecutionContext, owner: ExactField<E>): NumberFieldModularDescriptor<E> {
  if (owner !== Q && !isAlgebraicField(owner)) throw new UnsupportedAlgebraicDomain('modular number-field arithmetic requires a registered extension of Q');
  const scope = operationDomains(ctx), old = scope?.descriptors.get(owner);
  if (old !== undefined) {ctx.tick(); return old as NumberFieldModularDescriptor<E>;}
  const parent = isAlgebraicField(owner) ? numberFieldModularDescriptor(ctx, owner.parent) : null;
  const degree = isAlgebraicField(owner) ? owner.modulus.coefficients.length - 1 : 1;
  const dimension = degree * (parent?.dimension ?? 1);
  demand(Number.isSafeInteger(dimension) && dimension > 0, 'invalid-input', 'number-field tensor dimension'); ctx.allocate(dimension + 6);
  ctx.allocate(degree + 1);
  const relation = parent && isAlgebraicField(owner) ? owner.modulus.coefficients.map(c => parent.coordinates(ctx, c)) : [];
  function native(c: ExecutionContext, cs: readonly Rational[]): E {
    demand(cs.length === dimension, 'invalid-input', 'complete number-field tensor coverage'); for (const q of cs) Q.assert(c, q);
    if (!parent) return cs[0] as E;
    demand(isAlgebraicField(owner), 'domain-mismatch', 'registered number-field owner'); c.allocate(degree + dimension);
    return owner.make(c, owner.ring.make(c, Array.from({length: degree}, (_, i) => parent.native(c, cs.slice(i * parent.dimension, (i + 1) * parent.dimension))))) as E;
  }
  function coordinates(c: ExecutionContext, value: E): readonly Rational[] {
    owner.assert(c, value); const scope = operationDomains(c), previous = scope?.coordinates.get(owner)?.get(value as object);
    if (previous !== undefined) {c.tick(); return previous;}
    c.allocate(dimension); const out: Rational[] = [];
    if (!parent) out.push(value as Rational);
    else {
      demand(isAlgebraicField(owner), 'domain-mismatch', 'registered number-field owner');
      const p = (value as AlgebraicElement<unknown>).representative;
      for (let i = 0; i < degree; i++) out.push(...parent.coordinates(c, p.coefficients[i] ?? owner.parent.fromInteger(c, 0n)));
      demand(owner.equal(c, value, native(c, out)), 'verification-failed', 'number-field coordinate inverse reconstruction');
    }
    const result = Object.freeze(out);
    if (scope !== null) {
      let coordinates = scope.coordinates.get(owner);
      if (coordinates === undefined) {c.allocate(3); coordinates = new WeakMap(); scope.coordinates.set(owner, coordinates);}
      c.allocate(3); coordinates.set(value as object, result);
    }
    return result;
  }
  const descriptor = Object.freeze({owner, parent, degree, dimension, relation: Object.freeze(relation), coordinates, native});
  ctx.allocate(1); descriptors.add(descriptor);
  if (scope !== null) {ctx.allocate(3); scope.descriptors.set(owner, descriptor as NumberFieldModularDescriptor<unknown>);}
  return descriptor;
}

export interface NumberFieldModularImage {
  readonly coefficients: ModularCoefficientRing<unknown>;
  readonly polynomials: ModularCoefficientPolynomialRing<unknown>;
  fromCoordinates(ctx: ExecutionContext, cs: readonly Rational[]): unknown | null;
  coordinates(ctx: ExecutionContext, value: unknown): readonly bigint[];
  bind(ctx: ExecutionContext, cs: readonly bigint[]): unknown;
}
/** Only denominators lost at this prime reject the conversion. Arithmetic or
 * resource failure propagates; it never triggers an uncharged alternative. */
export function numberFieldModularImage(ctx: ExecutionContext, descriptor: NumberFieldModularDescriptor<unknown>, prime: FactorPrimeField): NumberFieldModularImage | null {
  prime.assert(ctx, prime.one(ctx));
  const scope = descriptors.has(descriptor) ? operationDomains(ctx) : null, old = scope?.images.get(descriptor)?.get(prime);
  if (old !== undefined) {ctx.tick(); return old;}
  const image = constructModularImage(ctx, descriptor, prime);
  if (scope !== null && image !== null) {
    let images = scope.images.get(descriptor);
    if (images === undefined) {ctx.allocate(3); images = new WeakMap(); scope.images.set(descriptor, images);}
    ctx.allocate(3); images.set(prime, image);
  }
  return image;
}
function constructModularImage(ctx: ExecutionContext, descriptor: NumberFieldModularDescriptor<unknown>, prime: FactorPrimeField): NumberFieldModularImage | null {
  if (!descriptor.parent) {
    const coefficients: ModularCoefficientRing<bigint> = Object.freeze({characteristic: prime.modulus,
      assert(c: ExecutionContext, value: bigint) {c.integer(value); demand(value >= 0n && value < prime.modulus, 'domain-mismatch', 'canonical prime residue');},
      zero(c: ExecutionContext) {c.tick(); return 0n;}, one(c: ExecutionContext) {c.tick(); return 1n;},
      isZero(c: ExecutionContext, a: bigint) {this.assert(c, a); return a === 0n;},
      equal(c: ExecutionContext, a: bigint, b: bigint) {this.assert(c, a); this.assert(c, b); return a === b;},
      add(c: ExecutionContext, a: bigint, b: bigint) {this.assert(c, a); this.assert(c, b); return prime.plus(c, a, b);},
      negate(c: ExecutionContext, a: bigint) {this.assert(c, a); return prime.residue(c, -a);},
      multiply(c: ExecutionContext, a: bigint, b: bigint) {this.assert(c, a); this.assert(c, b); return prime.times(c, a, b);},
      inverse(c: ExecutionContext, a: bigint) {this.assert(c, a); return a === 0n ? null : prime.inverse(c, a);}
    });
    const polynomials = new ModularCoefficientPolynomialRing(ctx, coefficients);
    return Object.freeze({coefficients, polynomials,
      fromCoordinates(c: ExecutionContext, cs: readonly Rational[]) {
        demand(cs.length === 1, 'invalid-input', 'rational modular coordinate'); const q = cs[0]; Q.assert(c, q);
        if (prime.residue(c, q.denominator) === 0n) return null;
        return prime.times(c, prime.residue(c, q.numerator), prime.inverse(c, q.denominator));
      },
      coordinates(c: ExecutionContext, value: unknown) {coefficients.assert(c, value as bigint); c.allocate(1); return Object.freeze([value as bigint]);},
      bind(c: ExecutionContext, cs: readonly bigint[]) {demand(cs.length === 1, 'verification-failed', 'prime coordinate coverage'); coefficients.assert(c, cs[0]); return cs[0];}
    }) as NumberFieldModularImage;
  }
  const parent = numberFieldModularImage(ctx, descriptor.parent, prime); if (parent === null) return null;
  ctx.allocate(descriptor.relation.length); const relation: unknown[] = [];
  for (const cs of descriptor.relation) {const value = parent.fromCoordinates(ctx, cs); if (value === null) return null; relation.push(value);}
  if (!descriptor.parent.parent) {
    const ring = new NumberFieldModularRing(ctx, prime, prime.make(ctx, relation as bigint[]));
    const image: NumberFieldModularImage = Object.freeze({coefficients: ring, polynomials: ring.polynomials,
      fromCoordinates(c: ExecutionContext, cs: readonly Rational[]) {
        demand(cs.length === descriptor.dimension, 'invalid-input', 'modular tensor coordinate coverage'); c.allocate(cs.length); const out: bigint[] = [];
        for (const q of cs) {const a = parent.fromCoordinates(c, [q]); if (a === null) return null; out.push(a as bigint);} return ring.make(c, out);
      },
      coordinates(c: ExecutionContext, value: unknown) {
        ring.assert(c, value as NumberFieldResidue); c.allocate(descriptor.dimension);
        return Object.freeze(Array.from({length: descriptor.dimension}, (_, i) => (value as NumberFieldResidue).value.coefficients[i] ?? 0n));
      },
      bind(c: ExecutionContext, cs: readonly bigint[]) {
        demand(cs.length === descriptor.dimension, 'verification-failed', 'modular tensor coverage');
        for (const a of cs) parent.coefficients.assert(c, a); return ring.make(c, cs);
      }
    }); return image;
  }
  const ring = new NestedModularRing(ctx, parent.polynomials, parent.polynomials.make(ctx, relation));
  const image: NumberFieldModularImage = Object.freeze({coefficients: ring, polynomials: new ModularCoefficientPolynomialRing(ctx, ring),
    fromCoordinates(c: ExecutionContext, cs: readonly Rational[]) {
      demand(cs.length === descriptor.dimension, 'invalid-input', 'nested modular tensor coverage'); c.allocate(descriptor.degree + descriptor.dimension); const out: unknown[] = [];
      for (let i = 0; i < descriptor.degree; i++) {
        const value = parent.fromCoordinates(c, cs.slice(i * descriptor.parent!.dimension, (i + 1) * descriptor.parent!.dimension));
        if (value === null) return null; out.push(value);
      } return ring.make(c, parent.polynomials.make(c, out));
    },
    coordinates(c: ExecutionContext, value: unknown) {
      ring.assert(c, value as NestedResidue<unknown>); c.allocate(descriptor.dimension); const cs: bigint[] = [], p = (value as NestedResidue<unknown>).representative;
      for (let i = 0; i < descriptor.degree; i++) cs.push(...parent.coordinates(c, p.coefficients[i] ?? parent.coefficients.zero(c)));
      return Object.freeze(cs);
    },
    bind(c: ExecutionContext, cs: readonly bigint[]) {
      demand(cs.length === descriptor.dimension, 'verification-failed', 'nested residue coordinate coverage'); c.allocate(descriptor.degree + descriptor.dimension);
      return ring.make(c, parent.polynomials.make(c, Array.from({length: descriptor.degree}, (_, i) => parent.bind(c, cs.slice(i * descriptor.parent!.dimension, (i + 1) * descriptor.parent!.dimension)))));
    }
  }); return image;
}
