import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import type { AlgebraicElement, AlgebraicField } from './algebraic-field';
import { assertAlgebraicEmbedding, type AlgebraicEmbedding } from './algebraic-embedding';
import { numberFieldCoordinatesWithin } from './number-field-coordinates';
import { invertExactMatrix, verifyExactMatrixInverse, transposeExactMatrix, type MatrixInverse } from './algebraic-matrix';

export type NumberValue = AlgebraicElement<Rational>;
/** A privately registered relative basis over an explicitly embedded C. Native
 * source/target fields remain the supplied owners; no field flag is promoted. */
export interface RelativeNumberField {
  readonly source: AlgebraicField<Rational>;
  readonly target: AlgebraicField<Rational>;
  readonly embedding: AlgebraicEmbedding<NumberValue, NumberValue>;
  readonly degree: number;
  readonly powers: readonly NumberValue[];
  readonly inverse: MatrixInverse<Rational>;
  readonly relation: Polynomial<NumberValue>;
}
const registered = new WeakSet<object>();
function basis(ctx: ExecutionContext, source: AlgebraicField<Rational>, target: AlgebraicField<Rational>, embedding: RelativeNumberField['embedding']) {
  assertAlgebraicEmbedding(ctx, embedding);
  demand(embedding.source === source && embedding.target === target, 'domain-mismatch', 'relative constant embedding');
  const a = source.ring.degree(ctx, source.modulus), b = target.ring.degree(ctx, target.modulus);
  demand(b % a === 0, 'verification-failed', 'relative constant degree quotient'); const degree = b / a;
  ctx.allocate(b + degree + a); const powers: NumberValue[] = [], expanded: NumberValue[] = []; let power = target.fromInteger(ctx, 1n);
  for (let i = 0; i < degree; i++) {
    powers.push(power); let c = source.fromInteger(ctx, 1n);
    for (let j = 0; j < a; j++) { expanded.push(target.multiply(ctx, power, embedding.map(ctx, c))); c = source.multiply(ctx, c, source.generator(ctx)); }
    power = target.multiply(ctx, power, target.generator(ctx));
  }
  return {degree, powers: Object.freeze(powers), expanded, next: power};
}
function coordinates(ctx: ExecutionContext, proof: RelativeNumberField, value: NumberValue): readonly NumberValue[] {
  proof.target.assert(ctx, value); const n = proof.target.ring.degree(ctx, proof.target.modulus), a = proof.source.ring.degree(ctx, proof.source.modulus);
  ctx.allocate(n); const vector = Array.from({length: n}, (_, i) => value.representative.coefficients[i] ?? Q.fromInteger(ctx, 0n));
  const expanded = proof.inverse.inverse.map(row => { let q = Q.fromInteger(ctx, 0n); for (let j = 0; j < n; j++) q = Q.add(ctx, q, Q.multiply(ctx, row[j], vector[j])); return q; });
  return Object.freeze(Array.from({length: proof.degree}, (_, i) => proof.source.make(ctx, proof.source.ring.make(ctx, expanded.slice(i * a, (i + 1) * a)))));
}
function native(ctx: ExecutionContext, proof: RelativeNumberField, values: readonly NumberValue[]): NumberValue {
  demand(values.length === proof.degree, 'invalid-input', 'relative constant complete coefficients'); let out = proof.target.fromInteger(ctx, 0n);
  for (let i = 0; i < values.length; i++) out = proof.target.add(ctx, out, proof.target.multiply(ctx, proof.powers[i], proof.embedding.map(ctx, values[i]))); return out;
}
export function relativeNumberFieldValue(ctx: ExecutionContext, proof: RelativeNumberField, values: readonly NumberValue[]): NumberValue {
  demand(registered.has(proof), 'domain-mismatch', 'owned relative constant basis'); return native(ctx, proof, values);
}
export function relativeNumberFieldCoordinates(ctx: ExecutionContext, proof: RelativeNumberField, value: NumberValue): readonly NumberValue[] {
  demand(registered.has(proof), 'domain-mismatch', 'owned relative constant basis'); const out = coordinates(ctx, proof, value);
  demand(proof.target.equal(ctx, value, relativeNumberFieldValue(ctx, proof, out)), 'verification-failed', 'relative constant inverse reconstruction'); return out;
}
export function verifyRelativeNumberFieldWithin(ctx: ExecutionContext, proof: RelativeNumberField, bounds: DifferentialBounds): void {
  const c = numberFieldCoordinatesWithin(ctx, proof.target, bounds); numberFieldCoordinatesWithin(ctx, proof.source, bounds);
  const b = basis(ctx, proof.source, proof.target, proof.embedding);
  demand(proof.degree === b.degree && proof.powers.length === b.powers.length && proof.powers.every((p, i) => proof.target.equal(ctx, p, b.powers[i])), 'verification-failed', 'relative constant full power coverage');
  verifyExactMatrixInverse(ctx, Q, transposeExactMatrix(ctx, b.expanded.map(v => c.coordinates(ctx, v)), c.basis.length), proof.inverse);
  const ring = proof.relation.ring; demand(ring.domain === proof.source, 'domain-mismatch', 'relative constant relation coefficients');
  const next = coordinates(ctx, proof, b.next), expected = ring.make(ctx, [...next.map(v => proof.source.negate(ctx, v)), proof.source.fromInteger(ctx, 1n)]);
  demand(ring.equal(ctx, expected, proof.relation), 'verification-failed', 'relative constant minimal relation');
  for (const v of c.basis) demand(proof.target.equal(ctx, v, native(ctx, proof, coordinates(ctx, proof, v))), 'verification-failed', 'relative constant complete basis inverse');
}
export function reconstructRelativeNumberFieldWithin(ctx: ExecutionContext, proof: RelativeNumberField, bounds: DifferentialBounds): RelativeNumberField {
  verifyRelativeNumberFieldWithin(ctx, proof, bounds); ctx.allocate(7); const result = Object.freeze({...proof, powers: Object.freeze([...proof.powers])}); registered.add(result); return result;
}
export function constructRelativeNumberFieldWithin(ctx: ExecutionContext, source: AlgebraicField<Rational>, target: AlgebraicField<Rational>, embedding: RelativeNumberField['embedding'], bounds: DifferentialBounds): RelativeNumberField {
  const c = numberFieldCoordinatesWithin(ctx, target, bounds); numberFieldCoordinatesWithin(ctx, source, bounds); const b = basis(ctx, source, target, embedding);
  const inverse = invertExactMatrix(ctx, Q, transposeExactMatrix(ctx, b.expanded.map(v => c.coordinates(ctx, v)), c.basis.length));
  demand(inverse !== null, 'verification-failed', 'relative constant full basis rank');
  const ring = new PolynomialRing(source, 'relativeConstant'), partial = {source, target, embedding, degree: b.degree, powers: b.powers, inverse, relation: ring.zero(ctx)};
  const next = coordinates(ctx, partial, b.next), relation = ring.make(ctx, [...next.map(v => source.negate(ctx, v)), source.fromInteger(ctx, 1n)]);
  return reconstructRelativeNumberFieldWithin(ctx, {...partial, relation}, bounds);
}
