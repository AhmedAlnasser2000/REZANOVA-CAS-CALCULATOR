import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import { PolynomialRing } from './polynomial';
import type { DifferentialBounds } from './differential-field';
import { constructAlgebraicExtensionWithin, isAlgebraicField, type AlgebraicElement, type AlgebraicField } from './algebraic-field';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, verifyAlgebraicChainWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { factorCoefficientDomain } from './factorization-domain';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';
import { descendCoefficientSystemWithin, verifyCoefficientSystemWithin, type RationalCoefficientSystem } from './recursive-coefficient-system';
import { algebraicCoordinates, algebraicPrimitivePresentationWithin, verifyAlgebraicPresentationWithin, presentationValue,
  type AlgebraicCoordinates, type AlgebraicPresentation, type FunctionScalar } from './algebraic-presentation';
import { algebraicIntegralModelWithin, verifyAlgebraicIntegralModelWithin, type AlgebraicIntegralModel } from './algebraic-integral-model';
import { algebraicIntegralBasisWithin, verifyAlgebraicIntegralBasisWithin, type AlgebraicIntegralBasis } from './algebraic-integral-basis';
import { algebraicConstantSpaceWithin, verifyAlgebraicConstantSpaceWithin, type AlgebraicConstantSpace } from './algebraic-constant-space';
import { freezeExactMatrix, transposeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, type MatrixInverse } from './algebraic-matrix';
import { algebraicConstructionSources, algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition, type AlgebraicConditionSource } from './algebraic-conditions';
import { reuseAlgebraicVerification } from './algebraic-proof-reuse';

