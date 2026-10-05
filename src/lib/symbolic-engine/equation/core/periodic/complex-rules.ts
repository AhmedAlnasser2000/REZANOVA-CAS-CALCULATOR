import { NATURAL_DOMAIN } from '../decision/rules';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { conditionKey, withChanges, type Condition, type RelationProblem } from '../representation/relation';
import { MOVE_TO_ZERO, type TransformRule } from '../representation/transform';
import { dependsOn, replay, step } from '../generators/normal-form';
import { complexIsZero, principalLog } from './rectangular';

/**
 * Rules of the complex families (slice 4, part B), equivalences over ℂ with
 * principal values:
 * - `complex-kernel-normal-form` (EQUIVALENT): b^u → exp(u·Log b) for a
 *   nonzero constant b and a target-dependent u (the principal power, by user
 *   decision); sin u, cos u, tan u → rational expressions in exp(±i·u)
 *   (tan keeps its poles: its denominator becomes a natural-domain condition).
 * - `complex-log-domain` (EQUIVALENT_UNDER_CONDITIONS): log u needs u ≠ 0.
 * The real log, power, radical and trig rules never apply over ℂ.
 */
function rewriteNode(store: ExpressionStore, id: ExprId, x: string): ExprId | undefined {
  const node = store.node(id);
  if (node.kind === 'pow' && dependsOn(store, node.exponent, x) && !dependsOn(store, node.base, x)) {
    if (complexIsZero(store, node.base) !== false) return undefined;
    const L = principalLog(store, node.base);
    return L === undefined ? undefined : store.exp(store.mul(node.exponent, L));
  }
  if (node.kind === 'apply' && dependsOn(store, node.arg, x) && (node.fn === 'sin' || node.fn === 'cos' || node.fn === 'tan')) {
    const iu = store.mul(store.constant('i'), node.arg);
    const w = store.exp(iu), wInv = store.exp(store.neg(iu));
    const sin = store.mul(store.pow(store.mul(store.integer(2), store.constant('i')), store.integer(-1)), store.sub(w, wInv));
    const cos = store.mul(store.fraction(1, 2), store.add(w, wInv));
    return node.fn === 'sin' ? sin : node.fn === 'cos' ? cos : store.div(store.sub(w, wInv), store.mul(store.constant('i'), store.add(w, wInv)));
  }
  return undefined;
}

function normalize(store: ExpressionStore, id: ExprId, x: string): { id: ExprId; rewrites: number } {
  const mapped = new Map<ExprId, ExprId>();
  let rewrites = 0;
  for (const n of store.postorder([id])) {
    const node = store.node(n), m = (c: ExprId) => mapped.get(c) as ExprId;
    let out: ExprId;
    switch (node.kind) {
      case 'add': out = store.add(...node.args.map(m)); break;
      case 'mul': out = store.mul(...node.args.map(m)); break;
      case 'pow': out = store.pow(m(node.base), m(node.exponent)); break;
      case 'apply': out = store.apply(node.fn, m(node.arg)); break;
      default: out = n;
    }
    for (;;) {
      store.ctx.tick();
      const r = rewriteNode(store, out, x);
      if (r === undefined || r === out) break;
      rewrites++;
      out = r;
    }
    mapped.set(n, out);
  }
  return { id: mapped.get(id) as ExprId, rewrites };
}

function normalizeProblem(problem: RelationProblem) {
  const s = problem.store, x = problem.targets[0];
  let rewrites = 0;
  const norm = (id: ExprId) => { const r = normalize(s, id, x); rewrites += r.rewrites; return r.id; };
  const relations = problem.relations.map(r => ({ op: r.op, lhs: norm(r.lhs), rhs: norm(r.rhs) }));
  const conditions = problem.conditions.map(c => ('other' in c ? { kind: c.kind, expr: norm(c.expr), other: norm(c.other) } : { kind: c.kind, expr: norm(c.expr) }) as Condition);
  return { relations, conditions, rewrites };
}

export const COMPLEX_KERNEL_NORMAL_FORM: TransformRule = Object.freeze<TransformRule>({
  id: 'complex-kernel-normal-form',
  apply(problem) {
    if (problem.domain !== 'complex' || problem.targets.length !== 1) return null;
    const { relations, conditions, rewrites } = normalizeProblem(problem);
    if (rewrites === 0) return null;
    const out = withChanges(problem, { relations, conditions });
    const s = problem.store, before = new Set(problem.conditions.map(c => conditionKey(s, c))), after = new Set(out.conditions.map(c => conditionKey(s, c)));
    // Rewritten conditions (same meaning) are recorded as removed and added.
    const added = out.conditions.filter(c => !before.has(conditionKey(s, c)));
    const removed = problem.conditions.filter(c => !after.has(conditionKey(s, c)));
    const record = step('complex-kernel-normal-form', problem, out, added.length ? 'EQUIVALENT_UNDER_CONDITIONS' : 'EQUIVALENT', added, 'non-normal-complex-kernels', rewrites, normalizeProblem(out).rewrites);
    if (!removed.length) return record;
    const to = Object.freeze([Object.freeze({ ...record.record.to[0], removed: Object.freeze(removed) })]);
    return Object.freeze({ record: Object.freeze({ ...record.record, to }), outputs: record.outputs });
  },
  check: (from, outputs, record) => replay(() => COMPLEX_KERNEL_NORMAL_FORM)(from, outputs, record),
});

function logConditions(p: RelationProblem): Condition[] {
  const s = p.store, x = p.targets[0], out: Condition[] = [], have = new Set(p.conditions.map(c => conditionKey(s, c)));
  const roots = [...p.relations.flatMap(r => [r.lhs, r.rhs]), ...p.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  for (const n of s.postorder(roots)) {
    const node = s.node(n);
    if (node.kind !== 'apply' || node.fn !== 'log' || !dependsOn(s, node.arg, x)) continue;
    const c: Condition = { kind: 'nonzero', expr: node.arg }, k = conditionKey(s, c);
    if (!have.has(k)) { have.add(k); out.push(c); }
  }
  return out;
}

export const COMPLEX_LOG_DOMAIN: TransformRule = Object.freeze<TransformRule>({
  id: 'complex-log-domain',
  apply(problem) {
    if (problem.domain !== 'complex' || problem.targets.length !== 1) return null;
    const added = logConditions(problem);
    if (added.length === 0) return null;
    const out = withChanges(problem, { conditions: [...problem.conditions, ...added] });
    return step('complex-log-domain', problem, out, 'EQUIVALENT_UNDER_CONDITIONS', added, 'missing-complex-log-conditions', added.length, logConditions(out).length);
  },
  check: (from, outputs, record) => replay(() => COMPLEX_LOG_DOMAIN)(from, outputs, record),
});

/** Kernel normal form, log domain, denominators (tan poles included), zero form. */
export const COMPLEX_PIPELINE: readonly TransformRule[] = [COMPLEX_KERNEL_NORMAL_FORM, COMPLEX_LOG_DOMAIN, NATURAL_DOMAIN, MOVE_TO_ZERO];
export const COMPLEX_RULES: ReadonlyMap<string, TransformRule> = new Map(COMPLEX_PIPELINE.map(r => [r.id, r]));
