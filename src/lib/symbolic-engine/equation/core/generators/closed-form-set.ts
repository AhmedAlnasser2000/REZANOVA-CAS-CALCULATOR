import type { ExecutionContext } from '../execution';
import { rAdd, rational, rDivide, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { attachForm } from '../decision/radical-forms';
import type { Refusal } from '../decision/rational-form';
import { assemble } from '../decision/real-set';
import type { AtomOperator } from '../decision/univariate';
import { enclose } from '../representation/enclosure';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign, START_BITS } from '../representation/real-order';
import type { Condition, RelationProblem } from '../representation/relation';
import type { PointValue, SolutionSet } from '../representation/solution-set';
import { zerosOf } from './inversion';

/**
 * Exact one-dimensional decision with closed-form critical points.
 *
 * Every relation and condition is an atom F op 0 whose complete real zero set
 * is known in closed form (`zerosOf`). Sorted, those zeros split ℝ into
 * pieces on which every atom has constant sign. Each atom is evaluated at one
 * rational sample per open piece and at each critical point: zero by
 * membership in its own zero list, otherwise nonzero — which is what makes
 * certified refinement terminate. Conditions come first, innermost first, so
 * an atom is never evaluated outside its natural domain.
 */
export interface ClosedAtom {
  readonly f: ExprId;
  readonly op: AtomOperator;
  readonly zeros: ReadonlySet<ExprId> | 'all';
}

export type ClosedDecision =
  | { readonly kind: 'set'; readonly set: SolutionSet }
  | { readonly kind: 'empty' }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

const CONDITION_OPERATOR: Readonly<Record<string, AtomOperator>> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };

export function holds(op: AtomOperator, sign: -1 | 0 | 1): boolean {
  switch (op) {
    case 'eq': return sign === 0;
    case 'ne': return sign !== 0;
    case 'lt': return sign < 0;
    case 'le': return sign <= 0;
    case 'gt': return sign > 0;
    case 'ge': return sign >= 0;
  }
}

/** Atoms of a leaf, conditions first (by height), each with its complete zero set; or a refusal. */
export function closedAtoms(problem: RelationProblem): { atoms: ClosedAtom[] } | { refusal: Refusal } {
  const s = problem.store, x = problem.targets[0];
  const raw: { f: ExprId; op: AtomOperator }[] = [];
  const conditions = [...problem.conditions as readonly Condition[]].filter(c => c.kind !== 'in-domain')
    .map(c => ({ f: 'other' in c ? s.sub(c.expr, c.other) : c.expr, op: CONDITION_OPERATOR[c.kind] }))
    .sort((a, b) => s.height(a.f) - s.height(b.f));
  raw.push(...conditions, ...problem.relations.map(r => ({ f: s.sub(r.lhs, r.rhs), op: r.op })));
  const atoms: ClosedAtom[] = [];
  for (const a of raw) {
    const z = zerosOf(s, a.f, x);
    if (z.kind === 'refused') return { refusal: z.refusal };
    atoms.push({ f: a.f, op: a.op, zeros: z.kind === 'all' ? 'all' : new Set(z.values) });
  }
  return { atoms };
}

/** Sign of an atom at a point (a closed form, or a rational sample that is no atom's zero). */
export function atomSign(store: ExpressionStore, atom: ClosedAtom, x: string, point: ExprId): -1 | 0 | 1 {
  if (atom.zeros === 'all' || atom.zeros.has(point)) return 0;
  return realSign(store, store.substitute(atom.f, new Map([[x, point]])));
}

export function allHold(store: ExpressionStore, atoms: readonly ClosedAtom[], x: string, point: ExprId): boolean {
  for (const a of atoms) if (!holds(a.op, atomSign(store, a, x, point))) return false;
  return true;
}

function floorOf(r: Rational): bigint { return r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator); }

