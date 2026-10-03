import { evaluateExact, type EvaluationDomain } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { PointValue } from '../representation/solution-set';
import type { RootOf } from '../algebraic/root-of';

/**
 * Radical presentation of algebraic values. A closed form is attached only
 * when exact evaluation proves it is the same root; the RootOf stays the
 * identity. Covered: roots of quadratics, (−b ± √(b² − 4ac))/(2a) or ±√(−c/a)
 * when b = 0, and real
 * roots of binomials a·xⁿ − b, ±(b/a)^(1/n). Everything else stays RootOf.
 */
type Algebraic = Extract<PointValue, { kind: 'algebraic' }>;

function candidates(store: ExpressionStore, root: RootOf): ExprId[] {
  const s = store, m = root.poly.coefficients, n = m.length - 1, int = (v: bigint) => s.integer(v);
  if (n === 2) {
    const [c, b, a] = m, d = b * b - 4n * a * c;
    if (b === 0n) {
      const r = s.sqrt(s.fraction(-c, a));
      return [r, s.neg(r)];
    }
    return [1, -1].map(sign => s.div(s.add(int(-b), s.mul(s.integer(sign), s.sqrt(int(d)))), int(2n * a)));
  }
  if (n >= 3 && m.slice(1, -1).every(c => c === 0n) && root.kind === 'real') {
    const a = m[n], b = -m[0], ratio = s.fraction(b < 0n ? -b : b, a), principal = s.root(ratio, n);
    if (b > 0n) return n % 2 === 0 ? [principal, s.neg(principal)] : [principal];
    if (b < 0n && n % 2 === 1) return [s.neg(principal)];
  }
  return [];
}

/** Whether `form` evaluates exactly to `root`. */
export function formMatches(store: ExpressionStore, form: ExprId, root: RootOf): boolean {
  const domain: EvaluationDomain = root.kind === 'real' ? 'real' : 'complex';
  const e = evaluateExact(store, form, domain);
  return e.kind === 'exact' && e.value.kind === 'algebraic' && store.roots.same(store.ctx, e.value.root, root);
}

export function attachForm(store: ExpressionStore, v: Algebraic): Algebraic {
  if ('form' in v && v.form !== undefined) return v;
  for (const form of candidates(store, v.root)) if (formMatches(store, form, v.root)) return Object.freeze({ kind: 'algebraic', root: v.root, form });
  return v;
}
