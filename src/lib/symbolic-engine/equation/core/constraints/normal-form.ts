import type { ExprId } from '../representation/expression';
import { conditionKey, withChanges, type Condition, type RelationProblem } from '../representation/relation';
import type { TransformRule } from '../representation/transform';
import { dependsOn, replay, step } from '../generators/normal-form';

/**
 * `radical-domain`: the natural domain of real radicals of the target.
 * u^{p/q} (reduced, q ≥ 2) needs u ≥ 0 when q is even, and u ≠ 0 when p < 0
 * (EQUIVALENT_UNDER_CONDITIONS). Odd roots of negative numbers are real.
 */
function radicalConditions(p: RelationProblem): Condition[] {
  const s = p.store, x = p.targets[0], out: Condition[] = [];
  const roots: ExprId[] = [...p.relations.flatMap(r => [r.lhs, r.rhs]), ...p.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  for (const n of s.postorder(roots)) {
    const node = s.node(n);
    if (node.kind !== 'pow' || !dependsOn(s, node.base, x)) continue;
    const r = s.numberValue(node.exponent);
    if (!r || r.denominator === 1n) continue;
    if (r.denominator % 2n === 0n) out.push({ kind: 'nonnegative', expr: node.base });
    if (r.numerator < 0n) out.push({ kind: 'nonzero', expr: node.base });
  }
  return out;
}

function missing(p: RelationProblem): Condition[] {
  const s = p.store, have = new Set(p.conditions.map(c => conditionKey(s, c))), out: Condition[] = [];
  for (const c of radicalConditions(p)) {
    const k = conditionKey(s, c);
    if (!have.has(k)) { have.add(k); out.push(c); }
  }
  return out;
}

export const RADICAL_DOMAIN: TransformRule = Object.freeze<TransformRule>({
  id: 'radical-domain',
  apply(problem) {
    if (problem.domain !== 'real' || problem.targets.length !== 1) return null;
    const added = missing(problem);
    if (added.length === 0) return null;
    const out = withChanges(problem, { conditions: [...problem.conditions, ...added] });
    return step('radical-domain', problem, out, 'EQUIVALENT_UNDER_CONDITIONS', added, 'missing-radical-domain-conditions', added.length, missing(out).length);
  },
  check: (from, outputs, record) => replay(() => RADICAL_DOMAIN)(from, outputs, record),
});
