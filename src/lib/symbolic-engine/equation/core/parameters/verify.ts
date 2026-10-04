import { demand } from '../execution';
import { rational } from '../algebra/rational';
import { exactPolynomial, rationalForm } from '../decision/rational-form';
import { pieces, sortedDistinct } from '../decision/real-set';
import { zerosOf } from '../decision/univariate';
import { evaluateExact, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition, ProblemDomain, RelationProblem } from '../representation/relation';
import {
  assertOutcome, compareValues, finiteSet, normalizeSet, setKey, valueExpression, type Case, type EquationOutcome, type SolutionSet,
} from '../representation/solution-set';
import { verifyProofLog } from '../representation/transform';
import { decideParametricProblem } from './solve';
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

export function verifyParametricOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
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
    if (claimed === undefined || setKey(store, claimed) !== setKey(store, canonical(store, decided.set, domain))) fail('a case set differs from the decision at a sample');
  }
  if (problem.parameters.length === 1 && hit.size !== cases.length) fail('a case is never sampled');
  const again = decideParametricProblem(problem);
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

function conditionHolds(store: ExpressionStore, c: Condition, values: ReadonlyMap<string, ExprId>, domain: ProblemDomain): boolean {
  if (c.kind === 'in-domain') return true;
  const e = 'other' in c ? store.sub(c.expr, c.other) : c.expr;
  const v = evaluateExact(store, store.substitute(e, values), c.kind === 'positive' || c.kind === 'nonnegative' ? 'real' : domain);
  if (v.kind !== 'exact') return fail('a condition is not exactly evaluable at a sample');
  const ev = (v as { value: ExactValue }).value;
  const zero = ev.kind === 'rational' ? ev.value.numerator === 0n : false;
  switch (c.kind) {
    case 'equal': return zero;
    case 'nonzero': case 'not-equal': return !zero;
    case 'positive': return compareValues(store, ev, { kind: 'rational', value: rational(store.ctx, 0n) }) > 0;
    case 'nonnegative': return compareValues(store, ev, { kind: 'rational', value: rational(store.ctx, 0n) }) >= 0;
  }
}

const GRID = [[0n, 1n], [1n, 1n], [-1n, 1n], [2n, 1n], [-2n, 1n], [1n, 2n], [3n, 1n]] as const;

function samples(problem: RelationProblem, cases: readonly Case[]): ReadonlyMap<string, ExprId>[] {
  const store = problem.store, ctx = store.ctx, ps = problem.parameters;
  if (ps.length === 1) {
    const p = ps[0], zeros: ExactValue[] = [];
    for (const c of cases.flatMap(k => k.conditions)) {
      if (c.kind === 'in-domain') continue;
      const r = rationalForm(store, 'other' in c ? store.sub(c.expr, c.other) : c.expr, p);
      if (!r.ok) return fail('a condition is not polynomial in the parameter');
      const e = exactPolynomial(store, r.form.num, problem.domain);
      if (e.kind !== 'ok') return fail('a condition has no exact polynomial form');
      if ((e.poly.kind === 'rational' ? e.poly.poly.coefficients.length : e.poly.coefficients.length) > 1) zeros.push(...zerosOf(store, e.poly, problem.domain));
    }
    const at = (e: ExprId) => new Map([[p, e]]);
    if (problem.domain === 'complex') {
      const generic = GRID.map(([n, d]) => store.number(rational(ctx, n, d)));
      return [...zeros.map(z => at(valueExpression(store, z))), ...generic.map(at)];
    }
    return pieces(store, sortedDistinct(store, zeros)).map(piece => at(piece.kind === 'open' ? store.number(piece.sample) : valueExpression(store, piece.value)));
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
