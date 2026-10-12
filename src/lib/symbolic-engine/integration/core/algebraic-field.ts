import { AlgebraError, demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import { PolynomialRing, assertPolynomialRingOwner, type Polynomial } from './polynomial';
import { extendedGcd, polynomialDivide, verifyBezout, type Bezout } from './polynomial-division';
import { assertDifferentialFieldOwner, checkDifferentialBounds, DifferentialField, type DifferentialBounds } from './differential-field';
import { requireRationalVariable } from './differential-admission';
import { RationalFunctionField } from './rational-function';
import { factorCoefficientDomain, UnsupportedFactorizationDomain } from './factorization-domain';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';

export interface AlgebraicElement<E> {
  readonly owner: AlgebraicField<E>;
  readonly representative: Polynomial<E>;
}
export interface AlgebraicConstruction<E> {
  readonly relation: Polynomial<E>;
  readonly monic: Polynomial<E>;
  readonly normalization: E;
  readonly factorization: AlgebraicFactorization<E>;
  readonly separable: Bezout<E>;
}
const key = Symbol('algebraic construction');
const owners = new WeakSet<object>();
export class UnsupportedAlgebraicDomain extends AlgebraError {
  constructor(reason = 'unsupported algebraic coefficient domain') { super('domain-mismatch', reason); this.name = 'UnsupportedAlgebraicDomain'; }
}
export function isAlgebraicField(field: unknown): field is AlgebraicField<unknown> {
  return field instanceof AlgebraicField && owners.has(field);
}
export function assertAlgebraicOwner<E>(ctx: ExecutionContext, field: AlgebraicField<E>): void {
  ctx.tick(); demand(isAlgebraicField(field), 'domain-mismatch', 'algebraic field owner');
}
/** Closed native base admission. Transcendental/formal owners cannot opt in. */
export function algebraicHeight<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds): number {
  checkDifferentialBounds(ctx, bounds);
  if (field instanceof AlgebraicField) {
    assertAlgebraicOwner(ctx, field);
    if (field.height > bounds.towerHeight) ctx.exhaust('tower-height');
    return field.height;
  }
  if (field instanceof DifferentialField) {
    assertDifferentialFieldOwner(ctx, field);
    if (field.kind === 'formal') throw new UnsupportedAlgebraicDomain();
    if (field.kind !== 'rational') requireRationalVariable(ctx, field);
  }
  if (!(field === Q as unknown as ExactField<E> || field instanceof DifferentialField || field instanceof RationalFunctionField)) throw new UnsupportedAlgebraicDomain();
  let base;
  try { base = factorCoefficientDomain(ctx, field, bounds.towerHeight); }
  catch (error) { if (error instanceof UnsupportedFactorizationDomain) throw new UnsupportedAlgebraicDomain(); throw error; }
  if (base.height > 1) throw new UnsupportedAlgebraicDomain('algebraic base requires Q or Q(x)');
  return base.height;
}
/** Proof records must be immutable before they can become owner authority. Native
 * owners/values are already privately registered; verifiers check their ownership. */
function immutable(ctx: ExecutionContext, value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  ctx.allocate(1); seen.add(value);
  demand(Object.isFrozen(value), 'invalid-input', 'mutable algebraic construction evidence');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return;
  for (const v of Object.values(value)) { ctx.tick(); immutable(ctx, v, seen); }
}
export function verifyAlgebraicConstructionWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>,
  relation: Polynomial<E>, proof: AlgebraicConstruction<E>, bounds: DifferentialBounds): void {
  assertPolynomialRingOwner(ctx, ring); algebraicHeight(ctx, ring.domain, bounds); ring.assert(ctx, relation);
  demand(ring.degree(ctx, relation) > 0, 'invalid-input', 'nonconstant algebraic defining relation required');
  demand(ring.equal(ctx, proof.relation, relation) && ring.domain.equal(ctx, proof.normalization, ring.leading(ctx, relation))
    && ring.equal(ctx, ring.scale(ctx, proof.monic, proof.normalization), relation)
    && ring.domain.equal(ctx, ring.leading(ctx, proof.monic), ring.domain.fromInteger(ctx, 1n)),
  'verification-failed', 'algebraic monic normalization');
  verifyAlgebraicFactorizationWithin(ctx, ring, proof.monic, proof.factorization, bounds);
  const f = proof.factorization;
  demand(f.kind === 'factorization' && f.factors.length === 1 && f.factors[0].multiplicity === 1n
    && ring.equal(ctx, f.factors[0].polynomial, proof.monic), 'invalid-input', 'irreducible algebraic relation required');
  verifyBezout(ctx, ring, proof.monic, ring.derivative(ctx, proof.monic), proof.separable);
  demand(ring.equal(ctx, proof.separable.gcd, ring.one(ctx)), 'verification-failed', 'algebraic separability');
}
/** An irreducible quotient field, distinct from the square-free quotient rings
 * used for all-root logarithms. No constant-field claim is made here. */
