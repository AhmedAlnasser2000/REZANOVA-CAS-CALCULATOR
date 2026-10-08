import type { ExprId, ExpressionStore } from '../representation/expression';
import { conditionKey, type Condition, type RelationProblem } from '../representation/relation';
import {
  finiteSet, normalizeSet, resourceOutcome, setKey, type EquationOutcome, type Interval, type Point, type PointValue, type RegionCell, type SolutionSet,
} from '../representation/solution-set';
import type { ParamCase } from '../parameters/cells';
import { caseOutcome } from '../parameters/solve';
import { SEMIALGEBRAIC } from '../parameters/tree';
import { cadProblem } from './atoms';
import { decompose } from './decompose';
import { describeDecomposition, type Bound, type Desc, type Piece } from './region';

/**
 * Parameters through the decomposition (EQUATION-SEMIALGEBRAIC1 PR B): the parameters are the outer levels and the
 * unknowns the inner ones, so the description of the decomposition reads as cases over parameter cells — written like
 * Reduce ("If −1 < a < 1 and b > a²:"), merged where one description of the unknowns holds — each with the set of the
 * unknowns over that cell, its bounds functions of the parameters. A parameter bound that is a root of degree ≥ 3 in
 * the outer parameters has no condition form yet and is refused.
 */
class NoCondition extends Error {}

function boundExpr(store: ExpressionStore, b: Bound): ExprId {
  const v = b.value;
  if (v.kind === 'rational') return store.number(v.value);
  if (v.kind === 'algebraic') return 'form' in v && v.form !== undefined ? v.form : store.algebraic(v.root);
  if (v.kind === 'expression') return v.id;
  throw new NoCondition();
}

/** A parameter cell's conditions: p = v for a section, p ≷ its ends otherwise. */
function conditionsOf(store: ExpressionStore, p: Piece, name: string): Condition[] {
  const x = store.symbol(name);
  if (p.lo && p.hi && p.lo === p.hi) return [{ kind: 'equal', expr: store.sub(x, boundExpr(store, p.lo)), other: store.integer(0) }];
  const out: Condition[] = [];
  if (p.lo) out.push({ kind: p.loClosed ? 'nonnegative' : 'positive', expr: store.sub(x, boundExpr(store, p.lo)) });
  if (p.hi) out.push({ kind: p.hiClosed ? 'nonnegative' : 'positive', expr: store.sub(boundExpr(store, p.hi), x) });
  return out;
}

const end = (b: Bound | undefined, sign: -1 | 1) => (b ? b.value : { kind: 'infinity' as const, sign });
function cells(pieces: readonly Piece[]): RegionCell[] {
  return pieces.map(p => {
    const head = { lo: end(p.lo, -1), hi: end(p.hi, 1), loClosed: p.loClosed, hiClosed: p.hiClosed };
    return typeof p.desc === 'string' ? head : { ...head, children: cells(p.desc) };
  });
}

/** Points when every piece is a section down to the last unknown; undefined otherwise. */
function pointsOf(desc: Desc, depth: number, prefix: PointValue[]): Point[] | undefined {
  if (desc === 'none') return [];
  if (desc === 'all') return depth === 0 ? [prefix] : undefined;
  const out: Point[] = [];
  for (const p of desc) {
    if (!(p.lo && p.hi && p.lo === p.hi) || depth === 0) return undefined;
    const inner = pointsOf(p.desc, depth - 1, [...prefix, p.lo.value]);
    if (!inner) return undefined;
    out.push(...inner);
  }
  return out;
}

/** The unknowns' set over one parameter cell. */
function targetSet(desc: Desc, targets: readonly string[]): SolutionSet {
  if (desc === 'none') return finiteSet(targets, []);
  const whole = { lo: { kind: 'infinity' as const, sign: -1 as const }, hi: { kind: 'infinity' as const, sign: 1 as const }, loClosed: false, hiClosed: false };
  const points = pointsOf(desc, targets.length, []);
  if (points) return finiteSet(targets, points);
  const list = desc === 'all' ? [whole] : cells(desc);
  if (targets.length === 1) return { kind: 'intervals', variables: targets, intervals: list.map((c): Interval => ({ lo: c.lo, hi: c.hi, loClosed: c.loClosed, hiClosed: c.hiClosed })) };
  return { kind: 'cylindrical', variables: targets, cells: list };
}

/**
 * Cases with the same set whose conditions differ only in E > 0 against −E > 0 join as E ≠ 0 (c > 0 and c < 0 with
 * one answer read c ≠ 0); cells on both sides of a section stay apart in the decomposition when the section differs.
 */
function joinOpposites(store: ExpressionStore, cases: readonly ParamCase[]): ParamCase[] {
  const out = [...cases], key = (c: ParamCase) => setKey(store, normalizeSet(store, c.set, 'real'));
  const condKey = (c: Condition) => conditionKey(store, c);
  for (let changed = true; changed;) {
    changed = false;
    search: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        store.ctx.tick();
        const a = out[i], b = out[j];
        if (a.conditions.length !== b.conditions.length || key(a) !== key(b)) continue;
        const onlyA = a.conditions.filter(c => !b.conditions.some(d => condKey(d) === condKey(c)));
        const onlyB = b.conditions.filter(c => !a.conditions.some(d => condKey(d) === condKey(c)));
        if (onlyA.length !== 1 || onlyB.length !== 1 || onlyA[0].kind !== 'positive' || onlyB[0].kind !== 'positive') continue;
        if (store.numberValue(store.add(onlyA[0].expr, onlyB[0].expr))?.numerator !== 0n) continue;
        const joined: ParamCase = { conditions: [...a.conditions.filter(c => c !== onlyA[0]), { kind: 'nonzero', expr: onlyA[0].expr }], set: a.set };
        out.splice(j, 1); out.splice(i, 1, joined);
        changed = true;
        break search;
      }
    }
  }
  return out;
}

export function decideParametersByCad(problem: RelationProblem): EquationOutcome {
  try {
    const store = problem.store, params = problem.parameters, names = [...params, ...problem.targets];
    const p = cadProblem(problem, names);
    if (!p) return { kind: 'incomplete-implementation', reason: `${SEMIALGEBRAIC}: not a polynomial problem` };
    const desc = describeDecomposition(store, decompose(store, p), names, params.length);
    const cases: ParamCase[] = [];
    const walk = (d: Desc, level: number, conditions: readonly Condition[]): void => {
      store.ctx.tick();
      if (level === params.length || typeof d === 'string') {
        // A truth fixed above the unknowns: every value of them, or none.
        cases.push({ conditions, set: level === params.length ? targetSet(d, problem.targets) : d === 'all' ? targetSet('all', problem.targets) : finiteSet(problem.targets, []) });
        return;
      }
      for (const piece of d) walk(piece.desc, level + 1, [...conditions, ...conditionsOf(store, piece, params[level])]);
    };
    try {
      walk(desc, 0, []);
    } catch (e) {
      if (e instanceof NoCondition) return { kind: 'incomplete-implementation', reason: `${SEMIALGEBRAIC}: a parameter case bounded by a root of degree ≥ 3 in the other parameters` };
      throw e;
    }
    return caseOutcome(problem, joinOpposites(store, cases.length ? cases : [{ conditions: [], set: finiteSet(problem.targets, []) }]));
  } catch (e) {
    return resourceOutcome(e);
  }
}
