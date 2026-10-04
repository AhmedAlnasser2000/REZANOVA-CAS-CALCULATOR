import { demand } from '../execution';
import { rational } from '../algebra/rational';
import { exactPolynomial, rationalForm } from '../decision/rational-form';
import { pieces, sortedDistinct } from '../decision/real-set';
import { zerosOf } from '../decision/univariate';
import { evaluateExact, type ExactValue } from '../representation/evaluate';
import { realSign } from '../representation/real-order';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition, ProblemDomain, RelationProblem } from '../representation/relation';
import {
  assertOutcome, compareValues, finiteSet, normalizeSet, setKey, valueExpression, type Case, type Endpoint, type EquationOutcome, type Interval, type Point, type PointValue,
  type SolutionSet,
} from '../representation/solution-set';
import { verifyProofLog } from '../representation/transform';
import { decideParametricProblem } from './solve';
import { fractionOf } from './mpoly';
import { canonical, decideAt, instantiate } from './specialize';

/**
 * Independent evidence for a parameters outcome:
 * - the proof log is the problem itself (one state, no steps);
 * - specialization: parameter samples are taken from the cases' own
 *   conditions (one parameter: every zero of every condition and a rational
 *   between and beyond them; ℂ: those zeros and generic rationals; several:
 *   a grid of small rationals). Every sample must satisfy the conditions of
 *   exactly one case (the cases tile the parameter space), and there the
 *   case's set must equal the problem decided by slice 1 with the parameters
 *   replaced by the sample. With one parameter every case must be sampled;
 * - finally, re-deriving gives the same canonical case tree.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

export function verifyParametricOutcome(problem: RelationProblem, outcome: EquationOutcome, rederive: (p: RelationProblem) => EquationOutcome = decideParametricProblem): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  const store = problem.store, domain = problem.domain;
  if (outcome.proof.root !== problem.hash) fail('proof does not start from the problem');
  const report = verifyProofLog(outcome.proof, new Map());
  if (report.leaves.length !== 1 || report.leaves[0] !== problem.hash) fail('a parameters proof is the problem itself');
  const cases: readonly Case[] = outcome.kind === 'empty' ? [{ conditions: [], set: finiteSet(problem.targets, []) }]
    : outcome.set.kind === 'case-tree' ? outcome.set.cases : [{ conditions: [], set: outcome.set }];
  const hit = new Set<number>();
  for (const sample of samples(problem, cases)) {
    store.ctx.tick();
    const matching = cases.flatMap((c, i) => (c.conditions.every(k => conditionHolds(store, k, sample, domain)) ? [i] : []));
    if (matching.length !== 1) fail(matching.length ? 'cases overlap at a sample' : 'no case covers a sample');
    hit.add(matching[0]);
    const decided = decideAt(problem, sample);
    if (decided.kind === 'refused') return fail(`a sample is not decidable: ${decided.reason}`);
    const claimed = instantiate(store, cases[matching[0]].set, sample, domain);
    if (claimed === undefined || !sameSet(store, claimed, canonical(store, decided.set, domain))) fail('a case set differs from the decision at a sample');
  }
  // One parameter: every case whose conditions are polynomial has a sample (cells are never empty).
  if (problem.parameters.length === 1 && cases.some((c, i) => !hit.has(i) && c.conditions.every(k => polynomialIn(store, k, problem.parameters[0])))) fail('a case is never sampled');
  const again = rederive(problem);
  if (again.kind !== outcome.kind) fail('re-derivation gives a different outcome');
  if (outcome.kind === 'solved' && again.kind === 'solved'
    && setKey(store, normalizeSet(store, outcome.set, domain)) !== setKey(store, normalizeSet(store, again.set, domain))) fail('case tree differs from the re-derived tree');
}

/** The set of the one case whose conditions hold at the given parameter values, instantiated there. */
export function caseAt(problem: RelationProblem, set: SolutionSet, values: ReadonlyMap<string, ExprId>): SolutionSet | undefined {
  const store = problem.store, cases = set.kind === 'case-tree' ? set.cases : [{ conditions: [], set }];
  const matching = cases.filter(c => c.conditions.every(k => conditionHolds(store, k, values, problem.domain)));
  if (matching.length !== 1) return fail('expected exactly one matching case');
  return instantiate(store, matching[0].set, values, problem.domain);
}

/** Whether a condition holds at parameter values: exactly, or by certified sign for transcendental values over ℝ. */
export function conditionHolds(store: ExpressionStore, c: Condition, values: ReadonlyMap<string, ExprId>, domain: ProblemDomain): boolean {
  if (c.kind === 'in-domain') return true;
  const e = store.substitute('other' in c ? store.sub(c.expr, c.other) : c.expr, values);
  const real = c.kind === 'positive' || c.kind === 'nonnegative' || domain === 'real';
  const v = evaluateExact(store, e, real ? 'real' : domain);
  let sign: number;
  if (v.kind === 'exact') {
    const ev = v.value;
    if (ev.kind === 'algebraic' && ev.root.kind !== 'real') sign = Number.NaN;
    else sign = compareValues(store, ev, { kind: 'rational', value: rational(store.ctx, 0n) });
  } else if (v.kind === 'not-exact' && v.reason === 'transcendental' && real) sign = realSign(store, e);
  else if (v.kind === 'undefined') return false;
  else return fail('a condition is not evaluable at a sample');
  switch (c.kind) {
    case 'equal': return sign === 0;
    case 'nonzero': case 'not-equal': return sign !== 0;
    case 'positive': return sign > 0;
    case 'nonnegative': return sign >= 0;
  }
}

