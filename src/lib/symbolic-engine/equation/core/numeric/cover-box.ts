import { demand } from '../execution';
import { rational, rCompare, type Rational } from '../algebra/rational';
import type { XRange } from '../composition/range';
import { pointVariable, type ExprId, type ExpressionStore } from '../representation/expression';
import type { RelationProblem } from '../representation/relation';
import { valueExpression, type Point, type SolutionSet } from '../representation/solution-set';
import { contractSystem } from './contract';
import { distribute } from './identity';
import { fromRange, type Iv } from './interval';
import { bitsFor, boxMap, certifyPoint, definedOn, krawczyk, squareSystem } from './krawczyk';
import { around, excluded, initialRange, inside, satisfiesRange, split, systemRanges, tiny } from './systems';

/**
 * Independent evidence for certified system solutions (EQUATION-CERTIFIED-NUMERICS1 PR B):
 * 1. every isolated point in the answer re-proves its Krawczyk certificate;
 * 2. for a square system decided wholly by certified numerics (no exact elimination first), an exclusion cover of
 *    the search box (the range rows, then HC4, recomputed here): the claimed boxes are pairwise disjoint (an exact
 *    claimed point gets its own Krawczyk box), every claimed point satisfies the range rows, and every other part
 *    of the box is excluded (a kernel undefined throughout it, a certified range without 0, an empty HC4
 *    contraction, or a Krawczyk test with no solution). A part where the Krawczyk test proves a solution outside
 *    every claimed box is an unclaimed solution, unless that solution violates the range rows.
 * Returns whether completeness was proven (otherwise the slice re-derives the answer). That each claimed point
 * solves the problem's own equations is checked separately, by identity (`holdsAt`).
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

type PointNode = Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated-point' }>;

/** The isolated point behind a tuple whose coordinates are exactly its coordinates, in order. */
function bareSource(store: ExpressionStore, p: Point): PointNode | undefined {
  const nodes = p.map(v => (v.kind === 'expression' ? store.node(v.id) : undefined));
  if (!nodes.every((n, i) => n?.kind === 'isolated-point' && n.index === i)) return undefined;
  const first = nodes[0] as PointNode;
  return nodes.every(n => (n as PointNode).system.every((e, i) => e === first.system[i])) ? first : undefined;
}

export function verifyCertifiedSystem(problem: RelationProblem, claimed: SolutionSet): boolean {
  const store = problem.store, ctx = store.ctx, vars = problem.targets;
  if (claimed.kind !== 'finite') return false;
  const leaves = claimed.points.flatMap(p => p.flatMap(v => (v.kind === 'expression' ? store.postorder([v.id]).filter(n => store.node(n).kind === 'isolated-point') : [])));
  if (!leaves.length) return false;
  // 1. Certificates.
  const proven = new Set<string>();
  for (const n of leaves) {
    const node = store.node(n) as PointNode, key = `${node.system.join(',')}|${node.box.map(b => `${b.lo.numerator}/${b.lo.denominator}:${b.hi.numerator}/${b.hi.denominator}`).join(',')}`;
    if (proven.has(key)) continue;
    certifyPoint(store, node.system, node.system.map((_, i) => pointVariable(i)), node.box);
    proven.add(key);
  }
  // 2. The cover, when every point is exact or an isolated point of the problem's own equations.
  const fs = problem.relations.filter(r => r.op === 'eq').map(r => distribute(store, store.sub(r.lhs, r.rhs)));
  if (fs.length !== vars.length) return false;
  const bound = new Map(vars.map((v, i) => [v, store.symbol(pointVariable(i))] as const)), inBound = fs.map(f => store.substitute(f, bound));
  const sys = squareSystem(store, fs, vars) ?? fail('the system has no derivative here');
  const boxes: Iv[][] = [];
  for (const p of claimed.points) {
    const source = bareSource(store, p);
    if (source) {
      if (!source.system.every((e, i) => e === inBound[i])) return false;
      boxes.push(source.box.map(b => ({ lo: b.lo, hi: b.hi })));
      continue;
    }
    const q = p.map(v => (v.kind === 'rational' ? v.value : undefined));
    if (!q.every(x => x !== undefined)) return false;
    const box = [40n, 60n].map(e => around(store, q as Rational[], rational(ctx, 1n, 1n << e))).find(B => krawczyk(store, sys, B).kind === 'unique');
    boxes.push(box ?? fail('an exact claimed solution is not isolated by the Krawczyk test'));
  }
  const { ranges } = systemRanges(store, problem.relations, vars);
  for (const p of claimed.points) {
    if (!p.every((v, i) => satisfiesRange(store, valueExpression(store, v), ranges.get(vars[i])) === true)) fail('a claimed solution is outside the range rows');
  }
  boxes.forEach((a, i) => boxes.slice(0, i).forEach(b => {
    if (a.every((x, k) => rCompare(ctx, x.hi, b[k].lo) >= 0 && rCompare(ctx, b[k].hi, x.lo) >= 0)) fail('two claimed solutions share a box');
  }));
  const start = contractSystem(store, fs, new Map(vars.map(v => [v, initialRange(store, ranges.get(v))] as const)), 64);
  if (!start) {
    if (claimed.points.length) fail('solutions claimed where the search box holds none');
    return true;
  }
  const X0 = vars.map(v => fromRange(start.get(v) as XRange) ?? fail('the search box is unbounded'));
  const work: Iv[][] = [X0];
  while (work.length) {
    ctx.tick();
    let X = work.pop() as Iv[];
    if (boxes.some(B => inside(store, X, B))) continue;
    const bits = bitsFor(X);
    if (definedOn(store, sys, X, bits) === false || excluded(store, sys, X, bits)) continue;
    // Contractions keep every zero of the box, so the rest of the cover works on what they leave.
    const c = contractSystem(store, fs, boxMap(vars, X), bits);
    if (!c) continue;
    const contracted = vars.map((v, i) => fromRange(c.get(v) as XRange) ?? X[i]);
    if (contracted.every(b => rCompare(ctx, b.lo, b.hi) < 0)) X = contracted;
    if (boxes.some(B => inside(store, X, B))) continue;
    const k = krawczyk(store, sys, X, bits);
    if (k.kind === 'none') continue;
    if (k.kind === 'unknown' && k.box.every(b => rCompare(ctx, b.lo, b.hi) < 0)) X = [...k.box];
    if (k.kind === 'unique' && !boxes.some(B => B.every((b, i) => rCompare(ctx, b.hi, X[i].lo) >= 0 && rCompare(ctx, X[i].hi, b.lo) >= 0))) {
      const coordinates: ExprId[] = vars.map((_, i) => store.isolatedPoint(fs, vars, X, i));
      const inRange = coordinates.map((c, i) => satisfiesRange(store, c, ranges.get(vars[i])));
      if (inRange.every(v => v === true)) fail('an unclaimed solution');
      if (inRange.some(v => v === undefined)) fail('an unclaimed solution may lie on a range boundary');
      continue;
    }
    if (tiny(store, X)) fail('the cover cannot exclude a part of the box (a tangent solution)');
    work.push(...split(store, X));
  }
  return true;
}
