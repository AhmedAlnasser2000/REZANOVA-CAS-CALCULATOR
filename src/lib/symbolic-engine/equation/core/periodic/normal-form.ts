import type { ExprId } from '../representation/expression';
import { conditionKey, withChanges, type Condition, type RelationProblem } from '../representation/relation';
import type { TransformRule } from '../representation/transform';
import { dependsOn, replay, step } from '../generators/normal-form';

/**
 * `trig-domain`: the natural domain of tan and of the inverse sine and cosine
 * of the target. tan u needs cos u ≠ 0; asin u and acos u need 1 − u ≥ 0 and
 * 1 + u ≥ 0 (EQUIVALENT_UNDER_CONDITIONS). sin, cos and atan are total.
 */
function trigConditions(p: RelationProblem): Condition[] {
  const s = p.store, x = p.targets[0], out: Condition[] = [];
  const roots: ExprId[] = [...p.relations.flatMap(r => [r.lhs, r.rhs]), ...p.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  for (const n of s.postorder(roots)) {
    const node = s.node(n);
    if (node.kind !== 'apply' || !dependsOn(s, node.arg, x)) continue;
    if (node.fn === 'tan') out.push({ kind: 'nonzero', expr: s.cos(node.arg) });
    if (node.fn === 'asin' || node.fn === 'acos') {
      out.push({ kind: 'nonnegative', expr: s.sub(s.integer(1), node.arg) });
      out.push({ kind: 'nonnegative', expr: s.add(s.integer(1), node.arg) });
    }
  }
  return out;
}

function missing(p: RelationProblem): Condition[] {
  const s = p.store, have = new Set(p.conditions.map(c => conditionKey(s, c))), out: Condition[] = [];
  for (const c of trigConditions(p)) {
    const k = conditionKey(s, c);
    if (!have.has(k)) { have.add(k); out.push(c); }
  }
  return out;
}

export const TRIG_DOMAIN: TransformRule = Object.freeze<TransformRule>({
  id: 'trig-domain',
  apply(problem) {
    if (problem.domain !== 'real' || problem.targets.length !== 1) return null;
    const added = missing(problem);
    if (added.length === 0) return null;
    const out = withChanges(problem, { conditions: [...problem.conditions, ...added] });
    return step('trig-domain', problem, out, 'EQUIVALENT_UNDER_CONDITIONS', added, 'missing-trig-domain-conditions', added.length, missing(out).length);
  },
  check: (from, outputs, record) => replay(() => TRIG_DOMAIN)(from, outputs, record),
});