function polynomialIn(store: ExpressionStore, c: Condition, p: string): boolean {
  if (c.kind === 'in-domain') return true;
  const r = rationalForm(store, 'other' in c ? store.sub(c.expr, c.other) : c.expr, p);
  return r.ok && exactPolynomial(store, r.form.num, 'complex').kind === 'ok';
}

/**
 * Equality of two canonical sets by value: the same kind and shape, and every
 * value equal by exact comparison (two closed forms of one number, such as
 * ln 4/2 and ln 2, are equal), not only by identity.
 */
export function sameSet(store: ExpressionStore, a: SolutionSet, b: SolutionSet): boolean {
  if (setKey(store, a) === setKey(store, b)) return true;
  const eq = (x: PointValue, y: PointValue) => compareValues(store, x, y) === 0;
  const end = (x: Endpoint, y: Endpoint) => (x.kind === 'infinity' || y.kind === 'infinity' ? x.kind === y.kind && (x as { sign: number }).sign === (y as { sign: number }).sign : eq(x, y));
  const iv = (x: Interval, y: Interval) => x.loClosed === y.loClosed && x.hiClosed === y.hiClosed && end(x.lo, y.lo) && end(x.hi, y.hi);
  const matched = <T>(xs: readonly T[], ys: readonly T[], same: (x: T, y: T) => boolean) => {
    if (xs.length !== ys.length) return false;
    const used = new Set<number>();
    return xs.every(x => { const j = ys.findIndex((y, k) => !used.has(k) && same(x, y)); if (j < 0) return false; used.add(j); return true; });
  };
  const point = (x: Point, y: Point) => x.length === y.length && x.every((v, i) => eq(v, y[i]));
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'finite': return matched(a.points, (b as typeof a).points, point);
    case 'cofinite': return matched(a.except, (b as typeof a).except, point);
    case 'intervals': return matched(a.intervals, (b as typeof a).intervals, iv);
    case 'periodic-set': {
      const y = b as typeof a;
      return eq(a.period, y.period) && iv(a.range, y.range) && matched(a.components, y.components, iv);
    }
    case 'union': return matched(a.sets, (b as typeof a).sets, (x, y) => sameSet(store, x, y));
    case 'parametric': {
      // Same free targets, and every coordinate and constraint equal as rational functions of them.
      const y = b as typeof a;
      if (a.variables.join() !== y.variables.join() || a.freeParameters.join() !== y.freeParameters.join()) return false;
      const zeroDiff = (u: ExprId, v: ExprId) => {
        const f = fractionOf(store, store.sub(u, v), a.freeParameters);
        return f ? f.num.terms.size === 0 : u === v;
      };
      const zeroSum = (u: ExprId, v: ExprId) => zeroDiff(u, store.neg(v));
      const cond = (c: Condition, d: Condition) => c.kind === d.kind && (zeroDiff(c.expr, d.expr) || (c.kind !== 'positive' && c.kind !== 'nonnegative' && zeroSum(c.expr, d.expr)));
      return a.values.every((v, i) => zeroDiff(v, y.values[i])) && matched(a.constraints, y.constraints, cond);
    }
    default: return false;
  }
}

const GRID = [[0n, 1n], [1n, 1n], [-1n, 1n], [2n, 1n], [-2n, 1n], [1n, 2n], [3n, 1n]] as const;

function samples(problem: RelationProblem, cases: readonly Case[]): ReadonlyMap<string, ExprId>[] {
  const store = problem.store, ctx = store.ctx, ps = problem.parameters;
  if (ps.length === 1) {
    const p = ps[0], zeros: ExactValue[] = [];
    // Zeros of the polynomial conditions; a transcendental condition (from an x-free kernel relation) adds none.
    for (const c of cases.flatMap(k => k.conditions)) {
      if (c.kind === 'in-domain' || !polynomialIn(store, c, p)) continue;
      const r = rationalForm(store, 'other' in c ? store.sub(c.expr, c.other) : c.expr, p);
      const e = r.ok ? exactPolynomial(store, r.form.num, problem.domain) : undefined;
      if (e?.kind === 'ok' && (e.poly.kind === 'rational' ? e.poly.poly.coefficients.length : e.poly.coefficients.length) > 1) zeros.push(...zerosOf(store, e.poly, problem.domain));
    }
    const at = (e: ExprId) => new Map([[p, e]]);
    const generic = GRID.map(([n, d]) => store.number(rational(ctx, n, d)));
    if (problem.domain === 'complex') return [...zeros.map(z => at(valueExpression(store, z))), ...generic.map(at)];
    const cells = pieces(store, sortedDistinct(store, zeros)).map(piece => at(piece.kind === 'open' ? store.number(piece.sample) : valueExpression(store, piece.value)));
    return cases.every(k => k.conditions.every(c => polynomialIn(store, c, p))) ? cells : [...cells, ...generic.map(at)];
  }
  // Several parameters: grid tuples in order of total index, all of them up to 7³, otherwise the first 512.
  const out: Map<string, ExprId>[] = [], k = ps.length, total = GRID.length ** k;
  const limit = k <= 3 ? total : 512;
  const tuples: number[][] = [];
  for (let i = 0; i < total && tuples.length < 4 * limit; i++) {
    ctx.tick();
    const t: number[] = [];
    for (let j = 0, r = i; j < k; j++, r = Math.floor(r / GRID.length)) t.push(r % GRID.length);
    tuples.push(t);
  }
  tuples.sort((a, b) => a.reduce((s, v) => s + v, 0) - b.reduce((s, v) => s + v, 0));
  for (const t of tuples.slice(0, limit)) out.push(new Map(ps.map((p, j) => [p, store.number(rational(ctx, GRID[t[j]][0], GRID[t[j]][1]))])));
  return out;
}
