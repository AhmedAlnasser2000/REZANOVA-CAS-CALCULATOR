/** A genus-zero curve gains a rational place over a checked residue extension. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, reconstructConstantBaseChangedCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {constructAlgebraicCanonicalGeometryWithin, verifyAlgebraicCanonicalGeometryWithin, type AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';
import type {CurveConstant} from './algebraic-curve-coordinates';
import type {CurvePlaceResidue} from './algebraic-residue-algebra';
import {constructNumberFieldPresentationWithin, verifyNumberFieldPresentationWithin, numberFieldPresentationValueWithin, type NumberFieldPresentation} from './number-field-presentation';
import {AlgebraicEmbedding} from './algebraic-embedding';
import {baseChangeAlgebraicCurveWithin, type ConstantBaseChangeValue} from './algebraic-curve-base-change';
import {constructRelativeNumberFieldWithin} from './relative-number-field';
import {reconstructAlgebraicConstantQuotientWithin, verifyAlgebraicConstantQuotientWithin, type AlgebraicConstantQuotient} from './algebraic-constant-quotient';
import {tryGenusZeroParameterWithin, verifyGenusZeroParameterWithin, type GenusZeroParameter} from './genus-zero-parameter';

export type GenusZeroConstantParameter<E> =
  | Readonly<{kind: 'native'; source: AlgebraicCurveView<E>; parameter: GenusZeroParameter<E>}>
  | Readonly<{kind: 'constant-extension'; source: AlgebraicCurveView<E>; geometry: AlgebraicCanonicalGeometry<E>; point: number;
      presentation: NumberFieldPresentation<CurvePlaceResidue>; quotient: AlgebraicConstantQuotient<E>;
      curve: AlgebraicCurveView<ConstantBaseChangeValue>; parameter: GenusZeroParameter<ConstantBaseChangeValue>}>;

export function verifyGenusZeroConstantParameterWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, proof: GenusZeroConstantParameter<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, source.owner, source, bounds); demand(proof.source === source, 'domain-mismatch', 'genus-zero original supplied owner');
  if (proof.kind === 'native') {verifyGenusZeroParameterWithin(ctx, source, proof.parameter, bounds); return;}
  demand(proof.kind === 'constant-extension', 'verification-failed', 'genus-zero constant extension kind');
  verifyAlgebraicCanonicalGeometryWithin(ctx, source, proof.geometry, bounds);
  demand(proof.geometry.genus === 0n && Number.isSafeInteger(proof.point) && proof.point >= 0 && proof.point < proof.geometry.infinity.places.length, 'verification-failed', 'genus-zero original residue place');
  const residue = proof.geometry.infinity.places[proof.point].residue, p = proof.presentation, q = proof.quotient, C = source.coordinates.constantOwner;
  verifyNumberFieldPresentationWithin(ctx, residue, p, bounds); verifyAlgebraicConstantQuotientWithin(ctx, q, bounds);
  demand(q.curve === source && q.relative.source === C && q.relative.target === p.field && q.change.constants === p.field
    && proof.curve.owner === q.change.field && proof.curve.authority.kind === 'constant-base-change' && proof.curve.authority.evidence === q.change, 'domain-mismatch', 'genus-zero full constant diagram');
  const embed = AlgebraicEmbedding.ancestor(ctx, C, residue, bounds); let power: CurveConstant = C.fromInteger(ctx, 1n);
  for (let i = 0; i < C.ring.degree(ctx, C.modulus); i++) {
    demand(residue.equal(ctx, p.embedding.map(ctx, q.relative.embedding.map(ctx, power)), embed.map(ctx, power)), 'verification-failed', 'genus-zero constant embedding complete basis');
    power = C.multiply(ctx, power, C.generator(ctx));
  }
  // Full constants imply geometric integrality; this finite base change cannot
  // split the function field. The checked degree-one place gives K L = L(t).
  verifyGenusZeroParameterWithin(ctx, proof.curve, proof.parameter, bounds);
}
export function tryGenusZeroConstantParameterWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, bounds: DifferentialBounds, supplied?: AlgebraicCanonicalGeometry<E>): GenusZeroConstantParameter<E> | null {
  const geometry = supplied ?? constructAlgebraicCanonicalGeometryWithin(ctx, source, bounds); verifyAlgebraicCanonicalGeometryWithin(ctx, source, geometry, bounds);
  const native = tryGenusZeroParameterWithin(ctx, source, bounds, geometry);
  if (native) {ctx.allocate(3); return Object.freeze({kind: 'native', source, parameter: native});}
  if (geometry.genus !== 0n) return null;
  demand(geometry.infinity.places.length > 0, 'verification-failed', 'complete genus-zero infinity coverage');
  const point = 0, residue = geometry.infinity.places[point].residue, presentation = constructNumberFieldPresentationWithin(ctx, residue, bounds), C = source.coordinates.constantOwner;
  const image = numberFieldPresentationValueWithin(ctx, residue, presentation, AlgebraicEmbedding.ancestor(ctx, C, residue, bounds).map(ctx, C.generator(ctx)), bounds);
  const embedding = AlgebraicEmbedding.extension(ctx, C, presentation.field, AlgebraicEmbedding.rationals(ctx, presentation.field, bounds), image, bounds);
  const relative = constructRelativeNumberFieldWithin(ctx, C, presentation.field, embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, source, presentation.field, embedding, bounds);
  const quotient = reconstructAlgebraicConstantQuotientWithin(ctx, source, change, relative, bounds), curve = reconstructConstantBaseChangedCurveWithin(ctx, change, bounds), parameter = tryGenusZeroParameterWithin(ctx, curve, bounds);
  demand(parameter !== null, 'verification-failed', 'genus-zero residue extension missing degree-one parameter'); ctx.allocate(8);
  const proof = Object.freeze({kind: 'constant-extension' as const, source, geometry, point, presentation, quotient, curve, parameter});
  verifyGenusZeroConstantParameterWithin(ctx, source, proof, bounds); return proof;
}
export function tryGenusZeroConstantParameter<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, bounds: DifferentialBounds): GenusZeroConstantParameter<E> | null {
  return ctx.operation(() => tryGenusZeroConstantParameterWithin(ctx, source, bounds));
}
export function verifyGenusZeroConstantParameter<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, proof: GenusZeroConstantParameter<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGenusZeroConstantParameterWithin(ctx, source, proof, bounds));
}
