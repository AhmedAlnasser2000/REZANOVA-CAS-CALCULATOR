import { demand, type ExecutionContext } from './execution';
import type { PolynomialRing } from './polynomial';
import type { Rational } from './rational';
import type { FactorIntegerTree } from './factorization-integer';
import type { RationalFactorization } from './factorization-rational';
import type { FactorSquareFree } from './factorization-square-free';
import { normalizationInteger, normalizationKind } from './exponential-normalization-wire-values';
import * as w from './decision-wire-algebra';

export function factorFiniteCodec(ctx: ExecutionContext) {
  const integer = normalizationInteger(ctx), cs = w.list(ctx, integer), index = w.integer(ctx);
  const bezout = w.structure(ctx, {gcd: cs, s: cs, t: cs});
  const finite = w.structure(ctx, {prime: integer, squareFree: bezout, factors: w.list(ctx, w.structure(ctx, {polynomial: cs,
    irreducibility: w.structure(ctx, {frobenius: w.list(ctx, cs), exclusions: w.list(ctx, w.structure(ctx, {index, bezout}))})}))});
  return {integer, cs, bezout, finite};
}
export function factorIntegerTreeCodec(ctx: ExecutionContext): w.EvidenceCodec<FactorIntegerTree> {
  const {integer, cs, bezout, finite} = factorFiniteCodec(ctx), rational = w.list(ctx, w.scalar(ctx));
  const linear = w.structure(ctx, {kind: w.literal(ctx, 'linear'), polynomial: cs});
  const proof = w.structure(ctx, {
    bound: integer, finite, inverses: w.list(ctx, bezout), lifts: w.list(ctx, w.structure(ctx, {modulus: integer, factors: w.list(ctx, cs)})),
    rejected: w.list(ctx, w.structure(ctx, {mask: integer, candidate: cs, quotient: rational, remainder: rational}))});
  const terminal = w.structure(ctx, {kind: w.literal(ctx, 'irreducible'), polynomial: cs, proof});
  const tree: w.EvidenceCodec<FactorIntegerTree> = {
    encode(v) { if (v.kind === 'linear') return linear.encode(v); if (v.kind === 'irreducible') return terminal.encode(v); return split.encode(v); },
    decode(v) { const tag = normalizationKind(v); if (tag === 'linear') return linear.decode(v); if (tag === 'irreducible') return terminal.decode(v);
      demand(tag === 'split', 'invalid-input', 'factor tree tag'); return split.decode(v); },
  };
  const split = w.structure(ctx, {kind: w.literal(ctx, 'split'), polynomial: cs, left: tree, right: tree, proof, mask: integer});
  return tree;
}
export function factorSquareFreeCodec<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, element: w.EvidenceCodec<E>): w.EvidenceCodec<FactorSquareFree<E>> {
  const p = w.polynomial(ctx, ring, element), bezout = w.bezout(ctx, p), integer = normalizationInteger(ctx);
  return w.structure(ctx, {scalar: element, components: w.list(ctx, w.structure(ctx, {polynomial: p, multiplicity: integer,
    derivative: bezout, previous: w.list(ctx, bezout)}))});
}
export function rationalFactorizationCodec(ctx: ExecutionContext, ring: PolynomialRing<Rational>): w.EvidenceCodec<RationalFactorization> {
  const scalar = w.scalar(ctx), p = w.polynomial(ctx, ring, scalar), integer = normalizationInteger(ctx);
  const zero = w.structure(ctx, {kind: w.literal(ctx, 'zero'), input: p});
  const result = w.structure(ctx, {kind: w.literal(ctx, 'factorization'), input: p, unit: scalar,
    factors: w.list(ctx, w.structure(ctx, {polynomial: p, multiplicity: integer})),
    squareFree: factorSquareFreeCodec(ctx, ring, scalar), trees: w.list(ctx, factorIntegerTreeCodec(ctx))});
  return {encode(v) { return v.kind === 'zero' ? zero.encode(v) : result.encode(v); },
    decode(v) { if (normalizationKind(v) === 'zero') return zero.decode(v);
      demand(normalizationKind(v) === 'factorization', 'invalid-input', 'factorization tag'); return result.decode(v); }};
}
