/** Shared evidence schemas; existing rational-RDE version-1 keys stay unchanged. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { RdeDomain } from './rde-algebra';
import type { PolynomialRing } from './polynomial';
import { factorCoefficientDomain } from './factorization-domain';
import { normalizationInteger } from './exponential-normalization-wire-values';
import * as w from './decision-wire-algebra';

export function integerRootEvidenceCodec(ctx: ExecutionContext, ring: PolynomialRing<E>, scalar: w.EvidenceCodec<E>) {
  const m = w.polynomial(ctx, ring, scalar), number = normalizationInteger(ctx);
  return w.structure(ctx, {
    squareFree: w.squareFreeEvidence(ctx, m, scalar), polynomial: m, sturm: w.list(ctx, m), divisions: w.list(ctx, w.division(ctx, m)),
    bound: number, intervals: w.list(ctx, w.structure(ctx, {lower: number, upper: number, leftVariation: w.integer(ctx), rightVariation: w.integer(ctx), root: w.literal(ctx, false, true)})),
    roots: w.list(ctx, number),
  });
}
export function rationalRdeEvidenceCodecs(ctx: ExecutionContext, d: RdeDomain) {
  const scalar = factorCoefficientDomain(ctx, d.owner.parent!, 0).codec(ctx);
  const nativeFraction = w.fraction(ctx, d.owner.fractions!, scalar);
  const element: w.EvidenceCodec<E> = {
    encode(value) { d.owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'RDE fraction required'); return nativeFraction.encode(value.value); },
    decode(value) { return d.owner.fraction(ctx, nativeFraction.decode(value)); },
  };
  const p = w.polynomial(ctx, d.ring, scalar), m = w.polynomial(ctx, d.orders, scalar);
  const mx = w.polynomial(ctx, d.resultantRing, m), bezout = w.bezout(ctx, p), number = normalizationInteger(ctx);
  const triple = w.structure(ctx, {pair: bezout, common: bezout, A: p, B: p, C: p});
  const rootEvidence = integerRootEvidenceCodec(ctx, d.orders, scalar);
  const resonance = w.structure(ctx, {leadingUnit: bezout, resultant: w.prsEvidence(ctx, mx, m), integers: rootEvidence, splits: w.list(ctx, bezout)});
  const derivative = w.structure(ctx, {input: element, derivative: element});
  const denominator = w.structure(ctx, {squareFree: w.squareFreeEvidence(ctx, p, scalar), hasseA: w.list(ctx, p), hasseB: w.list(ctx, p),
    blocks: w.list(ctx, w.structure(ctx, {valuationSplits: w.list(ctx, bezout), resonance: w.optional(resonance)})), denominator: p});
  const degree = w.structure(ctx, {delta: w.integer(ctx, -1), slope: scalar, intercept: scalar, forcing: w.optional(number), resonance: w.optional(number), bound: number});
  return {scalar, element, p, bezout, triple, derivative, denominator, degree};
}
