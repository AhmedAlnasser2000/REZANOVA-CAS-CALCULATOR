import { OWNERS } from '../decision/rational-form';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign } from '../representation/real-order';
import type { Condition, RelationProblem } from '../representation/relation';
import { floorExact, type Endpoint, type Interval, type PointValue, type SolutionSet } from '../representation/solution-set';
import { CERTIFIED_NUMERICS } from '../generators/lattice';
import type { ClosedAtom, ClosedDecision } from '../generators/closed-form-set';
import { holds, pointValue } from '../generators/closed-form-set';
import { sampleBetween } from '../generators/samples';
import { commonPeriod, hasTrig, inFamilies, kernelPeriods, lifted, periodicIn, restrictParam, sortedDistinct, type FamilyZeros, type PeriodicZeros } from './families';
import { COMPOSITION } from './inversion';

/**
 * Exact decision of a one-variable real problem whose atoms have periodic
 * zero families (slice 4).
 *
 * Every inequality atom is periodic (invariant under x → x + P, checked
 * structurally), trig-free (finitely many critical points), or a product of
 * such factors; = and ≠ atoms depend only on their (periodic) zero sets.
 * With P the common period and F the finite critical points:
 * - F empty: the truth pattern of one period window gives a periodic set;
 * - otherwise the region [min F − 2P, max F + 2P] is decided piece by piece
 *   (every lifted family member is a critical point), and beyond F the truth
 *   is periodic: each tail is the pattern on a half-line starting at the first
 *   whole pattern component from which the set agrees with the pattern. The
 *   bounded rest is enumerated exactly.
 * Families in integer parameters (non-affine) are equations: their members
 * are restricted piece by piece with exact parameter ranges.
 */
type Piece = { readonly kind: 'point'; readonly at: ExprId } | { readonly kind: 'open'; readonly lo: ExprId; readonly hi: ExprId; readonly sample: ExprId };

const fail = (owner: string, detail: string): ClosedDecision => ({ kind: 'refused', refusal: { owner, detail } });

function sign(store: ExpressionStore, atom: ClosedAtom, x: string, point: ExprId, extraZero: boolean): -1 | 0 | 1 {
  if (extraZero) return 0;
  if (atom.zeros === 'all' || atom.zeros.has(point)) return 0;
  if (atom.intervals.some(i => (i.lo === undefined || realCompare(store, point, i.lo) > (i.loClosed ? -1 : 0)) && (i.hi === undefined || realCompare(store, point, i.hi) < (i.hiClosed ? 1 : 0)))) return 0;
  if (inFamilies(store, atom.periodic, point)) return 0;
  return realSign(store, store.substitute(atom.f, new Map([[x, point]])));
}

function truthAt(store: ExpressionStore, atoms: readonly ClosedAtom[], x: string, point: ExprId, zeroOf?: ReadonlySet<ClosedAtom>): boolean {
  for (const a of atoms) if (!holds(a.op, sign(store, a, x, point, zeroOf?.has(a) ?? false))) return false;
  return true;
}

/** Family members and zero-interval ends of one period. */
function residuesOf(f: PeriodicZeros): ExprId[] { return [...f.points, ...(f.intervals ?? []).flatMap(i => [i.lo as ExprId, i.hi as ExprId])]; }

function piecesOf(store: ExpressionStore, points: readonly ExprId[]): Piece[] {
  const out: Piece[] = [];
  points.forEach((c, i) => {
    out.push({ kind: 'point', at: c });
    if (i + 1 < points.length) out.push({ kind: 'open', lo: c, hi: points[i + 1], sample: sampleBetween(store, c, points[i + 1]) });
  });
  return out;
}

const endpoint = (store: ExpressionStore, id: ExprId): PointValue => pointValue(store, id);
const infinity = (sign: -1 | 1): Endpoint => ({ kind: 'infinity', sign });

/** Runs of true pieces as intervals (pieces outside [from, to] count as false). */
function runs(store: ExpressionStore, pieces: readonly Piece[], truth: readonly boolean[], from: number, to: number): Interval[] {
  const out: Interval[] = [];
  for (let p = from; p <= to; p++) {
    if (!truth[p]) continue;
    const start = p;
    while (p + 1 <= to && truth[p + 1]) p++;
    const a = pieces[start], b = pieces[p], lo = endpoint(store, a.kind === 'point' ? a.at : a.lo);
    out.push({
      lo, loClosed: a.kind === 'point',
      hi: start === p && a.kind === 'point' ? lo : endpoint(store, b.kind === 'point' ? b.at : b.hi), hiClosed: b.kind === 'point',
    });
  }
  return out;
}

function positionOf(p: Piece): ExprId { return p.kind === 'point' ? p.at : p.sample; }