export class AlgebraicField<E> implements ExactField<AlgebraicElement<E>> {
  readonly identity = Symbol('algebraic field');
  readonly capability = 'field' as const;
  readonly characteristic = 0 as const;
  readonly parent: ExactField<E>;
  readonly ring: PolynomialRing<E>;
  readonly construction: AlgebraicConstruction<E>;
  readonly height: number;
  #values = new WeakSet<object>();
  #units = new WeakMap<object, {zero?: AlgebraicElement<E>; one?: AlgebraicElement<E>}>();
  private constructor(token: symbol, ring: PolynomialRing<E>, proof: AlgebraicConstruction<E>, height: number) {
    demand(token === key, 'domain-mismatch', 'private algebraic constructor');
    this.parent = ring.domain; this.ring = ring; this.construction = proof; this.height = height;
    owners.add(this); Object.freeze(this);
  }
  /** Reconstruction helper, not an irreducibility or factorization producer. */
  static fromEvidence<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, relation: Polynomial<E>,
    proof: AlgebraicConstruction<E>, bounds: DifferentialBounds): AlgebraicField<E> {
    verifyAlgebraicConstructionWithin(ctx, ring, relation, proof, bounds); immutable(ctx, proof);
    const height = algebraicHeight(ctx, ring.domain, bounds) + 1;
    if (height > bounds.towerHeight) ctx.exhaust('tower-height');
    ctx.allocate(9); return new AlgebraicField(key, ring, proof, height);
  }
  get modulus(): Polynomial<E> { return this.construction.monic; }
  assert(ctx: ExecutionContext, value: AlgebraicElement<E>): void {
    assertAlgebraicOwner(ctx, this);
    demand(value !== null && typeof value === 'object' && this.#values.has(value), 'domain-mismatch', 'algebraic element owner');
    this.ring.assert(ctx, value.representative);
  }
  make(ctx: ExecutionContext, p: Polynomial<E>): AlgebraicElement<E> {
    assertAlgebraicOwner(ctx, this);
    this.ring.assert(ctx, p);
    const representative = p.coefficients.length < this.modulus.coefficients.length ? p
      : polynomialDivide(ctx, this.ring, p, this.modulus).remainder;
    ctx.allocate(2); const v = Object.freeze({owner: this, representative}); this.#values.add(v); return v;
  }
  embed(ctx: ExecutionContext, value: E): AlgebraicElement<E> {
    this.parent.assert(ctx, value); return this.make(ctx, this.ring.constant(ctx, value));
  }
  fromInteger(ctx: ExecutionContext, n: bigint) {
    assertAlgebraicOwner(ctx, this);
    const token = ctx.operationToken, name = n === 0n ? 'zero' : n === 1n ? 'one' : null;
    if (!token || !name) return this.embed(ctx, this.parent.fromInteger(ctx, n));
    let units = this.#units.get(token); const previous = units?.[name];
    if (previous) { this.assert(ctx, previous); return previous; }
    const value = this.embed(ctx, this.parent.fromInteger(ctx, n));
    if (!units) { ctx.allocate(4); units = {}; this.#units.set(token, units); ctx.onOperationEnd(() => this.#units.delete(token)); }
    ctx.allocate(1); units[name] = value; return value;
  }
  generator(ctx: ExecutionContext) { return this.make(ctx, this.ring.make(ctx, [this.parent.fromInteger(ctx, 0n), this.parent.fromInteger(ctx, 1n)])); }
  add(ctx: ExecutionContext, a: AlgebraicElement<E>, b: AlgebraicElement<E>) {
    this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.ring.add(ctx, a.representative, b.representative));
  }
  negate(ctx: ExecutionContext, a: AlgebraicElement<E>) { this.assert(ctx, a); return this.make(ctx, this.ring.negate(ctx, a.representative)); }
  subtract(ctx: ExecutionContext, a: AlgebraicElement<E>, b: AlgebraicElement<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: AlgebraicElement<E>, b: AlgebraicElement<E>) {
    this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, this.ring.multiply(ctx, a.representative, b.representative));
  }
  equal(ctx: ExecutionContext, a: AlgebraicElement<E>, b: AlgebraicElement<E>) {
    this.assert(ctx, a); this.assert(ctx, b); return this.ring.equal(ctx, a.representative, b.representative);
  }
  isZero(ctx: ExecutionContext, a: AlgebraicElement<E>) { this.assert(ctx, a); return this.ring.isZero(ctx, a.representative); }
  inverseEvidence(ctx: ExecutionContext, a: AlgebraicElement<E>) {
    this.assert(ctx, a); demand(!this.isZero(ctx, a), 'division-by-zero', 'algebraic inverse');
    const bezout = extendedGcd(ctx, this.ring, a.representative, this.modulus);
    const inverse = this.make(ctx, bezout.s); this.verifyInverse(ctx, a, inverse, bezout);
    ctx.allocate(3); return Object.freeze({input: a, inverse, bezout});
  }
  verifyInverse(ctx: ExecutionContext, a: AlgebraicElement<E>, inverse: AlgebraicElement<E>, bezout: Bezout<E>): void {
    this.assert(ctx, a); this.assert(ctx, inverse);
    verifyBezout(ctx, this.ring, a.representative, this.modulus, bezout);
    demand(this.ring.equal(ctx, bezout.gcd, this.ring.one(ctx)) && this.equal(ctx, inverse, this.make(ctx, bezout.s))
      && this.equal(ctx, this.multiply(ctx, a, inverse), this.fromInteger(ctx, 1n)), 'verification-failed', 'algebraic inverse identity');
  }
  inverse(ctx: ExecutionContext, a: AlgebraicElement<E>) {
    this.assert(ctx, a);
    if (a.representative.coefficients.length === 1) return this.embed(ctx, this.parent.inverse(ctx, a.representative.coefficients[0]));
    return this.inverseEvidence(ctx, a).inverse;
  }
  exactDivide(ctx: ExecutionContext, a: AlgebraicElement<E>, b: AlgebraicElement<E>) { return this.multiply(ctx, a, this.inverse(ctx, b)); }
}
export function constructAlgebraicExtension<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, relation: Polynomial<E>,
  bounds: DifferentialBounds): AlgebraicField<E> {
  return ctx.operation(() => {
    algebraicHeight(ctx, ring.domain, bounds); ring.assert(ctx, relation);
    demand(ring.degree(ctx, relation) > 0, 'invalid-input', 'nonconstant algebraic defining relation required');
    const normalization = ring.leading(ctx, relation), monic = ring.scale(ctx, relation, ring.domain.inverse(ctx, normalization));
    const factorization = factorAlgebraicPolynomialWithin(ctx, ring, monic, bounds);
    const proof = Object.freeze({relation, monic, normalization, factorization, separable: extendedGcd(ctx, ring, monic, ring.derivative(ctx, monic))});
    return AlgebraicField.fromEvidence(ctx, ring, relation, proof, bounds);
  });
}
export function verifyAlgebraicExtension<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, relation: Polynomial<E>,
  owner: AlgebraicField<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => {
    assertAlgebraicOwner(ctx, owner); demand(owner.ring === ring, 'domain-mismatch', 'algebraic construction ring');
    verifyAlgebraicConstructionWithin(ctx, ring, relation, owner.construction, bounds);
  });
}
export function algebraicScalarBase<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds) {
  demand(!isAlgebraicField(field), 'domain-mismatch', 'algebraic scalar base');
  algebraicHeight(ctx, field, bounds); return factorCoefficientDomain(ctx, field, bounds.towerHeight);
}
export { Q as algebraicRationals };
