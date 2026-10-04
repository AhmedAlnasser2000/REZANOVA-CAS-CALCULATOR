import { demand, type ExecutionContext } from '../execution';
import { factorQ } from '../algebra/factor';
import type { Polynomial } from '../algebra/polynomial';
import { integerToRational } from '../algebra/polynomial-division';
import { rational, type Rational } from '../algebra/rational';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { QX } from '../decision/rational-form';
import { pieces, sortedDistinct } from '../decision/real-set';
import { vanishes, zerosOf } from '../decision/univariate';
import { normalizeValue, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition, RelationProblem } from '../representation/relation';
import {
  compareValues, finiteSet, normalizeSet, setKey, unionSet, valueExpression, type Endpoint, type Point, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import {
  bExpression, coprimeBasis, content, degX, derivX, lcX, pExpression, primitive, resultantX, specialize, fromMPoly, type BPoly,
} from './bivariate';
import { decideAt, instantiate, type ParamAtom } from './specialize';

/**
 * One parameter p: exact cells.
 *
 * Over ℝ the projection — contents in p, leading coefficients, discriminants
 * and pairwise resultants of a coprime square-free basis in x — vanishes only
 * at finitely many real p. On each open cell between them every basis
 * polynomial keeps its degree and its number of distinct real roots, and roots
 * of different polynomials never meet, so the answer is decided at one
 * rational sample (slice 1) and every root in it is named by its place: the
 * j-th real root of the basis polynomial B(x, p), as −c₀/c₁ for degree 1,
 * (−b ∓ √D)/(2a) (sign fixed by sign(a) on the cell) for degree 2, and a
 * parametric root from degree 3. Each critical point is decided exactly
 * (algebraic coefficients). Adjacent pieces whose answers agree merge, so the
 * cases are exact parameter intervals and points with no redundant splits.
 *
 * Over ℂ the projection's complex zeros are the exceptional points; every
 * other p shares one generic answer, decided at a rational sample.
 */
export interface ParamCase { readonly conditions: readonly Condition[]; readonly set: SolutionSet }
export type CellsResult = { readonly kind: 'cases'; readonly cases: readonly ParamCase[] } | { readonly kind: 'refused'; readonly reason: string };

type P = Polynomial<Rational>;
const leaf = (poly: P) => ({ kind: 'rational' as const, poly });

interface Projection { readonly basis: readonly BPoly[]; readonly polys: readonly P[] }

/** The coprime basis in x and the projection polynomials in p. */
export function projection(ctx: ExecutionContext, atoms: readonly ParamAtom[]): Projection {
  const polys: P[] = [], prims: BPoly[] = [];
  for (const a of atoms) {
    const b = fromMPoly(ctx, a.poly, 0, 1);
    if (b.length === 0) continue;
    polys.push(content(ctx, b));
    const pp = primitive(ctx, b);
    if (degX(pp) > 0) prims.push(pp);
  }
  const basis = coprimeBasis(ctx, prims);
  basis.forEach((B, i) => {
    polys.push(lcX(B));
    if (degX(B) >= 2) polys.push(resultantX(ctx, B, derivX(ctx, B)));
    for (let j = 0; j < i; j++) polys.push(resultantX(ctx, basis[j], B));
  });
  for (const f of polys) demand(!QX.isZero(ctx, f), 'verification-failed', 'a vanishing projection polynomial');
  return { basis, polys: polys.filter(f => QX.degree(ctx, f) > 0) };
}

/** Distinct irreducible factors over ℚ of the projection polynomials. */
function factorsOf(ctx: ExecutionContext, polys: readonly P[]): { readonly q: P; readonly z: Polynomial<bigint> }[] {
  const byKey = new Map<string, { q: P; z: Polynomial<bigint> }>();
  for (const f of polys) {
    for (const { factor } of factorQ(ctx, QX, f, ALGEBRAIC_RING).factors) {
      byKey.set(factor.coefficients.join(','), { q: integerToRational(ctx, QX, factor), z: factor });
    }
  }
  return [...byKey.values()];
}

// ---- naming roots ----

function rootForm(store: ExpressionStore, B: BPoly, x: string, p: string, index: number, count: number, lcSign: number): PointValue {
  const c = B.map(v => pExpression(store, v, p));
  if (degX(B) === 1) return { kind: 'expression', id: store.div(store.neg(c[0]), c[1]) };
  if (degX(B) === 2 && count === 2) {
    const D = store.sub(store.mul(c[1], c[1]), store.mul(store.integer(4), c[2], c[0]));
    const sign = (index === 1 ? -1 : 1) * lcSign;
    return { kind: 'expression', id: store.div(store.add(store.neg(c[1]), store.mul(store.integer(sign), store.sqrt(D))), store.mul(store.integer(2), c[2])) };
  }
  return { kind: 'root', poly: bExpression(store, B, x, p), variable: x, index };
}

/** Name every value of a set decided at p = t by its place among the basis roots (real cells). */
function nameReal(store: ExpressionStore, set: SolutionSet, basis: readonly BPoly[], t: Rational, x: string, p: string): SolutionSet {
  const ctx = store.ctx;
  const spec = basis.map(B => {
    const poly = specialize(ctx, B, t);
    return { B, roots: sortedDistinct(store, zerosOf(store, leaf(poly), 'real')), lcSign: Math.sign(Number(QX.leading(ctx, poly).numerator)) };
  });
  const name = (v: PointValue): PointValue => {
    for (const s of spec) {
      const i = s.roots.findIndex(r => compareValues(store, r, v) === 0);
      if (i >= 0) return rootForm(store, s.B, x, p, i + 1, s.roots.length, s.lcSign);
    }
    return demand(false, 'verification-failed', 'a solution value is not a root of the basis') as never;
  };
  const end = (e: Endpoint): Endpoint => (e.kind === 'infinity' ? e : name(e));
  switch (set.kind) {
    case 'finite': return normalizeSet(store, finiteSet(set.variables, set.points.map(pt => pt.map(name))), 'real');
    case 'intervals': return { ...set, intervals: set.intervals.map(i => ({ ...i, lo: end(i.lo), hi: end(i.hi) })) };
    default: return demand(false, 'verification-failed', `unexpected ${set.kind} set over ℝ`) as never;
  }
}

/** Over ℂ: a generic set is a union of whole root sets of basis polynomials. */
function nameComplex(store: ExpressionStore, set: SolutionSet, basis: readonly BPoly[], t: Rational, x: string, p: string): SolutionSet | string {
  const ctx = store.ctx, pts = set.kind === 'finite' ? set.points : set.kind === 'cofinite' ? set.except : [];
  const hits = new Map<number, number>();
  for (const [v] of pts) {
    const k = basis.findIndex(B => vanishes(store, leaf(specialize(ctx, B, t)), v as ExactValue));
    demand(k >= 0, 'verification-failed', 'a solution value is not a root of the basis');
    hits.set(k, (hits.get(k) ?? 0) + 1);
  }
  const points: Point[] = [], rootSets: SolutionSet[] = [];
  for (const [k, n] of [...hits].sort((a, b) => a[0] - b[0])) {
    const B = basis[k];
    demand(n === degX(B), 'verification-failed', 'a basis polynomial contributes only some of its roots');
    if (degX(B) <= 2) {
      for (let j = 1; j <= degX(B); j++) points.push([complexForm(store, B, p, j)]);
    } else if (set.kind === 'cofinite') {
      return 'excluding the roots of a parametric polynomial of degree ≥ 3 over ℂ';
    } else rootSets.push({ kind: 'root-set', variables: [x], poly: bExpression(store, B, x, p) });
  }
  if (set.kind === 'cofinite') return normalizeSet(store, { kind: 'cofinite', variables: [x], except: points }, 'complex');
  if (rootSets.length === 0) return normalizeSet(store, finiteSet([x], points), 'complex');
  return unionSet([...(points.length ? [finiteSet([x], points)] : []), ...rootSets]);
}

function complexForm(store: ExpressionStore, B: BPoly, p: string, j: number): PointValue {
  const c = B.map(v => pExpression(store, v, p));
  if (degX(B) === 1) return { kind: 'expression', id: store.div(store.neg(c[0]), c[1]) };
  const D = store.sub(store.mul(c[1], c[1]), store.mul(store.integer(4), c[2], c[0]));
  return { kind: 'expression', id: store.div(store.add(store.neg(c[1]), store.mul(store.integer(j === 1 ? -1 : 1), store.sqrt(D))), store.mul(store.integer(2), c[2])) };
}

// ---- decisions ----

const same = (store: ExpressionStore, a: SolutionSet | undefined, b: SolutionSet) => a !== undefined && setKey(store, a) === setKey(store, b);

export function decideCells(problem: RelationProblem, atoms: readonly ParamAtom[]): CellsResult {
  const store = problem.store, ctx = store.ctx, x = problem.targets[0], p = problem.parameters[0], ps = store.symbol(p);
  const { basis, polys } = projection(ctx, atoms);
  const at = (e: ExprId) => decideAt(problem, new Map([[p, e]]));
  const check = (symbolic: SolutionSet, e: ExprId, decided: SolutionSet) => {
    demand(same(store, instantiate(store, symbolic, new Map([[p, e]]), problem.domain), decided), 'verification-failed', 'a named answer differs from its sample');
  };

  if (problem.domain === 'complex') {
    const factors = factorsOf(ctx, polys);
    let n = 0, t = rational(ctx, 0n);
    for (; factors.some(f => QX.evaluate(ctx, f.q, t).numerator === 0n); n++) t = rational(ctx, BigInt(n % 2 ? (n + 1) / 2 : -n / 2));
    const generic = at(store.number(t));
    if (generic.kind === 'refused') return { kind: 'refused', reason: generic.reason };
    const named = nameComplex(store, generic.set, basis, t, x, p);
    if (typeof named === 'string') return { kind: 'refused', reason: named };
    check(named, store.number(t), generic.set);
    const cases: ParamCase[] = [], kept: Condition[] = [];
    for (const f of factors) {
      const points: ParamCase[] = [];
      for (const root of store.roots.roots(ctx, f.z)) {
        const c = valueExpression(store, normalizeValue(root)), d = at(c);
        if (d.kind === 'refused') return { kind: 'refused', reason: d.reason };
        points.push({ conditions: [{ kind: 'equal', expr: ps, other: c }], set: d.set });
      }
      if (points.every(pc => same(store, instantiate(store, named, new Map([[p, (pc.conditions[0] as { other: ExprId }).other]]), 'complex'), pc.set))) continue;
      kept.push({ kind: 'nonzero', expr: pExpression(store, f.q, p) });
      cases.push(...points);
    }
    return { kind: 'cases', cases: [{ conditions: kept, set: named }, ...cases] };
  }

  const critical = sortedDistinct(store, polys.flatMap(f => zerosOf(store, leaf(f), 'real')));
  const parts = pieces(store, critical);
  const sets: SolutionSet[] = [];
  for (const piece of parts) {
    const e = piece.kind === 'open' ? store.number(piece.sample) : valueExpression(store, piece.value);
    const d = at(e);
    if (d.kind === 'refused') return { kind: 'refused', reason: d.reason };
    if (piece.kind === 'point') { sets.push(d.set); continue; }
    const named = nameReal(store, d.set, basis, piece.sample, x, p);
    check(named, e, d.set);
    sets.push(named);
  }
  // Merge: a point joins a neighbouring cell whose named answer, instantiated there, is its answer.
  const groups: { from: number; to: number; set: SolutionSet; holes: number[] }[] = [{ from: 0, to: 0, set: sets[0], holes: [] }];
  for (let i = 1; i < parts.length; i += 2) {
    const c = valueExpression(store, critical[(i - 1) >> 1]), values = new Map([[p, c]]);
    const last = groups[groups.length - 1], next = sets[i + 1];
    const left = same(store, instantiate(store, last.set, values, 'real'), sets[i]);
    const right = same(store, instantiate(store, next, values, 'real'), sets[i]);
    if (left && setKey(store, last.set) === setKey(store, next)) { last.to = i + 1; continue; }
    if (left) { last.to = i; groups.push({ from: i + 1, to: i + 1, set: next, holes: [] }); continue; }
    if (right) { groups.push({ from: i, to: i + 1, set: next, holes: [] }); continue; }
    if (last.to === i - 1 && setKey(store, last.set) === setKey(store, next)) {
      // The same answer on both sides of an exceptional point: one case with p ≠ c, and the point its own case.
      groups.push({ from: i, to: i, set: sets[i], holes: [] });
      last.to = i + 1; last.holes.push((i - 1) >> 1);
      groups.push(groups.splice(groups.indexOf(last), 1)[0]);
      continue;
    }
    groups.push({ from: i, to: i, set: sets[i], holes: [] }, { from: i + 1, to: i + 1, set: next, holes: [] });
  }
  const cut = (k: number) => valueExpression(store, critical[k]);
  return {
    kind: 'cases',
    cases: groups.map(g => {
      if (g.from === g.to && g.from % 2 === 1) return { conditions: [{ kind: 'equal', expr: ps, other: cut((g.from - 1) >> 1) }], set: g.set };
      const conditions: Condition[] = [];
      if (g.from > 0) conditions.push(g.from % 2 === 1 ? { kind: 'nonnegative', expr: store.sub(ps, cut((g.from - 1) >> 1)) } : { kind: 'positive', expr: store.sub(ps, cut((g.from >> 1) - 1)) });
      if (g.to < parts.length - 1) conditions.push(g.to % 2 === 1 ? { kind: 'nonnegative', expr: store.sub(cut((g.to - 1) >> 1), ps) } : { kind: 'positive', expr: store.sub(cut(g.to >> 1), ps) });
      for (const h of g.holes) conditions.push({ kind: 'not-equal', expr: ps, other: cut(h) });
      return { conditions, set: g.set };
    }),
  };
}
