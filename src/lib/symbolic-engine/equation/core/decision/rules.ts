import type { ExprId, ExpressionStore } from '../representation/expression';
import { conditionKey, withChanges, type Condition, type Relation, type RelationProblem } from '../representation/relation';
import {
  MOVE_TO_ZERO, recordsEqual, type TransformRecord, type TransformRule, type TransformStep,
} from '../representation/transform';
import { multiplyForms, polynomialExpression, rationalForm } from './rational-form';

/**
 * Transform rules of the polynomial decision slice, each with a checker that
 * re-derives its step from the input state.
 *
 * - `natural-domain`: every base raised to a non-positive integer power must
 *   be nonzero; those conditions are added (EQUIVALENT_UNDER_CONDITIONS).
 * - `to-polynomial`: e op 0 with e = n/d becomes n op 0 for = and ≠, and
 *   n·d op 0 for < and ≤ (EQUIVALENT, given d ≠ 0 from recorded conditions).
 */

/** Bases b of b^k with an integer k ≤ 0 anywhere in the expressions. */
export function domainBases(store: ExpressionStore, roots: readonly ExprId[]): ExprId[] {
  const out: ExprId[] = [];
  for (const n of store.postorder(roots)) {
    const node = store.node(n);
    if (node.kind !== 'pow') continue;
    const e = store.numberValue(node.exponent);
    if (e && e.denominator === 1n && e.numerator <= 0n) out.push(node.base);
  }
  return out;
}

function problemExpressions(p: RelationProblem): ExprId[] {
  return [...p.relations.flatMap(r => [r.lhs, r.rhs]), ...p.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
}

function missingDomainConditions(p: RelationProblem): Condition[] {
  const s = p.store, have = new Set(p.conditions.map(c => conditionKey(s, c))), out: Condition[] = [];
  for (const base of domainBases(s, problemExpressions(p))) {
    const c: Condition = Object.freeze({ kind: 'nonzero', expr: base });
    const key = conditionKey(s, c);
    if (!have.has(key)) { have.add(key); out.push(c); }
  }
  return out;
}

const check = (rule: TransformRule) => (from: RelationProblem, outputs: readonly RelationProblem[], record: TransformRecord) => {
  const again = rule.apply(from);
  return again !== null && outputs.length === 1 && again.outputs[0].hash === outputs[0].hash && recordsEqual(again.record, record, from);
};

function step(rule: string, from: RelationProblem, out: RelationProblem, kind: TransformRecord['kind'], added: readonly Condition[], measure: string, before: number, after: number): TransformStep {
  const record: TransformRecord = Object.freeze({
    rule, from: from.hash, kind, progress: 'measure', obligations: Object.freeze([]),
    to: Object.freeze([Object.freeze({ state: out.hash, added: Object.freeze([...added]), removed: Object.freeze([]) })]),
    measure: Object.freeze({ name: measure, before: Object.freeze([BigInt(before)]), after: Object.freeze([BigInt(after)]) }),
  });
  return Object.freeze({ record, outputs: Object.freeze([out]) });
}

export const NATURAL_DOMAIN: TransformRule = Object.freeze<TransformRule>({
  id: 'natural-domain',
  apply(problem) {
    const added = missingDomainConditions(problem);
    if (added.length === 0) return null;
    const out = withChanges(problem, { conditions: [...problem.conditions, ...added] });
    return step('natural-domain', problem, out, 'EQUIVALENT_UNDER_CONDITIONS', added, 'missing-domain-conditions', added.length, missingDomainConditions(out).length);
  },
  check: (from, outputs, record) => check(NATURAL_DOMAIN)(from, outputs, record),
});

function isZero(store: ExpressionStore, id: ExprId): boolean { return store.numberValue(id)?.numerator === 0n; }

/** The polynomial relation for a zero-form relation, or undefined when the relation is not recognized. */
function polynomialRelation(problem: RelationProblem, r: Relation): Relation | undefined {
  const s = problem.store, x = problem.targets[0];
  let e: ExprId;
  if (isZero(s, r.rhs)) e = r.lhs;
  else if ((r.op === 'eq' || r.op === 'ne') && isZero(s, r.lhs)) e = r.rhs;
  else return undefined;
  const f = rationalForm(s, e, x);
  if (!f.ok) return undefined;
  const poly = r.op === 'eq' || r.op === 'ne' ? f.form.num : multiplyForms(s, f.form.num, f.form.den);
  return { op: r.op, lhs: polynomialExpression(s, poly, x), rhs: s.integer(0) };
}

function pendingPolynomial(problem: RelationProblem): number {
  return problem.relations.filter(r => {
    const p = polynomialRelation(problem, r);
    return p !== undefined && (p.lhs !== r.lhs && p.lhs !== r.rhs);
  }).length;
}

export const TO_POLYNOMIAL: TransformRule = Object.freeze<TransformRule>({
  id: 'to-polynomial',
  apply(problem) {
    if (problem.targets.length !== 1 || missingDomainConditions(problem).length) return null;
    const converted = problem.relations.map(r => polynomialRelation(problem, r));
    if (converted.some(c => c === undefined)) return null;
    const before = pendingPolynomial(problem);
    if (before === 0) return null;
    const out = withChanges(problem, { relations: converted as Relation[] });
    return step('to-polynomial', problem, out, 'EQUIVALENT', [], 'relations-not-polynomial', before, pendingPolynomial(out));
  },
  check: (from, outputs, record) => check(TO_POLYNOMIAL)(from, outputs, record),
});

export const POLYNOMIAL_RULES: ReadonlyMap<string, TransformRule> = new Map([MOVE_TO_ZERO, NATURAL_DOMAIN, TO_POLYNOMIAL].map(r => [r.id, r]));
