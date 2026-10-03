import { demand } from '../execution';
import { rational, rSubtract, type Rational } from '../algebra/rational';
import { formMatches } from '../decision/radical-forms';
import { enclose } from '../representation/enclosure';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { exactSign, START_BITS } from '../representation/real-order';
import type { RelationProblem } from '../representation/relation';
import {
  assertOutcome, compareEndpoints, floorExact, normalizeSet, setKey, type Endpoint, type EquationOutcome, type Interval, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import { verifyProofLog } from '../representation/transform';
import { allHold, closedAtoms, decideClosedForm, holds } from './closed-form-set';
import { simplestBetween } from './samples';
import { FINAL_FORM_RULES, GENERATOR_RULES } from './solve';
import { commonPeriod, hasTrig, kernelPeriods, periodicIn } from '../periodic/families';

/**
 * Independent check of a generators-slice outcome:
 * - the proof log replays (hashes, continuity, condition bookkeeping, measures, rule checkers);
 * - one leaf, in final form; re-deciding it gives the same canonical set (or empty);
 * - independent evidence against the original relations: at every claimed
 *   point, closed endpoint and interval sample, each relation holds exactly when
 *   its value is algebraic (an undefined value fails), and otherwise each
 *   equation's residual enclosure contains 0 at high precision and no
 *   inequality's enclosure certifies the wrong sign — so a spurious
 *   radical candidate or a wrong zero interval is caught without the zero finder;
 * - periodic sets: members and interval samples at several periods satisfy the
 *   original relations, and a full-line periodic set needs every trig
 *   inequality structurally periodic with a multiple of its period; families:
 *   their first members;
 * - a rational sample inside every interval satisfies all leaf atoms and one in
 *   every gap fails;
 * - every Lambert W in a value has its argument in the branch domain, and every
 *   radical form evaluates to its root.
 */
const RESIDUAL_BITS = 192;

function idOf(store: ExpressionStore, v: PointValue): ExprId {
  return v.kind === 'expression' ? v.id : v.kind === 'rational' ? store.number(v.value) : store.algebraic(v.root);
}

function bounds(store: ExpressionStore, id: ExprId) {
  for (let bits = START_BITS; ; bits *= 2) {
    const e = enclose(store, id, bits);
    if (e.kind === 'bounds') return e;
    demand(e.kind === 'unknown', 'verification-failed', `value is not a defined real number: ${'detail' in e ? e.detail : ''}`);
  }
}

export function verifyGeneratorOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
  const proof = outcome.proof, store = problem.store, ctx = store.ctx;
  if (proof.root !== problem.hash) fail('proof does not start from the problem');
  const report = verifyProofLog(proof, GENERATOR_RULES);
  if (report.leaves.length !== 1) fail('expected exactly one leaf');
  const leaf = proof.states.get(report.leaves[0]) ?? fail('leaf state missing');
  if (FINAL_FORM_RULES.some(r => r.apply(leaf) !== null)) fail('leaf is not in final form');
  if (outcome.kind === 'empty') {
    if (decideClosedForm(leaf).kind !== 'empty') fail('claimed empty, but the leaf has solutions');
    return;
  }
  const claimed = normalizeSet(store, outcome.set, 'real');
  for (const v of values(claimed)) {
    const id = idOf(store, v);
    bounds(store, id); // every value, including each Lambert W in it, is a defined real number
    if (v.kind === 'algebraic' && 'form' in v && v.form !== undefined && !formMatches(store, v.form, v.root)) fail('radical form does not match its root');
  }
  // Independent evidence against the original relations, before re-deriving anything.
  const satisfiesProblem = (point: ExprId, label: string) => {
    for (const r of problem.relations) {
      const d = store.substitute(store.sub(r.lhs, r.rhs), new Map([[problem.targets[0], point]]));
      const e = evaluateExact(store, d, 'real');
      if (e.kind === 'undefined') fail(`${label} is outside the domain of a relation`);
      if (e.kind === 'exact') {
        if (!holds(r.op, exactSign(ctx, e.value))) fail(`${label} does not satisfy a relation exactly`);
        continue;
      }
      const residual = enclose(store, d, RESIDUAL_BITS);
      if (residual.kind !== 'bounds') continue;
      if (r.op === 'eq' && (residual.lo.numerator > 0n || residual.hi.numerator < 0n)) fail(`${label} does not satisfy an equation (residual excludes 0)`);
      // Inequalities: a certified sign that contradicts the relation (an inconclusive enclosure proves nothing).
      const certain: -1 | 1 | undefined = residual.lo.numerator > 0n ? 1 : residual.hi.numerator < 0n ? -1 : undefined;
      if (r.op !== 'eq' && certain !== undefined && !holds(r.op, certain)) fail(`${label} does not satisfy a relation (certified sign)`);
    }
  };
  const sampleBetween = (lo: Endpoint, hi: Endpoint) => {
    const below = lo.kind === 'infinity' ? undefined : bounds(store, idOf(store, lo)).hi;
    const above = hi.kind === 'infinity' ? undefined : bounds(store, idOf(store, hi)).lo;
    if (below === undefined && above === undefined) return store.integer(0);
    if (below === undefined) return store.number(simplestBetween(ctx, rSubtract(ctx, above as Rational, rational(ctx, 2n)), above));
    return store.number(simplestBetween(ctx, below, above));
  };
  const x0 = problem.targets[0];
  const inRange = (r: Interval, v: ExprId) => {
    const pv: PointValue = { kind: 'expression', id: v };
    const lo = r.lo.kind === 'infinity' ? 1 : compareEndpoints(store, pv, r.lo), hi = r.hi.kind === 'infinity' ? -1 : compareEndpoints(store, pv, r.hi);
    return (lo > 0 || (lo === 0 && r.loClosed)) && (hi < 0 || (hi === 0 && r.hiClosed));
  };
  const evidence = (set: SolutionSet): void => {
    switch (set.kind) {
      case 'finite': for (const [p] of set.points) satisfiesProblem(idOf(store, p), 'a point'); return;
      case 'intervals':
        for (const i of set.intervals) {
          if (i.loClosed && i.lo.kind !== 'infinity') satisfiesProblem(idOf(store, i.lo), 'a closed endpoint');
          if (i.hiClosed && i.hi.kind !== 'infinity') satisfiesProblem(idOf(store, i.hi), 'a closed endpoint');
          if (i.lo !== i.hi) satisfiesProblem(sampleBetween(i.lo, i.hi), 'an interval sample');
        }
        return;
      case 'union': set.sets.forEach(evidence); return;
      case 'periodic-set': {
        const P = idOf(store, set.period);
        // A full-line periodic set needs every trig relation periodic (structurally) with a period that is an
        // integer multiple of the claimed one.
        if (set.range.lo.kind === 'infinity' && set.range.hi.kind === 'infinity') {
          for (const r of problem.relations) {
            // An inequality, or each trig factor of it, has a period that is a multiple of P (equations depend
            // only on their zero sets, checked by members and re-derivation).
            if (r.op === 'eq' || r.op === 'ne') continue;
            const d = store.sub(r.lhs, r.rhs), node = store.node(d);
            for (const factor of node.kind === 'mul' ? node.args : [d]) {
              if (!hasTrig(store, factor, x0)) continue;
              const Q = commonPeriod(store, kernelPeriods(store, factor, x0));
              const ratio = Q === undefined ? undefined : store.numberValue(store.div(Q, P));
              if (Q === undefined || !ratio || ratio.denominator !== 1n || !periodicIn(store, factor, x0, Q)) fail('a periodic set for a relation without a matching period');
            }
          }
        }
        // Members and samples at several periods (within the range).
        const anchor = set.range.lo.kind !== 'infinity' ? idOf(store, set.range.lo) : set.range.hi.kind !== 'infinity' ? idOf(store, set.range.hi) : store.integer(0);
        const base = floorExact(store, store.div(anchor, P)).n;
        for (const k of [base - 2n, base - 1n, base, base + 1n, base + 2n]) {
          const shift = store.mul(store.integer(k), P);
          for (const c of set.components) {
            const lo = store.add(idOf(store, c.lo as PointValue), shift), hi = store.add(idOf(store, c.hi as PointValue), shift);
            if (c.loClosed && inRange(set.range, lo)) satisfiesProblem(lo, 'a periodic member');
            if (c.hiClosed && inRange(set.range, hi)) satisfiesProblem(hi, 'a periodic member');
            if (lo !== hi) {
              const sample = sampleBetween({ kind: 'expression', id: lo }, { kind: 'expression', id: hi });
              if (inRange(set.range, sample)) satisfiesProblem(sample, 'a periodic interval sample');
            }
          }
        }
        return;
      }
      case 'interval-family': {
        // The first members: closed ends and inner samples satisfy the problem; the gap to the next member fails.
        const at = (k: bigint, e: ExprId) => store.substitute(e, new Map([[set.parameter, store.integer(k)]]));
        const first = set.from ?? (set.to !== undefined ? set.to - 2n : -1n);
        const ks = [first, first + 1n, first + 2n].filter(k => (set.from === undefined || k >= set.from) && (set.to === undefined || k <= set.to));
        for (const k of ks) {
          const lo = at(k, set.lo), hi = at(k, set.hi);
          if (set.loClosed) satisfiesProblem(lo, 'an interval-family end');
          if (set.hiClosed) satisfiesProblem(hi, 'an interval-family end');
          satisfiesProblem(sampleBetween({ kind: 'expression', id: lo }, { kind: 'expression', id: hi }), 'an interval-family sample');
        }
        return;
      }
      case 'periodic': {
        // The first members allowed by the parameter constraints (each parameter from its lower bound, or 0).
        const lower = (name: string) => {
          for (const c of set.constraints) {
            const shift = store.numberValue(store.sub(c.expr, store.symbol(name)));
            if (c.kind === 'nonnegative' && shift) return -shift.numerator / shift.denominator;
          }
          return 0n;
        };
        for (let j = 0n; j < 3n; j++) {
          const at = new Map(set.integerParameters.map(n => [n, store.integer(lower(n) + j)]));
          if (set.constraints.some(c => { const v = store.numberValue(store.substitute(c.expr, at)); return v !== undefined && v.numerator < 0n; })) continue;
          satisfiesProblem(store.substitute(set.values[0], at), 'a family member');
        }
        return;
      }
      default: return;
    }
  };
  evidence(claimed);

  const decision = decideClosedForm(leaf);
  if (decision.kind === 'refused') fail('leaf is not decidable by this slice');
  if (decision.kind !== 'set') return fail('claimed solutions, but the leaf is empty');
  if (setKey(store, claimed) !== setKey(store, normalizeSet(store, decision.set, 'real'))) fail('solution set differs from the re-derived set');
  if (claimed.kind !== 'finite' && claimed.kind !== 'intervals') return;
  const built = closedAtoms(leaf);
  if ('refusal' in built) return fail('leaf atoms are not decidable');
  const atoms = built.atoms, x = leaf.targets[0];
  if (claimed.kind === 'finite') {
    for (const [p] of claimed.points) if (!allHold(store, atoms, x, idOf(store, p))) fail('a point does not satisfy the leaf');
  }
  if (claimed.kind === 'intervals') {
    const ivs = claimed.intervals;
    ivs.forEach(i => {
      if (i.lo !== i.hi && !allHold(store, atoms, x, sampleBetween(i.lo, i.hi))) fail('an interval sample does not satisfy the leaf');
    });
    const gaps: [Endpoint, Endpoint][] = [];
    if (ivs[0].lo.kind !== 'infinity') gaps.push([{ kind: 'infinity', sign: -1 }, ivs[0].lo]);
    for (let i = 0; i + 1 < ivs.length; i++) gaps.push([ivs[i].hi, ivs[i + 1].lo]);
    const last = ivs[ivs.length - 1];
    if (last.hi.kind !== 'infinity') gaps.push([last.hi, { kind: 'infinity', sign: 1 }]);
    for (const [lo, hi] of gaps) {
      if (lo.kind !== 'infinity' && hi.kind !== 'infinity' && idOf(store, lo) === idOf(store, hi)) continue;
      if (allHold(store, atoms, x, sampleBetween(lo, hi))) fail('a gap sample satisfies the leaf');
    }
  }
}

function values(set: SolutionSet): PointValue[] {
  const ends = (e: Endpoint): PointValue[] => (e.kind === 'infinity' ? [] : [e]);
  switch (set.kind) {
    case 'finite': return set.points.flat();
    case 'intervals': return set.intervals.flatMap(i => [...ends(i.lo), ...ends(i.hi)]);
    case 'union': return set.sets.flatMap(values);
    case 'periodic-set': return [set.period, ...set.components.flatMap(i => [...ends(i.lo), ...ends(i.hi)]), ...ends(set.range.lo), ...ends(set.range.hi)];
    default: return [];
  }
}
