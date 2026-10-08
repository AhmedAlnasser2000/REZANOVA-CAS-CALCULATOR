import { demand, type ExecutionContext } from '../execution';
import {
  canonical, content, coprimeBasis, degree, discriminant, gcd, isZero, key, lc, primitive, resultant, tc, trueLevel, variable, type RPoly,
} from './recursive';

/**
 * Lazard's projection (EQUATION-SEMIALGEBRAIC1). From the level-n polynomials of a problem down to level 1, each
 * level's polynomials are split into contents (sent below) and primitive parts, whose square-free, pairwise coprime
 * basis B is projected to the leading and trailing coefficients and discriminants of each element and the
 * resultants of each pair — every one placed at its own true level. McCallum, Parusiński and Paunescu (J. Symbolic
 * Comput. 92, 2019) proved this projection correct for every input, with no well-orientedness condition: over a
 * cell on which the projection is Lazard-valuation-invariant, each basis element is Lazard-delineable, so lifting
 * never has to report failure.
 *
 * An equational constraint at the top level (an equation f = 0 that is a conjunct of the whole formula, f primitive
 * in xₙ) reduces the first projection to P_L(E) ∪ {res(e, g) : e ∈ E, g ∈ B \ E}, E the basis elements dividing f
 * (Nair, Davenport and Sankaran, "On benefits of equality constraints in lex-least invariant CAD", 2019): over a
 * cell where no element of E is nullified, every g is sign-invariant on the sections of E, and off them the formula
 * is false. Lifting checks the nullification condition and the projection is recomputed without the constraint
 * when it fails.
 */
export interface Projection {
  readonly n: number;
  /** basis[k − 1]: the level-k basis (primitive, square-free, pairwise coprime, positive degree in xₖ). */
  readonly basis: readonly (readonly RPoly[])[];
  /** Indices into basis[n − 1] of the equational constraint's factors, when one is used. */
  readonly equational?: readonly number[];
}

/** The polynomials (any levels ≤ n) sorted into their true levels, deduplicated up to sign and integer content. */
function sortIntoLevels(ctx: ExecutionContext, polys: readonly { poly: RPoly; level: number }[], n: number): RPoly[][] {
  const levels: Map<string, RPoly>[] = Array.from({ length: n }, () => new Map());
  for (const p of polys) {
    const t = trueLevel(p.poly, p.level);
    if (t.level === 0) continue;
    const q = canonical(ctx, t.poly, t.level);
    levels[t.level - 1].set(key(q), q);
  }
  return levels.map(m => [...m.values()]);
}

/** Lazard's projection of the inputs (polynomials of level ≤ n), optionally with an equational constraint of level n. */
export function project(ctx: ExecutionContext, inputs: readonly { poly: RPoly; level: number }[], n: number, constraint?: RPoly): Projection {
  const pending = sortIntoLevels(ctx, inputs, n);
  const basis: RPoly[][] = Array.from({ length: n }, () => []);
  let equational: number[] | undefined;
  for (let k = n; k >= 1; k--) {
    ctx.tick();
    const below: { poly: RPoly; level: number }[] = [];
    const prims: RPoly[] = [];
    for (const f of pending[k - 1]) {
      if (k > 1) below.push({ poly: content(ctx, f, k), level: k - 1 });
      let pp = primitive(ctx, f, k);
      // A power of xₖ splits off (x³ + cyx² − ayx is x·(x² + cyx − ay)): its roots then get closed forms.
      if (degree(pp) > 0 && isZero((pp as readonly RPoly[])[0])) {
        let shift = 0;
        while (isZero((pp as readonly RPoly[])[shift])) shift++;
        prims.push(variable(k, k));
        pp = Object.freeze((pp as readonly RPoly[]).slice(shift));
      }
      if (degree(pp) > 0) prims.push(pp);
    }
    const B = coprimeBasis(ctx, prims, k);
    basis[k - 1] = B;
    if (k === 1) break;
    const E = k === n && constraint !== undefined ? B.flatMap((b, i) => (degree(gcd(ctx, b, constraint, k)) > 0 ? [i] : [])) : undefined;
    if (E) {
      demand(E.length > 0, 'verification-failed', 'an equational constraint without basis factors');
      equational = E;
    }
    const projected = (i: number) => !E || E.includes(i);
    B.forEach((f, i) => {
      if (!projected(i)) return;
      below.push({ poly: lc(f), level: k - 1 }, { poly: tc(f), level: k - 1 });
      if (degree(f) >= 2) below.push({ poly: discriminant(ctx, f, k), level: k - 1 });
    });
    for (let i = 0; i < B.length; i++) {
      for (let j = 0; j < i; j++) {
        if (!projected(i) && !projected(j)) continue;
        ctx.tick();
        const r = resultant(ctx, B[j], B[i], k);
        demand(!isZero(r), 'verification-failed', 'coprime basis elements with a zero resultant');
        below.push({ poly: r, level: k - 1 });
      }
    }
    const lower = sortIntoLevels(ctx, below, k - 1);
    for (let m = 1; m < k; m++) {
      const seen = new Set(pending[m - 1].map(key));
      for (const p of lower[m - 1]) if (!seen.has(key(p))) { pending[m - 1].push(p); seen.add(key(p)); }
    }
  }
  return equational ? { n, basis, equational } : { n, basis };
}
