import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension, type AlgebraicField, type AlgebraicElement } from './algebraic-field';
import { AlgebraicEmbedding, assertAlgebraicEmbedding } from './algebraic-embedding';
import { numberFieldCoordinatesWithin, type NumberFieldCoordinates } from './number-field-coordinates';
import { invertExactMatrix, verifyExactMatrixInverse, transposeExactMatrix, type MatrixInverse } from './algebraic-matrix';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';

export interface NumberFieldPresentation<E> {
  readonly combination: readonly bigint[];
  readonly primitive: E;
  readonly powers: readonly E[];
  readonly inverse: MatrixInverse<Rational>;
  readonly field: AlgebraicField<Rational>;
  readonly embedding: AlgebraicEmbedding<AlgebraicElement<Rational>, E>;
}
function polynomialCoordinates<E>(ctx: ExecutionContext, c: NumberFieldCoordinates<E>, proof: Pick<NumberFieldPresentation<E>, 'inverse'>, value: E) {
  const vector = c.coordinates(ctx, value); ctx.allocate(vector.length);
  return Object.freeze(proof.inverse.inverse.map(row => {
    let out = Q.fromInteger(ctx, 0n); for (let i = 0; i < row.length; i++) out = Q.add(ctx, out, Q.multiply(ctx, row[i], vector[i])); return out;
  }));
}
export function numberFieldPresentationValueWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: NumberFieldPresentation<E>, value: E, bounds: DifferentialBounds): AlgebraicElement<Rational> {
  const c = numberFieldCoordinatesWithin(ctx, owner, bounds), out = proof.field.make(ctx, proof.field.ring.make(ctx, polynomialCoordinates(ctx, c, proof, value)));
  demand(owner.equal(ctx, value, proof.embedding.map(ctx, out)), 'verification-failed', 'number-field primitive inverse conversion'); return out;
}
export function verifyNumberFieldPresentationWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: NumberFieldPresentation<E>, bounds: DifferentialBounds): void {
  const c = numberFieldCoordinatesWithin(ctx, owner, bounds), n = c.basis.length;
  demand(proof.combination.length === c.generators.length && proof.powers.length === n, 'verification-failed', 'number-field presentation coverage');
  let primitive = owner.fromInteger(ctx, 0n), power = owner.fromInteger(ctx, 1n);
  for (let i = 0; i < c.generators.length; i++) { ctx.integer(proof.combination[i]); primitive = owner.add(ctx, primitive, owner.multiply(ctx, owner.fromInteger(ctx, proof.combination[i]), c.generators[i])); }
  demand(owner.equal(ctx, primitive, proof.primitive), 'verification-failed', 'number-field primitive combination');
  for (let i = 0; i < n; i++) { demand(owner.equal(ctx, power, proof.powers[i]), 'verification-failed', 'number-field power coverage'); power = owner.multiply(ctx, power, primitive); }
  const matrix = transposeExactMatrix(ctx, proof.powers.map(v => c.coordinates(ctx, v)), n);
  verifyExactMatrixInverse(ctx, Q, matrix, proof.inverse); verifyAlgebraicChainWithin(ctx, proof.field, bounds);
  demand(proof.field.parent === Q && proof.field.ring.degree(ctx, proof.field.modulus) === n, 'domain-mismatch', 'number-field absolute primitive owner');
  const next = polynomialCoordinates(ctx, c, proof, power), relation = proof.field.ring.make(ctx, [...next.map(q => Q.negate(ctx, q)), Q.fromInteger(ctx, 1n)]);
  demand(proof.field.ring.equal(ctx, relation, proof.field.modulus), 'verification-failed', 'number-field primitive defining relation');
  assertAlgebraicEmbedding(ctx, proof.embedding);
  demand(proof.embedding.source === proof.field && proof.embedding.target === owner
    && owner.equal(ctx, proof.embedding.map(ctx, proof.field.generator(ctx)), primitive), 'domain-mismatch', 'number-field primitive embedding');
  for (const b of c.basis) numberFieldPresentationValueWithin(ctx, owner, proof, b, bounds);
}
export function constructNumberFieldPresentationWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds): NumberFieldPresentation<E> {
  const c = numberFieldCoordinatesWithin(ctx, owner, bounds), n = c.basis.length;
  for (let seed = 0n;; seed = ctx.add(seed, 1n)) {
    ctx.allocate(n + c.generators.length + 8); let coefficient = 1n, primitive = owner.fromInteger(ctx, 0n); const combination: bigint[] = [];
    for (const g of c.generators) { combination.push(coefficient); primitive = owner.add(ctx, primitive, owner.multiply(ctx, owner.fromInteger(ctx, coefficient), g)); coefficient = ctx.multiply(coefficient, seed); }
    const powers: E[] = []; let power = owner.fromInteger(ctx, 1n);
    for (let i = 0; i < n; i++) { powers.push(power); power = owner.multiply(ctx, power, primitive); }
    const inverse = invertExactMatrix(ctx, Q, transposeExactMatrix(ctx, powers.map(v => c.coordinates(ctx, v)), n));
    if (inverse === null) continue;
    const ring = new PolynomialRing(Q, 'constant'), next = polynomialCoordinates(ctx, c, {inverse}, power);
    const field = constructAlgebraicExtension(ctx, ring, ring.make(ctx, [...next.map(q => Q.negate(ctx, q)), Q.fromInteger(ctx, 1n)]), bounds);
    const embedding = AlgebraicEmbedding.extension(ctx, field, owner, AlgebraicEmbedding.rationals(ctx, owner, bounds), primitive, bounds);
    const result = Object.freeze({combination: Object.freeze(combination), primitive, powers: Object.freeze(powers), inverse, field, embedding});
    verifyNumberFieldPresentationWithin(ctx, owner, result, bounds); return result;
  }
}
