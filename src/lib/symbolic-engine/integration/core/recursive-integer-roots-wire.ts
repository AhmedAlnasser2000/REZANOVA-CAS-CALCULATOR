import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { PolynomialRing } from './polynomial';
import { DifferentialField, type DifferentialBounds } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { integerRootEvidenceCodec } from './rde-wire-evidence';
import { normalizationInteger, normalizationKind } from './exponential-normalization-wire-values';
import type { RecursiveIntegerRootEvidence } from './recursive-integer-roots';
import * as w from './decision-wire-algebra';

/** Stored indicial evidence only; no root search is used during decoding. */
export function recursiveIntegerRootsEvidenceCodec<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveIntegerRootEvidence<E>> {
  const input = w.polynomial(ctx, ring, factorCoefficientDomain(ctx, ring.domain, bounds.towerHeight).codec(ctx));
  const comparison = coefficientSystemCodec(ctx, ring.domain, bounds);
  function common(qr: PolynomialRing<import('./rational').Rational>) {
    const p = w.polynomial(ctx, qr, w.scalar(ctx)); return {input, comparison, gcds: w.list(ctx, w.bezout(ctx, p)), polynomial: p};
  }
  function finite(qr: PolynomialRing<import('./rational').Rational>, ar: PolynomialRing<import('./differential-field').DifferentialElement>) {
    const scalar = factorCoefficientDomain(ctx, ar.domain, 0).codec(ctx), integers = integerRootEvidenceCodec(ctx, ar, scalar);
    return w.structure(ctx, {...common(qr), kind: w.literal(ctx, 'finite'), positive: integers, negative: integers,
      zero: w.literal(ctx, false, true), roots: w.list(ctx, normalizationInteger(ctx))});
  }
  return {
    encode(e) { return e.kind === 'all-integers' ? w.structure(ctx, {...common(e.ring), kind: w.literal(ctx, 'all-integers')}).encode(e)
      : finite(e.ring, e.auxiliary).encode(e); },
    decode(value) {
      const qr = new PolynomialRing(Q, ring.variable);
      if (normalizationKind(value) === 'all-integers') {
        const decoded = w.structure(ctx, {...common(qr), kind: w.literal(ctx, 'all-integers')}).decode(value); ctx.allocate(2);
        return Object.freeze({...decoded, ring: qr});
      }
      demand(normalizationKind(value) === 'finite', 'invalid-input', 'indicial root outcome');
      const auxiliary = new PolynomialRing(DifferentialField.rationals(ctx, bounds), ring.variable), decoded = finite(qr, auxiliary).decode(value);
      ctx.allocate(3); return Object.freeze({...decoded, ring: qr, auxiliary});
    },
  };
}
