import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import { PolynomialRing } from './polynomial';
import { RationalFunctionField } from './rational-function';
import type { DifferentialBounds } from './differential-field';
import { isAlgebraicField, type AlgebraicField } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { algebraicCoefficientCodec, algebraicDerivativeCodec, encodeAlgebraicSnapshot, verifyAlgebraicSnapshot } from './algebraic-wire';
import { algebraicCoordinates, type AlgebraicPresentation, type FunctionScalar } from './algebraic-presentation';
import type { AlgebraicIntegralModel } from './algebraic-integral-model';
import type { AlgebraicConstantSpace } from './algebraic-constant-space';
import { verifyAlgebraicConstantFieldWithin, type AlgebraicConstantField } from './algebraic-constant-field';
import { matrixInverseCodec, auxiliaryAlgebraicCodec, polynomialDenominatorCodec, algebraicIntegralBasisCodec } from './algebraic-module-wire';
import { linearEvidenceCodec } from './linear-wire';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { normalizationInteger, normalizationText } from './exponential-normalization-wire-values';
import { inspectExactArtifact } from './artifact-bounds';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import * as w from './decision-wire-algebra';

function presentationParts<E>(ctx: ExecutionContext, owner: ExactField<E>, auxiliary: AlgebraicField<FunctionScalar>, bounds: DifferentialBounds) {
  const scalar = algebraicCoefficientCodec(ctx, auxiliary.parent, bounds), native = algebraicCoefficientCodec(ctx, owner, bounds);
  return w.structure(ctx, {combination: w.list(ctx, normalizationInteger(ctx)), primitive: native, powers: w.list(ctx, native),
    basis: matrixInverseCodec(ctx, scalar), generatorCoordinates: w.list(ctx, w.list(ctx, scalar))});
}
function presentationCodec<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicPresentation<E>> {
  return {encode(v) { ctx.allocate(2); return Object.freeze({auxiliary: auxiliaryAlgebraicCodec(ctx, v.auxiliary.parent, bounds).encode(v.auxiliary),
    evidence: presentationParts(ctx, owner, v.auxiliary, bounds).encode(v)}); },
  decode(v) { const raw = w.record(ctx, v, ['auxiliary', 'evidence']), base = algebraicCoordinates(ctx, owner, bounds).base;
    const auxiliary = auxiliaryAlgebraicCodec(ctx, base, bounds).decode(raw.auxiliary), evidence = presentationParts(ctx, owner, auxiliary, bounds).decode(raw.evidence);
    ctx.allocate(2); return Object.freeze({...evidence, auxiliary}); }};
}
function integralModelCodec(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, infinity: boolean, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicIntegralModel> {
  function parts(field: AlgebraicField<FunctionScalar>) {
    const base = field.parent as RationalFunctionField<Rational>, scalar = w.fraction(ctx, base, w.scalar(ctx));
    return w.structure(ctx, {infinity: w.literal(ctx, infinity), transformed: w.polynomial(ctx, field.ring, scalar), denominators: polynomialDenominatorCodec(ctx, base.ring)});
  }
  return {encode(v) { ctx.allocate(2); return Object.freeze({field: auxiliaryAlgebraicCodec(ctx, v.field.parent, bounds).encode(v.field), evidence: parts(v.field).encode(v)}); },
    decode(v) { const raw = w.record(ctx, v, ['field', 'evidence']), parent = infinity ? new RationalFunctionField(new PolynomialRing(Q, 'u')) : presentation.parent;
      const field = auxiliaryAlgebraicCodec(ctx, parent, bounds).decode(raw.field), evidence = parts(field).decode(raw.evidence); ctx.allocate(2); return Object.freeze({...evidence, field}); }};
}
function constantSpaceCodec(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, infinity: AlgebraicIntegralModel, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicConstantSpace> {
  const base = presentation.parent as RationalFunctionField<Rational>, p = w.polynomial(ctx, base.ring, w.scalar(ctx)), scalar = w.fraction(ctx, base, w.scalar(ctx));
  return w.structure(ctx, {finiteInverse: matrixInverseCodec(ctx, scalar), transition: matrixInverseCodec(ctx, scalar), degrees: w.list(ctx, w.integer(ctx, -1)),
    denominators: w.list(ctx, polynomialDenominatorCodec(ctx, (infinity.field.parent as RationalFunctionField<Rational>).ring)),
    elimination: linearEvidenceCodec(ctx, w.scalar(ctx)), vectors: w.list(ctx, w.list(ctx, p)), basis: w.list(ctx, algebraicCoefficientCodec(ctx, presentation, bounds))});
}
function constantParts<E>(ctx: ExecutionContext, owner: ExactField<E>, presentation: AlgebraicPresentation<E>, finite: AlgebraicIntegralModel,
  infinity: AlgebraicIntegralModel, numberField: AlgebraicField<Rational>, bounds: DifferentialBounds) {
  const native = algebraicCoefficientCodec(ctx, owner, bounds), base = algebraicCoefficientCodec(ctx, presentation.auxiliary.parent, bounds);
  const condition = w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'nonzero'), path: normalizationText(ctx), value: native});
  return w.structure(ctx, {finiteClosure: algebraicIntegralBasisCodec(ctx, finite, bounds), infinityClosure: algebraicIntegralBasisCodec(ctx, infinity, bounds),
    space: constantSpaceCodec(ctx, presentation.auxiliary, infinity, bounds), basis: w.list(ctx, native), derivatives: w.list(ctx, algebraicDerivativeCodec(ctx, owner, bounds)),
    combination: w.list(ctx, normalizationInteger(ctx)), primitive: native, powers: w.list(ctx, native), rank: linearEvidenceCodec(ctx, base), coordinates: matrixInverseCodec(ctx, base),
    relation: w.structure(ctx, {descent: coefficientSystemCodec(ctx, presentation.auxiliary.parent, bounds), elimination: linearEvidenceCodec(ctx, w.scalar(ctx))}),
    parentCoordinates: w.list(ctx, algebraicCoefficientCodec(ctx, numberField, bounds)), conditions: w.list(ctx, condition)});
}
export function algebraicConstantFieldCodec<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicConstantField<E>> {
  const p = presentationCodec(ctx, owner, bounds), number = auxiliaryAlgebraicCodec(ctx, Q, bounds);
  return {
    encode(v) {
      const parent = isAlgebraicField(owner) ? algebraicConstantFieldCodec(ctx, owner.parent, bounds).encode(v.parent!) : null; ctx.allocate(6);
      return Object.freeze({parent, presentation: p.encode(v.presentation), finite: integralModelCodec(ctx, v.presentation.auxiliary, false, bounds).encode(v.finite),
        infinity: integralModelCodec(ctx, v.presentation.auxiliary, true, bounds).encode(v.infinity), numberField: number.encode(v.numberField),
        evidence: constantParts(ctx, owner, v.presentation, v.finite, v.infinity, v.numberField, bounds).encode(v)});
    },
    decode(v) {
      const raw = w.record(ctx, v, ['parent', 'presentation', 'finite', 'infinity', 'numberField', 'evidence']);
      if (!isAlgebraicField(owner)) demand(raw.parent === null, 'invalid-input', 'constant artifact base prefix');
      const parent = isAlgebraicField(owner) ? algebraicConstantFieldCodec(ctx, owner.parent, bounds).decode(raw.parent) : null;
      const presentation = p.decode(raw.presentation), finite = integralModelCodec(ctx, presentation.auxiliary, false, bounds).decode(raw.finite),
        infinity = integralModelCodec(ctx, presentation.auxiliary, true, bounds).decode(raw.infinity), numberField = number.decode(raw.numberField);
      const evidence = constantParts(ctx, owner, presentation, finite, infinity, numberField, bounds).decode(raw.evidence); ctx.allocate(6);
      return Object.freeze({...evidence, parent, presentation, finite, infinity, numberField});
    },
  };
}
export function encodeAlgebraicConstantField<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicConstantField<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyAlgebraicChainWithin(ctx, owner, bounds);
    verifyAlgebraicConstantFieldWithin(ctx, owner, proof, bounds);
    const payload = packRecursiveArtifactGraph(ctx, {construction: encodeAlgebraicSnapshot(ctx, owner, bounds), evidence: algebraicConstantFieldCodec(ctx, owner, bounds).encode(proof)}, bounds);
    ctx.allocate(3); const data = Object.freeze({tag: 'algebraic-constant-field', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeAlgebraicConstantField<E>(ctx: ExecutionContext, owner: ExactField<E>, data: unknown, bounds: DifferentialBounds): AlgebraicConstantField<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'algebraic-constant-field' && raw.version === 1, 'invalid-input', 'algebraic constant artifact tag/version');
    const body = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['construction', 'evidence']);
    verifyAlgebraicSnapshot(ctx, owner, body.construction, bounds);
    const proof = algebraicConstantFieldCodec(ctx, owner, bounds).decode(body.evidence); verifyAlgebraicConstantFieldWithin(ctx, owner, proof, bounds); return proof;
  });
}