export interface AlgebraicConstantRelation {
  readonly descent: RationalCoefficientSystem;
  readonly elimination: LinearSolution<Rational>;
}
export interface AlgebraicConstantField<E> {
  readonly parent: AlgebraicConstantField<unknown> | null;
  readonly presentation: AlgebraicPresentation<E>;
  readonly finite: AlgebraicIntegralModel;
  readonly infinity: AlgebraicIntegralModel;
  readonly finiteClosure: AlgebraicIntegralBasis;
  readonly infinityClosure: AlgebraicIntegralBasis;
  readonly space: AlgebraicConstantSpace;
  readonly basis: readonly E[];
  readonly derivatives: readonly AlgebraicDerivative<E>[];
  readonly combination: readonly bigint[];
  readonly primitive: E;
  readonly powers: readonly E[];
  readonly rank: LinearSolution<FunctionScalar>;
  readonly coordinates: MatrixInverse<FunctionScalar>;
  readonly relation: AlgebraicConstantRelation;
  readonly numberField: AlgebraicField<Rational>;
  readonly parentCoordinates: readonly AlgebraicElement<Rational>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function relationRequest<E>(ctx: ExecutionContext, coordinates: AlgebraicCoordinates<E>, powers: readonly E[], target: E): LinearSystem<FunctionScalar> {
  const n = coordinates.basis.length, columns = powers.length;
  const matrix = transposeExactMatrix(ctx, powers.map(p => coordinates.coordinates(ctx, p)), n);
  return Object.freeze({rows: n, columns, matrix, rhs: coordinates.coordinates(ctx, target)});
}
function homogeneousRank<E>(ctx: ExecutionContext, c: AlgebraicCoordinates<E>, powers: readonly E[]) {
  return Object.freeze({rows: powers.length, columns: c.basis.length,
    matrix: freezeExactMatrix(ctx, powers.map(p => [...c.coordinates(ctx, p)])), rhs: Object.freeze(powers.map(() => c.base.fromInteger(ctx, 0n)))});
}
function selectedMatrix<E>(ctx: ExecutionContext, c: AlgebraicCoordinates<E>, powers: readonly E[], rank: LinearSolution<FunctionScalar>) {
  demand(rank.kind === 'consistent' && rank.rank === powers.length && rank.pivots.length === powers.length, 'verification-failed', 'constant primitive full rank');
  const columns = powers.map(p => c.coordinates(ctx, p)); ctx.allocate(powers.length * powers.length);
  return freezeExactMatrix(ctx, rank.pivots.map(i => columns.map(column => column[i])));
}
function constantCoordinatesWithin<E>(ctx: ExecutionContext, c: AlgebraicCoordinates<E>, proof: Pick<AlgebraicConstantField<E>, 'numberField' | 'primitive' | 'powers' | 'rank' | 'coordinates'>, value: E, bounds: DifferentialBounds): AlgebraicElement<Rational> {
  demand(proof.rank.kind === 'consistent', 'verification-failed', 'constant coordinate rank');
  const f = c.base, vector = c.coordinates(ctx, value), selected = proof.rank.pivots.map(i => vector[i]); ctx.allocate(selected.length);
  const coefficients = proof.coordinates.inverse.map(row => {
    let out = f.fromInteger(ctx, 0n); for (let i = 0; i < row.length; i++) out = f.add(ctx, out, f.multiply(ctx, row[i], selected[i]));
    return factorCoefficientDomain(ctx, f, 1).rational(ctx, out);
  });
  const result = proof.numberField.make(ctx, proof.numberField.ring.make(ctx, coefficients));
  const map = AlgebraicEmbedding.extension(ctx, proof.numberField, c.owner, AlgebraicEmbedding.rationals(ctx, c.owner, bounds), proof.primitive, bounds);
  demand(c.owner.equal(ctx, map.map(ctx, result), value), 'invalid-input', 'value outside certified constants');
  return result;
}
function conditionSources<E>(ctx: ExecutionContext, owner: ExactField<E>, basis: readonly E[], primitive: E, powers: readonly E[]): AlgebraicConditionSource[] {
  ctx.allocate(basis.length + powers.length + 1); return [...algebraicConstructionSources(ctx, owner),
    ...basis.map((value, i) => ({field: owner as ExactField<unknown>, value, path: `constants.basis.${i}`})),
    {field: owner as ExactField<unknown>, value: primitive, path: 'constants.primitive'},
    ...powers.map((value, i) => ({field: owner as ExactField<unknown>, value, path: `constants.power.${i}`}))];
}
export function certifyAlgebraicConstantFieldWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds): AlgebraicConstantField<E> {
  const parent = isAlgebraicField(owner) ? certifyAlgebraicConstantFieldWithin(ctx, owner.parent, bounds) : null;
  const c = algebraicCoordinates(ctx, owner, bounds), presentation = algebraicPrimitivePresentationWithin(ctx, c, bounds);
  const finite = algebraicIntegralModelWithin(ctx, presentation.auxiliary, false, bounds), infinity = algebraicIntegralModelWithin(ctx, presentation.auxiliary, true, bounds);
  const finiteClosure = algebraicIntegralBasisWithin(ctx, finite, bounds), infinityClosure = algebraicIntegralBasisWithin(ctx, infinity, bounds);
  const space = algebraicConstantSpaceWithin(ctx, presentation.auxiliary, finite, finiteClosure.final, infinity, infinityClosure.final);
  const basis = Object.freeze(space.basis.map(v => presentationValue(ctx, c, presentation, v))), derivatives = Object.freeze(basis.map(v => differentiateAlgebraicWithin(ctx, owner, v, bounds)));
  const n = basis.length; demand(n > 0, 'verification-failed', 'nonempty constant field'); let seed = 1n;
  for (;;) {
    ctx.integer(seed); ctx.allocate(n * 2 + 12); let coefficient = 1n, primitive = owner.fromInteger(ctx, 0n); const combination: bigint[] = [];
    for (const b of basis) { combination.push(coefficient); primitive = owner.add(ctx, primitive, owner.multiply(ctx, owner.fromInteger(ctx, coefficient), b)); coefficient *= seed; ctx.integer(coefficient); }
    let power = owner.fromInteger(ctx, 1n); const powers: E[] = [];
    for (let i = 0; i < n; i++) { powers.push(power); power = owner.multiply(ctx, power, primitive); }
    const rank = solveLinearSystem(ctx, c.base, homogeneousRank(ctx, c, powers));
    if (rank.rank !== n) { seed++; continue; }
    const coordinates = invertExactMatrix(ctx, c.base, selectedMatrix(ctx, c, powers, rank)); demand(coordinates !== null, 'verification-failed', 'constant power coordinates');
    const request = relationRequest(ctx, c, powers, power), descent = descendCoefficientSystemWithin(ctx, c.base, request, bounds), elimination = solveLinearSystem(ctx, Q, descent.system);
    demand(elimination.kind === 'consistent' && elimination.nullspace.length === 0, 'verification-failed', 'constant minimal relation');
    const r = new PolynomialRing(Q, 'gamma'), polynomial = r.make(ctx, [...elimination.particular.map(q => Q.negate(ctx, q)), Q.fromInteger(ctx, 1n)]);
    const numberField = constructAlgebraicExtensionWithin(ctx, r, polynomial, bounds);
    const partial = {numberField, primitive, powers: Object.freeze(powers), rank, coordinates};
    const parentCoordinates = parent && isAlgebraicField(owner) ? Object.freeze(parent.basis.map(v => constantCoordinatesWithin(ctx, c, partial, owner.embed(ctx, v) as E, bounds))) : Object.freeze([]);
    const conditions = algebraicConditions(ctx, owner, conditionSources(ctx, owner, basis, primitive, powers), bounds);
    const proof = Object.freeze({parent, presentation, finite, infinity, finiteClosure, infinityClosure, space, basis, derivatives,
      combination: Object.freeze(combination), ...partial, relation: Object.freeze({descent, elimination}), parentCoordinates, conditions});
    verifyAlgebraicConstantFieldWithin(ctx, owner, proof, bounds); return proof;
  }
}
export function verifyAlgebraicConstantFieldWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicConstantField<E>, bounds: DifferentialBounds): void {
  demand(proof !== null && typeof proof === 'object' && Array.isArray(proof.basis) && proof.presentation !== undefined, 'invalid-input', 'constant evidence record');
  reuseAlgebraicVerification(ctx, 'constant-field', owner, proof, bounds, () => verifyConstantFieldEvidence(ctx, owner, proof, bounds));
}
function verifyConstantFieldEvidence<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicConstantField<E>, bounds: DifferentialBounds): void {
  if (isAlgebraicField(owner)) { demand(proof.parent !== null, 'verification-failed', 'constant prefix coverage'); verifyAlgebraicConstantFieldWithin(ctx, owner.parent, proof.parent, bounds); }
  else demand(proof.parent === null, 'verification-failed', 'constant base coverage');
  const c = algebraicCoordinates(ctx, owner, bounds, proof.presentation.auxiliary.parent as AlgebraicCoordinates<E>['base']);
  verifyAlgebraicPresentationWithin(ctx, c, proof.presentation, bounds);
  verifyAlgebraicIntegralModelWithin(ctx, proof.presentation.auxiliary, false, proof.finite, bounds);
  verifyAlgebraicIntegralModelWithin(ctx, proof.presentation.auxiliary, true, proof.infinity, bounds);
  verifyAlgebraicIntegralBasisWithin(ctx, proof.finite, proof.finiteClosure, bounds); verifyAlgebraicIntegralBasisWithin(ctx, proof.infinity, proof.infinityClosure, bounds);
  verifyAlgebraicConstantSpaceWithin(ctx, proof.presentation.auxiliary, proof.finite, proof.finiteClosure.final, proof.infinity, proof.infinityClosure.final, proof.space);
  const n = proof.space.basis.length;
  demand(proof.basis.length === n && proof.derivatives.length === n && proof.combination.length === n && proof.powers.length === n, 'verification-failed', 'constant field coverage');
  let primitive = owner.fromInteger(ctx, 0n), power = owner.fromInteger(ctx, 1n);
  for (let i = 0; i < n; i++) {
    demand(owner.equal(ctx, proof.basis[i], presentationValue(ctx, c, proof.presentation, proof.space.basis[i])), 'verification-failed', 'native constant basis');
    verifyAlgebraicDerivativeWithin(ctx, owner, proof.basis[i], proof.derivatives[i], bounds);
    demand(owner.isZero(ctx, proof.derivatives[i].derivative), 'verification-failed', 'constant independent derivative'); ctx.integer(proof.combination[i]);
    primitive = owner.add(ctx, primitive, owner.multiply(ctx, owner.fromInteger(ctx, proof.combination[i]), proof.basis[i]));
  }
  demand(owner.equal(ctx, primitive, proof.primitive), 'verification-failed', 'constant primitive combination');
  for (let i = 0; i < n; i++) { demand(owner.equal(ctx, power, proof.powers[i]), 'verification-failed', 'constant primitive powers'); power = owner.multiply(ctx, power, primitive); }
  verifyLinearSolution(ctx, c.base, homogeneousRank(ctx, c, proof.powers), proof.rank);
  verifyExactMatrixInverse(ctx, c.base, selectedMatrix(ctx, c, proof.powers, proof.rank), proof.coordinates);
  const request = relationRequest(ctx, c, proof.powers, power);
  verifyCoefficientSystemWithin(ctx, c.base, request, proof.relation.descent, bounds); verifyLinearSolution(ctx, Q, proof.relation.descent.system, proof.relation.elimination);
  const solution = proof.relation.elimination; demand(solution.kind === 'consistent' && solution.nullspace.length === 0, 'verification-failed', 'constant relation uniqueness');
  verifyAlgebraicChainWithin(ctx, proof.numberField, bounds);
  const relation = proof.numberField.ring.make(ctx, [...solution.particular.map(q => Q.negate(ctx, q)), Q.fromInteger(ctx, 1n)]);
  demand(proof.numberField.parent === Q && proof.numberField.ring.equal(ctx, proof.numberField.modulus, relation), 'verification-failed', 'constant field defining relation');
  const map = AlgebraicEmbedding.extension(ctx, proof.numberField, owner, AlgebraicEmbedding.rationals(ctx, owner, bounds), primitive, bounds);
  // Complete intersection plus full power rank shows every constant has exactly
  // one coordinate vector. Checking products in the number field and native owner
  // independently also verifies multiplication closure of the returned space.
  const images = proof.basis.map(v => constantCoordinatesWithin(ctx, c, proof, v, bounds));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) demand(owner.equal(ctx,
    map.map(ctx, proof.numberField.multiply(ctx, images[i], images[j])), owner.multiply(ctx, proof.basis[i], proof.basis[j])), 'verification-failed', 'constant multiplication closure');
  if (proof.parent && isAlgebraicField(owner)) {
    demand(proof.parentCoordinates.length === proof.parent.basis.length, 'verification-failed', 'constant prefix inclusion coverage');
    for (let i = 0; i < proof.parent.basis.length; i++) demand(owner.equal(ctx, map.map(ctx, proof.parentCoordinates[i]), owner.embed(ctx, proof.parent.basis[i]) as E), 'verification-failed', 'constant prefix inclusion');
  } else demand(proof.parentCoordinates.length === 0, 'verification-failed', 'constant base inclusion');
  verifyAlgebraicConditions(ctx, owner, conditionSources(ctx, owner, proof.basis, primitive, proof.powers), proof.conditions, bounds);
}
export function certifyAlgebraicConstantField<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, owner, bounds); return certifyAlgebraicConstantFieldWithin(ctx, owner, bounds); });
}
export function verifyAlgebraicConstantField<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicConstantField<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicChainWithin(ctx, owner, bounds); verifyAlgebraicConstantFieldWithin(ctx, owner, proof, bounds); });
}
export function algebraicConstantCoordinates<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicConstantField<E>, value: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, owner, bounds); verifyAlgebraicConstantFieldWithin(ctx, owner, proof, bounds);
    return constantCoordinatesWithin(ctx, algebraicCoordinates(ctx, owner, bounds, proof.presentation.auxiliary.parent as ReturnType<typeof algebraicCoordinates>['base']), proof, value, bounds); });
}
export function algebraicConstantEmbedding<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicConstantField<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => {
    verifyAlgebraicChainWithin(ctx, owner, bounds); verifyAlgebraicConstantFieldWithin(ctx, owner, proof, bounds);
    return AlgebraicEmbedding.extension(ctx, proof.numberField, owner, AlgebraicEmbedding.rationals(ctx, owner, bounds), proof.primitive, bounds);
  });
}
