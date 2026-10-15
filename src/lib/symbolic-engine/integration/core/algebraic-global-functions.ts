/** Complete L(0) from certified full constants and complete finite/infinity
 * orders. This is a distinct certificate, not a shortened legacy Hess proof. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {ExactField} from './field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant} from './algebraic-curve-coordinates';
import {algebraicConditions, algebraicConstructionSources, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';

export const algebraicGlobalFunctionRule = 'algebraic-global-functions-full-constants-v1' as const;
export interface AlgebraicGlobalFunctionSpace<E> {
  readonly rule: typeof algebraicGlobalFunctionRule; readonly curve: AlgebraicCurveView<E>;
  readonly dimension: 1; readonly basis: readonly [E]; readonly conditions: readonly AlgebraicCondition<E>[];
}
export type AlgebraicGlobalFunctionCoordinate<E> = Readonly<{
  space: AlgebraicGlobalFunctionSpace<E>; input: E; conditions: readonly AlgebraicCondition<E>[];
} & ({kind: 'member'; coefficient: CurveConstant} | {kind: 'not-member'; coefficient: null})>;
const spaces = new WeakSet<object>();
export function verifyAlgebraicGlobalFunctionsWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicGlobalFunctionSpace<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner;
  demand(spaces.has(proof) && proof.curve === curve, 'domain-mismatch', 'registered global-function space');
  demand(proof.rule === algebraicGlobalFunctionRule && proof.dimension === 1 && proof.basis.length === 1 && f.equal(ctx, proof.basis[0], f.fromInteger(ctx, 1n))
    && f.equal(ctx, curve.coordinates.basis[0], proof.basis[0]), 'verification-failed', 'complete actual-constant global basis');
  verifyAlgebraicConditions(ctx, f, algebraicConstructionSources(ctx, f), proof.conditions, bounds);
}
export function reconstructAlgebraicGlobalFunctionsWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, basis: readonly E[], conditions: readonly AlgebraicCondition<E>[], bounds: DifferentialBounds): AlgebraicGlobalFunctionSpace<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  demand(basis.length === 1 && curve.owner.equal(ctx, basis[0], curve.owner.fromInteger(ctx, 1n)), 'verification-failed', 'global space exact basis coverage');
  ctx.allocate(4 * conditions.length + 6); const proof = Object.freeze({rule: algebraicGlobalFunctionRule, curve, dimension: 1 as const, basis: Object.freeze([basis[0]] as const), conditions: Object.freeze(conditions.map(p => Object.freeze({...p})))});
  spaces.add(proof); verifyAlgebraicGlobalFunctionsWithin(ctx, curve, proof, bounds); return proof;
}
export function constructAlgebraicGlobalFunctionsWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds): AlgebraicGlobalFunctionSpace<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  return reconstructAlgebraicGlobalFunctionsWithin(ctx, curve, [curve.owner.fromInteger(ctx, 1n)], algebraicConditions(ctx, curve.owner, algebraicConstructionSources(ctx, curve.owner), bounds), bounds);
}
function coefficient<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E): CurveConstant | null {
  const c = curve.coordinates, values = c.coordinates(ctx, input), r = c.scalar.ring, C = c.constantOwner;
  demand(values.length === c.basis.length && values.length > 0, 'verification-failed', 'global coordinate full field-basis coverage');
  for (let i = 1; i < values.length; i++) if (!c.scalar.isZero(ctx, values[i])) return null;
  const scalar = values[0]; c.scalar.assert(ctx, scalar);
  if (r.degree(ctx, scalar.numerator) > 0 || r.degree(ctx, scalar.denominator) > 0) return null;
  const value = C.exactDivide(ctx, scalar.numerator.coefficients[0] ?? C.fromInteger(ctx, 0n), r.leading(ctx, scalar.denominator));
  demand(curve.owner.equal(ctx, c.scalarNative(ctx, c.scalar.fromCoefficient(ctx, value)), input), 'verification-failed', 'global coordinate inverse native reconstruction');
  return value;
}
function coordinateSources<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E) {
  const f = curve.owner; ctx.allocate(1); return [...algebraicConstructionSources(ctx, f), {field: f as ExactField<unknown>, value: input, path: 'global-functions.input'}];
}
export function verifyAlgebraicGlobalFunctionCoordinateWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicGlobalFunctionSpace<E>, input: E, proof: AlgebraicGlobalFunctionCoordinate<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicGlobalFunctionsWithin(ctx, curve, space, bounds); curve.owner.assert(ctx, input);
  demand(proof.space === space && curve.owner.equal(ctx, input, proof.input), 'verification-failed', 'global coordinates explicit space/input');
  const value = coefficient(ctx, curve, input), C = curve.coordinates.constantOwner;
  if (value === null) demand(proof.kind === 'not-member' && proof.coefficient === null, 'verification-failed', 'global coordinates complete nonmembership');
  else demand(proof.kind === 'member' && C.equal(ctx, value, proof.coefficient), 'verification-failed', 'global coordinates exact actual-constant coefficient');
  verifyAlgebraicConditions(ctx, curve.owner, coordinateSources(ctx, curve, input), proof.conditions, bounds);
}
export function coordinateAlgebraicGlobalFunctionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicGlobalFunctionSpace<E>, input: E, bounds: DifferentialBounds): AlgebraicGlobalFunctionCoordinate<E> {
  verifyAlgebraicGlobalFunctionsWithin(ctx, curve, space, bounds); curve.owner.assert(ctx, input); const value = coefficient(ctx, curve, input);
  ctx.allocate(5); const common = {space, input, conditions: algebraicConditions(ctx, curve.owner, coordinateSources(ctx, curve, input), bounds)};
  const proof = value === null ? Object.freeze({...common, kind: 'not-member' as const, coefficient: null}) : Object.freeze({...common, kind: 'member' as const, coefficient: value});
  verifyAlgebraicGlobalFunctionCoordinateWithin(ctx, curve, space, input, proof, bounds); return proof;
}
export function constructAlgebraicGlobalFunctions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => constructAlgebraicGlobalFunctionsWithin(ctx, curve, bounds));
}
export function verifyAlgebraicGlobalFunctions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicGlobalFunctionSpace<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyAlgebraicGlobalFunctionsWithin(ctx, curve, space, bounds));
}
export function coordinateAlgebraicGlobalFunction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, space: AlgebraicGlobalFunctionSpace<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => coordinateAlgebraicGlobalFunctionWithin(ctx, curve, space, input, bounds));
}
