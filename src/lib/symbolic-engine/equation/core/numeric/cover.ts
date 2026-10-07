import { demand } from '../execution';
import { rAbs, rAdd, rational, rCompare, rDivide, rSubtract, type Rational } from '../algebra/rational';
import { derivative } from '../composition/derivative';
import { excludesZero, rangeOf, type XRange } from '../composition/range';
import { enclose } from '../representation/enclosure';
import { ISOLATED_VARIABLE, type ExprId, type ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import type { RelationProblem } from '../representation/relation';
import { valueExpression, type SolutionSet } from '../representation/solution-set';
import { certifyIsolated, domainNeeds, rangeBound } from './isolated';

/**
 * Independent evidence for answers with certified numeric roots (EQUATION-CERTIFIED-NUMERICS1):
 * 1. every isolated zero in the answer re-proves its own certificate;
 * 2. for one equation f = 0 in one variable, optionally bounded by range rows (x ≥ a, x < b with constant
 *    bounds), an exclusion cover: each claimed root sits in an interval where f itself is proven to have
 *    exactly one zero (numeric roots: their isolating interval; exact roots: a small interval on which f′
 *    keeps one sign), and everywhere else in the range the certified range of f excludes 0, or f is
 *    undefined. Pieces are bisected (tails extended outward) until proven, under the budget only; an exact
 *    zero found at a split point is an unclaimed solution.
 * Other shapes (inequalities, several equations, an exact root where f′ = 0) keep the slice's own checks and
 * re-derivation; only step 1 applies there.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
const BITS = 64;

type End = { readonly kind: 'q'; readonly q: Rational } | { readonly kind: 'c'; readonly id: ExprId } | { readonly kind: 'inf'; readonly sign: -1 | 1 };

function isolatedNodes(store: ExpressionStore, ids: readonly ExprId[]): ExprId[] {
  return store.postorder([...ids]).filter(n => store.node(n).kind === 'isolated');
}

function setValues(store: ExpressionStore, set: SolutionSet): ExprId[] {
  switch (set.kind) {
    case 'finite': return set.points.flat().map(v => valueExpression(store, v));
    case 'intervals': return set.intervals.flatMap(i => [i.lo, i.hi]).filter(e => e.kind !== 'infinity').map(e => valueExpression(store, e as Parameters<typeof valueExpression>[1]));
    case 'union': return set.sets.flatMap(s => setValues(store, s));
    default: return [];
  }
}

export function verifyNumericAnswer(problem: RelationProblem, claimed: SolutionSet): void {
  const store = problem.store, ctx = store.ctx;
  const nodes = isolatedNodes(store, setValues(store, claimed));
  if (!nodes.length) return;
  for (const n of nodes) {
    const node = store.node(n) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated' }>;
    if (certifyIsolated(store, node.expr, ISOLATED_VARIABLE, node.lo, node.hi) !== node.loSign) fail('an isolated zero has the wrong orientation');
  }
  // 2. The exclusion cover, for one equation with optional constant range rows.
  if (claimed.kind !== 'finite' || problem.targets.length !== 1) return;
  const x = problem.targets[0];
  const eqs = problem.relations.filter(r => r.op === 'eq');
  if (eqs.length !== 1) return;
  let lo: End = { kind: 'inf', sign: -1 }, hi: End = { kind: 'inf', sign: 1 };
  for (const r of problem.relations) {
    if (r === eqs[0]) continue;
    const b = rangeBound(store, r.lhs, r.rhs, r.op, x);
    if (!b) return;
    if (b.side === 1) hi = tighter(store, hi, { kind: 'c', id: b.at }, 1); else lo = tighter(store, lo, { kind: 'c', id: b.at }, -1);
  }
  const f = store.sub(eqs[0].lhs, eqs[0].rhs), df = derivative(store, f, x);
  if (df === undefined) return;
  // Claimed roots, each with an interval where f has exactly one zero.
  const intervals: [Rational, Rational][] = [];
  for (const [v] of claimed.points) {
    const id = valueExpression(store, v), node = store.node(id);
    if (node.kind === 'isolated') {
      certifyIsolated(store, f, x, node.lo, node.hi);
      intervals.push([node.lo, node.hi]);
      continue;
    }
    if (isolatedNodes(store, [id]).length) return;
    const around = uniqueAround(store, f, df, x, id);
    if (!around) return;
    intervals.push(around);
  }
  intervals.sort((a, b) => rCompare(ctx, a[0], b[0]));
  for (let i = 0; i + 1 < intervals.length; i++) if (rCompare(ctx, intervals[i][1], intervals[i + 1][0]) >= 0) fail('two claimed roots share an interval');
  // The gaps between them (within the range) contain no zero of f.
  const ends: End[] = [lo, ...intervals.flatMap(([a, b]) => [{ kind: 'q', q: a } as End, { kind: 'q', q: b } as End]), hi];
  for (let i = 0; i < ends.length; i += 2) exclude(store, f, x, ends[i], ends[i + 1]);
}

/** The tighter of two bounds on one side (side −1: lower bounds, the larger wins). */
function tighter(store: ExpressionStore, current: End, next: End, side: -1 | 1): End {
  if (current.kind === 'inf') return next;
  const a = current.kind === 'c' ? current.id : store.number((current as { q: Rational }).q), b = (next as { id: ExprId }).id;
  const c = realSign(store, store.sub(b, a));
  return (side === -1 ? c > 0 : c < 0) ? next : current;
}

/** A rational interval around the exact root c on which f′ keeps one sign (so c is f's only zero there). */
function uniqueAround(store: ExpressionStore, f: ExprId, df: ExprId, x: string, c: ExprId): [Rational, Rational] | undefined {
  const ctx = store.ctx;
  if (realSign(store, store.substitute(df, new Map([[x, c]]))) === 0) return undefined;
  const needs = domainNeeds(store, f, x);
  for (let bits = BITS; ; bits *= 2) {
    ctx.tick();
    const e = enclose(store, c, bits);
    if (e.kind !== 'bounds') return undefined;
    const pad = rational(ctx, 1n, 1n << BigInt(bits / 2));
    const a = rSubtract(ctx, e.lo, pad), b = rAdd(ctx, e.hi, pad), box: XRange = { lo: a, hi: b, loOpen: false, hiOpen: false };
    if (needs.every(n => n.test(rangeOf(store, n.arg, x, box, bits)) === true) && excludesZero(rangeOf(store, df, x, box, bits))) return [a, b];
  }
}

/** f has no zero on the gap between `a` and `b` (open at rational ends, closed at the range's own ends). */
function exclude(store: ExpressionStore, f: ExprId, x: string, a: End, b: End): void {
  const ctx = store.ctx, needs = domainNeeds(store, f, x);
  const work: { a: End; b: End; depth: number }[] = [{ a, b, depth: 0 }];
  const valueAt = (e: End, bits: number, side: -1 | 1): Rational | undefined => {
    if (e.kind === 'inf') return undefined;
    if (e.kind === 'q') return e.q;
    const b = enclose(store, e.id, bits);
    return b.kind === 'bounds' ? (side < 0 ? b.lo : b.hi) : fail('a range bound is not a real number');
  };
  while (work.length) {
    ctx.tick();
    const p = work.pop() as { a: End; b: End; depth: number };
    const bits = BITS + 16 * Math.min(p.depth, 64);
    const l = valueAt(p.a, bits, -1), h = valueAt(p.b, bits, 1);
    if (l !== undefined && h !== undefined && rCompare(ctx, l, h) > 0) continue;
    const box: XRange = { ...(l !== undefined ? { lo: l } : {}), ...(h !== undefined ? { hi: h } : {}), loOpen: l === undefined, hiOpen: h === undefined };
    if (needs.some(n => n.test(rangeOf(store, n.arg, x, box, bits)) === false)) continue; // undefined throughout
    if (excludesZero(rangeOf(store, f, x, box, bits))) continue;
    // Split: at the middle of a bounded piece, or outward on a tail.
    const one = rational(ctx, 1n);
    const m = l !== undefined && h !== undefined ? rDivide(ctx, rAdd(ctx, l, h), rational(ctx, 2n))
      : l !== undefined ? rAdd(ctx, l, rAdd(ctx, one, rAbs(ctx, l)))
        : h !== undefined ? rSubtract(ctx, h, rAdd(ctx, one, rAbs(ctx, h))) : rational(ctx, 0n);
    const at = store.substitute(f, new Map([[x, store.number(m)]]));
    if (needs.every(n => { const v = store.substitute(n.arg, new Map([[x, store.number(m)]])); return n.at(realSign(store, v), v); }) && realSign(store, at) === 0) fail('an unclaimed zero');
    work.push({ a: p.a, b: { kind: 'q', q: m }, depth: p.depth + 1 }, { a: { kind: 'q', q: m }, b: p.b, depth: p.depth + 1 });
  }
}
