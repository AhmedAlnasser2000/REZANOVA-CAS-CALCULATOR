import { attachForm } from '../decision/radical-forms';
import type { Refusal } from '../decision/rational-form';
import { assemble } from '../decision/real-set';
import type { AtomOperator } from '../decision/univariate';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign } from '../representation/real-order';
import type { Condition, RelationProblem } from '../representation/relation';
import type { PointValue, SolutionSet } from '../representation/solution-set';
import { decidePeriodic } from '../periodic/decide';
import { inFamilies, type FamilyZeros, type PeriodicZeros } from '../periodic/families';
import { zerosOf, type ZeroInterval } from './inversion';
import { sampleBetween } from './samples';
import { rewriteGenerators } from './solve';
import { decideIntervalFamilies } from '../composition/families';

/**
 * Exact one-dimensional decision with closed-form critical points.
 *
 * Every relation and condition is an atom F op 0 whose complete real zero set
 * is known in closed form (`zerosOf`): finitely many points and intervals.
 * Sorted, those points and interval endpoints split ℝ into pieces on which
 * every atom has constant sign. Each atom is evaluated at one rational sample
 * per open piece and at each critical point: zero by membership in its own
 * zero set, otherwise nonzero — which is what makes certified refinement
 * terminate (an identically zero piece is never refined). Conditions come
 * first, innermost first, so an atom is never evaluated outside its natural
 * domain.
 */
export interface ClosedAtom {
  readonly f: ExprId;
  readonly op: AtomOperator;
  /** Zero points, closed interval endpoints included. */
  readonly zeros: ReadonlySet<ExprId> | 'all';
  readonly intervals: readonly ZeroInterval[];
  /** Affine zero families r + P·ℤ (slice 4). */
  readonly periodic: readonly PeriodicZeros[];
  /** Zero families in integer parameters (slice 4). */
  readonly families: readonly FamilyZeros[];
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
    if (z.kind === 'all') { atoms.push({ f: a.f, op: a.op, zeros: 'all', intervals: [], periodic: [], families: [] }); continue; }
    const intervals = z.intervals ?? [], zeros = new Set(z.values);
    for (const i of intervals) { if (i.loClosed && i.lo !== undefined) zeros.add(i.lo); if (i.hiClosed && i.hi !== undefined) zeros.add(i.hi); }
    atoms.push({ f: a.f, op: a.op, zeros, intervals, periodic: z.periodic ?? [], families: z.families ?? [] });
  }
  return { atoms };
}

/** Whether a point lies in the open interior of a zero interval (its endpoints are compared exactly, never equal to it). */
function inInterior(store: ExpressionStore, i: ZeroInterval, point: ExprId): boolean {
  if (point === i.lo || point === i.hi) return false;
  return (i.lo === undefined || realCompare(store, point, i.lo) > 0) && (i.hi === undefined || realCompare(store, point, i.hi) < 0);
}

/** Sign of an atom at a point (a closed form, or a rational sample that is no atom's isolated zero). */
export function atomSign(store: ExpressionStore, atom: ClosedAtom, x: string, point: ExprId): -1 | 0 | 1 {
  if (atom.zeros === 'all' || atom.zeros.has(point)) return 0;
  if (atom.intervals.some(i => inInterior(store, i, point))) return 0;
  // Members of affine zero families (exact: (point − r)/P is an integer).
  if (inFamilies(store, atom.periodic, point)) return 0;
  return realSign(store, store.substitute(atom.f, new Map([[x, point]])));
}

export function allHold(store: ExpressionStore, atoms: readonly ClosedAtom[], x: string, point: ExprId): boolean {
  for (const a of atoms) if (!holds(a.op, atomSign(store, a, x, point))) return false;
  return true;
}

/** Closed form as a solution value: exact numbers when exact (with proven radical forms), else the expression. */
export function pointValue(store: ExpressionStore, id: ExprId): PointValue {
  const e = evaluateExact(store, id, 'real');
  if (e.kind !== 'exact') return { kind: 'expression', id };
  return e.value.kind === 'algebraic' ? attachForm(store, e.value) : e.value;
}

