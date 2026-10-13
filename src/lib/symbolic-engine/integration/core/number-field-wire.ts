import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import type { AlgebraicField } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { algebraicCoefficientCodec, algebraicFactorizationCodec } from './algebraic-wire';
import { matrixInverseCodec, auxiliaryAlgebraicCodec } from './algebraic-module-wire';
import { normalizationInteger } from './exponential-normalization-wire-values';
import { verifyNumberFieldPresentationWithin, numberFieldPresentationValueWithin, type NumberFieldPresentation } from './number-field-presentation';
import { reconstructRelativeNumberFieldWithin, type RelativeNumberField, type NumberValue } from './relative-number-field';
import { verifyNumberFieldSplittingWithin, type NumberFieldSplitting, type NumberFieldSplitStep } from './number-field-splitting';
import * as w from './decision-wire-algebra';

/** Auxiliary reconstruction checks defining evidence first. No construction,
 * factorization or primitive search producer is invoked by these codecs. */
export const auxiliaryNumberFieldCodec = auxiliaryAlgebraicCodec;
export function numberFieldPresentationCodec<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds, expectedField?: AlgebraicField<Rational>): w.EvidenceCodec<NumberFieldPresentation<E>> {
  const element = algebraicCoefficientCodec(ctx, owner, bounds), inverse = matrixInverseCodec(ctx, w.scalar(ctx));
  const parts = w.structure(ctx, {combination: w.list(ctx, normalizationInteger(ctx)), primitive: element, powers: w.list(ctx, element), inverse});
  return {encode(p) {
    verifyNumberFieldPresentationWithin(ctx, owner, p, bounds); return Object.freeze({field: auxiliaryNumberFieldCodec(ctx, Q, bounds).encode(p.field), evidence: parts.encode(p)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['field', 'evidence']), decoded = auxiliaryNumberFieldCodec(ctx, Q, bounds).decode(raw.field), field = expectedField ?? decoded, p = parts.decode(raw.evidence);
    demand(field.ring.equal(ctx, field.ring.make(ctx, decoded.modulus.coefficients), field.modulus), 'domain-mismatch', 'complete expected primitive constant relation');
    const embedding = AlgebraicEmbedding.extension(ctx, field, owner, AlgebraicEmbedding.rationals(ctx, owner, bounds), p.primitive, bounds), result = Object.freeze({...p, field, embedding});
    verifyNumberFieldPresentationWithin(ctx, owner, result, bounds); return result;
  }};
}
export function relativeNumberFieldCodec(ctx: ExecutionContext, source: AlgebraicField<Rational>, target: AlgebraicField<Rational>, bounds: DifferentialBounds): w.EvidenceCodec<RelativeNumberField> {
  const ring = new PolynomialRing(source, 'relativeConstant'), c = algebraicCoefficientCodec(ctx, source, bounds), t = algebraicCoefficientCodec(ctx, target, bounds);
  const parts = w.structure(ctx, {degree: w.integer(ctx, 1), powers: w.list(ctx, t), inverse: matrixInverseCodec(ctx, w.scalar(ctx)), relation: w.polynomial(ctx, ring, c), image: t});
  return {encode(p) {
    demand(p.source === source && p.target === target, 'domain-mismatch', 'relative codec expected owners');
    return parts.encode({...p, image: p.embedding.map(ctx, source.generator(ctx)), relation: ring.make(ctx, p.relation.coefficients)});
  }, decode(data) {
    const p = parts.decode(data), embedding = AlgebraicEmbedding.extension(ctx, source, target, AlgebraicEmbedding.rationals(ctx, target, bounds), p.image, bounds);
    return reconstructRelativeNumberFieldWithin(ctx, {...p, source, target, embedding}, bounds);
  }};
}
export function numberFieldSplittingCodec(ctx: ExecutionContext, ring: PolynomialRing<NumberValue>, input: Polynomial<NumberValue>, bounds: DifferentialBounds): w.EvidenceCodec<NumberFieldSplitting> {
  const source = ring.domain as AlgebraicField<Rational>;
  return {encode(proof) {
    verifyNumberFieldSplittingWithin(ctx, ring, input, proof, bounds); ctx.allocate(proof.steps.length);
    const steps = proof.steps.map(p => {
      const scalar = algebraicCoefficientCodec(ctx, p.input.ring.domain, bounds), f = algebraicFactorizationCodec(ctx, p.input.ring, bounds);
      const common = {input: w.polynomial(ctx, p.input.ring, scalar).encode(p.input), factorization: f.encode(p.factorization), selected: p.selected};
      if (p.extension === null) return Object.freeze({...common, extension: null, presentation: null});
      demand(p.presentation !== null, 'verification-failed', 'splitting primitive coverage');
      return Object.freeze({...common, extension: auxiliaryNumberFieldCodec(ctx, p.input.ring.domain, bounds).encode(p.extension),
        presentation: numberFieldPresentationCodec(ctx, p.extension, bounds).encode(p.presentation)});
    });
    return Object.freeze({input: w.polynomial(ctx, ring, algebraicCoefficientCodec(ctx, source, bounds)).encode(proof.input), steps: Object.freeze(steps),
      roots: w.list(ctx, algebraicCoefficientCodec(ctx, proof.target, bounds)).encode(proof.roots)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['input', 'steps', 'roots']); const given = w.polynomial(ctx, ring, algebraicCoefficientCodec(ctx, source, bounds)).decode(raw.input);
    demand(ring.equal(ctx, given, input), 'domain-mismatch', 'splitting codec explicit input');
    let field = source, embedding = AlgebraicEmbedding.identity(ctx, source, bounds); const steps: NumberFieldSplitStep[] = [];
    for (const entry of w.array(ctx, raw.steps)) {
      const p = w.record(ctx, entry, ['input', 'factorization', 'selected', 'extension', 'presentation']), r = field === source ? ring : new PolynomialRing(field, ring.variable);
      const scalar = algebraicCoefficientCodec(ctx, field, bounds), value = w.polynomial(ctx, r, scalar).decode(p.input), factorization = algebraicFactorizationCodec(ctx, r, bounds).decode(p.factorization);
      demand(Number.isSafeInteger(p.selected) && (p.selected as number) >= -1, 'invalid-input', 'splitting selection index'); const selected = p.selected as number;
      if (p.extension === null) { demand(p.presentation === null, 'invalid-input', 'terminal splitting primitive'); steps.push(Object.freeze({input: value, factorization, selected, extension: null, presentation: null})); continue; }
      const extension = auxiliaryNumberFieldCodec(ctx, field, bounds).decode(p.extension), presentation = numberFieldPresentationCodec(ctx, extension, bounds).decode(p.presentation);
      steps.push(Object.freeze({input: value, factorization, selected, extension, presentation}));
      const image = numberFieldPresentationValueWithin(ctx, extension, presentation, extension.embed(ctx, embedding.map(ctx, source.generator(ctx))), bounds);
      field = presentation.field; embedding = AlgebraicEmbedding.extension(ctx, source, field, AlgebraicEmbedding.rationals(ctx, field, bounds), image, bounds);
    }
    const roots = w.list(ctx, algebraicCoefficientCodec(ctx, field, bounds)).decode(raw.roots), result = Object.freeze({input, steps: Object.freeze(steps), target: field, embedding, roots});
    verifyNumberFieldSplittingWithin(ctx, ring, input, result, bounds); return result;
  }};
}
