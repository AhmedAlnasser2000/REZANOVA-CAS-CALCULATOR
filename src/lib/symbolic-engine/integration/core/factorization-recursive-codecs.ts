import { demand, type ExecutionContext } from './execution';
import type { Rational } from './rational';
import type { MultivariateRing } from './multivariate-polynomial';
import type { MultivariateContent } from './multivariate-gcd';
import { normalizationKind, normalizationPolynomialCodec, normalizationGcdCodec } from './exponential-normalization-wire-values';
import { factorFiniteCodec } from './factorization-codecs';
import type { FactorConversion } from './factorization-conversion';
import type { FactorMultivariateTree, FactorMultivariateProof, FactorMultivariateRecovery, FactorMultivariateRejection } from './factorization-multivariate';
import type { FactorSparseSquareFree, FactorSparsePrimitive } from './factorization-sparse-square-free';
import * as w from './decision-wire-algebra';

export function factorContentCodec(ctx: ExecutionContext, ring: MultivariateRing<Rational>): w.EvidenceCodec<MultivariateContent<Rational>> {
  demand(ring.lower !== undefined, 'invalid-input', 'factor content codec coordinates'); const q = w.scalar(ctx);
  return w.structure(ctx, {content: normalizationPolynomialCodec(ctx, ring.lower, q), primitive: normalizationPolynomialCodec(ctx, ring, q),
    chain: w.list(ctx, normalizationGcdCodec(ctx, ring.lower, q))});
}
export function factorConversionCodec(ctx: ExecutionContext, ring: MultivariateRing<Rational>): w.EvidenceCodec<FactorConversion> {
  demand(ring.lower !== undefined, 'invalid-input', 'factor conversion coordinates');
  const q = w.scalar(ctx), p = normalizationPolynomialCodec(ctx, ring, q), c = normalizationPolynomialCodec(ctx, ring.lower, q);
  return w.structure(ctx, {coefficients: w.list(ctx, w.structure(ctx, {numerator: c, denominator: c})), denominator: c, quotients: w.list(ctx, c),
    cleared: p, content: factorContentCodec(ctx, ring), integerScale: q, working: p});
}
export function factorSparsePrimitiveCodec(ctx: ExecutionContext, ring: MultivariateRing<Rational>): w.EvidenceCodec<FactorSparsePrimitive> {
  return w.structure(ctx, {content: factorContentCodec(ctx, ring), scale: w.scalar(ctx), working: normalizationPolynomialCodec(ctx, ring, w.scalar(ctx))});
}
export function factorSparseSquareFreeCodec(ctx: ExecutionContext, ring: MultivariateRing<Rational>): w.EvidenceCodec<FactorSparseSquareFree> {
  const q = w.scalar(ctx), p = normalizationPolynomialCodec(ctx, ring, q), gcd = normalizationGcdCodec(ctx, ring, q);
  return w.structure(ctx, {scalar: q, components: w.list(ctx, w.structure(ctx, {polynomial: p,
    multiplicity: factorFiniteCodec(ctx).integer, derivative: gcd, previous: w.list(ctx, gcd)}))});
}
export function factorMultivariateTreeCodec(ctx: ExecutionContext, ring: MultivariateRing<Rational>): w.EvidenceCodec<FactorMultivariateTree> {
  const q = w.scalar(ctx), p = normalizationPolynomialCodec(ctx, ring, q), content = factorContentCodec(ctx, ring);
  const {integer, cs, bezout, finite} = factorFiniteCodec(ctx), index = w.integer(ctx), division = w.division(ctx, p);
  const recovery: w.EvidenceCodec<FactorMultivariateRecovery> = w.structure(ctx, {raw: p, content: w.optional(content), scale: q, candidate: p});
  const degree = w.structure(ctx, {kind: w.literal(ctx, 'degree'), mask: integer, recovery});
  const rejection = w.structure(ctx, {kind: w.literal(ctx, 'division'), mask: integer, recovery, division});
  const rejected: w.EvidenceCodec<FactorMultivariateRejection> = {encode(v) { return v.kind === 'degree' ? degree.encode(v) : rejection.encode(v); },
    decode(v) { const kind = normalizationKind(v); if (kind === 'degree') return degree.decode(v); demand(kind === 'division', 'invalid-input', 'factor rejection tag'); return rejection.decode(v); }};
  const terms = w.list(ctx, w.structure(ctx, {powers: w.list(ctx, index), coefficient: integer}));
  const proof: w.EvidenceCodec<FactorMultivariateProof> = w.structure(ctx, {points: cs, shifted: p, degrees: w.list(ctx, index), bound: integer,
    modular: w.structure(ctx, {bound: integer, finite, inverses: w.list(ctx, bezout), lifts: w.list(ctx, w.structure(ctx, {modulus: integer, factors: w.list(ctx, cs)}))}),
    inverses: w.list(ctx, cs), leadingInverse: terms, factors: w.list(ctx, terms), rejected: w.list(ctx, rejected)});
  const base = {polynomial: p, content}; const linear = w.structure(ctx, {...base, kind: w.literal(ctx, 'linear')});
  const terminal = w.structure(ctx, {...base, kind: w.literal(ctx, 'irreducible'), proof});
  const tree: w.EvidenceCodec<FactorMultivariateTree> = {encode(v) {
    if (v.kind === 'linear') return linear.encode(v); if (v.kind === 'irreducible') return terminal.encode(v); return split.encode(v);
  }, decode(v) { const kind = normalizationKind(v); if (kind === 'linear') return linear.decode(v); if (kind === 'irreducible') return terminal.decode(v);
    demand(kind === 'split', 'invalid-input', 'multivariate tree tag'); return split.decode(v); }};
  const split = w.structure(ctx, {...base, kind: w.literal(ctx, 'split'), proof,
    selected: w.structure(ctx, {mask: integer, recovery, division}), left: tree, right: tree}); return tree;
}
