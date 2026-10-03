import { demand } from '../execution';
import { factorQ } from '../algebra/factor';
import type { Polynomial } from '../algebra/polynomial';
import { divides, rationalToPrimitive } from '../algebra/polynomial-division';
import type { Rational } from '../algebra/rational';
import { ALGEBRAIC_RING, signAtReal } from '../algebraic/root-of';
import { normalizeValue, type EvaluationDomain, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition, RelationProblem } from '../representation/relation';
import { valueKey, type Point, type SolutionSet } from '../representation/solution-set';
import { normPolynomial, signAt, vanishesAt } from './algebraic-coefficients';
import { attachForm } from './radical-forms';
import { exactPolynomial, multiplyForms, QX, rationalForm, type LeafPoly, type Refusal } from './rational-form';
import { assemble, pieces, sortedDistinct } from './real-set';

/**
 * Decide a conjunction of polynomial atoms P op 0 in one variable, over ℝ or ℂ.
 * Every relation and condition of a problem becomes one atom; the answer is
 * the exact set of values satisfying all of them.
 */
export type AtomOperator = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge';
export type Atom = { readonly kind: 'poly'; readonly poly: LeafPoly; readonly op: AtomOperator } | { readonly kind: 'false'; readonly reason: string };

export type LeafDecision =
  | { readonly kind: 'set'; readonly set: SolutionSet }
  | { readonly kind: 'empty' }
  | { readonly kind: 'refused'; readonly refusal: Refusal; readonly unsupported?: boolean };

class Refused { readonly refusal: Refusal; readonly unsupported: boolean; constructor(r: Refusal, unsupported = false) { this.refusal = r; this.unsupported = unsupported; } }

function isZeroPoly(p: LeafPoly): boolean { return p.kind === 'rational' ? p.poly.coefficients.length === 0 : p.coefficients.length === 0; }

/** The atom for e op 0, from the exact rational form n/d of e (d ≠ 0 holds under the problem's conditions). */
function atomOf(store: ExpressionStore, e: ExprId, op: AtomOperator, variable: string, domain: EvaluationDomain): Atom {
  const r = rationalForm(store, e, variable);
  if (!r.ok) {
    if ('undefinedEverywhere' in r) return { kind: 'false', reason: r.undefinedEverywhere };
    throw new Refused(r.refusal);
  }
  if (domain === 'complex' && op !== 'eq' && op !== 'ne') throw new Refused({ owner: 'EQUATION-POLYNOMIAL-DECISION1', detail: 'order conditions over ℂ' }, true);
  const den = exactPolynomial(store, r.form.den, domain);
  if (den.kind === 'undefined') return { kind: 'false', reason: den.detail };
  if (den.kind === 'refused') throw new Refused(den.refusal);
  if (isZeroPoly(den.poly)) return { kind: 'false', reason: 'a denominator that is identically zero' };
  const target = op === 'eq' || op === 'ne' ? r.form.num : multiplyForms(store, r.form.num, r.form.den);
  const exact = exactPolynomial(store, target, domain);
  if (exact.kind === 'undefined') return { kind: 'false', reason: exact.detail };
  if (exact.kind === 'refused') throw new Refused(exact.refusal);
  return { kind: 'poly', poly: exact.poly, op };
}

const CONDITION_OPERATOR: Readonly<Record<string, AtomOperator>> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };

export function problemAtoms(problem: RelationProblem): Atom[] {
  const s = problem.store, x = problem.targets[0], domain = problem.domain;
  const atoms = problem.relations.map(r => atomOf(s, s.sub(r.lhs, r.rhs), r.op, x, domain));
  for (const c of problem.conditions as readonly Condition[]) {
    if (c.kind === 'in-domain') continue; // its denominators are recorded as nonzero conditions
    const e = 'other' in c ? s.sub(c.expr, c.other) : c.expr;
    atoms.push(atomOf(s, e, CONDITION_OPERATOR[c.kind], x, domain));
  }
  return atoms;
}

// ---- zeros and values ----

/** Distinct zeros of a nonzero polynomial in the domain (exact values). */
export function zerosOf(store: ExpressionStore, p: LeafPoly, domain: EvaluationDomain): ExactValue[] {
  const ctx = store.ctx;
  demand(!isZeroPoly(p), 'invalid-input', 'zeros of the zero polynomial');
  const rational = p.kind === 'rational' ? p.poly : normPolynomial(store, p.coefficients);
  if (QX.degree(ctx, rational) <= 0) return [];
  const out: ExactValue[] = [];
  for (const { factor } of factorQ(ctx, QX, rational, ALGEBRAIC_RING).factors) {
    for (const root of store.roots.roots(ctx, factor)) {
      if (domain === 'real' && root.kind !== 'real') continue;
      const v = normalizeValue(root);
      if (p.kind === 'algebraic' && !vanishesAt(ctx, p.coefficients, v)) continue;
      out.push(v);
    }
  }
  return out;
}

function rationalSign(n: bigint): -1 | 0 | 1 { return n === 0n ? 0 : n < 0n ? -1 : 1; }

/** Sign of P at a real value (exact). */
export function signOf(store: ExpressionStore, p: LeafPoly, v: ExactValue): -1 | 0 | 1 {
  const ctx = store.ctx;
  if (isZeroPoly(p)) return 0;
  if (p.kind === 'algebraic') return signAt(ctx, p.coefficients, v);
  if (v.kind === 'rational') return rationalSign(QX.evaluate(ctx, p.poly, v.value).numerator);
  demand(v.root.kind === 'real', 'invalid-input', 'sign at a non-real value');
  return signAtReal(ctx, p.poly, v.root);
}

