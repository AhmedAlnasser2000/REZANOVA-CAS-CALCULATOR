import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { integerGcd } from './rational';
import { numberFieldCoordinatesWithin } from './number-field-coordinates';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { freezeExactMatrix } from './algebraic-matrix';
import { constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import { verifyAlgebraicResidueSplittingWithin, type AlgebraicResidueSplitting, type AlgebraicResidueSplittingData } from './algebraic-residue-splitting';
import type { NumberValue } from './relative-number-field';

export interface AlgebraicResidueRelationsData<E, S extends AlgebraicResidueSplittingData<E> = AlgebraicResidueSplittingData<E>> {
  readonly splitting: S;
  readonly system: LinearSystem<Rational>;
  readonly elimination: LinearSolution<Rational>;
  readonly basisIndices: readonly number[];
  readonly basis: readonly NumberValue[];
  readonly coordinateEliminations: readonly LinearSolution<Rational>[];
  readonly coordinates: readonly (readonly Rational[])[];
  readonly denominator: bigint;
  readonly divisors: readonly AlgebraicDivisor<unknown>[];
}
function request<E>(ctx: ExecutionContext, split: AlgebraicResidueSplittingData<E>, indices: readonly number[] | null, index: number | null, bounds: DifferentialBounds): LinearSystem<Rational> {
  const c = numberFieldCoordinatesWithin(ctx, split.splitting.target, bounds), columns = indices === null ? split.values : indices.map(i => {
    demand(Number.isSafeInteger(i) && i >= 0 && i < split.values.length, 'verification-failed', 'residue basis ordered index'); return split.values[i];
  });
  demand(Number.isSafeInteger(c.basis.length * columns.length), 'invalid-input', 'residue rational system dimensions'); ctx.allocate(c.basis.length * columns.length + columns.length);
  const vectors = columns.map(v => c.coordinates(ctx, v)), rhs = index === null ? c.basis.map(() => Q.fromInteger(ctx, 0n)) : c.coordinates(ctx, split.values[index]);
  return Object.freeze({rows: c.basis.length, columns: columns.length, matrix: freezeExactMatrix(ctx, Array.from({length: c.basis.length}, (_, i) => vectors.map(v => v[i]))), rhs: Object.freeze([...rhs])});
}
function sameSystem(ctx: ExecutionContext, actual: LinearSystem<Rational>, expected: LinearSystem<Rational>) {
  demand(actual.rows === expected.rows && actual.columns === expected.columns && actual.matrix.length === expected.rows && actual.rhs.length === expected.rows, 'verification-failed', 'complete rational residue system dimensions');
  for (let i = 0; i < expected.rows; i++) demand(actual.matrix[i].length === expected.columns && actual.matrix[i].every((v, j) => Q.equal(ctx, v, expected.matrix[i][j])) && Q.equal(ctx, actual.rhs[i], expected.rhs[i]), 'verification-failed', 'residue system full rational coefficient comparison');
}
function denominator(ctx: ExecutionContext, coordinates: readonly (readonly Rational[])[]) {
  let out = 1n; for (const row of coordinates) for (const q of row) { Q.assert(ctx, q); out = ctx.multiply(ctx.quotient(out, integerGcd(ctx, out, q.denominator)), q.denominator); } return out;
}
function entries<E>(ctx: ExecutionContext, proof: Pick<AlgebraicResidueRelationsData<E>, 'splitting' | 'coordinates' | 'denominator'>, index: number) {
  const m = proof.denominator; return Object.freeze(proof.splitting.residues.entries.map((p, i) => {
    const q = proof.coordinates[i][index]; Q.assert(ctx, q); demand(ctx.remainder(m, q.denominator) === 0n, 'verification-failed', 'residue common denominator exactness');
    return Object.freeze({place: p.place, coefficient: ctx.multiply(ctx.quotient(m, q.denominator), q.numerator)});
  }));
}
export function verifyAlgebraicResidueRelationsDataWithin<E, S extends AlgebraicResidueSplittingData<E>>(ctx: ExecutionContext, split: S, proof: AlgebraicResidueRelationsData<E, S>, bounds: DifferentialBounds, verifySplit: () => void): void {
  demand(proof.splitting === split, 'domain-mismatch', 'residue relations complete expected splitting'); verifySplit();
  const system = request(ctx, split, null, null, bounds); sameSystem(ctx, proof.system, system); verifyLinearSolution(ctx, Q, system, proof.elimination);
  demand(proof.elimination.kind === 'consistent' && proof.basisIndices.length === proof.elimination.rank && proof.basisIndices.every((v, i) => v === proof.elimination.pivots[i])
    && proof.basis.length === proof.basisIndices.length && proof.divisors.length === proof.basis.length && proof.coordinateEliminations.length === split.values.length && proof.coordinates.length === split.values.length, 'verification-failed', 'complete rational residue rank/basis/coverage');
  const L = split.splitting.target;
  for (let i = 0; i < proof.basis.length; i++) demand(L.equal(ctx, proof.basis[i], split.values[proof.basisIndices[i]]), 'verification-failed', 'residue basis preserves the actual rationally independent values');
  for (let i = 0; i < split.values.length; i++) {
    const e = proof.coordinateEliminations[i]; verifyLinearSolution(ctx, Q, request(ctx, split, proof.basisIndices, i, bounds), e);
    demand(e.kind === 'consistent' && e.nullspace.length === 0 && proof.coordinates[i].length === proof.basis.length && proof.coordinates[i].every((v, j) => Q.equal(ctx, v, e.particular[j])), 'verification-failed', 'complete rational residue coordinates');
    let value = L.fromInteger(ctx, 0n); for (let j = 0; j < proof.basis.length; j++) value = L.add(ctx, value, L.multiply(ctx, L.embed(ctx, proof.coordinates[i][j]), proof.basis[j]));
    demand(L.equal(ctx, value, split.values[i]), 'verification-failed', 'residue native reconstruction over Q');
  }
  ctx.integer(proof.denominator); demand(proof.denominator > 0n && proof.denominator === denominator(ctx, proof.coordinates), 'verification-failed', 'complete canonical positive residue denominator');
  for (let i = 0; i < proof.divisors.length; i++) {
    verifyAlgebraicDivisorWithin(ctx, split.curve, entries(ctx, proof, i), proof.divisors[i]); demand(proof.divisors[i].degree === 0n, 'verification-failed', 'residue-weighted degree-zero combined divisor');
  }
  // Rank over Q, not over the actual number-field constants, is essential:
  // logarithmic valuations are integers and Liouville uses rational relations.
}
export function combineAlgebraicResidueDataWithin<E, S extends AlgebraicResidueSplittingData<E>>(ctx: ExecutionContext, split: S, bounds: DifferentialBounds, verifySplit: () => void): AlgebraicResidueRelationsData<E, S> {
  verifySplit(); const system = request(ctx, split, null, null, bounds), elimination = solveLinearSystem(ctx, Q, system);
  demand(elimination.kind === 'consistent', 'verification-failed', 'homogeneous rational residue relation system'); const basisIndices = Object.freeze([...elimination.pivots]), basis = Object.freeze(basisIndices.map(i => split.values[i]));
  ctx.allocate(split.values.length * 2); const coordinateEliminations = Object.freeze(split.values.map((_, i) => solveLinearSystem(ctx, Q, request(ctx, split, basisIndices, i, bounds)))), coordinates = Object.freeze(coordinateEliminations.map(e => {
    demand(e.kind === 'consistent' && e.nullspace.length === 0, 'verification-failed', 'complete rational residue span'); return e.particular;
  })), m = denominator(ctx, coordinates), common = {splitting: split, system, elimination, basisIndices, basis, coordinateEliminations, coordinates, denominator: m}, divisors = Object.freeze(basis.map((_, i) => constructAlgebraicDivisorWithin(ctx, split.curve, entries(ctx, common, i))));
  const proof = Object.freeze({...common, divisors}); verifyAlgebraicResidueRelationsDataWithin(ctx, split, proof, bounds, verifySplit); return proof;
}

export type AlgebraicResidueRelations<E> = AlgebraicResidueRelationsData<E, AlgebraicResidueSplitting<E>>;
export function verifyAlgebraicResidueRelationsWithin<E>(ctx: ExecutionContext, split: AlgebraicResidueSplitting<E>, proof: AlgebraicResidueRelations<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicResidueRelationsDataWithin(ctx, split, proof, bounds, () => verifyAlgebraicResidueSplittingWithin(ctx, split.source, split.input, split.original, split, bounds));
}
export function combineAlgebraicResiduesWithin<E>(ctx: ExecutionContext, split: AlgebraicResidueSplitting<E>, bounds: DifferentialBounds): AlgebraicResidueRelations<E> {
  return combineAlgebraicResidueDataWithin(ctx, split, bounds, () => verifyAlgebraicResidueSplittingWithin(ctx, split.source, split.input, split.original, split, bounds));
}