/**
 * The rational with the smallest denominator in the open interval (lo, hi),
 * lo < hi (continued fractions). Simple samples keep later exact evaluation
 * cheap: e^{s·ln 2} at s = 1/2 is √2, not a root of degree 2³².
 */
export function simplestBetween(ctx: ExecutionContext, lo: Rational, hi: Rational | undefined): Rational {
  ctx.tick();
  const a = floorOf(lo);
  if (hi === undefined || compareRational(ctx, rational(ctx, a + 1n), hi) < 0) return rational(ctx, a + 1n);
  // (lo, hi) ⊂ [a, a + 1]: recurse on the reciprocals of the fractional parts.
  const fracLo = rSubtract(ctx, lo, rational(ctx, a)), fracHi = rSubtract(ctx, hi, rational(ctx, a));
  const inner = simplestBetween(ctx, rDivide(ctx, rational(ctx, 1n), fracHi), fracLo.numerator === 0n ? undefined : rDivide(ctx, rational(ctx, 1n), fracLo));
  return rAdd(ctx, rational(ctx, a), rDivide(ctx, rational(ctx, 1n), inner));
}

/** A simple rational strictly between closed forms a < b (enclosures refined until they separate). */
export function rationalBetween(store: ExpressionStore, a: ExprId, b: ExprId): Rational {
  const ctx = store.ctx;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const ea = enclose(store, a, bits), eb = enclose(store, b, bits);
    if (ea.kind === 'bounds' && eb.kind === 'bounds' && compareRational(ctx, ea.hi, eb.lo) < 0) return simplestBetween(ctx, ea.hi, eb.lo);
  }
}

/** An integer below (side −1) or above (side +1) a closed form. */
function outside(store: ExpressionStore, c: ExprId, side: -1 | 1): Rational {
  const ctx = store.ctx;
  for (let bits = START_BITS; ; bits *= 2) {
    const e = enclose(store, c, bits);
    if (e.kind === 'bounds') return rational(ctx, side < 0 ? floorOf(e.lo) - 1n : floorOf(e.hi) + 1n);
  }
}

/** Closed form as a solution value: exact numbers when exact (with proven radical forms), else the expression. */
export function pointValue(store: ExpressionStore, id: ExprId): PointValue {
  const e = evaluateExact(store, id, 'real');
  if (e.kind !== 'exact') return { kind: 'expression', id };
  return e.value.kind === 'algebraic' ? attachForm(store, e.value) : e.value;
}

export function decideClosedForm(problem: RelationProblem): ClosedDecision {
  const s = problem.store, x = problem.targets[0];
  const built = closedAtoms(problem);
  if ('refusal' in built) return { kind: 'refused', refusal: built.refusal };
  const atoms = built.atoms;
  const distinct = new Set<ExprId>();
  for (const a of atoms) if (a.zeros !== 'all') for (const z of a.zeros) distinct.add(z);
  const critical = [...distinct].sort((a, b) => realCompare(s, a, b));
  // Pieces: open (before c₀), point c₀, open (c₀, c₁), …, point cₖ, open (after cₖ).
  const truth: boolean[] = [];
  const sample = (r: Rational) => s.number(r);
  truth.push(allHold(s, atoms, x, critical.length ? sample(outside(s, critical[0], -1)) : s.integer(0)));
  critical.forEach((c, i) => {
    truth.push(allHold(s, atoms, x, c));
    const next = i + 1 < critical.length ? rationalBetween(s, c, critical[i + 1]) : outside(s, c, 1);
    truth.push(allHold(s, atoms, x, sample(next)));
  });
  const values = critical.map(c => pointValue(s, c));
  const intervals = assemble(values, truth);
  if (intervals.length === 0) return { kind: 'empty' };
  if (intervals.every(i => i.loClosed && i.hiClosed && i.lo === i.hi)) {
    return { kind: 'set', set: { kind: 'finite', variables: [x], points: intervals.map(i => [i.lo as PointValue]) } };
  }
  return { kind: 'set', set: { kind: 'intervals', variables: [x], intervals } };
}