/** Whether P(v) = 0 (exact, any domain). */
export function vanishes(store: ExpressionStore, p: LeafPoly, v: ExactValue): boolean {
  const ctx = store.ctx;
  if (isZeroPoly(p)) return true;
  if (p.kind === 'algebraic') return vanishesAt(ctx, p.coefficients, v);
  if (v.kind === 'rational') return QX.evaluate(ctx, p.poly, v.value).numerator === 0n;
  return divides(ctx, ALGEBRAIC_RING, v.root.poly, rationalToPrimitive(ctx, ALGEBRAIC_RING, p.poly as Polynomial<Rational>).primitive);
}

function holds(op: AtomOperator, sign: -1 | 0 | 1): boolean {
  switch (op) {
    case 'eq': return sign === 0;
    case 'ne': return sign !== 0;
    case 'lt': return sign < 0;
    case 'le': return sign <= 0;
    case 'gt': return sign > 0;
    case 'ge': return sign >= 0;
  }
}

/** Whether every atom holds at the value (exact). */
export function satisfiesAll(store: ExpressionStore, atoms: readonly Atom[], v: ExactValue, domain: EvaluationDomain): boolean {
  return atoms.every(a => a.kind === 'poly' && (domain === 'real' ? holds(a.op, signOf(store, a.poly, v)) : holds(a.op, vanishes(store, a.poly, v) ? 0 : 1)));
}

// ---- decisions ----

function decideReal(store: ExpressionStore, atoms: readonly Atom[], variable: string): LeafDecision {
  const polys = atoms as readonly Extract<Atom, { kind: 'poly' }>[];
  const critical = sortedDistinct(store, polys.filter(a => !isZeroPoly(a.poly)).flatMap(a => zerosOf(store, a.poly, 'real')));
  const parts = pieces(store, critical);
  const truth = parts.map(piece => {
    store.ctx.tick();
    const v: ExactValue = piece.kind === 'open' ? { kind: 'rational', value: piece.sample } : piece.value;
    return polys.every(a => holds(a.op, signOf(store, a.poly, v)));
  });
  const intervals = assemble(critical, truth);
  if (intervals.length === 0) return { kind: 'empty' };
  const degenerate = intervals.every(i => i.loClosed && i.hiClosed && i.lo === i.hi);
  if (degenerate) return { kind: 'set', set: { kind: 'finite', variables: [variable], points: intervals.map(i => [i.lo as ExactValue]) } };
  return { kind: 'set', set: { kind: 'intervals', variables: [variable], intervals } };
}

function decideComplex(store: ExpressionStore, atoms: readonly Atom[], variable: string): LeafDecision {
  const polys = atoms as readonly Extract<Atom, { kind: 'poly' }>[];
  const equations = polys.filter(a => a.op === 'eq' && !isZeroPoly(a.poly));
  if (equations.length) {
    const degree = (p: LeafPoly) => (p.kind === 'rational' ? p.poly.coefficients.length : p.coefficients.length);
    const pivot = equations.reduce((a, b) => (degree(b.poly) < degree(a.poly) ? b : a));
    const points = zerosOf(store, pivot.poly, 'complex').filter(v => satisfiesAll(store, polys, v, 'complex'));
    return points.length ? { kind: 'set', set: { kind: 'finite', variables: [variable], points: points.map(v => [v]) } } : { kind: 'empty' };
  }
  if (polys.some(a => a.op === 'ne' && isZeroPoly(a.poly))) return { kind: 'empty' };
  const except = new Map<string, ExactValue>();
  for (const a of polys) if (a.op === 'ne') for (const v of zerosOf(store, a.poly, 'complex')) except.set(valueKey(store, v), v);
  return { kind: 'set', set: { kind: 'cofinite', variables: [variable], except: [...except.values()].map(v => [v]) } };
}

function withForms(store: ExpressionStore, set: SolutionSet): SolutionSet {
  const point = (p: Point): Point => p.map(v => (v.kind === 'algebraic' ? attachForm(store, v) : v));
  switch (set.kind) {
    case 'finite': return { ...set, points: set.points.map(point) };
    case 'cofinite': return { ...set, except: set.except.map(point) };
    case 'intervals': return {
      ...set,
      intervals: set.intervals.map(i => ({
        ...i,
        lo: i.lo.kind === 'algebraic' ? attachForm(store, i.lo) : i.lo,
        hi: i.hi.kind === 'algebraic' ? attachForm(store, i.hi) : i.hi,
      })),
    };
    default: return set;
  }
}

/** Decide a leaf problem in one target (relations and conditions as atoms). */
export function decideLeaf(problem: RelationProblem): LeafDecision {
  demand(problem.targets.length === 1, 'invalid-input', 'one target expected');
  let atoms: Atom[];
  try {
    atoms = problemAtoms(problem);
  } catch (e) {
    if (e instanceof Refused) return { kind: 'refused', refusal: e.refusal, ...(e.unsupported ? { unsupported: true } : {}) };
    throw e;
  }
  if (atoms.some(a => a.kind === 'false')) return { kind: 'empty' };
  const x = problem.targets[0];
  const result = problem.domain === 'real' ? decideReal(problem.store, atoms, x) : decideComplex(problem.store, atoms, x);
  return result.kind === 'set' ? { kind: 'set', set: withForms(problem.store, result.set) } : result;
}
