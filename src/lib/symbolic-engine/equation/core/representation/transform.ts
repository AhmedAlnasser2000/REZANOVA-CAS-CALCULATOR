import { demand } from '../execution';
import { conditionKey, withChanges, type Condition, type Relation, type RelationProblem } from './relation';

/**
 * Transform records and the proof log. Each solving step is recorded with
 * its equivalence kind, the conditions it adds or removes, and the progress
 * measure that decreased (or the fact that it reached a fresh state). A
 * verifier, separate from whatever produced the log, replays it: structural
 * checks first, then each rule's own semantic checker.
 */
export const EQUIVALENCE_KINDS = ['EQUIVALENT', 'EQUIVALENT_UNDER_CONDITIONS', 'FORWARD_ONLY', 'BRANCH_DECOMPOSITION'] as const;
export type EquivalenceKind = (typeof EQUIVALENCE_KINDS)[number];
export const OBLIGATIONS = ['substitution-check'] as const;
export type Obligation = (typeof OBLIGATIONS)[number];

/** Lexicographic measure over nonnegative integers: `after` must be smaller than `before`. */
export interface ProgressMeasure { readonly name: string; readonly before: readonly bigint[]; readonly after: readonly bigint[] }

export interface TransformOutput { readonly state: string; readonly added: readonly Condition[]; readonly removed: readonly Condition[] }

export interface TransformRecord {
  readonly rule: string;
  readonly from: string;
  readonly to: readonly TransformOutput[];
  readonly kind: EquivalenceKind;
  readonly progress: 'measure' | 'fresh-state';
  readonly measure: ProgressMeasure;
  readonly obligations: readonly Obligation[];
}

export interface ProofLog {
  readonly root: string;
  readonly states: ReadonlyMap<string, RelationProblem>;
  readonly records: readonly TransformRecord[];
}

export interface TransformStep { readonly record: TransformRecord; readonly outputs: readonly RelationProblem[] }

export interface TransformRule {
  readonly id: string;
  /** The step this rule takes on `problem`, or null when it does not apply. */
  apply(problem: RelationProblem): TransformStep | null;
  /** Semantic re-validation of a recorded step, independent of how it was produced. */
  check(from: RelationProblem, outputs: readonly RelationProblem[], record: TransformRecord): boolean;
}

export class ProofLogBuilder {
  readonly #states = new Map<string, RelationProblem>();
  readonly #records: TransformRecord[] = [];
  readonly root: string;

  constructor(root: RelationProblem) {
    this.root = root.hash;
    this.#states.set(root.hash, root);
  }

  append(step: TransformStep): void {
    demand(step.outputs.length === step.record.to.length, 'invalid-input', 'outputs do not match the record');
    step.outputs.forEach((p, i) => {
      demand(p.hash === step.record.to[i].state, 'invalid-input', 'output state hash');
      this.#states.set(p.hash, p);
    });
    this.#records.push(step.record);
  }

