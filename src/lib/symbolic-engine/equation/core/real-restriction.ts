import { demand } from './execution';
import { complexIsZero, rect } from './periodic/rectangular';
import { expandConstant } from './representation/angles';
import { enclose } from './representation/enclosure';
import type { ExprId, ExpressionStore } from './representation/expression';
import { realSign } from './representation/real-order';
import { relationProblem, type RelationProblem } from './representation/relation';
import {
  normalizeSet, setKey, valueExpression, type EquationOutcome, type Interval, type PointValue, type SolutionSet,
} from './representation/solution-set';
import { ProofLogBuilder } from './representation/transform';

/**
 * Equations with the constant i in Real mode (user decision, 2026-10-15: Mathematica's semantics, where Real mode
 * restricts the unknown and not the constants): the problem is decided over ℂ and the answer intersected with ℝ.
 * A point stays when its imaginary part is exactly 0, a family a + P·k (one integer parameter) when Im P = Im a = 0
 * (it becomes a real periodic set), and drops when Im P = 0 and Im a ≠ 0; with Im P ≠ 0 at most one member is real. Imaginary parts are decided by the exact
 * complex zero test, never by rounding. Orders (non-real values are not ordered), parameters, several targets and
 * other set kinds are typed stops. sin x = i → ∅; (1 + i)(1 − i)·x = 2 → x = 1; sin x + i = i → x = kπ.
 */
const OWNER = 'EQUATION-RECONSTRUCTION-CLOSEOUT1';
const stop = (detail: string): EquationOutcome => ({ kind: 'unsupported', reason: `${OWNER}: i in Real mode: ${detail}` });

export function complexProblemOf(problem: RelationProblem): RelationProblem {
  return relationProblem(problem.store, { domain: 'complex', targets: problem.targets, relations: problem.relations, conditions: problem.conditions });
}

export function decideRealRestriction(problem: RelationProblem, decide: (p: RelationProblem) => EquationOutcome): EquationOutcome {
  if (problem.targets.length !== 1 || problem.parameters.length || problem.formulas.length || problem.generators.length || problem.constraints.length) return stop('one unknown without parameters');
  if (problem.relations.some(r => r.op !== 'eq' && r.op !== 'ne') || problem.conditions.some(c => c.kind === 'positive' || c.kind === 'nonnegative')) {
    return stop('non-real values are not ordered');
  }
  const out = decide(complexProblemOf(problem)), proof = new ProofLogBuilder(problem).build();
  if (out.kind === 'empty') return { kind: 'empty', proof };
  if (out.kind !== 'solved') return out;
  const real = realPart(problem.store, out.set);
  if (real === undefined) return stop('a complex answer whose real members cannot be separated exactly');
  if (real === 'empty') return { kind: 'empty', proof };
  return { kind: 'solved', set: normalizeSet(problem.store, real, 'real'), proof };
}

/** The complex outcome is verified in full; the intersection with ℝ is recomputed and must match. */
export function verifyRealRestriction(problem: RelationProblem, outcome: EquationOutcome, decide: (p: RelationProblem) => EquationOutcome,
  verify: (p: RelationProblem, o: EquationOutcome) => void): void {
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
  const store = problem.store, complex = complexProblemOf(problem), out = decide(complex);
  if (out.kind !== 'solved' && out.kind !== 'empty') return fail('the complex problem is not decided');
  verify(complex, out);
  const real = out.kind === 'empty' ? 'empty' : realPart(store, out.set);
  if (real === undefined) return fail('the real members cannot be separated');
  if (outcome.kind === 'empty') { if (real !== 'empty') fail('claimed empty, but real solutions exist'); return; }
  if (real === 'empty' || setKey(store, normalizeSet(store, real, 'real')) !== setKey(store, normalizeSet(store, outcome.set, 'real'))) fail('the real solutions differ from the re-derived ones');
}

type Real = SolutionSet | 'empty' | undefined;

function imaginaryZero(store: ExpressionStore, id: ExprId): { re: ExprId; zero: boolean } | undefined {
  const r = rect(store, id);
  if (!r) return undefined;
  const z = complexIsZero(store, r.im);
  return z === true || z === false ? { re: r.re, zero: z } : undefined;
}