/** The pattern components of one period [start, start + P) as intervals. */
function patternComponents(store: ExpressionStore, pieces: readonly Piece[], truth: readonly boolean[], startIndex: number, P: ExprId): Interval[] {
  const startAt = positionOf(pieces[startIndex]), end = store.add(pieces[startIndex].kind === 'point' ? startAt : (pieces[startIndex] as { lo: ExprId }).lo, P);
  let last = startIndex;
  while (last + 1 < pieces.length && realCompare(store, positionOf(pieces[last + 1]), end) < 0) last++;
  return runs(store, pieces, truth, startIndex, last);
}

function periodicSet(x: string, P: PointValue, components: readonly Interval[], range: Interval): SolutionSet {
  return { kind: 'periodic-set', variables: [x], period: P, components, range };
}

export function decidePeriodic(problem: RelationProblem, atoms: readonly ClosedAtom[]): ClosedDecision {
  const s = problem.store, x = problem.targets[0];
  if (atoms.some(a => a.families.length)) return decideFamilies(problem, atoms);
  const periods = [...atoms.flatMap(a => a.periodic.map(f => f.period)), ...atoms.flatMap(a => kernelPeriods(s, a.f, x))];
  const P = commonPeriod(s, periods);
  if (P === undefined) return fail(CERTIFIED_NUMERICS, 'incommensurable periods');
  // Each atom: trig-free, periodic, or a product of such factors.
  for (const a of atoms) {
    // = and ≠ depend on the zero set only (periodic by construction); inequalities need a periodic sign.
    if (a.op === 'eq' || a.op === 'ne' || !hasTrig(s, a.f, x) || periodicIn(s, a.f, x, P)) continue;
    const node = s.node(a.f);
    const factors = node.kind === 'mul' ? node.args : [a.f];
    if (!factors.every(f => !hasTrig(s, f, x) || periodicIn(s, f, x, P))) return fail(COMPOSITION, 'an atom mixing periodic and non-periodic parts other than as factors');
  }
  const finite = new Set<ExprId>();
  for (const a of atoms) {
    if (a.zeros !== 'all') for (const z of a.zeros) finite.add(z);
    for (const i of a.intervals) { if (i.lo !== undefined) finite.add(i.lo); if (i.hi !== undefined) finite.add(i.hi); }
  }
  const F = sortedDistinct(s, finite);
  const two = s.integer(2), Pv = pointValue(s, P);
  if (F.length === 0) {
    // One window [−P/2, P/2] of the pattern.
    const halfP = s.div(P, two), lo = s.neg(halfP);
    const points = sortedDistinct(s, [lo, halfP, ...atoms.flatMap(a => a.periodic.flatMap(f => residuesOf(f).flatMap(r => lifted(s, r, f.period, lo, halfP))))]);
    const pieces = piecesOf(s, points), truth = pieces.map(p => truthAt(s, atoms, x, positionOf(p)));
    if (truth.every(t => t)) return { kind: 'set', set: { kind: 'intervals', variables: [x], intervals: [{ lo: infinity(-1), hi: infinity(1), loClosed: false, hiClosed: false }] } };
    // The last piece (the point P/2) repeats the first (−P/2).
    const components = runs(s, pieces, truth, 0, pieces.length - 2);
    if (components.length === 0) return { kind: 'empty' };
    return { kind: 'set', set: periodicSet(x, Pv, components, { lo: infinity(-1), hi: infinity(1), loClosed: false, hiClosed: false }) };
  }
  const L = s.sub(F[0], s.mul(two, P)), U = s.add(F[F.length - 1], s.mul(two, P));
  const points = sortedDistinct(s, [L, U, ...F, ...atoms.flatMap(a => a.periodic.flatMap(f => residuesOf(f).flatMap(r => lifted(s, r, f.period, L, U))))]);
  const pieces = piecesOf(s, points);
  const truth = pieces.map(p => truthAt(s, atoms, x, positionOf(p)));
  // Pattern truth: the same position translated by whole periods beyond F (right) or before it (left).
  const translated = (p: Piece, side: 1 | -1) => {
    const pos = positionOf(p), edge = side > 0 ? F[F.length - 1] : F[0];
    const f = floorExact(s, s.div(s.sub(edge, pos), P));
    const k = side > 0 ? f.n + 1n : f.n - (f.integer ? 1n : 0n);
    if ((side > 0 && k <= 0n) || (side < 0 && k >= 0n)) return pos;
    return s.add(pos, s.mul(s.integer(k), P));
  };
  const right = pieces.map(p => truthAt(s, atoms, x, translated(p, 1)));
  const left = pieces.map(p => truthAt(s, atoms, x, translated(p, -1)));
  let jR = pieces.length;
  while (jR > 0 && truth[jR - 1] === right[jR - 1]) jR--;
  let jL = -1;
  while (jL + 1 < pieces.length && truth[jL + 1] === left[jL + 1]) jL++;
  const parts: SolutionSet[] = [];
  const full: Interval = { lo: infinity(-1), hi: infinity(1), loClosed: false, hiClosed: false };
  // Both tails follow one pattern and the set contains all of it: the periodic set plus bounded extras.
  if (right.some(t => t) && right.every((r, i) => r === left[i] && (!r || truth[i]))) {
    if (right.every(t => t)) return { kind: 'set', set: { kind: 'intervals', variables: [x], intervals: [full] } };
    let start = 1;
    while (!(right[start] && !right[start - 1])) start++;
    parts.push(periodicSet(x, Pv, patternComponents(s, pieces, right, start, P), full));
    const extra = truth.map((t, i) => t && !right[i]);
    const extras = runs(s, pieces, extra, 0, pieces.length - 1);
    if (extras.length && extras.every(i => i.loClosed && i.hiClosed && i.lo === i.hi)) parts.push({ kind: 'finite', variables: [x], points: extras.map(i => [i.lo as PointValue]) });
    else if (extras.length) parts.push({ kind: 'intervals', variables: [x], intervals: extras });
    return { kind: 'set', set: parts.length === 1 ? parts[0] : { kind: 'union', sets: parts } };
  }
  let middleFrom = 0, middleTo = pieces.length - 1;
  // Right tail: the first whole pattern component starting at or after jR.
  if (right.some(t => t)) {
    if (right.every(t => t)) {
      let start = pieces.length - 1;
      while (start > 0 && truth[start - 1]) start--;
      const a = pieces[start];
      parts.push({ kind: 'intervals', variables: [x], intervals: [{ lo: endpoint(s, a.kind === 'point' ? a.at : a.lo), loClosed: a.kind === 'point', hi: infinity(1), hiClosed: false }] });
      middleTo = start - 1;
    } else {
      let i = Math.max(jR, 1);
      while (i < pieces.length && !(truth[i] && !truth[i - 1] && !right[i - 1])) i++;
      if (i >= pieces.length) return fail(OWNERS.periodic, 'no whole pattern component in the decided region');
      const a = pieces[i], startAt = a.kind === 'point' ? a.at : a.lo;
      parts.push(periodicSet(x, Pv, patternComponents(s, pieces, truth, i, P), { lo: endpoint(s, startAt), loClosed: a.kind === 'point', hi: infinity(1), hiClosed: false }));
      middleTo = i - 1;
    }
  }
  if (left.some(t => t)) {
    if (left.every(t => t)) {
      let end = 0;
      while (end + 1 < pieces.length && truth[end + 1]) end++;
      const b = pieces[end];
      parts.push({ kind: 'intervals', variables: [x], intervals: [{ lo: infinity(-1), loClosed: false, hi: endpoint(s, b.kind === 'point' ? b.at : b.hi), hiClosed: b.kind === 'point' }] });
      middleFrom = end + 1;
    } else {
      let i = Math.min(jL, middleTo - 1, pieces.length - 2);
      while (i >= 0 && !(truth[i] && !truth[i + 1] && !left[i + 1])) i--;
      if (i < 0) return fail(OWNERS.periodic, 'no whole pattern component in the decided region');
      const b = pieces[i], endAt = b.kind === 'point' ? b.at : b.hi;
      // The component ending at piece i, and the pattern period before it.
      let start = i;
      while (start > 0 && truth[start - 1]) start--;
      const startAt = pieces[start].kind === 'point' ? (pieces[start] as { at: ExprId }).at : (pieces[start] as { lo: ExprId }).lo;
      const firstPeriod = pieces.findIndex(p => realCompare(s, positionOf(p), s.sub(startAt, P)) >= 0);
      parts.push(periodicSet(x, Pv, patternComponents(s, pieces, left, Math.max(firstPeriod, 0), P), { lo: infinity(-1), loClosed: false, hi: endpoint(s, endAt), hiClosed: b.kind === 'point' }));
      middleFrom = i + 1;
    }
  }
  const middle = runs(s, pieces, truth, middleFrom, middleTo);
  if (middle.length && middle.every(i => i.loClosed && i.hiClosed && i.lo === i.hi)) parts.push({ kind: 'finite', variables: [x], points: middle.map(i => [i.lo as PointValue]) });
  else if (middle.length) parts.push({ kind: 'intervals', variables: [x], intervals: middle });
  if (parts.length === 0) return { kind: 'empty' };
  return { kind: 'set', set: parts.length === 1 ? parts[0] : { kind: 'union', sets: parts } };
}

