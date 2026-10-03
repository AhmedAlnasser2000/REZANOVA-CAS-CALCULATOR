import { demand } from '../execution';
import { rational, rSubtract, type Rational } from '../algebra/rational';
import { formMatches } from '../decision/radical-forms';
import { NATURAL_DOMAIN } from '../decision/rules';
import { enclose } from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { START_BITS } from '../representation/real-order';
import type { RelationProblem } from '../representation/relation';
import {
  assertOutcome, normalizeSet, setKey, type Endpoint, type EquationOutcome, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import { MOVE_TO_ZERO, verifyProofLog } from '../representation/transform';
import { allHold, closedAtoms, decideClosedForm, simplestBetween } from './closed-form-set';
import { LOG_DOMAIN, REAL_POWER_NORMAL_FORM } from './normal-form';
import { GENERATOR_RULES } from './solve';

/**
 * Independent check of a generators-slice outcome:
 * - the proof log replays (hashes, continuity, condition bookkeeping, measures, rule checkers);
 * - one leaf, in final form; re-deciding it gives the same canonical set (or empty);
 * - numeric evidence: every finite point leaves each equation's residual enclosure
 *   containing 0 at high precision; a rational sample inside every interval satisfies
 *   all atoms and one in every gap fails;
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
  if ([LOG_DOMAIN, REAL_POWER_NORMAL_FORM, NATURAL_DOMAIN, MOVE_TO_ZERO].some(r => r.apply(leaf) !== null)) fail('leaf is not in final form');
  const decision = decideClosedForm(leaf);
  if (decision.kind === 'refused') fail('leaf is not decidable by this slice');
  if (outcome.kind === 'empty') {
    if (decision.kind !== 'empty') fail('claimed empty, but the leaf has solutions');
    return;
  }
  if (decision.kind !== 'set') return fail('claimed solutions, but the leaf is empty');
  const claimed = normalizeSet(store, outcome.set, 'real');
  if (setKey(store, claimed) !== setKey(store, normalizeSet(store, decision.set, 'real'))) fail('solution set differs from the re-derived set');

  const built = closedAtoms(leaf);
  if ('refusal' in built) return fail('leaf atoms are not decidable');
  const atoms = built.atoms, x = leaf.targets[0];
  for (const v of values(claimed)) {
    const id = idOf(store, v);
    bounds(store, id); // every value, including each Lambert W in it, is a defined real number
    if (v.kind === 'algebraic' && 'form' in v && v.form !== undefined && !formMatches(store, v.form, v.root)) fail('radical form does not match its root');
  }
  if (claimed.kind === 'finite') {
    for (const [p] of claimed.points) {
      const id = idOf(store, p);
      for (const r of leaf.relations) {
        if (r.op !== 'eq') continue;
        const residual = enclose(store, store.substitute(store.sub(r.lhs, r.rhs), new Map([[x, id]])), RESIDUAL_BITS);
        if (residual.kind === 'bounds' && (residual.lo.numerator > 0n || residual.hi.numerator < 0n)) fail('a point does not satisfy an equation (residual excludes 0)');
      }
      if (!allHold(store, atoms, x, id)) fail('a point does not satisfy the leaf');
    }
  }
  if (claimed.kind === 'intervals') {
    const sampleBetween = (lo: Endpoint, hi: Endpoint) => {
      const below = lo.kind === 'infinity' ? undefined : bounds(store, idOf(store, lo)).hi;
      const above = hi.kind === 'infinity' ? undefined : bounds(store, idOf(store, hi)).lo;
      if (below === undefined && above === undefined) return store.integer(0);
      if (below === undefined) return store.number(simplestBetween(ctx, rSubtract(ctx, above as Rational, rational(ctx, 2n)), above));
      return store.number(simplestBetween(ctx, below, above));
    };
    const ivs = claimed.intervals;
    ivs.forEach(i => {
      if (i.lo === i.hi) return;
      if (!allHold(store, atoms, x, sampleBetween(i.lo, i.hi))) fail('an interval sample does not satisfy the leaf');
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
    default: return [];
  }
}
