import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import type { Rational } from './rational';
import type { LinearSolution, RowOperation } from './linear-system';
import { MultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';
import type { MultivariateContent, MultivariateGcd } from './multivariate-gcd';
import * as w from './decision-wire-algebra';

export function normalizationInteger(ctx: ExecutionContext): w.EvidenceCodec<bigint> {
  return {
    encode(value) { const bits = ctx.integer(value); ctx.allocate(bits + 1); return value.toString(); },
    decode(value) {
      demand(typeof value === 'string', 'invalid-input', 'normalization integer string'); ctx.integerText(value);
      demand(/^(0|-?[1-9][0-9]*)$/.test(value), 'invalid-input', 'normalization canonical integer');
      const n = BigInt(value); ctx.integer(n); return n;
    },
  };
}
export function normalizationText(ctx: ExecutionContext): w.EvidenceCodec<string> {
  function check(v: unknown): string { demand(typeof v === 'string', 'invalid-input', 'normalization string'); ctx.allocate(v.length); return v; }
  return {encode: check, decode: check};
}
export function normalizationKind(value: unknown): unknown {
  demand(value !== null && typeof value === 'object', 'invalid-input', 'normalization evidence');
  const d = Object.getOwnPropertyDescriptor(value, 'kind');
  demand(d !== undefined && 'value' in d, 'invalid-input', 'normalization kind'); return d.value;
}
export function normalizationBaseCodec(ctx: ExecutionContext, owner: DifferentialField) {
  const scalar: w.EvidenceCodec<E> = {
    encode(value) { owner.parent!.assert(ctx, value); demand(value.kind === 'scalar', 'domain-mismatch', 'normalization scalar'); return w.scalar(ctx).encode(value.value); },
    decode(value) { return owner.parent!.scalar(ctx, w.scalar(ctx).decode(value)); },
  };
  const fraction = w.fraction(ctx, owner.fractions!, scalar);
  const element: w.EvidenceCodec<E> = {
    encode(value) { owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'normalization element'); return fraction.encode(value.value); },
    decode(value) { return owner.fraction(ctx, fraction.decode(value)); },
  };
  return {element, polynomial: w.polynomial(ctx, owner.fractions!.ring, scalar)};
}
export function normalizationLinearCodec(ctx: ExecutionContext): w.EvidenceCodec<LinearSolution<Rational>> {
  const scalar = w.scalar(ctx), index = w.integer(ctx);
  const swap = w.structure(ctx, {kind: w.literal(ctx, 'swap'), target: index, source: index});
  const scale = w.structure(ctx, {kind: w.literal(ctx, 'scale'), target: index, factor: scalar});
  const add = w.structure(ctx, {kind: w.literal(ctx, 'add'), target: index, source: index, factor: scalar});
  const operation: w.EvidenceCodec<RowOperation<Rational>> = {
    encode(v) { return v.kind === 'swap' ? swap.encode(v) : v.kind === 'scale' ? scale.encode(v) : add.encode(v); },
    decode(v) {
      const kind = normalizationKind(v); if (kind === 'swap') return swap.decode(v); if (kind === 'scale') return scale.decode(v);
      demand(kind === 'add', 'invalid-input', 'normalization row operation'); return add.decode(v);
    },
  };
  const codec = w.structure(ctx, {kind: w.literal(ctx, 'consistent'), operations: w.list(ctx, operation),
    reduced: w.list(ctx, w.list(ctx, scalar)), rank: index, pivots: w.list(ctx, index),
    particular: w.list(ctx, scalar), nullspace: w.list(ctx, w.list(ctx, scalar))});
  return {
    encode(v) { demand(v.kind === 'consistent', 'verification-failed', 'normalization homogeneous system'); return codec.encode(v); },
    decode: v => codec.decode(v),
  };
}
export function normalizationPolynomialCodec<C>(ctx: ExecutionContext, ring: MultivariateRing<C>, element: w.EvidenceCodec<C>): w.EvidenceCodec<P<C>> {
  const integer = normalizationInteger(ctx);
  const power: w.EvidenceCodec<number> = {
    encode(n) { ctx.degree(n); return integer.encode(BigInt(n)); },
    decode(v) { const n = integer.decode(v); demand(n >= 0n, 'invalid-input', 'negative polynomial exponent');
      if (n > BigInt(ctx.limits.degree)) ctx.exhaust('degree'); return Number(n); },
  };
  const terms = w.list(ctx, w.structure(ctx, {powers: w.list(ctx, power), coefficient: element}));
  return {
    encode(v) { ring.assert(ctx, v); return terms.encode(v.terms); },
    decode(v) {
      const ts = terms.decode(v), result = ring.make(ctx, ts);
      demand(ts.length === result.terms.length, 'invalid-input', 'noncanonical sparse polynomial');
      for (let i = 0; i < ts.length; i++) {
        ctx.tick(ring.arity + 1);
        demand(ts[i].powers.every((n, j) => n === result.terms[i].powers[j])
          && ring.field.equal(ctx, ts[i].coefficient, result.terms[i].coefficient), 'invalid-input', 'noncanonical sparse term order');
      }
      return result;
    },
  };
}
export function normalizationGcdCodec<C>(ctx: ExecutionContext, ring: MultivariateRing<C>, element: w.EvidenceCodec<C>): w.EvidenceCodec<MultivariateGcd<C>> {
  const p = normalizationPolynomialCodec(ctx, ring, element);
  const common = {gcd: p, left: p, right: p};
  const simple = w.structure(ctx, {...common, kind: w.literal(ctx, 'zero', 'scalar')});
  let recursive: w.EvidenceCodec<Extract<MultivariateGcd<C>, {kind: 'recursive'}>> | undefined;
  if (ring.lower) {
    const c = normalizationPolynomialCodec(ctx, ring.lower, element), child = normalizationGcdCodec(ctx, ring.lower, element);
    const content: w.EvidenceCodec<MultivariateContent<C>> = w.structure(ctx, {content: c, primitive: p, chain: w.list(ctx, child)});
    recursive = w.structure(ctx, {...common, kind: w.literal(ctx, 'recursive'), a: content, b: content, content: child,
      steps: w.list(ctx, w.structure(ctx, {division: w.structure(ctx, {quotient: p, remainder: p, multiplier: c}), content})),
      s: p, t: p, denominator: c});
  }
  return {
    encode(v) {
      if (v.kind !== 'recursive') return simple.encode(v);
      demand(recursive !== undefined, 'invalid-input', 'recursive scalar GCD'); return recursive.encode(v);
    },
    decode(v) {
      const kind = normalizationKind(v);
      if (kind === 'zero' || kind === 'scalar') return simple.decode(v);
      demand(kind === 'recursive' && recursive !== undefined, 'invalid-input', 'normalization GCD kind'); return recursive.decode(v);
    },
  };
}