// ---- families in integer parameters ----

function renamed(store: ExpressionStore, fam: FamilyZeros): { value: ExprId; names: string[]; constraints: Condition[] } {
  const names = fam.params.map((_, i) => (fam.params.length === 1 ? 'k' : `k${i + 1}`));
  const map = new Map(fam.params.map((p, i) => [p.name, store.symbol(names[i])]));
  const constraints: Condition[] = [];
  fam.params.forEach((p, i) => {
    const k = store.symbol(names[i]);
    if (p.from !== undefined) constraints.push({ kind: 'nonnegative', expr: store.sub(k, store.integer(p.from)) });
    if (p.to !== undefined) constraints.push({ kind: 'nonnegative', expr: store.sub(store.integer(p.to), k) });
  });
  return { value: store.substitute(fam.value, map), names, constraints };
}

function decideFamilies(problem: RelationProblem, atoms: readonly ClosedAtom[]): ClosedDecision {
  const s = problem.store, x = problem.targets[0];
  if (atoms.some(a => a.periodic.length)) return fail(COMPOSITION, 'families in integer parameters together with periodic families');
  const familyAtoms = atoms.filter(a => a.families.length);
  if (familyAtoms.length > 1 || familyAtoms[0].op !== 'eq') return fail(COMPOSITION, 'families in integer parameters outside a single equation');
  const famAtom = familyAtoms[0], others = atoms.filter(a => a !== famAtom);
  const finite = new Set<ExprId>();
  for (const a of atoms) {
    if (a.zeros !== 'all') for (const z of a.zeros) finite.add(z);
    for (const i of a.intervals) { if (i.lo !== undefined) finite.add(i.lo); if (i.hi !== undefined) finite.add(i.hi); }
  }
  const F = sortedDistinct(s, finite);
  const pointsOut: ExprId[] = [];
  const sets: SolutionSet[] = [];
  // Pieces of the real line by F: (−∞, F₀), F₀, (F₀, F₁), …, (Fₙ, ∞).
  const bounds: { lo?: ExprId; hi?: ExprId; at?: ExprId }[] = [];
  if (F.length === 0) bounds.push({});
  F.forEach((c, i) => {
    if (i === 0) bounds.push({ hi: c });
    bounds.push({ at: c });
    bounds.push({ lo: c, hi: i + 1 < F.length ? F[i + 1] : undefined });
  });
  for (const b of bounds) {
    s.ctx.tick();
    if (b.at !== undefined) {
      // A critical point may itself be a family member: then the family equation holds there.
      let member = false;
      for (const fam of famAtom.families) {
        if (fam.params.length !== 1) return fail(COMPOSITION, 'a family in several integer parameters under further conditions');
        const r = restrictParam(s, fam.value, fam.params[0], [{ op: 'eq', against: b.at }]);
        if ('refusal' in r) return { kind: 'refused', refusal: r.refusal };
        if (r.length) member = true;
      }
      if (truthAt(s, atoms, x, b.at, member ? new Set([famAtom]) : undefined)) pointsOut.push(b.at);
      continue;
    }
    const sample = sampleBetween(s, b.lo, b.hi);
    if (!truthAt(s, others, x, sample)) continue;
    for (const fam of famAtom.families) {
      if (fam.params.length !== 1) {
        if (F.length === 0) { const r = renamed(s, fam); sets.push({ kind: 'periodic', variables: [x], values: [r.value], integerParameters: r.names, constraints: r.constraints }); continue; }
        return fail(COMPOSITION, 'a family in several integer parameters under further conditions');
      }
      const conditions: { op: 'gt' | 'lt'; against: ExprId }[] = [];
      if (b.lo !== undefined) conditions.push({ op: 'gt', against: b.lo });
      if (b.hi !== undefined) conditions.push({ op: 'lt', against: b.hi });
      const ranges = conditions.length ? restrictParam(s, fam.value, fam.params[0], conditions) : [{ from: fam.params[0].from, to: fam.params[0].to }];
      if ('refusal' in ranges) return { kind: 'refused', refusal: ranges.refusal };
      for (const r of ranges) {
        if (r.from !== undefined && r.to !== undefined) {
          for (let k = r.from; k <= r.to; k++) { s.ctx.tick(); pointsOut.push(s.substitute(fam.value, new Map([[fam.params[0].name, s.integer(k)]]))); }
          continue;
        }
        const named = renamed(s, { value: fam.value, params: [{ name: fam.params[0].name, from: r.from, to: r.to }] });
        sets.push({ kind: 'periodic', variables: [x], values: [named.value], integerParameters: named.names, constraints: named.constraints });
      }
    }
  }
  if (pointsOut.length) sets.push({ kind: 'finite', variables: [x], points: sortedDistinct(s, pointsOut).map(p => [pointValue(s, p)]) });
  if (sets.length === 0) return { kind: 'empty' };
  return { kind: 'set', set: sets.length === 1 ? sets[0] : { kind: 'union', sets } };
}
