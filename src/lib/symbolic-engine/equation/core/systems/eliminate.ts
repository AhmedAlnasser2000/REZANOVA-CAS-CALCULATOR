import { OWNERS } from '../decision/rational-form';
import { evaluateExact } from '../representation/evaluate';
import { isSymbolName, type ExprId, type ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import { relationProblem, type RelationProblem } from '../representation/relation';
import { finiteSet, normalizeSet, valueExpression, valueKey, type EquationOutcome, type Point, type PointValue, type SolutionSet } from '../representation/solution-set';
import type { SystemResult } from './polynomial';

/**
 * Systems with exp, log, trig or radicals of the targets, by elimination: an
 * equation in which some target v occurs only as c·v (c a nonzero constant,
 * no target elsewhere in the term) is solved for v = −rest/c and v is
 * substituted everywhere else. Each step is an equivalence. When one target
 * is left, its problem goes to slices 1–5 (`decideOne`); several targets
 * left without kernels go to the polynomial path (`decideMany`). The tuples
 * are rebuilt by substituting back:
 * - a finite set gives points (a closed form that is undefined there drops the point);
 * - a real family {cⱼ} + P·ℤ gives the `periodic` kind in a fresh integer k;
 * - a target that is free (no equation left) gives a parametric set when the
 *   eliminated expressions are defined everywhere (exp, sin, cos, polynomials).
 * Nothing isolable names certified numerics.
 */
const CERTIFIED_NUMERICS = 'EQUATION-CERTIFIED-NUMERICS1';
class Unsupported extends Error {}
export function decideByElimination(problem: RelationProblem, decideOne: (p: RelationProblem) => EquationOutcome): SystemResult {
  const store = problem.store, ctx = store.ctx;
  let equations = problem.relations.map(r => store.sub(r.lhs, r.rhs));
  let targets = [...problem.targets];
  const eliminated: { v: string; value: ExprId }[] = [];
  const has = (id: ExprId, v: string) => store.freeSymbols(id).includes(v);
  while (targets.length > 1) {
    ctx.tick();
    const choice = pick(store, equations, targets);
    if (!choice) return { kind: 'refused', reason: `${CERTIFIED_NUMERICS}: no target can be isolated exactly in a system with kernels` };
    const { index, v, value } = choice;
    eliminated.push({ v, value });
    equations = equations.filter((_, i) => i !== index).map(e => store.substitute(e, new Map([[v, value]])));
    for (const e of eliminated) if (e !== eliminated[eliminated.length - 1]) e.value = store.substitute(e.value, new Map([[v, value]]));
    targets = targets.filter(t => t !== v);
    equations = equations.filter(e => store.numberValue(e)?.numerator !== 0n);
  }
  const x = targets[0];
  const leftover = equations.filter(e => !has(e, x));
  for (const e of leftover) {
    const v = evaluateExact(store, e, problem.domain);
    if (v.kind === 'exact' ? !(v.value.kind === 'rational' && v.value.value.numerator === 0n) : problem.domain === 'real' && realSign(store, e) !== 0) return { kind: 'cases', cases: [{ conditions: [], set: finiteSet(problem.targets, []) }] };
  }
  const inX = equations.filter(e => has(e, x));
  const order = problem.targets;
  const tuple = (xv: ExprId): ExprId[] => order.map(t => (t === x ? xv : store.substitute((eliminated.find(e => e.v === t) as { value: ExprId }).value, new Map([[x, xv]]))));
  if (inX.length === 0) {
    // x is free: the eliminated targets are functions of x, defined everywhere only for exp, sin, cos and polynomials.
    const unsafe = eliminated.some(e => store.postorder([e.value]).some(n => {
      const node = store.node(n);
      return (node.kind === 'apply' && !['exp', 'sin', 'cos'].includes(node.fn)) || (node.kind === 'pow' && has(n, x) && (store.numberValue(node.exponent)?.denominator !== 1n || (store.numberValue(node.exponent)?.numerator ?? 0n) < 0n));
    }));
    if (unsafe) return { kind: 'refused', reason: `${OWNERS.systems}: a free target whose eliminated expressions have a restricted domain (follow-up ledger)` };
    return { kind: 'cases', cases: [{ conditions: [], set: { kind: 'parametric', variables: order, values: tuple(store.symbol(x)), freeParameters: [x], constraints: [] } }] };
  }
  // The one-target problem; where an eliminated expression is undefined, its point is dropped when rebuilt.
  const one = relationProblem(store, { domain: problem.domain, targets: [x], relations: inX.map(e => ({ op: 'eq' as const, lhs: e, rhs: store.integer(0) })) });
  const o = decideOne(one);
  if (o.kind === 'empty') return { kind: 'cases', cases: [{ conditions: [], set: finiteSet(order, []) }] };
  if (o.kind !== 'solved') return { kind: 'refused', reason: 'reason' in o ? o.reason : `${OWNERS.systems}: a resource stop` };
  const set = normalizeSet(store, o.set, problem.domain);
  try {
    return { kind: 'cases', cases: [{ conditions: [], set: rebuild(store, set, order, x, tuple, problem) }] };
  } catch (e) {
    if (e instanceof Unsupported) return { kind: 'refused', reason: `${OWNERS.systems}: ${o.set.kind} answers of the remaining target in a system with kernels (follow-up ledger)` };
    throw e;
  }
}

function rebuild(store: ExpressionStore, set: SolutionSet, order: readonly string[], x: string, tuple: (xv: ExprId) => ExprId[], problem: RelationProblem): SolutionSet {
  const defined = (id: ExprId) => {
    const v = evaluateExact(store, id, problem.domain);
    return v.kind !== 'undefined';
  };
  const asPoint = (xv: PointValue): Point | undefined => {
    const ids = tuple(valueExpression(store, xv));
    if (!ids.every(defined)) return undefined;
    return ids.map((id, i) => (order[i] === x ? xv : ({ kind: 'expression', id } as PointValue)));
  };
  switch (set.kind) {
    case 'finite': return finiteSet(order, set.points.map(p => asPoint(p[0])).filter((p): p is Point => p !== undefined));
    case 'periodic-set': {
      if (!set.components.every(c => c.loClosed && c.hiClosed && c.lo.kind !== 'infinity' && c.hi.kind !== 'infinity' && valueKey(store, c.lo) === valueKey(store, c.hi)) || set.range.lo.kind !== 'infinity' || set.range.hi.kind !== 'infinity') return refusedSet();
      let k = 'k';
      for (let i = 1; !isSymbolName(k) || order.includes(k) || store.freeSymbols(...problem.relations.flatMap(r => [r.lhs, r.rhs])).includes(k); i++) k = `k${i}`;
      const period = valueExpression(store, set.period);
      const sets: SolutionSet[] = set.components.map(c => ({
        kind: 'periodic', variables: order, values: tuple(store.add(valueExpression(store, c.lo as PointValue), store.mul(store.symbol(k), period))), integerParameters: [k], constraints: [],
      }));
      return sets.length === 1 ? sets[0] : { kind: 'union', sets };
    }
    case 'periodic': {
      const sets: SolutionSet = { kind: 'periodic', variables: order, values: tuple(set.values[0]), integerParameters: set.integerParameters, constraints: set.constraints };
      return sets;
    }
    case 'union': return { kind: 'union', sets: set.sets.map(s => rebuild(store, s, order, x, tuple, problem)) };
    default: return refusedSet();
  }
}

function refusedSet(): never { throw new Unsupported(); }

/** An equation and a target in it that occurs only as c·v with a nonzero constant c; v = −rest/c. */
function pick(store: ExpressionStore, equations: readonly ExprId[], targets: readonly string[]): { index: number; v: string; value: ExprId } | undefined {
  const candidates: { index: number; v: string; value: ExprId; score: number }[] = [];
  equations.forEach((e, index) => {
    const node = store.node(e), terms = node.kind === 'add' ? node.args : [e];
    for (const v of targets) {
      const c: ExprId[] = [];
      let ok = true;
      const rest: ExprId[] = [];
      for (const t of terms) {
        if (!store.freeSymbols(t).includes(v)) { rest.push(t); continue; }
        if (t === store.symbol(v)) { c.push(store.integer(1)); continue; }
        const tn = store.node(t);
        if (tn.kind === 'mul' && tn.args.filter(a => a === store.symbol(v)).length === 1 && tn.args.every(a => a === store.symbol(v) || store.freeSymbols(a).length === 0)) {
          c.push(store.mul(...tn.args.filter(a => a !== store.symbol(v))));
          continue;
        }
        ok = false;
        break;
      }
      if (!ok || c.length === 0) continue;
      const coefficient = store.add(...c), value = evaluateExact(store, coefficient, 'complex');
      if (value.kind !== 'exact' || (value.value.kind === 'rational' && value.value.value.numerator === 0n)) continue;
      const restSum = store.add(store.integer(0), ...rest);
      // Prefer isolations whose value involves no other target, then none inside a kernel.
      const score = (store.freeSymbols(restSum).some(s => targets.includes(s)) ? 2 : 0) + (store.postorder([restSum]).some(n => store.node(n).kind === 'apply') ? 1 : 0);
      candidates.push({ index, v, value: store.div(store.neg(restSum), coefficient), score });
    }
  });
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0];
}
