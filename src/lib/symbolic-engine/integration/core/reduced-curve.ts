import { demand, type ExecutionContext } from './execution';
import { immutablePositiveEvidence, type FiniteField, type PositiveRing, type PositiveField } from './positive-field';
import type { PositivePolynomial } from './positive-polynomial';
import { PositiveFractionField, reciprocalPositiveFraction, type PositiveFraction } from './positive-fraction';
import { positiveLatticeCoordinates, verifyPositiveLattice, type PositiveLattice } from './positive-lattice';
import { freezeExactMatrix, transposeExactMatrix, invertArithmeticMatrix, verifyArithmeticMatrixInverse, determinantArithmeticInverse, equalExactMatrices, type ExactMatrix, type MatrixInverse } from './arithmetic-matrix';
import { requireGoodReduction } from './algebraic-reduction-errors';

export interface ReducedCurveValue<E> { readonly algebra: ReducedCurveAlgebra<E>; readonly coefficients: readonly PositiveFraction<E>[] }
const algebras = new WeakSet<object>();
export class ReducedCurveAlgebra<E> implements PositiveRing<ReducedCurveValue<E>> {
  readonly identity = Symbol('reduced-curve-algebra'); readonly capability = 'ring' as const; readonly characteristic: bigint;
  readonly constants: FiniteField<E>; readonly scalar: PositiveFractionField<E>; readonly relation: PositivePolynomial<PositiveFraction<E>>; readonly dimension: number;
  #values = new WeakSet<object>();
  constructor(ctx: ExecutionContext, constants: FiniteField<E>, scalar: PositiveFractionField<E>, relation: PositivePolynomial<PositiveFraction<E>>) {
    demand(scalar.ring.field === constants && relation.ring.field === scalar, 'domain-mismatch', 'reduced curve coefficient owners');
    const n = relation.ring.degree(ctx, relation); demand(n > 0 && scalar.equal(ctx, relation.ring.leading(ctx, relation), scalar.fromInteger(ctx, 1n)), 'invalid-input', 'reduced curve monic relation');
    this.constants = constants; this.scalar = scalar; this.relation = relation; this.dimension = n; this.characteristic = constants.characteristic; ctx.allocate(7); algebras.add(this); Object.freeze(this);
  }
  assert(ctx: ExecutionContext, a: ReducedCurveValue<E>): void { ctx.tick(); demand(algebras.has(this) && a !== null && typeof a === 'object' && this.#values.has(a), 'domain-mismatch', 'owned reduced curve value'); for (const c of a.coefficients) this.scalar.assert(ctx, c); }
  make(ctx: ExecutionContext, coefficients: readonly PositiveFraction<E>[]): ReducedCurveValue<E> {
    const r = this.relation.ring, p = r.divide(ctx, r.make(ctx, coefficients), this.relation).remainder; ctx.allocate(2 + this.dimension);
    const value = Object.freeze({algebra: this, coefficients: Object.freeze(Array.from({length: this.dimension}, (_, i) => p.coefficients[i] ?? this.scalar.fromInteger(ctx, 0n)))}); this.#values.add(value); return value;
  }
  fromScalar(ctx: ExecutionContext, value: PositiveFraction<E>) { return this.make(ctx, [value]); }
  fromInteger(ctx: ExecutionContext, n: bigint) { return this.fromScalar(ctx, this.scalar.fromInteger(ctx, n)); }
  generator(ctx: ExecutionContext) { return this.make(ctx, [this.scalar.fromInteger(ctx, 0n), this.scalar.fromInteger(ctx, 1n)]); }
  equal(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { this.assert(ctx, a); this.assert(ctx, b); return a.coefficients.every((v, i) => this.scalar.equal(ctx, v, b.coefficients[i])); }
  isZero(ctx: ExecutionContext, a: ReducedCurveValue<E>) { this.assert(ctx, a); return a.coefficients.every(v => this.scalar.isZero(ctx, v)); }
  add(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { this.assert(ctx, a); this.assert(ctx, b); return this.make(ctx, a.coefficients.map((v, i) => this.scalar.add(ctx, v, b.coefficients[i]))); }
  negate(ctx: ExecutionContext, a: ReducedCurveValue<E>) { this.assert(ctx, a); return this.make(ctx, a.coefficients.map(v => this.scalar.negate(ctx, v))); }
  subtract(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { return this.add(ctx, a, this.negate(ctx, b)); }
  multiply(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { this.assert(ctx, a); this.assert(ctx, b); const r = this.relation.ring; return this.make(ctx, r.multiply(ctx, r.make(ctx, a.coefficients), r.make(ctx, b.coefficients)).coefficients); }
}
export interface ReducedCurveOrder<E> { readonly infinity: boolean; readonly lattice: PositiveLattice<E>; readonly multiplication: readonly ExactMatrix<PositivePolynomial<E>>[];
  readonly traces: readonly PositivePolynomial<E>[]; readonly gram: ExactMatrix<PositiveFraction<E>>; readonly traceInverse: MatrixInverse<PositiveFraction<E>>; readonly discriminant: PositivePolynomial<E> }
export function reducedOrderNative<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, order: ReducedCurveOrder<E>, vector: readonly PositiveFraction<E>[]) {
  return algebra.make(ctx, vector.map(v => order.infinity ? reciprocalPositiveFraction(ctx, algebra.scalar, v) : v));
}
export function reducedOrderCoordinates<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, order: ReducedCurveOrder<E>, value: ReducedCurveValue<E>) {
  algebra.assert(ctx, value); return positiveLatticeCoordinates(ctx, order.lattice, value.coefficients.map(v => order.infinity ? reciprocalPositiveFraction(ctx, order.lattice.field, v) : v));
}
function trace<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, value: ReducedCurveValue<E>) {
  const f = algebra.scalar, n = algebra.dimension; let result = f.fromInteger(ctx, 0n);
  for (let j = 0; j < n; j++) { const unit = Array<PositiveFraction<E>>(n).fill(f.fromInteger(ctx, 0n)); ctx.allocate(n); unit[j] = f.fromInteger(ctx, 1n); result = f.add(ctx, result, algebra.multiply(ctx, value, algebra.make(ctx, unit)).coefficients[j]); } return result;
}
function orderTables<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, infinity: boolean, lattice: PositiveLattice<E>) {
  const partial = {infinity, lattice} as ReducedCurveOrder<E>, f = lattice.field, r = f.ring, n = algebra.dimension;
  const native = lattice.basis.map(row => reducedOrderNative(ctx, algebra, partial, row));
  const polynomial = (v: PositiveFraction<E>) => { demand(r.degree(ctx, v.denominator) === 0, 'verification-failed', 'reduced order integrality'); return v.numerator; };
  const multiplication = Object.freeze(native.map(a => {
    const columns = native.map(b => reducedOrderCoordinates(ctx, algebra, partial, algebra.multiply(ctx, a, b))); return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => columns.map(column => polynomial(column[i]))));
  }));
  const convert = (v: PositiveFraction<E>) => infinity ? reciprocalPositiveFraction(ctx, f, v) : v;
  const traces = Object.freeze(native.map(v => polynomial(convert(trace(ctx, algebra, v)))));
  const gram = freezeExactMatrix(ctx, native.map(a => native.map(b => convert(trace(ctx, algebra, algebra.multiply(ctx, a, b))))));
  return {multiplication, traces, gram};
}
export function constructReducedCurveOrder<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, infinity: boolean, lattice: PositiveLattice<E>): ReducedCurveOrder<E> {
  const tables = orderTables(ctx, algebra, infinity, lattice), traceInverse = invertArithmeticMatrix(ctx, lattice.field, tables.gram);
  requireGoodReduction(traceInverse !== null, 'reduced generic separability'); const discriminant = determinantArithmeticInverse(ctx, lattice.field, traceInverse);
  demand(lattice.field.ring.degree(ctx, discriminant.denominator) === 0, 'verification-failed', 'reduced order discriminant');
  const proof = Object.freeze({infinity, lattice, ...tables, traceInverse, discriminant: discriminant.numerator}); verifyReducedCurveOrder(ctx, algebra, infinity, lattice.input, proof); return proof;
}
export function verifyReducedCurveOrder<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, infinity: boolean, input: ExactMatrix<PositiveFraction<E>>, proof: ReducedCurveOrder<E>): void {
  demand(proof.infinity === infinity && proof.lattice.field.ring.field === algebra.constants && (!infinity ? proof.lattice.field === algebra.scalar : true), 'domain-mismatch', 'reduced curve order chart');
  verifyPositiveLattice(ctx, proof.lattice.field, input, algebra.dimension, proof.lattice); const expected = orderTables(ctx, algebra, infinity, proof.lattice), f = proof.lattice.field, r = f.ring;
  const one = reducedOrderCoordinates(ctx, algebra, proof, algebra.fromInteger(ctx, 1n)); demand(one.every(v => r.degree(ctx, v.denominator) === 0), 'verification-failed', 'reduced order contains one');
  demand(proof.multiplication.length === expected.multiplication.length && proof.multiplication.every((m, i) => equalExactMatrices(ctx, {equal:(c,a,b)=>r.equal(c,a,b)}, m, expected.multiplication[i]))
    && proof.traces.length === expected.traces.length && proof.traces.every((v, i) => r.equal(ctx, v, expected.traces[i])) && equalExactMatrices(ctx, f, proof.gram, expected.gram), 'verification-failed', 'complete reduced order tables');
  verifyArithmeticMatrixInverse(ctx, f, expected.gram, proof.traceInverse); const d = determinantArithmeticInverse(ctx, f, proof.traceInverse);
  demand(r.degree(ctx, d.denominator) === 0 && r.equal(ctx, d.numerator, proof.discriminant), 'verification-failed', 'reduced trace discriminant');
}
/** Registered by the good-reduction verifier after normality, proper gluing
 * and complete L(0) prove the generic algebra is a geometrically integral field. */
