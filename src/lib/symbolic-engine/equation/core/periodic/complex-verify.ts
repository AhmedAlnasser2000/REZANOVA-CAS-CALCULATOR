import { demand } from '../execution';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition, RelationProblem } from '../representation/relation';
import { assertOutcome, normalizeSet, setKey, type EquationOutcome, type PointValue, type SolutionSet, valueExpression } from '../representation/solution-set';
import { verifyProofLog } from '../representation/transform';
import { decideComplexLeaf } from './complex';
import { COMPLEX_PIPELINE, COMPLEX_RULES } from './complex-rules';
import { complexBounds, complexIsZero } from './rectangular';

/**
 * Independent check of a complex outcome of slice 4:
 * - the proof log replays with the complex rules; one leaf, in final form;
 * - evidence against the original relations and conditions before anything
 *   is re-derived: every point, and the members of every family at several
 *   parameter values allowed by its constraints, satisfy them (exactly when
 *   the residual is decidable, otherwise its enclosure contains 0 at high
 *   precision); members excluded by a constraint violate them;
 * - re-deciding the leaf gives the same canonical set (or empty).
 */
const RESIDUAL_BITS = 192;

type Check = 'holds' | 'fails' | 'unknown';

function idOf(store: ExpressionStore, v: PointValue): ExprId {
  return valueExpression(store, v);
}

/** e = 0 (eq) or e ≠ 0 (ne) at a point: exact when decidable, else from a residual enclosure. */
function atom(store: ExpressionStore, e: ExprId, op: 'eq' | 'ne'): Check {
  const z = complexIsZero(store, e);
  if (z === 'undefined') return 'fails';
  if (z !== 'unknown') return (z === (op === 'eq')) ? 'holds' : 'fails';
  const box = complexBounds(store, e, RESIDUAL_BITS);
  if (box === undefined) return 'unknown';
  const containsZero = box.re.lo.numerator <= 0n && box.re.hi.numerator >= 0n && box.im.lo.numerator <= 0n && box.im.hi.numerator >= 0n;
  if (op === 'eq') return containsZero ? 'unknown' : 'fails';
  return containsZero ? 'unknown' : 'holds';
}

function problemAtoms(problem: RelationProblem): { e: ExprId; op: 'eq' | 'ne' }[] {
  const s = problem.store, out: { e: ExprId; op: 'eq' | 'ne' }[] = [];
  for (const r of problem.relations) if (r.op === 'eq' || r.op === 'ne') out.push({ e: s.sub(r.lhs, r.rhs), op: r.op });
  for (const c of problem.conditions as readonly Condition[]) {
    if (c.kind === 'nonzero') out.push({ e: c.expr, op: 'ne' });
    if (c.kind === 'not-equal') out.push({ e: s.sub(c.expr, c.other), op: 'ne' });
    if (c.kind === 'equal') out.push({ e: s.sub(c.expr, c.other), op: 'eq' });
  }
  return out;
}

/** Integer assignments of the parameters: every combination of −2 … 2 (one parameter) or −1 … 1 (several). */
function assignments(names: readonly string[]): bigint[][] {
  const range = names.length === 1 ? [-2n, -1n, 0n, 1n, 2n] : [-1n, 0n, 1n];
  let out: bigint[][] = [[]];
  for (let i = 0; i < names.length; i++) out = out.flatMap(a => range.map(v => [...a, v]));
  return out;
}

/** Whether exact parameter constraints hold at an integer assignment. */
function constraintsHold(store: ExpressionStore, constraints: readonly Condition[], at: ReadonlyMap<string, ExprId>): boolean {
  return constraints.every(c => {
    const e = 'other' in c ? store.sub(c.expr, c.other) : c.expr, v = store.numberValue(store.substitute(e, at));
    if (v === undefined) return true;
    switch (c.kind) {
      case 'nonzero': case 'not-equal': return v.numerator !== 0n;
      case 'equal': return v.numerator === 0n;
      case 'positive': return v.numerator > 0n;
      case 'nonnegative': return v.numerator >= 0n;
      default: return true;
    }
  });
}

export function verifyComplexOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
  const proof = outcome.proof, store = problem.store, x = problem.targets[0];
  if (proof.root !== problem.hash) fail('proof does not start from the problem');
  const report = verifyProofLog(proof, COMPLEX_RULES);
  if (report.leaves.length !== 1) fail('expected exactly one leaf');
  const leaf = proof.states.get(report.leaves[0]) ?? fail('leaf state missing');
  if (COMPLEX_PIPELINE.some(r => r.apply(leaf) !== null)) fail('leaf is not in final form');
  if (outcome.kind === 'empty') {
    if (decideComplexLeaf(leaf).kind !== 'empty') fail('claimed empty, but the leaf has solutions');
    return;
  }
  const claimed = normalizeSet(store, outcome.set, 'complex'), atoms = problemAtoms(problem);
  const at = (p: ExprId) => atoms.map(a => atom(store, store.substitute(a.e, new Map([[x, p]])), a.op));
  const satisfies = (p: ExprId, label: string) => {
    if (at(p).includes('fails')) fail(`${label} does not satisfy the problem`);
  };
  const evidence = (set: SolutionSet): void => {
    switch (set.kind) {
      case 'finite': for (const [p] of set.points) satisfies(idOf(store, p), 'a point'); return;
      case 'cofinite': for (const [p] of set.except) if (!at(idOf(store, p)).includes('fails')) fail('an excluded point satisfies the problem'); return;
      case 'union': set.sets.forEach(evidence); return;
      case 'periodic':
        for (const values of assignments(set.integerParameters)) {
          const map = new Map(set.integerParameters.map((n, i) => [n, store.integer(values[i])]));
          const member = store.substitute(set.values[0], map);
          if (constraintsHold(store, set.constraints, map)) satisfies(member, 'a family member');
          else if (!at(member).includes('fails') ) fail('a member excluded by a constraint satisfies the problem');
        }
        return;
      default: fail(`unexpected set kind over ℂ: ${set.kind}`);
    }
  };
  evidence(claimed);
  const decision = decideComplexLeaf(leaf);
  if (decision.kind === 'refused') fail('leaf is not decidable by this slice');
  if (decision.kind !== 'set') return fail('claimed solutions, but the leaf is empty');
  if (setKey(store, claimed) !== setKey(store, normalizeSet(store, decision.set, 'complex'))) fail('solution set differs from the re-derived set');
}
