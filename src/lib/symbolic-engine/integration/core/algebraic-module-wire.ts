import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import { PolynomialRing } from './polynomial';
import type { DifferentialBounds } from './differential-field';
import { AlgebraicField } from './algebraic-field';
import { algebraicConstructionCodec, algebraicCoefficientCodec, algebraicFactorizationCodec } from './algebraic-wire';
import type { MatrixInverse } from './algebraic-matrix';
import type { PolynomialModuleEvidence, PolynomialModuleOperation } from './polynomial-module';
import type { PolynomialDenominatorEvidence, AlgebraicIntegralModel } from './algebraic-integral-model';
import type { AlgebraicOrder } from './algebraic-order';
import { modelBase } from './algebraic-order';
import type { AlgebraicIdealizer, AlgebraicIntegralBasis } from './algebraic-integral-basis';
import { linearEvidenceCodec } from './linear-wire';
import { normalizationKind, normalizationText } from './exponential-normalization-wire-values';
import * as w from './decision-wire-algebra';

export function matrixInverseCodec<E>(ctx: ExecutionContext, scalar: w.EvidenceCodec<E>): w.EvidenceCodec<MatrixInverse<E>> {
  const matrix = w.list(ctx, w.list(ctx, scalar));
  return w.structure(ctx, {matrix, inverse: matrix, columns: w.list(ctx, linearEvidenceCodec(ctx, scalar))});
}
export function polynomialModuleCodec<E>(ctx: ExecutionContext, r: PolynomialRing<E>, scalar: w.EvidenceCodec<E>): w.EvidenceCodec<PolynomialModuleEvidence<E>> {
  const p = w.polynomial(ctx, r, scalar), matrix = w.list(ctx, w.list(ctx, p));
  const swap = w.structure(ctx, {kind: w.literal(ctx, 'swap'), target: w.integer(ctx), source: w.integer(ctx)});
  const add = w.structure(ctx, {kind: w.literal(ctx, 'add'), target: w.integer(ctx), source: w.integer(ctx), factor: p});
  const scale = w.structure(ctx, {kind: w.literal(ctx, 'scale'), target: w.integer(ctx), factor: scalar});
  const op: w.EvidenceCodec<PolynomialModuleOperation<E>> = {
    encode(v) { return v.kind === 'swap' ? swap.encode(v) : v.kind === 'add' ? add.encode(v) : scale.encode(v); },
    decode(v) { const k = normalizationKind(v); if (k === 'swap') return swap.decode(v); if (k === 'add') return add.decode(v);
      demand(k === 'scale', 'invalid-input', 'module operation tag'); return scale.decode(v); },
  };
  return w.structure(ctx, {input: matrix, columns: w.integer(ctx), operations: w.list(ctx, op), reduced: matrix, transformation: matrix, pivots: w.list(ctx, w.integer(ctx))});
}
export function polynomialDenominatorCodec(ctx: ExecutionContext, r: PolynomialRing<Rational>): w.EvidenceCodec<PolynomialDenominatorEvidence> {
  const p = w.polynomial(ctx, r, w.scalar(ctx));
  return w.structure(ctx, {denominators: w.list(ctx, p), steps: w.list(ctx, w.structure(ctx,
    {gcd: w.bezout(ctx, p), previousQuotient: p, denominatorQuotient: p, next: p})), common: p});
}
/** Reconstruct an auxiliary irreducible owner only after its full evidence is
 * decoded. No search or field-capability flag is used. */
export function auxiliaryAlgebraicCodec<E>(ctx: ExecutionContext, parent: ExactField<E>, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicField<E>> {
  return {
    encode(v) { demand(v.parent === parent, 'domain-mismatch', 'auxiliary algebraic parent'); ctx.allocate(2);
      return Object.freeze({variable: v.ring.variable, construction: algebraicConstructionCodec(ctx, v.ring, bounds).encode(v.construction)}); },
    decode(v) {
      const raw = w.record(ctx, v, ['variable', 'construction']), variable = normalizationText(ctx).decode(raw.variable), r = new PolynomialRing(parent, variable);
      const construction = algebraicConstructionCodec(ctx, r, bounds).decode(raw.construction);
      return AlgebraicField.fromEvidence(ctx, r, construction.relation, construction, bounds);
    },
  };
}
export function algebraicOrderCodec(ctx: ExecutionContext, model: AlgebraicIntegralModel): w.EvidenceCodec<AlgebraicOrder> {
  const f = modelBase(model), s = w.fraction(ctx, f, w.scalar(ctx)), p = w.polynomial(ctx, f.ring, w.scalar(ctx)), matrix = w.list(ctx, w.list(ctx, p));
  return w.structure(ctx, {basis: w.list(ctx, w.list(ctx, s)), inverse: matrixInverseCodec(ctx, s), multiplication: w.list(ctx, matrix),
    traces: w.list(ctx, p), traceMatrix: matrix, traceInverse: matrixInverseCodec(ctx, s), discriminant: p});
}
function idealizerParts(ctx: ExecutionContext, model: AlgebraicIntegralModel, residue: AlgebraicField<Rational>, bounds: DifferentialBounds) {
  const f = modelBase(model), s = w.fraction(ctx, f, w.scalar(ctx)), p = w.polynomial(ctx, f.ring, w.scalar(ctx));
  return w.structure(ctx, {prime: p, traceKernel: linearEvidenceCodec(ctx, algebraicCoefficientCodec(ctx, residue, bounds)), radical: polynomialModuleCodec(ctx, f.ring, w.scalar(ctx)),
    radicalInverse: matrixInverseCodec(ctx, s), denominators: polynomialDenominatorCodec(ctx, f.ring), constraints: polynomialModuleCodec(ctx, f.ring, w.scalar(ctx)),
    constraintInverse: matrixInverseCodec(ctx, s), basis: w.list(ctx, w.list(ctx, s))});
}
export function algebraicIdealizerCodec(ctx: ExecutionContext, model: AlgebraicIntegralModel, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicIdealizer> {
  const auxiliary = auxiliaryAlgebraicCodec(ctx, Q, bounds);
  return {
    encode(v) { ctx.allocate(2); return Object.freeze({residue: auxiliary.encode(v.residue), evidence: idealizerParts(ctx, model, v.residue, bounds).encode(v)}); },
    decode(v) { const raw = w.record(ctx, v, ['residue', 'evidence']), residue = auxiliary.decode(raw.residue), evidence = idealizerParts(ctx, model, residue, bounds).decode(raw.evidence);
      ctx.allocate(2); return Object.freeze({...evidence, residue}); },
  };
}
export function algebraicIntegralBasisCodec(ctx: ExecutionContext, model: AlgebraicIntegralModel, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicIntegralBasis> {
  const f = modelBase(model), order = algebraicOrderCodec(ctx, model), s = w.fraction(ctx, f, w.scalar(ctx));
  const attempt = w.structure(ctx, {idealizer: algebraicIdealizerCodec(ctx, model, bounds), order, inclusion: matrixInverseCodec(ctx, s)});
  return w.structure(ctx, {initial: order, rounds: w.list(ctx, w.structure(ctx, {factors: algebraicFactorizationCodec(ctx, f.ring, bounds), attempts: w.list(ctx, attempt)})), final: order});
}
