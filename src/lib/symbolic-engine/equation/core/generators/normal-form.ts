import { EquationAlgebraError } from '../execution';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import { conditionKey, withChanges, type Condition, type RelationProblem } from '../representation/relation';
import { recordsEqual, type TransformRecord, type TransformRule, type TransformStep } from '../representation/transform';

/**
 * Real-domain rules of the generators slice.
 *
 * Convention (recorded in the spec): over ℝ, a power whose exponent depends on
 * the target is defined only where its base is positive, as in real analysis.
 *
 * - `log-domain` adds the natural domain of transcendental kernels:
 *   log v needs v > 0; f^g with the target in g needs f > 0; W₀(v) needs
 *   v ≥ −1/e; W₋₁(v) needs v ≥ −1/e and v < 0 (EQUIVALENT_UNDER_CONDITIONS).
 * - `real-power-normal-form` rewrites, with the same value on that domain:
 *   a^u → exp(u·log a) for a positive constant a or a target-dependent a;
 *   exp(u)^w → exp(u·w); log(exp u) → u; exp(log v) → v when v > 0 is
 *   recorded (EQUIVALENT over ℝ).
 */
export function dependsOn(store: ExpressionStore, id: ExprId, variable: string): boolean {
  return store.freeSymbols(id).includes(variable);
}