  build(): ProofLog {
    return Object.freeze({ root: this.root, states: new Map(this.#states), records: Object.freeze([...this.#records]) });
  }
}

function lexLess(a: readonly bigint[], b: readonly bigint[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

export function recordsEqual(a: TransformRecord, b: TransformRecord, from: RelationProblem): boolean {
  const store = from.store;
  const conditions = (list: readonly Condition[]) => list.map(c => conditionKey(store, c)).join(';');
  return a.rule === b.rule && a.from === b.from && a.kind === b.kind && a.progress === b.progress
    && a.measure.name === b.measure.name && a.measure.before.join(',') === b.measure.before.join(',')
    && a.measure.after.join(',') === b.measure.after.join(',') && a.obligations.join(',') === b.obligations.join(',')
    && a.to.length === b.to.length
    && a.to.every((t, i) => t.state === b.to[i].state && conditions(t.added) === conditions(b.to[i].added) && conditions(t.removed) === conditions(b.to[i].removed));
}

export interface VerificationReport {
  readonly records: number;
  /** States reached by a FORWARD_ONLY step: their candidates need a substitution check. */
  readonly substitutionChecks: readonly string[];
  readonly leaves: readonly string[];
}

/** Replay a proof log. Any failure throws `verification-failed` naming the broken property. */
export function verifyProofLog(log: ProofLog, rules: ReadonlyMap<string, TransformRule>): VerificationReport {
  const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
  const root = log.states.get(log.root) ?? fail('root state missing');
  const store = root.store, ctx = store.ctx;
  for (const [hash, state] of log.states) {
    ctx.tick();
    if (state.store !== store) fail('states from different stores');
    if (withChanges(state, {}).hash !== hash || state.hash !== hash) fail('state hash does not match its content');
  }
  const reached = new Set([log.root]), expanded = new Set<string>(), checks: string[] = [];
  for (const record of log.records) {
    ctx.tick();
    const from = log.states.get(record.from) ?? fail('record starts from an unknown state');
    if (!reached.has(record.from)) fail('chain discontinuity: record starts from an unreached state');
    if (!(EQUIVALENCE_KINDS as readonly string[]).includes(record.kind)) fail('unknown equivalence kind');
    if (record.kind === 'BRANCH_DECOMPOSITION' ? record.to.length < 2 : record.to.length !== 1) fail('wrong number of outputs for the equivalence kind');
    const outputs = record.to.map(t => log.states.get(t.state) ?? fail('record reaches an unknown state'));
    const fromKeys = new Set(from.conditions.map(c => conditionKey(store, c)));
    record.to.forEach((t, i) => {
      const out = outputs[i];
      if (out.domain !== from.domain || out.targets.join(',') !== from.targets.join(',')) fail('domain or targets changed');
      const added = t.added.map(c => conditionKey(store, c)), removed = t.removed.map(c => conditionKey(store, c));
      if (added.some(k => fromKeys.has(k)) || removed.some(k => !fromKeys.has(k))) fail('condition bookkeeping: added or removed condition inconsistent with the input');
      const expected = new Set([...fromKeys].filter(k => !removed.includes(k)).concat(added));
      const actual = out.conditions.map(c => conditionKey(store, c));
      if (actual.length !== expected.size || actual.some(k => !expected.has(k))) fail('condition bookkeeping: output conditions differ');
      if (record.kind === 'EQUIVALENT' && (added.length || removed.length)) fail('an EQUIVALENT step changed conditions');
    });
    if (record.kind === 'EQUIVALENT_UNDER_CONDITIONS' && record.to.every(t => t.added.length === 0)) fail('EQUIVALENT_UNDER_CONDITIONS without added conditions');
    if (record.kind === 'FORWARD_ONLY' && !record.obligations.includes('substitution-check')) fail('FORWARD_ONLY step without a substitution obligation');
    if (record.obligations.some(o => !(OBLIGATIONS as readonly string[]).includes(o))) fail('unknown obligation');
    if (record.progress === 'measure') {
      const m = record.measure;
      if (!m.name || m.before.length === 0 || m.before.length !== m.after.length || [...m.before, ...m.after].some(v => typeof v !== 'bigint' || v < 0n)) fail('malformed progress measure');
      if (!lexLess(m.after, m.before)) fail('progress measure did not decrease');
    } else if (record.progress === 'fresh-state') {
      if (record.to.some(t => reached.has(t.state))) fail('fresh-state step returned to a reached state');
    } else fail('unknown progress justification');
    const rule = rules.get(record.rule) ?? fail(`no checker for rule ${record.rule}`);
    if (!rule.check(from, outputs, record)) fail(`rule ${record.rule} rejected its step`);
    expanded.add(record.from);
    for (const t of record.to) {
      reached.add(t.state);
      if (record.obligations.includes('substitution-check')) checks.push(t.state);
    }
  }
  const leaves = [...reached].filter(h => !expanded.has(h)).sort();
  return Object.freeze({ records: log.records.length, substitutionChecks: Object.freeze([...new Set(checks)].sort()), leaves: Object.freeze(leaves) });
}

// ---- the two machinery-exercising rules of this gate ----

function isZeroExpr(problem: RelationProblem, id: number): boolean {
  const v = problem.store.numberValue(id as never);
  return v !== undefined && v.numerator === 0n;
}

/** A relation is in zero form when it compares one expression with 0 (`e op 0`; either side for = and ≠). */
function inZeroForm(problem: RelationProblem, r: Relation): boolean {
  return isZeroExpr(problem, r.rhs) || ((r.op === 'eq' || r.op === 'ne') && isZeroExpr(problem, r.lhs));
}

/** lhs op rhs  ⇔  lhs − rhs op 0 (same value set and natural domain). */
export const MOVE_TO_ZERO: TransformRule = Object.freeze<TransformRule>({
  id: 'move-to-zero',
  apply(problem: RelationProblem): TransformStep | null {
    const pending = problem.relations.filter(r => !inZeroForm(problem, r)).length;
    if (pending === 0) return null;
    const s = problem.store, zero = s.integer(0);
    const relations = problem.relations.map(r => (inZeroForm(problem, r) ? r : { op: r.op, lhs: s.sub(r.lhs, r.rhs), rhs: zero }));
    const out = withChanges(problem, { relations });
    const remaining = out.relations.filter(r => !inZeroForm(out, r)).length;
    const record: TransformRecord = Object.freeze({
      rule: 'move-to-zero', from: problem.hash, to: Object.freeze([Object.freeze({ state: out.hash, added: [], removed: [] })]),
      kind: 'EQUIVALENT', progress: 'measure', obligations: Object.freeze([]),
      measure: Object.freeze({ name: 'relations-not-in-zero-form', before: Object.freeze([BigInt(pending)]), after: Object.freeze([BigInt(remaining)]) }),
    });
    return { record, outputs: [out] };
  },
  check(from, outputs, record) {
    const again = MOVE_TO_ZERO.apply(from);
    return again !== null && outputs.length === 1 && again.outputs[0].hash === outputs[0].hash && recordsEqual(again.record, record, from);
  },
});

/**
 * t = t and t ≤ t hold exactly where t is defined: drop them, keeping
 * `in-domain(t)` as a condition unless t is total.
 */
export const DROP_IDENTICAL_SIDES: TransformRule = Object.freeze<TransformRule>({
  id: 'drop-identical-sides',
  apply(problem: RelationProblem): TransformStep | null {
    const s = problem.store;
    const dropped = problem.relations.filter(r => (r.op === 'eq' || r.op === 'le') && r.lhs === r.rhs);
    if (dropped.length === 0) return null;
    const have = new Set(problem.conditions.map(c => conditionKey(s, c)));
    const added: Condition[] = [];
    for (const r of dropped) {
      if (s.isTotal(r.lhs)) continue;
      const c: Condition = Object.freeze({ kind: 'in-domain', expr: r.lhs });
      const key = conditionKey(s, c);
      if (!have.has(key)) { have.add(key); added.push(c); }
    }
    const out = withChanges(problem, { relations: problem.relations.filter(r => !dropped.includes(r)), conditions: [...problem.conditions, ...added] });
    const record: TransformRecord = Object.freeze({
      rule: 'drop-identical-sides', from: problem.hash,
      to: Object.freeze([Object.freeze({ state: out.hash, added: Object.freeze(added), removed: [] })]),
      kind: added.length ? 'EQUIVALENT_UNDER_CONDITIONS' : 'EQUIVALENT', progress: 'measure', obligations: Object.freeze([]),
      measure: Object.freeze({ name: 'relation-count', before: Object.freeze([BigInt(problem.relations.length)]), after: Object.freeze([BigInt(out.relations.length)]) }),
    });
    return { record, outputs: [out] };
  },
  check(from, outputs, record) {
    const again = DROP_IDENTICAL_SIDES.apply(from);
    return again !== null && outputs.length === 1 && again.outputs[0].hash === outputs[0].hash && recordsEqual(again.record, record, from);
  },
});

export const GATE_RULES: ReadonlyMap<string, TransformRule> = new Map([MOVE_TO_ZERO, DROP_IDENTICAL_SIDES].map(r => [r.id, r]));