/** Distinct critical points in increasing order; numerically equal closed forms are merged into one representative. */
function sortedCritical(store: ExpressionStore, atoms: readonly ClosedAtom[]): { points: ExprId[]; representative: Map<ExprId, ExprId> } {
  const distinct = new Set<ExprId>();
  for (const a of atoms) {
    if (a.zeros !== 'all') for (const z of a.zeros) distinct.add(z);
    for (const i of a.intervals) { if (i.lo !== undefined) distinct.add(i.lo); if (i.hi !== undefined) distinct.add(i.hi); }
  }
  const sorted = [...distinct].sort((a, b) => realCompare(store, a, b));
  const points: ExprId[] = [], representative = new Map<ExprId, ExprId>();
  for (const c of sorted) {
    const last = points[points.length - 1];
    if (last !== undefined && realCompare(store, last, c) === 0) { representative.set(c, last); continue; }
    points.push(c);
    representative.set(c, c);
  }
  return { points, representative };
}

/** The atom with its zero points and interval endpoints mapped to the merged representatives. */
function canonicalAtom(atom: ClosedAtom, representative: ReadonlyMap<ExprId, ExprId>): ClosedAtom {
  const rep = (c: ExprId) => representative.get(c) ?? c;
  if (atom.zeros === 'all') return atom;
  return {
    ...atom,
    zeros: new Set([...atom.zeros].map(rep)),
    intervals: atom.intervals.map(i => ({ ...i, lo: i.lo === undefined ? undefined : rep(i.lo), hi: i.hi === undefined ? undefined : rep(i.hi) })),
  };
}

export function decideClosedForm(problem: RelationProblem): ClosedDecision {
  const s = problem.store, x = problem.targets[0];
  const built = closedAtoms(problem);
  if ('refusal' in built) {
    // Families through a non-affine common argument the zero finder cannot invert (sin x³ ≥ 1/2), slice 5.
    if (built.refusal.owner !== 'EQUATION-COMPOSITION1') return { kind: 'refused', refusal: built.refusal };
    const families = decideIntervalFamilies(problem, decideClosedForm, rewriteGenerators, (e, v) => zerosOf(s, e, v));
    return families.kind === 'refused' ? { kind: 'refused', refusal: built.refusal } : families;
  }
  if (built.atoms.some(a => a.periodic.length || a.families.length)) {
    const periodic = decidePeriodic(problem, built.atoms);
    // Inequalities with families that are not affine in k (slice 5): interval families through the common argument.
    if (periodic.kind !== 'refused' || !built.atoms.some(a => a.families.length)) return periodic;
    const families = decideIntervalFamilies(problem, decideClosedForm, rewriteGenerators, (e, v) => zerosOf(s, e, v));
    return families.kind === 'refused' ? periodic : families;
  }
  const { points: critical, representative } = sortedCritical(s, built.atoms);
  const atoms = built.atoms.map(a => canonicalAtom(a, representative));
  // Pieces: open (before c₀), point c₀, open (c₀, c₁), …, point cₖ, open (after cₖ).
  const truth: boolean[] = [];
  truth.push(allHold(s, atoms, x, sampleBetween(s, undefined, critical[0])));
  critical.forEach((c, i) => {
    truth.push(allHold(s, atoms, x, c));
    truth.push(allHold(s, atoms, x, sampleBetween(s, c, critical[i + 1])));
  });
  const values = critical.map(c => pointValue(s, c));
  const intervals = assemble(values, truth);
  if (intervals.length === 0) return { kind: 'empty' };
  if (intervals.every(i => i.loClosed && i.hiClosed && i.lo === i.hi)) {
    return { kind: 'set', set: { kind: 'finite', variables: [x], points: intervals.map(i => [i.lo as PointValue]) } };
  }
  return { kind: 'set', set: { kind: 'intervals', variables: [x], intervals } };
}
