import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import type { AlgebraicCurveView } from './algebraic-curve';
import { verifyAlgebraicConstantBaseChangeWithin, type AlgebraicConstantBaseChange, type ConstantBaseChangeValue } from './algebraic-curve-base-change';
import { verifyRelativeNumberFieldWithin, relativeNumberFieldCoordinates, type RelativeNumberField, type NumberValue } from './relative-number-field';
import type { CurveScalar } from './algebraic-curve-coordinates';
import { SquareFreeQuotientAlgebra, type UnitAnalysis } from './quotient-algebra';

export interface AlgebraicConstantQuotient<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly change: AlgebraicConstantBaseChange<E>;
  readonly relative: RelativeNumberField;
  readonly scalarAlgebra: SquareFreeQuotientAlgebra<CurveScalar>;
  readonly algebra: SquareFreeQuotientAlgebra<E>;
}
const quotients = new WeakSet<object>();
export function assertAlgebraicConstantQuotient<E>(ctx: ExecutionContext, proof: AlgebraicConstantQuotient<E>): void {
  ctx.tick(); demand(quotients.has(proof), 'domain-mismatch', 'owned algebraic constant quotient');
}
export function reconstructAlgebraicConstantQuotientWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, change: AlgebraicConstantBaseChange<E>, relative: RelativeNumberField, bounds: DifferentialBounds): AlgebraicConstantQuotient<E> {
  verifyRelativeNumberFieldWithin(ctx, relative, bounds);
  demand(relative.source === curve.coordinates.constantOwner && relative.target === change.constants && change.source === curve,
    'domain-mismatch', 'constant quotient complete source/target binding');
  demand(relative.target.equal(ctx, relative.embedding.map(ctx, relative.source.generator(ctx)), change.embedding.map(ctx, relative.source.generator(ctx))), 'domain-mismatch', 'constant quotient original constant embedding');
  verifyAlgebraicConstantBaseChangeWithin(ctx, curve, change.constants, change.embedding, change, bounds);
  const scalar = curve.coordinates.scalar, sr = new PolynomialRing(scalar, 'constant'), r = new PolynomialRing(curve.owner, 'constant');
  const coefficients = relative.relation.coefficients.map(c => scalar.fromCoefficient(ctx, c));
  const scalarAlgebra = new SquareFreeQuotientAlgebra(ctx, sr, sr.make(ctx, coefficients)), algebra = new SquareFreeQuotientAlgebra(ctx, r, r.make(ctx, coefficients.map(c => curve.coordinates.scalarNative(ctx, c))));
  ctx.allocate(6); const result = Object.freeze({curve, change, relative, scalarAlgebra, algebra}); quotients.add(result); return result;
}
export function verifyAlgebraicConstantQuotientWithin<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, bounds: DifferentialBounds): void {
  assertAlgebraicConstantQuotient(ctx, q); const {curve, change, relative} = q;
  verifyRelativeNumberFieldWithin(ctx, relative, bounds);
  demand(change.source === curve && relative.source === curve.coordinates.constantOwner && relative.target === change.constants
    && relative.target.equal(ctx, relative.embedding.map(ctx, relative.source.generator(ctx)), change.embedding.map(ctx, relative.source.generator(ctx))), 'domain-mismatch', 'constant quotient original complete constructions');
  verifyAlgebraicConstantBaseChangeWithin(ctx, curve, change.constants, change.embedding, change, bounds);
  demand(q.scalarAlgebra.ring.domain === curve.coordinates.scalar && q.algebra.ring.domain === curve.owner, 'domain-mismatch', 'constant quotient separate coefficient owners');
  const coefficients = relative.relation.coefficients.map(c => curve.coordinates.scalar.fromCoefficient(ctx, c));
  demand(q.scalarAlgebra.ring.equal(ctx, q.scalarAlgebra.modulus, q.scalarAlgebra.ring.make(ctx, coefficients))
    && q.algebra.ring.equal(ctx, q.algebra.modulus, q.algebra.ring.make(ctx, coefficients.map(c => curve.coordinates.scalarNative(ctx, c)))), 'verification-failed', 'constant quotient full relative modulus binding');
}
export function constantQuotientWeight<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, weight: NumberValue): Polynomial<E> {
  assertAlgebraicConstantQuotient(ctx, q); const c = relativeNumberFieldCoordinates(ctx, q.relative, weight);
  return q.algebra.ring.make(ctx, c.map(v => q.curve.coordinates.scalarNative(ctx, q.curve.coordinates.scalar.fromCoefficient(ctx, v))));
}
function scalarImage<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: CurveScalar): CurveScalar {
  const source = q.curve.coordinates.scalar, target = q.change.coordinates.scalar; source.assert(ctx, input);
  const convert = (p: typeof input.numerator) => target.ring.make(ctx, p.coefficients.map(c => q.change.embedding.map(ctx, c)));
  return target.make(ctx, convert(input.numerator), convert(input.denominator));
}
export function mapAlgebraicConstantBaseChangeValue<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: E): ConstantBaseChangeValue {
  assertAlgebraicConstantQuotient(ctx, q); const values = q.curve.coordinates.coordinates(ctx, input);
  demand(q.change.basisImages.length === q.change.coordinates.basis.length && q.change.basisImages.every((v, i) => q.change.field.equal(ctx, v, q.change.coordinates.basis[i])), 'verification-failed', 'constant base change exact source basis images');
  return q.change.coordinates.native(ctx, values.map(v => scalarImage(ctx, q, v)));
}
function scalarFromCoordinates<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, values: readonly CurveScalar[]): CurveScalar {
  const target = q.change.coordinates.scalar; let out = target.fromInteger(ctx, 0n), power = q.relative.target.fromInteger(ctx, 1n);
  for (const value of values) {
    out = target.add(ctx, out, target.multiply(ctx, scalarImage(ctx, q, value), target.fromCoefficient(ctx, power)));
    power = q.relative.target.multiply(ctx, power, q.relative.target.generator(ctx));
  }
  return out;
}
function scalarPolynomial<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: Polynomial<NumberValue>): Polynomial<CurveScalar> {
  const target = q.change.coordinates.scalar, source = q.curve.coordinates.scalar, d = q.relative.degree;
  target.ring.assert(ctx, input); demand(Number.isSafeInteger(d * input.coefficients.length), 'invalid-input', 'relative scalar coefficient dimensions'); ctx.allocate(d * input.coefficients.length);
  const vectors = input.coefficients.map(v => relativeNumberFieldCoordinates(ctx, q.relative, v));
  return q.scalarAlgebra.ring.make(ctx, Array.from({length: d}, (_, i) =>
    source.make(ctx, source.ring.make(ctx, vectors.map(v => v[i])), source.ring.one(ctx))));
}
export interface RelativeScalarConversion {
  readonly input: CurveScalar;
  readonly numerator: Polynomial<CurveScalar>;
  readonly denominator: Polynomial<CurveScalar>;
  readonly inverse: UnitAnalysis<CurveScalar>;
  readonly coefficients: readonly CurveScalar[];
}
export function verifyRelativeScalarConversion<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: CurveScalar, proof: RelativeScalarConversion): void {
  assertAlgebraicConstantQuotient(ctx, q); const target = q.change.coordinates.scalar, algebra = q.scalarAlgebra, r = algebra.ring, source = q.curve.coordinates.scalar;
  target.assert(ctx, input); demand(target.equal(ctx, input, proof.input), 'verification-failed', 'relative scalar exact input');
  demand(r.equal(ctx, proof.numerator, scalarPolynomial(ctx, q, input.numerator)) && r.equal(ctx, proof.denominator, scalarPolynomial(ctx, q, input.denominator)), 'verification-failed', 'relative scalar numerator/denominator coordinates');
  demand(proof.inverse.kind === 'unit', 'verification-failed', 'relative scalar complete denominator inverse'); algebra.verifyUnit(ctx, algebra.make(ctx, proof.denominator), proof.inverse);
  const product = algebra.multiply(ctx, algebra.make(ctx, proof.numerator), proof.inverse.inverse), expected = Array.from({length: q.relative.degree}, (_, i) => product.representative.coefficients[i] ?? source.fromInteger(ctx, 0n));
  demand(proof.coefficients.length === expected.length && expected.every((v, i) => source.equal(ctx, v, proof.coefficients[i]))
    && target.equal(ctx, input, scalarFromCoordinates(ctx, q, proof.coefficients)), 'verification-failed', 'relative scalar complete inverse reconstruction');
}
export function convertRelativeScalar<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: CurveScalar): RelativeScalarConversion {
  assertAlgebraicConstantQuotient(ctx, q); q.change.coordinates.scalar.assert(ctx, input);
  const numerator = scalarPolynomial(ctx, q, input.numerator), denominator = scalarPolynomial(ctx, q, input.denominator), algebra = q.scalarAlgebra, inverse = algebra.analyzeUnit(ctx, algebra.make(ctx, denominator));
  demand(inverse.kind === 'unit', 'verification-failed', 'nonzero relative scalar denominator'); const product = algebra.multiply(ctx, algebra.make(ctx, numerator), inverse.inverse);
  ctx.allocate(q.relative.degree + 5); const coefficients = Object.freeze(Array.from({length: q.relative.degree}, (_, i) => product.representative.coefficients[i] ?? q.curve.coordinates.scalar.fromInteger(ctx, 0n))), proof = Object.freeze({input, numerator, denominator, inverse, coefficients});
  verifyRelativeScalarConversion(ctx, q, input, proof); return proof;
}
export interface AlgebraicConstantValueConversion<E> {
  readonly input: ConstantBaseChangeValue;
  readonly scalars: readonly RelativeScalarConversion[];
  readonly polynomial: Polynomial<E>;
}
export function constantQuotientValue<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, polynomial: Polynomial<E>): ConstantBaseChangeValue {
  assertAlgebraicConstantQuotient(ctx, q); q.algebra.ring.assert(ctx, polynomial);
  const f = q.change.field, beta = q.change.coordinates.scalarNative(ctx, q.change.coordinates.scalar.fromCoefficient(ctx, q.relative.target.generator(ctx)));
  let out = f.fromInteger(ctx, 0n);
  for (let i = polynomial.coefficients.length - 1; i >= 0; i--) out = f.add(ctx, f.multiply(ctx, out, beta), mapAlgebraicConstantBaseChangeValue(ctx, q, polynomial.coefficients[i]));
  return out;
}
export function verifyAlgebraicConstantValueConversion<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: ConstantBaseChangeValue, proof: AlgebraicConstantValueConversion<E>): void {
  assertAlgebraicConstantQuotient(ctx, q); const f = q.change.field, source = q.curve, values = q.change.coordinates.coordinates(ctx, input), r = q.algebra.ring;
  demand(f.equal(ctx, input, proof.input) && proof.scalars.length === values.length && r.degree(ctx, proof.polynomial) < q.relative.degree, 'verification-failed', 'relative native conversion complete input/coverage');
  for (let i = 0; i < values.length; i++) verifyRelativeScalarConversion(ctx, q, values[i], proof.scalars[i]);
  const coefficients = Array.from({length: q.relative.degree}, (_, i) => source.coordinates.native(ctx, proof.scalars.map(v => v.coefficients[i])));
  demand(r.equal(ctx, proof.polynomial, r.make(ctx, coefficients)) && f.equal(ctx, input, constantQuotientValue(ctx, q, proof.polynomial)), 'verification-failed', 'relative native conversion both directions');
}
export function convertAlgebraicConstantValue<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, input: ConstantBaseChangeValue): AlgebraicConstantValueConversion<E> {
  assertAlgebraicConstantQuotient(ctx, q); const values = q.change.coordinates.coordinates(ctx, input); ctx.allocate(values.length + q.relative.degree);
  const scalars = Object.freeze(values.map(v => convertRelativeScalar(ctx, q, v))), polynomial = q.algebra.ring.make(ctx, Array.from({length: q.relative.degree}, (_, i) => q.curve.coordinates.native(ctx, scalars.map(v => v.coefficients[i]))));
  const proof = Object.freeze({input, scalars, polynomial}); verifyAlgebraicConstantValueConversion(ctx, q, input, proof); return proof;
}
