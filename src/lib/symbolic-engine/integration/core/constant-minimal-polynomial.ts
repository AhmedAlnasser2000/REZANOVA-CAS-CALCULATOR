import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import type { DifferentialBounds } from './differential-field';
import type { AlgebraicField } from './algebraic-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { numberFieldCoordinatesWithin } from './number-field-coordinates';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { transposeExactMatrix } from './algebraic-matrix';
import type { NumberValue } from './relative-number-field';

export interface ConstantMinimalPolynomial<E> {
  readonly input: E;
  readonly powers: readonly E[];
  readonly eliminations: readonly LinearSolution<Rational>[];
  readonly polynomial: Polynomial<NumberValue>;
}
function request<E>(ctx: ExecutionContext, source: AlgebraicField<Rational>, owner: ExactField<E>, powers: readonly E[], index: number, bounds: DifferentialBounds): LinearSystem<Rational> {
  const c = numberFieldCoordinatesWithin(ctx, owner, bounds), embedding = AlgebraicEmbedding.ancestor(ctx, source, owner, bounds), d = source.ring.degree(ctx, source.modulus), columns: (readonly Rational[])[] = [];
  demand(Number.isSafeInteger(index * d), 'invalid-input', 'constant minimal-polynomial dimensions'); ctx.allocate(index * d);
  for (let i = 0; i < index; i++) {
    let scalar = source.fromInteger(ctx, 1n);
    for (let j = 0; j < d; j++) { columns.push(c.coordinates(ctx, owner.multiply(ctx, powers[i], embedding.map(ctx, scalar)))); scalar = source.multiply(ctx, scalar, source.generator(ctx)); }
  }
  return Object.freeze({rows: c.basis.length, columns: index * d, matrix: transposeExactMatrix(ctx, columns, c.basis.length), rhs: c.coordinates(ctx, powers[index])});
}
function coefficients(ctx: ExecutionContext, source: AlgebraicField<Rational>, result: LinearSolution<Rational>) {
  demand(result.kind === 'consistent', 'verification-failed', 'minimal polynomial complete final relation'); const d = source.ring.degree(ctx, source.modulus);
  ctx.allocate(result.particular.length / d);
  return Object.freeze(Array.from({length: result.particular.length / d}, (_, i) => source.negate(ctx, source.make(ctx, source.ring.make(ctx, result.particular.slice(i * d, (i + 1) * d))))));
}
export function verifyConstantMinimalPolynomialWithin<E>(ctx: ExecutionContext, source: AlgebraicField<Rational>, owner: ExactField<E>, input: E, proof: ConstantMinimalPolynomial<E>, bounds: DifferentialBounds): void {
  const c = numberFieldCoordinatesWithin(ctx, owner, bounds), degree = proof.polynomial.ring.degree(ctx, proof.polynomial), d = source.ring.degree(ctx, source.modulus);
  demand(c.basis.length % d === 0 && degree > 0 && degree <= c.basis.length / d && proof.polynomial.ring.domain === source && proof.powers.length === degree + 1 && proof.eliminations.length === degree && owner.equal(ctx, input, proof.input), 'verification-failed', 'constant minimal polynomial complete coverage');
  let power = owner.fromInteger(ctx, 1n);
  for (let i = 0; i <= degree; i++) { demand(owner.equal(ctx, power, proof.powers[i]), 'verification-failed', 'constant minimal polynomial exact powers'); power = owner.multiply(ctx, power, input); }
  for (let i = 1; i <= degree; i++) {
    const r = request(ctx, source, owner, proof.powers, i, bounds), e = proof.eliminations[i - 1]; verifyLinearSolution(ctx, Q, r, e);
    demand(i === degree ? e.kind === 'consistent' && e.nullspace.length === 0 : e.kind === 'inconsistent', 'verification-failed', 'constant minimal polynomial first dependence');
  }
  const expected = proof.polynomial.ring.make(ctx, [...coefficients(ctx, source, proof.eliminations[degree - 1]), source.fromInteger(ctx, 1n)]);
  demand(proof.polynomial.ring.equal(ctx, proof.polynomial, expected), 'verification-failed', 'constant minimal polynomial exact coefficient mapping');
  // Full Q-coefficient comparison is equivalent to C-linear comparison via the
  // checked ancestor embedding. The first dependence is the minimal relation;
  // the owned target is a field, hence this relation is irreducible over C.
}
export function constantMinimalPolynomialWithin<E>(ctx: ExecutionContext, source: AlgebraicField<Rational>, owner: ExactField<E>, input: E, bounds: DifferentialBounds): ConstantMinimalPolynomial<E> {
  const c = numberFieldCoordinatesWithin(ctx, owner, bounds), d = source.ring.degree(ctx, source.modulus);
  demand(c.basis.length % d === 0, 'verification-failed', 'constant relative degree quotient'); owner.assert(ctx, input);
  const powers = [owner.fromInteger(ctx, 1n)], eliminations: LinearSolution<Rational>[] = [];
  for (let i = 1; i <= c.basis.length / d; i++) {
    ctx.allocate(2); powers.push(owner.multiply(ctx, powers[i - 1], input)); const solution = solveLinearSystem(ctx, Q, request(ctx, source, owner, powers, i, bounds)); eliminations.push(solution);
    if (solution.kind === 'inconsistent') continue;
    const ring = new PolynomialRing(source, 'residue'), polynomial = ring.make(ctx, [...coefficients(ctx, source, solution), source.fromInteger(ctx, 1n)]), proof = Object.freeze({input, powers: Object.freeze(powers), eliminations: Object.freeze(eliminations), polynomial});
    verifyConstantMinimalPolynomialWithin(ctx, source, owner, input, proof, bounds); return proof;
  }
  demand(false, 'verification-failed', 'finite constant extension lacks its complete minimal relation');
}