const fieldKey = Symbol('verified-reduced-curve');
const fieldOwners=new WeakSet<object>();
export function isReducedCurveField(value:unknown):value is ReducedCurveField<unknown>{return value!==null&&typeof value==='object'&&fieldOwners.has(value);}
export class ReducedCurveField<E> implements PositiveField<ReducedCurveValue<E>> {
  readonly identity = Symbol('reduced-curve-field'); readonly capability = 'field' as const; readonly characteristic: bigint; readonly algebra: ReducedCurveAlgebra<E>;
  private constructor(key: symbol, algebra: ReducedCurveAlgebra<E>) { demand(key === fieldKey, 'domain-mismatch', 'reduced field authority'); this.algebra = algebra; this.characteristic = algebra.characteristic;fieldOwners.add(this); Object.freeze(this); }
  static fromEvidence<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, evidence: ReducedCurveModel<E>) {
    immutablePositiveEvidence(ctx, evidence);
    verifyReducedCurveModel(ctx, algebra, evidence); ctx.allocate(3); return new ReducedCurveField(fieldKey, algebra);
  }
  assert(ctx: ExecutionContext, a: ReducedCurveValue<E>) { this.algebra.assert(ctx, a); }
  fromInteger(ctx: ExecutionContext, n: bigint) { return this.algebra.fromInteger(ctx, n); }
  add(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { return this.algebra.add(ctx, a, b); }
  subtract(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { return this.algebra.subtract(ctx, a, b); }
  negate(ctx: ExecutionContext, a: ReducedCurveValue<E>) { return this.algebra.negate(ctx, a); }
  multiply(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { return this.algebra.multiply(ctx, a, b); }
  equal(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { return this.algebra.equal(ctx, a, b); }
  isZero(ctx: ExecutionContext, a: ReducedCurveValue<E>) { return this.algebra.isZero(ctx, a); }
  inverse(ctx: ExecutionContext, a: ReducedCurveValue<E>) {
    this.assert(ctx, a); demand(!this.isZero(ctx, a), 'division-by-zero', 'reduced curve inverse'); const f = this.algebra.scalar, n = this.algebra.dimension;
    const columns = Array.from({length: n}, (_, j) => { const row = Array<PositiveFraction<E>>(n).fill(f.fromInteger(ctx, 0n)); row[j] = f.fromInteger(ctx, 1n); return this.multiply(ctx, a, this.algebra.make(ctx, row)).coefficients; });
    const inverse = invertArithmeticMatrix(ctx, f, transposeExactMatrix(ctx, columns, n)); demand(inverse !== null, 'verification-failed', 'verified reduced field inverse');
    const value = this.algebra.make(ctx, inverse.inverse.map(row => row[0])); demand(this.equal(ctx, this.multiply(ctx, a, value), this.fromInteger(ctx, 1n)), 'verification-failed', 'reduced inverse identity'); return value;
  }
  exactDivide(ctx: ExecutionContext, a: ReducedCurveValue<E>, b: ReducedCurveValue<E>) { return this.multiply(ctx, a, this.inverse(ctx, b)); }
}
export interface ReducedCurveView<E> { readonly algebra: ReducedCurveAlgebra<E>; readonly field: ReducedCurveField<E>; readonly finite: ReducedCurveOrder<E>; readonly infinity: ReducedCurveOrder<E>; readonly genus: bigint }
import { verifyReducedCurveModel, type ReducedCurveModel } from './reduced-model';