function realPart(store: ExpressionStore, set: SolutionSet): Real {
  switch (set.kind) {
    case 'finite': {
      const kept: PointValue[][] = [];
      for (const [v] of set.points) {
        if (v.kind === 'rational' || (v.kind === 'algebraic' && v.root.kind === 'real')) { kept.push([v]); continue; }
        if (v.kind === 'algebraic' && v.root.kind === 'complex') continue;
        if (v.kind === 'root') return undefined;
        const parts = imaginaryZero(store, v.kind === 'expression' ? v.id : valueExpression(store, v));
        if (!parts) return undefined;
        if (parts.zero) kept.push([{ kind: 'expression', id: parts.re }]);
      }
      return kept.length ? { kind: 'finite', variables: set.variables, points: kept } : 'empty';
    }
    case 'union': {
      const parts = set.sets.map(s => realPart(store, s));
      if (parts.some(p => p === undefined)) return undefined;
      const sets = parts.filter((p): p is SolutionSet => p !== 'empty');
      return sets.length === 0 ? 'empty' : sets.length === 1 ? sets[0] : { kind: 'union', sets };
    }
    case 'periodic': return realFamily(store, set);
    default: return undefined;
  }
}

/** a + P·k (affine in one integer parameter, no constraints) as a real periodic set, ∅, or undefined. */
function realFamily(store: ExpressionStore, set: Extract<SolutionSet, { kind: 'periodic' }>): Real {
  if (set.integerParameters.length !== 1 || set.constraints.length || set.values.length !== 1) return undefined;
  const k = set.integerParameters[0], at = (n: bigint) => store.substitute(set.values[0], new Map([[k, store.integer(n)]]));
  const a = at(0n), P = expandConstant(store, store.sub(at(1n), a));
  if (complexIsZero(store, expandConstant(store, store.sub(store.sub(at(2n), at(1n)), P))) !== true) return undefined;
  const period = imaginaryZero(store, P), anchor = imaginaryZero(store, a);
  if (!period || !anchor) return undefined;
  if (!period.zero) return realMember(store, set.variables, a, P);
  if (!anchor.zero) return 'empty';
  const p = realSign(store, period.re) < 0 ? store.neg(period.re) : period.re;
  const point: PointValue = { kind: 'expression', id: anchor.re };
  const all: Interval = { lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false };
  return { kind: 'periodic-set', variables: set.variables, period: { kind: 'expression', id: p }, components: [{ lo: point, hi: point, loClosed: true, hiClosed: true }], range: all };
}

/**
 * A family a + P·k with Im P ≠ 0: Im(a + P·k) = Im a + k·Im P vanishes for at most one integer, near −Im a/Im P.
 * Its enclosure is refined until it holds at most two integers, and each is tested exactly.
 */
function realMember(store: ExpressionStore, variables: readonly string[], a: ExprId, P: ExprId): Real {
  const ra = rect(store, a), rp = rect(store, P);
  if (!ra || !rp) return undefined;
  const ratio = store.div(store.neg(ra.im), rp.im), ctx = store.ctx;
  for (let bits = 32; ; bits *= 2) {
    ctx.tick();
    const e = enclose(store, ratio, bits);
    if (e.kind !== 'bounds') return undefined;
    const lo = ceilOf(e.lo), hi = floorOf(e.hi);
    if (hi - lo > 1n) continue;
    for (let n = lo; n <= hi; n++) {
      const im = expandConstant(store, store.add(ra.im, store.mul(store.integer(n), rp.im)));
      const z = complexIsZero(store, im);
      if (z !== true && z !== false) return undefined;
      if (z) return { kind: 'finite', variables, points: [[{ kind: 'expression', id: expandConstant(store, store.add(ra.re, store.mul(store.integer(n), rp.re))) }]] };
    }
    return 'empty';
  }
}

const floorOf = (q: { numerator: bigint; denominator: bigint }) => (q.numerator >= 0n ? q.numerator / q.denominator : -((-q.numerator + q.denominator - 1n) / q.denominator));
const ceilOf = (q: { numerator: bigint; denominator: bigint }) => -floorOf({ numerator: -q.numerator, denominator: q.denominator });
