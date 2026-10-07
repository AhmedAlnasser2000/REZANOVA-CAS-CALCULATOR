import type { SerializableMathJson as Tree } from '../../../types/calculator';
import type { CanonicalIntegrationRestriction } from '../../../types/calculator/canonical-result-integration';
import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import type { DifferentialField, DifferentialBounds, DifferentialElement as E } from '../../symbolic-engine/integration/core/differential-field';
import type { ExponentialNormalization, ExponentialNormalizationInput, ExponentialFraction } from '../../symbolic-engine/integration/core/exponential-normalization-types';
import { verifyExponentialNormalization } from '../../symbolic-engine/integration/core/exponential-normalization';
import type { MultivariatePolynomial } from '../../symbolic-engine/integration/core/multivariate-polynomial';
import { elementFromTree, integrationMath, projectElement } from './exponential-math';

export interface IntegrationSourceProof {
  readonly owner: DifferentialField;
  readonly input: ExponentialNormalizationInput;
  readonly normalization: ExponentialNormalization;
  readonly correspondence?: unknown;
  readonly bounds: DifferentialBounds;
}
/** Projects through the checked multivariate algebra, including canceled families. */
export function normalizationRestrictions(ctx: ExecutionContext, source: IntegrationSourceProof): CanonicalIntegrationRestriction[] {
  const {owner, input, normalization: proof, bounds} = source;
  verifyExponentialNormalization(ctx, owner, input, proof, bounds);
  const ring = proof.ring, bindings = new Map([[owner, owner.fractions!.ring.variable]]);
  const arguments_ = proof.basis.basis.map(v => projectElement(ctx, owner, v, bindings).mathJson);
  const argumentKeys = arguments_.map(v => JSON.stringify(v));
  const hasExp = (v: Tree): boolean => {
    ctx.tick(); return Array.isArray(v) && (v[0] === 'Exp' || (v as Tree[]).slice(1).some(hasExp));
  };
  const read = (v: Tree): MultivariatePolynomial<E> => {
    ctx.tick();
    if (!hasExp(v)) return ring.constant(ctx, elementFromTree(ctx, owner, v, bindings));
    demand(Array.isArray(v), 'verification-failed', 'restriction polynomial');
    const [head, ...a] = v;
    if (head === 'Exp') {
      const index = argumentKeys.indexOf(JSON.stringify(a[0]));
      demand(index >= 0, 'verification-failed', 'restriction exponential identity');
      ctx.allocate(ring.arity); const powers = Array<number>(ring.arity).fill(0); powers[index] = 1;
      return ring.make(ctx, [{powers, coefficient: owner.fromInteger(ctx, 1n)}]);
    }
    if (head === 'Power') {
      demand(typeof a[1] === 'number' && Number.isSafeInteger(a[1]) && a[1] >= 0, 'verification-failed', 'restriction power');
      let n = a[1], base = read(a[0]), out = ring.one(ctx);
      while (n > 0) {ctx.tick(); if (n % 2) out = ring.multiply(ctx, out, base); n = Math.floor(n / 2); if (n) base = ring.multiply(ctx, base, base);}
      return out;
    }
    demand(head === 'Add' || head === 'Multiply', 'verification-failed', 'restriction operator');
    return a.reduce<MultivariatePolynomial<E>>((acc, t) => head === 'Add' ? ring.add(ctx, acc, read(t)) : ring.multiply(ctx, acc, read(t)), head === 'Add' ? ring.zero(ctx) : ring.one(ctx));
  };
  const polynomial = (p: MultivariatePolynomial<E>): Tree => {
    ring.assert(ctx, p); ctx.allocate(p.terms.length * (ring.arity + 5));
    const terms = p.terms.map(term => {
      const factors: Tree[] = [projectElement(ctx, owner, term.coefficient, bindings).mathJson];
      term.powers.forEach((n, i) => {ctx.tick(); if (n) {const e: Tree = ['Exp', arguments_[i]]; factors.push(n === 1 ? e : ['Power', e, n]);}});
      return factors.length === 1 ? factors[0] : ['Multiply', ...factors] as Tree;
    });
    const tree: Tree = terms.length === 0 ? {num: '0'} : terms.length === 1 ? terms[0] : ['Add', ...terms];
    demand(ring.equal(ctx, p, read(tree)), 'verification-failed', 'exact multivariate projection'); return tree;
  };
  const fraction = (value: ExponentialFraction) => {
    demand(!ring.isZero(ctx, value.numerator) && !ring.isZero(ctx, value.denominator), 'verification-failed', 'zero restriction');
    const n = polynomial(value.numerator), d = polynomial(value.denominator);
    return integrationMath(ctx, ring.equal(ctx, value.denominator, ring.one(ctx)) ? n : ['Divide', n, d]);
  };
  return proof.restrictions.map(r => ({kind: 'nonzero', value: fraction(r.value),
    origins: [{category: r.kind === 'argument-denominator' ? 'argument-denominator' : 'source', path: r.provenance || `source.node.${r.node}.${r.kind}`}]}));
}