function expressionsOf(p: RelationProblem): ExprId[] {
  return [...p.relations.flatMap(r => [r.lhs, r.rhs]), ...p.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
}

function positiveConstant(store: ExpressionStore, id: ExprId): boolean {
  if (store.freeSymbols(id).length) return false;
  try {
    return realSign(store, id) === 1;
  } catch (e) {
    if (e instanceof EquationAlgebraError && e.code === 'invalid-input') return false;
    throw e;
  }
}

/** Domain conditions of the transcendental kernels (target-dependent ones only). */
function kernelConditions(p: RelationProblem): Condition[] {
  const s = p.store, x = p.targets[0], out: Condition[] = [];
  for (const n of s.postorder(expressionsOf(p))) {
    const node = s.node(n);
    if (node.kind === 'apply' && dependsOn(s, node.arg, x)) {
      const v = node.arg, threshold = s.add(v, s.exp(s.integer(-1)));
      if (node.fn === 'log') out.push({ kind: 'positive', expr: v });
      if (node.fn === 'lambertw') out.push({ kind: 'nonnegative', expr: threshold });
      if (node.fn === 'lambertwm1') out.push({ kind: 'nonnegative', expr: threshold }, { kind: 'positive', expr: s.neg(v) });
    }
    if (node.kind === 'pow' && dependsOn(s, node.exponent, x) && dependsOn(s, node.base, x)) out.push({ kind: 'positive', expr: node.base });
  }
  return out;
}

function missing(p: RelationProblem): Condition[] {
  const s = p.store, have = new Set(p.conditions.map(c => conditionKey(s, c))), out: Condition[] = [];
  for (const c of kernelConditions(p)) {
    const k = conditionKey(s, c);
    if (!have.has(k)) { have.add(k); out.push(c); }
  }
  return out;
}

function step(rule: string, from: RelationProblem, out: RelationProblem, kind: TransformRecord['kind'], added: readonly Condition[], measure: string, before: number, after: number): TransformStep {
  const record: TransformRecord = Object.freeze({
    rule, from: from.hash, kind, progress: 'measure', obligations: Object.freeze([]),
    to: Object.freeze([Object.freeze({ state: out.hash, added: Object.freeze([...added]), removed: Object.freeze([]) })]),
    measure: Object.freeze({ name: measure, before: Object.freeze([BigInt(before)]), after: Object.freeze([BigInt(after)]) }),
  });
  return Object.freeze({ record, outputs: Object.freeze([out]) });
}

const replay = (rule: () => TransformRule) => (from: RelationProblem, outputs: readonly RelationProblem[], record: TransformRecord) => {
  const again = rule().apply(from);
  return again !== null && outputs.length === 1 && again.outputs[0].hash === outputs[0].hash && recordsEqual(again.record, record, from);
};

export const LOG_DOMAIN: TransformRule = Object.freeze<TransformRule>({
  id: 'log-domain',
  apply(problem) {
    if (problem.domain !== 'real' || problem.targets.length !== 1) return null;
    const added = missing(problem);
    if (added.length === 0) return null;
    const out = withChanges(problem, { conditions: [...problem.conditions, ...added] });
    return step('log-domain', problem, out, 'EQUIVALENT_UNDER_CONDITIONS', added, 'missing-kernel-domain-conditions', added.length, missing(out).length);
  },
  check: (from, outputs, record) => replay(() => LOG_DOMAIN)(from, outputs, record),
});

/** One normal-form rewrite at a node, or undefined. Children are already normal. */
function rewriteNode(store: ExpressionStore, id: ExprId, x: string, positives: ReadonlySet<ExprId>): ExprId | undefined {
  const node = store.node(id);
  if (node.kind === 'pow' && dependsOn(store, node.exponent, x)) {
    const b = store.node(node.base);
    if (b.kind === 'apply' && b.fn === 'exp') return store.exp(store.mul(b.arg, node.exponent));
    if (dependsOn(store, node.base, x) || positiveConstant(store, node.base)) return store.exp(store.mul(node.exponent, store.log(node.base)));
    return undefined;
  }
  if (node.kind === 'apply' && dependsOn(store, node.arg, x)) {
    const a = store.node(node.arg);
    if (node.fn === 'log' && a.kind === 'apply' && a.fn === 'exp') return a.arg;
    if (node.fn === 'exp' && a.kind === 'apply' && a.fn === 'log' && positives.has(a.arg)) return a.arg;
  }
  return undefined;
}

/** Normalize an expression bottom-up (explicit stack); counts the rewrites made. */
export function normalizeReal(store: ExpressionStore, id: ExprId, x: string, positives: ReadonlySet<ExprId>): { id: ExprId; rewrites: number } {
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
      const r = rewriteNode(store, out, x, positives);
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
  const positives = new Set(problem.conditions.filter(c => c.kind === 'positive').map(c => c.expr));
  let rewrites = 0;
  const norm = (id: ExprId) => { const r = normalizeReal(s, id, x, positives); rewrites += r.rewrites; return r.id; };
  const relations = problem.relations.map(r => ({ op: r.op, lhs: norm(r.lhs), rhs: norm(r.rhs) }));
  const conditions = problem.conditions.map(c => ('other' in c ? { kind: c.kind, expr: norm(c.expr), other: norm(c.other) } : { kind: c.kind, expr: norm(c.expr) }) as Condition);
  return { relations, conditions, rewrites };
}

export const REAL_POWER_NORMAL_FORM: TransformRule = Object.freeze<TransformRule>({
  id: 'real-power-normal-form',
  apply(problem) {
    if (problem.domain !== 'real' || problem.targets.length !== 1) return null;
    const { relations, conditions, rewrites } = normalizeProblem(problem);
    if (rewrites === 0) return null;
    const out = withChanges(problem, { relations, conditions });
    // Rewritten conditions are recorded as removed (old form) and added (normal form).
    const s = problem.store, before = new Set(problem.conditions.map(c => conditionKey(s, c))), after = new Set(out.conditions.map(c => conditionKey(s, c)));
    const added = out.conditions.filter(c => !before.has(conditionKey(s, c)));
    const removed = problem.conditions.filter(c => !after.has(conditionKey(s, c)));
    if (removed.length && !added.length) return null;
    const record = step('real-power-normal-form', problem, out, added.length ? 'EQUIVALENT_UNDER_CONDITIONS' : 'EQUIVALENT', added, 'non-normal-real-powers', rewrites, normalizeProblem(out).rewrites);
    if (!removed.length) return record;
    const to = Object.freeze([Object.freeze({ ...record.record.to[0], removed: Object.freeze(removed) })]);
    return Object.freeze({ record: Object.freeze({ ...record.record, to }), outputs: record.outputs });
  },
  check: (from, outputs, record) => replay(() => REAL_POWER_NORMAL_FORM)(from, outputs, record),
});
