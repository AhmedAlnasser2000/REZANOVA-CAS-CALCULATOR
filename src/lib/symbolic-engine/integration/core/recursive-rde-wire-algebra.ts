/** Owned codecs for arithmetic evidence. Decode grants no mathematical authority. */
import type { ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing } from './polynomial';
import { factorCoefficientDomain } from './factorization-domain';
import { normalizationInteger, normalizationText } from './exponential-normalization-wire-values';
import { recursiveIntegerRootsEvidenceCodec } from './recursive-integer-roots-wire';
import { recursiveLogarithmicRelationsEvidenceCodec } from './recursive-logarithmic-relations-wire';
import { recursiveFactorizationEvidenceCodec } from './recursive-polynomial-factorization-wire';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { linearEvidenceCodec } from './linear-wire';
import type { CertifiedTowerView } from './recursive-certified-tower';
import type { NormalPoleResonance } from './recursive-rde-poles';
import type { HyperexponentialResonance } from './recursive-hyperexponential-resonance';
import type { RecursiveLogarithmicMembership } from './recursive-logarithmic-membership';
import * as w from './decision-wire-algebra';

export function recursiveRdeValueCodecs(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds) {
  const owner = view.owner, value = factorCoefficientDomain(ctx, owner, bounds.towerHeight).codec(ctx), coefficient = factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx);
  const p = w.polynomial(ctx, owner.fractions!.ring, coefficient), derivative = w.structure(ctx, {input: value, derivative: value}), integer = normalizationInteger(ctx);
  const polynomialValuation = w.structure(ctx, {input: p, divisions: w.list(ctx, w.division(ctx, p)), order: w.optional(integer), unit: p});
  const fractionValuation = w.structure(ctx, {numerator: polynomialValuation, denominator: polynomialValuation, order: w.optional(integer)});
  const radical = w.structure(ctx, {coefficients: w.list(ctx, w.scalar(ctx)), valuations: w.list(ctx, w.scalar(ctx)), index: integer, powers: w.list(ctx, integer)});
  const pair = w.structure(ctx, {coefficients: w.list(ctx, w.scalar(ctx)), value, derivative});
  const conditions = w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'logarithm-argument'), path: normalizationText(ctx), value}));
  return {value, coefficient, p, derivative, integer, polynomialValuation, fractionValuation, radical, pair, conditions};
}
export function recursiveMembershipEvidenceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveLogarithmicMembership> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds);
  return w.structure(ctx, {relations: recursiveLogarithmicRelationsEvidenceCodec(ctx, view, bounds), witness: w.optional(v.radical), radical: w.literal(ctx, false, true), actual: w.literal(ctx, false, true)});
}
export function hyperResonanceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<HyperexponentialResonance> {
  const v = recursiveRdeValueCodecs(ctx, view.parent!, bounds);
  return w.structure(ctx, {relations: recursiveLogarithmicRelationsEvidenceCodec(ctx, view.parent!, bounds), exponent: w.optional(w.scalar(ctx)), witness: w.optional(v.radical), actual: w.literal(ctx, false, true)});
}
export function normalResonanceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<NormalPoleResonance> {
  const v = recursiveRdeValueCodecs(ctx, view, bounds);
  function codec(ring: PolynomialRing<import('./differential-field').DifferentialElement>) {
    return w.structure(ctx, {valuation: v.fractionValuation, derivative: v.derivative, normal: w.bezout(ctx, v.p), inverse: w.bezout(ctx, v.p),
      residue: w.division(ctx, v.p), derivativeRemainder: w.division(ctx, v.p), indicial: w.polynomial(ctx, ring, v.value),
      roots: recursiveIntegerRootsEvidenceCodec(ctx, ring, bounds), positive: w.optional(v.integer)});
  }
  return {encode(e) { return codec(e.ring).encode(e); }, decode(data) {
    const ring = new PolynomialRing(view.owner, 'poleOrder'), e = codec(ring).decode(data); ctx.allocate(1); return Object.freeze({...e, ring});
  }};
}
export function recursiveNormalizationCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds) {
  const v = recursiveRdeValueCodecs(ctx, view, bounds);
  return w.structure(ctx, {factorization: recursiveFactorizationEvidenceCodec(ctx, view.owner.fractions!.ring, bounds),
    poles: w.list(ctx, w.structure(ctx, {factor: v.p, valuation: v.fractionValuation, resonance: w.optional(normalResonanceCodec(ctx, view, bounds))})),
    gauge: v.value, derivative: v.derivative, coefficient: v.value, forcing: w.list(ctx, v.value)});
}
export function recursiveDenominatorCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds) {
  const v = recursiveRdeValueCodecs(ctx, view, bounds);
  return w.structure(ctx, {factorizations: w.list(ctx, recursiveFactorizationEvidenceCodec(ctx, view.owner.fractions!.ring, bounds)),
    poles: w.list(ctx, w.structure(ctx, {factor: v.p, coefficient: v.fractionValuation, forcing: w.list(ctx, v.fractionValuation), kind: w.literal(ctx, 'normal', 'special'),
      derivative: w.optional(v.derivative), normal: w.optional(w.bezout(ctx, v.p)), residue: w.optional(normalResonanceCodec(ctx, view, bounds)),
      special: w.optional(hyperResonanceCodec(ctx, view, bounds)), bound: v.integer})), denominator: v.p});
}
export function recursiveConstraintCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds) {
  return w.structure(ctx, {comparison: coefficientSystemCodec(ctx, view.parent!.owner, bounds), linear: linearEvidenceCodec(ctx, w.scalar(ctx))});
}
