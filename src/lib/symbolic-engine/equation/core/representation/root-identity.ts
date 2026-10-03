import { demand, type ExecutionContext } from '../execution';
import { factorZ } from '../algebra/factor';
import type { Polynomial } from '../algebra/polynomial';
import { rAdd, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { ALGEBRAIC_RING, compareReal, refineComplex, rootsOfIrreducible, type ComplexRootOf, type RootOf } from '../algebraic/root-of';

/**
 * Canonical identity of an algebraic number: its minimal polynomial plus its
 * index among the roots that the deterministic isolation of that polynomial
 * produces. Two RootOf values are the same number exactly when they share
 * the polynomial and the index, whatever isolating regions they carry.
 */
export interface CanonicalRoot {
  readonly poly: Polynomial<bigint>;
  readonly index: number;
  /** The catalog's representative (the deterministic isolation region). */
  readonly root: RootOf;
  readonly key: string;
}

/**
 * Validate untrusted coefficients (ascending) as a minimal polynomial:
 * degree ≥ 1, primitive, positive leading coefficient and irreducible over ℚ.
 */
export function minimalPolynomial(ctx: ExecutionContext, coefficients: readonly bigint[]): Polynomial<bigint> {
  const poly = ALGEBRAIC_RING.make(ctx, coefficients);
  demand(poly.coefficients.length === coefficients.length && coefficients.length >= 2, 'invalid-input', 'minimal polynomial degree or trailing zeros');
  const f = factorZ(ctx, ALGEBRAIC_RING, poly);
  const only = f.factors.length === 1 ? f.factors[0] : undefined;
  demand(only !== undefined && only.multiplicity === 1 && f.unit.numerator === 1n && f.unit.denominator === 1n
    && only.factor.coefficients.every((c, i) => c === poly.coefficients[i]) && only.factor.coefficients.length === poly.coefficients.length,
  'invalid-input', 'not a minimal polynomial (primitive, positive leading coefficient, irreducible)');
  return poly;
}

export function polynomialKey(poly: Polynomial<bigint>): string { return poly.coefficients.join(','); }

function disksMeet(ctx: ExecutionContext, a: ComplexRootOf, b: ComplexRootOf): boolean {
  const dr = rSubtract(ctx, a.re, b.re), di = rSubtract(ctx, a.im, b.im), s: Rational = rAdd(ctx, a.radius, b.radius);
  return compareRational(ctx, rAdd(ctx, rMultiply(ctx, dr, dr), rMultiply(ctx, di, di)), rMultiply(ctx, s, s)) <= 0;
}

/** Per-owner cache of each minimal polynomial's deterministic root list. */
export class RootCatalog {
  readonly #roots = new Map<string, readonly RootOf[]>();

  roots(ctx: ExecutionContext, poly: Polynomial<bigint>): readonly RootOf[] {
    ALGEBRAIC_RING.assert(ctx, poly);
    const key = polynomialKey(poly);
    let list = this.#roots.get(key);
    if (!list) {
      list = Object.freeze(rootsOfIrreducible(ctx, poly));
      demand(list.length === ALGEBRAIC_RING.degree(ctx, poly), 'verification-failed', 'root catalog is incomplete');
      this.#roots.set(key, list);
    }
    return list;
  }

  canonical(ctx: ExecutionContext, root: RootOf): CanonicalRoot {
    demand(typeof root === 'object' && root !== null && (root.kind === 'real' || root.kind === 'complex'), 'invalid-input', 'RootOf expected');
    const list = this.roots(ctx, root.poly);
    const index = root.kind === 'real' ? this.#realIndex(ctx, root, list) : this.#complexIndex(ctx, root, list);
    return Object.freeze({ poly: list[index].poly, index, root: list[index], key: `${polynomialKey(root.poly)}#${index}` });
  }

  #realIndex(ctx: ExecutionContext, root: Extract<RootOf, { kind: 'real' }>, list: readonly RootOf[]): number {
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.kind === 'real' && compareReal(ctx, root, c) === 0) return i;
    }
    return demand(false, 'verification-failed', 'real root not among its polynomial roots') as never;
  }

  /** Closed catalog disks are pairwise disjoint, so refining the given disk eventually meets exactly one. */
  #complexIndex(ctx: ExecutionContext, root: ComplexRootOf, list: readonly RootOf[]): number {
    let cur = root;
    for (;;) {
      ctx.tick();
      const hits: number[] = [];
      list.forEach((c, i) => { if (c.kind === 'complex' && disksMeet(ctx, cur, c)) hits.push(i); });
      demand(hits.length > 0, 'verification-failed', 'complex root not among its polynomial roots');
      if (hits.length === 1) return hits[0];
      demand(cur.radius.numerator !== 0n, 'verification-failed', 'catalog disks overlap');
      cur = refineComplex(ctx, cur, cur.radius);
    }
  }

  same(ctx: ExecutionContext, a: RootOf, b: RootOf): boolean {
    // Minimal polynomials are unique (primitive, positive leading coefficient).
    if (!ALGEBRAIC_RING.equal(ctx, a.poly, b.poly)) return false;
    return this.canonical(ctx, a).index === this.canonical(ctx, b).index;
  }
}
