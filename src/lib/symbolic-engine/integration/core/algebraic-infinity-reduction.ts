import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { certifyAlgebraicDifferentialWithin, verifyAlgebraicDifferentialWithin, differentialPrimitiveBoundEntries, algebraicIntegrationConditionSources, type AlgebraicDifferential } from './algebraic-differential';
import { constructAlgebraicDivisorWithin, verifyAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import { equalAlgebraicPlaces, type AlgebraicPlace } from './algebraic-place';
import { solveAlgebraicRiemannRochWithin, verifyAlgebraicRiemannRochWithin, type AlgebraicRiemannRoch } from './algebraic-riemann-roch';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { algebraicLocalParameterWithin, verifyAlgebraicLocalParameterWithin, expandAlgebraicPlaceWithin, verifyAlgebraicLocalExpansionWithin, type AlgebraicLocalParameter, type AlgebraicLocalExpansion } from './algebraic-local';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { freezeExactMatrix } from './algebraic-matrix';
import { algebraicFunctionPower } from './algebraic-function-power';
import { normalizeAlgebraicPrimitiveCoordinates, verifyAlgebraicConstantProjection, type AlgebraicConstantProjection } from './algebraic-rr-constant-projection';
import { algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

export interface AlgebraicPrincipalPartBlock<E> {
  readonly place: AlgebraicPlace<E>;
  readonly poleOrder: bigint;
  readonly parameter: AlgebraicLocalParameter<E>;
  readonly parameterDerivative: AlgebraicDerivative<E>;
  readonly expansions: readonly AlgebraicLocalExpansion<E>[];
}
interface Common<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly input: E;
  readonly differential: AlgebraicDifferential<E>;
  readonly bound: AlgebraicDivisor<E>;
  readonly space: AlgebraicRiemannRoch<E>;
  readonly derivatives: readonly AlgebraicDerivative<E>[];
  readonly blocks: readonly AlgebraicPrincipalPartBlock<E>[];
  readonly system: LinearSystem<CurveConstant>;
  readonly elimination: LinearSolution<CurveConstant>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export type AlgebraicInfinityReduction<E> = Readonly<Common<E> & ({kind: 'no-simple-pole-reduction'} | (AlgebraicConstantProjection<E> & {
  kind: 'reduced'; derivative: AlgebraicDerivative<E>; remainder: E; remainderDifferential: AlgebraicDifferential<E>;
}))>;
function requests<E>(ctx: ExecutionContext, proof: AlgebraicDifferential<E>) {
  ctx.allocate(proof.geometry.infinity.places.length); return proof.geometry.infinity.places.flatMap(place => {
    const entry = proof.divisor?.entries.find(e => equalAlgebraicPlaces(ctx, place.curve, e.place, place));
    return entry && entry.coefficient < -1n ? [{place, poleOrder: -entry.coefficient}] : [];
  });
}
function blockSystem<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, columns: number, blocks: readonly AlgebraicPrincipalPartBlock<E>[]): LinearSystem<CurveConstant> {
  const matrix: CurveConstant[][] = [], rhs: CurveConstant[] = []; ctx.allocate(blocks.length);
  for (const block of blocks) {
    demand(block.expansions.length === columns + 1, 'verification-failed', 'principal-part complete column coverage'); const rows = block.expansions[0].coefficients.length;
    demand(Number.isSafeInteger(rows * (columns + 1)), 'invalid-input', 'principal-part dimensions'); ctx.allocate(rows * (columns + 1));
    for (const e of block.expansions) {
      demand(e.coefficients.length === rows, 'verification-failed', 'principal-part full quotient dimension');
      for (const coefficient of e.coefficients) curve.coordinates.constantOwner.assert(ctx, coefficient);
    }
    for (let i = 0; i < rows; i++) { matrix.push(block.expansions.slice(1).map(e => e.coefficients[i])); rhs.push(block.expansions[0].coefficients[i]); }
  }
  return Object.freeze({rows: rhs.length, columns, matrix: freezeExactMatrix(ctx, matrix), rhs: Object.freeze(rhs)});
}
function sameSystem<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: LinearSystem<CurveConstant>, b: LinearSystem<CurveConstant>) {
  const c = curve.coordinates.constantOwner; demand(a.rows === b.rows && a.columns === b.columns && a.matrix.length === b.rows && a.rhs.length === b.rows, 'verification-failed', 'infinity complete matrix dimensions');
  for (let i = 0; i < b.rows; i++) demand(a.matrix[i].length === b.columns && a.matrix[i].every((v, j) => c.equal(ctx, v, b.matrix[i][j])) && c.equal(ctx, a.rhs[i], b.rhs[i]), 'verification-failed', 'infinity complete principal-part mapping');
}
export function verifyAlgebraicInfinityReductionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicInfinityReduction<E>, bounds: DifferentialBounds): void {
  const f = curve.owner, c = curve.coordinates.constantOwner; demand(f.equal(ctx, input, proof.input), 'verification-failed', 'infinity exact expected input');
  verifyAlgebraicDifferentialWithin(ctx, curve, input, proof.differential, bounds);
  demand((proof.differential.divisor?.entries ?? []).every(e => e.place.order.infinity || e.coefficient >= -1n), 'invalid-input', 'infinity reduction requires finite simple poles');
  verifyAlgebraicDivisorWithin(ctx, curve, differentialPrimitiveBoundEntries(ctx, proof.differential, true), proof.bound);
  verifyAlgebraicRiemannRochWithin(ctx, curve, proof.bound, proof.space, bounds);
  demand(proof.derivatives.length === proof.space.dimension, 'verification-failed', 'infinity complete candidate derivatives');
  for (let i = 0; i < proof.derivatives.length; i++) verifyAlgebraicDerivativeWithin(ctx, f, proof.space.basis[i], proof.derivatives[i], bounds);
  const expected = requests(ctx, proof.differential); demand(proof.blocks.length === expected.length, 'verification-failed', 'infinity complete high-pole place coverage');
  for (let i = 0; i < expected.length; i++) {
    const b = proof.blocks[i], q = expected[i]; demand(equalAlgebraicPlaces(ctx, curve, b.place, q.place) && b.poleOrder === q.poleOrder, 'verification-failed', 'infinity ordered exact pole bound');
    verifyAlgebraicLocalParameterWithin(ctx, curve, b.place, b.parameter);
    verifyAlgebraicDerivativeWithin(ctx, f, b.parameter.value, b.parameterDerivative, bounds); demand(!f.isZero(ctx, b.parameterDerivative.derivative), 'verification-failed', 'nonconstant local uniformizer');
    const power = algebraicFunctionPower(ctx, f, b.parameter.value, b.poleOrder), values = [input, ...proof.derivatives.map(d => d.derivative)];
    demand(b.expansions.length === values.length, 'verification-failed', 'infinity full target/derivative local coverage');
    for (let j = 0; j < values.length; j++) {
      const scaled = f.multiply(ctx, power, f.exactDivide(ctx, values[j], b.parameterDerivative.derivative)), e = b.expansions[j];
      demand(f.equal(ctx, e.parameter.value, b.parameter.value) && equalAlgebraicPlaces(ctx, curve, e.place, b.place), 'verification-failed', 'infinity shared local quotient binding');
      verifyAlgebraicLocalExpansionWithin(ctx, curve, b.place, scaled, b.poleOrder - 1n, e);
    }
  }
  const system = blockSystem(ctx, curve, proof.space.dimension, proof.blocks); sameSystem(ctx, curve, proof.system, system); verifyLinearSolution(ctx, c, system, proof.elimination);
  if (proof.kind === 'no-simple-pole-reduction') demand(proof.elimination.kind === 'inconsistent', 'verification-failed', 'infinity complete obstruction witness');
  else {
    demand(proof.kind === 'reduced' && proof.elimination.kind === 'consistent' && proof.elimination.nullspace.length === 1, 'verification-failed', 'infinity complete constant freedom');
    verifyAlgebraicConstantProjection(ctx, curve, proof.space, proof.elimination.particular, proof);
    verifyAlgebraicDerivativeWithin(ctx, f, proof.primitive, proof.derivative, bounds);
    demand(f.equal(ctx, input, f.add(ctx, proof.derivative.derivative, proof.remainder)), 'verification-failed', 'infinity independent reconstruction');
    verifyAlgebraicDifferentialWithin(ctx, curve, proof.remainder, proof.remainderDifferential, bounds);
    demand((proof.remainderDifferential.divisor?.entries ?? []).every(e => e.coefficient >= -1n), 'verification-failed', 'complete global simple-pole remainder');
  }
  verifyAlgebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, proof.kind === 'reduced' ? [proof.primitive] : []), proof.conditions, bounds);
}
export function reduceAlgebraicInfinityWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicInfinityReduction<E> {
  const f = curve.owner, differential = certifyAlgebraicDifferentialWithin(ctx, curve, input, bounds);
  demand((differential.divisor?.entries ?? []).every(e => e.place.order.infinity || e.coefficient >= -1n), 'invalid-input', 'finite poles must first be reduced');
  const bound = constructAlgebraicDivisorWithin(ctx, curve, differentialPrimitiveBoundEntries(ctx, differential, true)), space = solveAlgebraicRiemannRochWithin(ctx, curve, bound, bounds), derivatives = Object.freeze(space.basis.map(v => differentiateAlgebraicWithin(ctx, f, v, bounds)));
  const blocks = Object.freeze(requests(ctx, differential).map(({place, poleOrder}) => {
    const parameter = algebraicLocalParameterWithin(ctx, curve, place), parameterDerivative = differentiateAlgebraicWithin(ctx, f, parameter.value, bounds), power = algebraicFunctionPower(ctx, f, parameter.value, poleOrder);
    const expansions = Object.freeze([input, ...derivatives.map(d => d.derivative)].map(v => expandAlgebraicPlaceWithin(ctx, curve, place, f.multiply(ctx, power, f.exactDivide(ctx, v, parameterDerivative.derivative)), poleOrder - 1n)));
    return Object.freeze({place, poleOrder, parameter, parameterDerivative, expansions});
  }));
  const system = blockSystem(ctx, curve, space.dimension, blocks), elimination = solveLinearSystem(ctx, curve.coordinates.constantOwner, system), common = {input, differential, bound, space, derivatives, blocks, system, elimination}; let result: AlgebraicInfinityReduction<E>;
  if (elimination.kind === 'inconsistent') result = Object.freeze({...common, kind: 'no-simple-pole-reduction', conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input), bounds)});
  else {
    const projection = normalizeAlgebraicPrimitiveCoordinates(ctx, curve, space, elimination.particular), derivative = differentiateAlgebraicWithin(ctx, f, projection.primitive, bounds), remainder = f.subtract(ctx, input, derivative.derivative);
    const remainderDifferential = f.equal(ctx, input, remainder) ? differential : certifyAlgebraicDifferentialWithin(ctx, curve, remainder, bounds);
    result = Object.freeze({...common, ...projection, kind: 'reduced', derivative, remainder, remainderDifferential, conditions: algebraicConditions(ctx, f, algebraicIntegrationConditionSources(ctx, curve, input, [projection.primitive]), bounds)});
  }
  verifyAlgebraicInfinityReductionWithin(ctx, curve, input, result, bounds); return result;
}
export function reduceAlgebraicInfinity<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return reduceAlgebraicInfinityWithin(ctx, curve, input, bounds); }); return Object.freeze({...recorded.value, arithmetic: recorded.evidence}); });
}
export function verifyAlgebraicInfinityReduction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicInfinityReduction<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'infinity arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicInfinityReductionWithin(ctx, curve, input, proof, bounds); }); });
}
