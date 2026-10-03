import { EquationAlgebraError } from '../execution';
import { rational } from '../algebra/rational';
import type { Refusal } from '../decision/rational-form';
import { expandConstant } from '../representation/angles';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign } from '../representation/real-order';
import { relationProblem, type Condition, type RelationInput, type RelationProblem } from '../representation/relation';
import { floorExact, normalizeSet, type Endpoint, type Interval, type PointValue, type SolutionSet } from '../representation/solution-set';
import { sampleBetween } from '../generators/samples';
import { hasTrig } from '../periodic/families';
import { derivative } from './derivative';
import { limit } from './limits';

/**
 * Inequalities whose trig kernels share one non-affine argument u = φ(x)
 * (sin eˣ > 1/2, sin √x ≥ 0, sin x² > 0): `EQUATION-COMPOSITION1`.
 *
 * The line is cut where φ′ vanishes and where the trig-free atoms change
 * truth, so φ is strictly monotone on every piece J. On J the problem is a
 * problem in t = φ(x) over the exact image φ(J) (ends by exact limits),
 * decided by the periodic engine of slice 4; its answer maps back through the
 * inverse of φ on J. A periodic tail [a, b] + P·k becomes an `interval-family`
 * whose members φ⁻¹(a + P·k), φ⁻¹(b + P·k) are pairwise disjoint and ordered in
 * k because φ⁻¹ is strictly monotone and the components are disjoint modulo P.
 */
export type FamilyDecision = { kind: 'set'; set: SolutionSet } | { kind: 'empty' } | { kind: 'refused'; refusal: Refusal };
type Decide = (p: RelationProblem) => FamilyDecision;
type Rewrite = (p: RelationProblem) => { leaf: RelationProblem };
type Zeros = (e: ExprId, x: string) => { kind: string; values?: readonly ExprId[]; periodic?: readonly unknown[]; families?: readonly unknown[]; intervals?: readonly unknown[] };

const COMPOSITION = 'EQUATION-COMPOSITION1';
class Refused { readonly refusal: Refusal; constructor(detail: string) { this.refusal = { owner: COMPOSITION, detail }; } }
const refuse = (detail: string): never => { throw new Refused(detail); };


/** The trig kernels' common argument, when every trig kernel has the same non-affine one. */
function commonArgument(store: ExpressionStore, roots: readonly ExprId[], x: string): ExprId | undefined {
  let u: ExprId | undefined;
  for (const n of store.postorder(roots)) {
    const node = store.node(n);
    if (node.kind !== 'apply' || !['sin', 'cos', 'tan'].includes(node.fn) || !store.freeSymbols(node.arg).includes(x)) continue;
    if (u !== undefined && u !== node.arg) return undefined;
    u = node.arg;
  }
  return u;
}

/** The inverse of φ on a piece where it is strictly monotone: x with φ(x) = y, peeled layer by layer. */
function inverse(store: ExpressionStore, phi: ExprId, x: string, y: ExprId, sample: ExprId): ExprId {
  let f = phi, target = y;
  for (;;) {
    store.ctx.tick();
    const node = store.node(f);
    if (node.kind === 'symbol' && node.name === x) return target;
    const dependent = (id: ExprId) => store.freeSymbols(id).includes(x);
    if (node.kind === 'add') {
      const dep = node.args.filter(dependent);
      if (dep.length !== 1) return refuse('the inverse of a sum with several variable terms');
      target = store.sub(target, store.add(...node.args.filter(a => !dependent(a))));
      f = dep[0];
      continue;
    }
    if (node.kind === 'mul') {
      const dep = node.args.filter(dependent);
      if (dep.length !== 1) return refuse('the inverse of a product with several variable factors');
      target = store.div(target, store.mul(...node.args.filter(a => !dependent(a))));
      f = dep[0];
      continue;
    }
    if (node.kind === 'apply' && (node.fn === 'exp' || node.fn === 'log')) {
      target = node.fn === 'exp' ? store.log(target) : store.exp(target);
      f = node.arg;
      continue;
    }
    if (node.kind === 'pow') {
      const r = store.numberValue(node.exponent);
      if (!r) return refuse('the inverse of a variable power');
      const inv = store.number(rational(store.ctx, r.denominator, r.numerator));
      // ψ^{p/q} = y: with p even the sign of ψ on the piece decides ±.
      const root = store.pow(target, inv);
      target = r.numerator % 2n === 0n && realSign(store, store.substitute(node.base, new Map([[x, sample]]))) < 0 ? store.neg(root) : root;
      f = node.base;
      continue;
    }
    return refuse('an inverse through this function');
  }
}

const idOf = (store: ExpressionStore, v: PointValue): ExprId => (v.kind === 'expression' ? v.id : v.kind === 'rational' ? store.number(v.value) : store.algebraic(v.root));

export function decideIntervalFamilies(problem: RelationProblem, decide: Decide, rewrite: Rewrite, zeros: Zeros): FamilyDecision {
  try {
    const s = problem.store, x = problem.targets[0];
    const atoms: { f: ExprId; op: RelationInput['op'] }[] = [
      ...problem.relations.map(r => ({ f: s.sub(r.lhs, r.rhs), op: r.op })),
      ...(problem.conditions as readonly Condition[]).filter(c => c.kind !== 'in-domain').map(c => ({
        f: 'other' in c ? s.sub(c.expr, c.other) : c.expr,
        op: ({ nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' } as const)[c.kind as 'nonzero'],
      })),
    ];
    const trigAtoms = atoms.filter(a => hasTrig(s, a.f, x)), plain = atoms.filter(a => !hasTrig(s, a.f, x));
    const phi = commonArgument(s, trigAtoms.map(a => a.f), x);
    if (phi === undefined) return refuse('trig kernels with different arguments');
    const t = x === 'τ0' ? 'τ1' : 'τ0', T = s.symbol(t), kName = x === 'k' ? 'n' : 'k';
    const lifted = trigAtoms.map(a => {
      const g = replaceArgument(s, a.f, phi, T);
      if (s.freeSymbols(g).includes(x)) refuse('an atom that is not a function of the common argument');
      return { f: g, op: a.op };
    });
    // Where the trig-free atoms hold (ℝ when there are none).
    let base: Interval[] = [{ lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false }];
    const isolated: ExprId[] = [];
    if (plain.length) {
      const d = decide(relationProblem(s, { domain: 'real', targets: [x], relations: plain.map(a => ({ op: a.op, lhs: a.f, rhs: s.integer(0) })) }));
      if (d.kind === 'refused') return d;
      if (d.kind === 'empty') return d;
      const parts = d.set.kind === 'union' ? d.set.sets : [d.set];
      base = [];
      for (const p of parts) {
        if (p.kind === 'intervals') base.push(...p.intervals);
        else if (p.kind === 'finite') isolated.push(...p.points.map(q => idOf(s, q[0])));
        else return refuse('trig-free atoms that are not intervals');
      }
    }
    // Monotone pieces: cut where φ′ vanishes.
    const dphi = derivative(s, phi, x);
    if (dphi === undefined) return refuse('a common argument without a derivative');
    const z = zeros(dphi, x);
    if (z.kind !== 'zeros' || z.periodic?.length || z.families?.length || z.intervals?.length) return refuse('a common argument with infinitely many turning points');
    const turning = [...(z.values ?? [])];
    const end = (e: Endpoint): ExprId | undefined => (e.kind === 'infinity' ? undefined : idOf(s, e));
    const out: SolutionSet[] = [];
    const points: ExprId[] = [...isolated];
    for (const iv of base) {
      const lo = end(iv.lo), hi = end(iv.hi);
      const inside = turning.filter(c => (lo === undefined || realCompare(s, lo, c) < 0) && (hi === undefined || realCompare(s, c, hi) < 0)).sort((a, b) => realCompare(s, a, b));
      points.push(...inside);
      const cuts = [lo, ...inside, hi];
      for (let i = 0; i + 1 < cuts.length; i++) {
        const a = cuts[i], b = cuts[i + 1];
        const aClosed = i === 0 ? iv.loClosed && a !== undefined : false, bClosed = i + 2 === cuts.length ? iv.hiClosed && b !== undefined : false;
        out.push(...piece(a, b, aClosed, bClosed));
      }
    }
    // Isolated points and turning points: decided directly.
    const holdsAt = (p: ExprId) => atoms.every(a => {
      let sg: -1 | 0 | 1;
      try { sg = realSign(s, s.substitute(a.f, new Map([[x, p]]))); } catch (e) { if (e instanceof EquationAlgebraError && e.code === 'invalid-input') return false; throw e; }
      return a.op === 'eq' ? sg === 0 : a.op === 'ne' ? sg !== 0 : a.op === 'lt' ? sg < 0 : a.op === 'le' ? sg <= 0 : a.op === 'gt' ? sg > 0 : sg >= 0;
    });
    const kept = points.filter(holdsAt);
    if (kept.length) out.push({ kind: 'finite', variables: [x], points: kept.map(p => [{ kind: 'expression', id: p }]) });
    if (out.length === 0) return { kind: 'empty' };
    return { kind: 'set', set: out.length === 1 ? out[0] : { kind: 'union', sets: out } };

    function piece(a: ExprId | undefined, b: ExprId | undefined, aClosed: boolean, bClosed: boolean): SolutionSet[] {
      const sample = sampleBetween(s, a, b);
      const increasing = realSign(s, s.substitute(dphi as ExprId, new Map([[x, sample]]))) > 0;
      const la = limit(s, phi as ExprId, x, a === undefined ? { inf: -1 } : { at: a }, sample), lb = limit(s, phi as ExprId, x, b === undefined ? { inf: 1 } : { at: b }, sample);
      if (la === undefined || lb === undefined) return refuse('an image end without an exact limit');
      // The image of J in t, with its ends ordered.
      const [ulo, uhi, loC, hiC] = increasing ? [la, lb, aClosed, bClosed] : [lb, la, bClosed, aClosed];
      const relations: RelationInput[] = lifted.map(l => ({ op: l.op, lhs: l.f, rhs: s.integer(0) }));
      if ('v' in ulo) relations.push({ op: loC ? 'ge' : 'gt', lhs: T, rhs: ulo.v });
      if ('v' in uhi) relations.push({ op: hiC ? 'le' : 'lt', lhs: T, rhs: uhi.v });
      const { leaf } = rewrite(relationProblem(s, { domain: 'real', targets: [t], relations }));
      const d = decide(leaf);
      if (d.kind === 'refused') throw new Refused(d.refusal.detail);
      if (d.kind === 'empty') return [];
      // Image ends that are limits at an unbounded end of J (eˣ → 0 as x → −∞): there φ⁻¹ is not defined, the x end is ±∞.
      const limits: { v: ExprId; x: Endpoint }[] = [];
      if ('v' in la && a === undefined) limits.push({ v: la.v, x: { kind: 'infinity', sign: -1 } });
      if ('v' in lb && b === undefined) limits.push({ v: lb.v, x: { kind: 'infinity', sign: 1 } });
      const atLimit = (id: ExprId) => limits.find(l => realCompare(s, l.v, id) === 0);
      const xEnd = (e: Endpoint, side: 'lo' | 'hi'): Endpoint => {
        if (e.kind === 'infinity') {
          // An unbounded image end comes from the matching end of J.
          const xe = (side === 'lo') === increasing ? a : b;
          return xe === undefined ? { kind: 'infinity', sign: (side === 'lo') === increasing ? -1 : 1 } : { kind: 'expression', id: xe };
        }
        const id = idOf(s, e), lim = atLimit(id);
        return lim ? lim.x : { kind: 'expression', id: inverse(s, phi as ExprId, x, id, sample) };
      };
      const mapInterval = (iv: Interval): Interval => {
        const lo = xEnd(iv.lo, 'lo'), hi = xEnd(iv.hi, 'hi');
        return increasing ? { lo, hi, loClosed: iv.loClosed, hiClosed: iv.hiClosed } : { lo: hi, hi: lo, loClosed: iv.hiClosed, hiClosed: iv.loClosed };
      };
      const result: SolutionSet[] = [];
      const ev = (id: ExprId): PointValue => ({ kind: 'expression', id });
      const visit = (set: SolutionSet) => {
        switch (set.kind) {
          case 'union': set.sets.forEach(visit); return;
          case 'finite': result.push({ kind: 'finite', variables: [x], points: set.points.map(p => [ev(inverse(s, phi as ExprId, x, idOf(s, p[0]), sample))]) }); return;
          case 'intervals': {
            // φ⁻¹ is monotone: the order of the intervals is kept, or reversed when φ decreases.
            const mapped = set.intervals.map(mapInterval);
            result.push({ kind: 'intervals', variables: [x], intervals: increasing ? mapped : mapped.reverse() });
            return;
          }
          case 'periodic-set': {
            const P = idOf(s, set.period), R = set.range, k = s.symbol(kName);
            for (const c of set.components) {
              const ca = idOf(s, c.lo as PointValue), cb = idOf(s, c.hi as PointValue);
              // k-range of the occurrences inside the range (the range starts or ends at an occurrence).
              let from: bigint | undefined, to: bigint | undefined;
              if (R.lo.kind !== 'infinity') { const q = floorExact(s, s.div(s.sub(idOf(s, R.lo), ca), P)); from = q.integer ? q.n : q.n + 1n; }
              if (R.hi.kind !== 'infinity') to = floorExact(s, s.div(s.sub(idOf(s, R.hi), cb), P)).n;
              const occurrence = (e: ExprId, m: bigint) => expandConstant(s, s.add(e, s.mul(s.integer(m), P)));
              // A member touching an image limit is mapped as an interval (its end goes to ±∞); the family starts after it.
              const edge = (m: bigint) => {
                const iv: Interval = { lo: ev(occurrence(ca, m)), hi: ev(occurrence(cb, m)), loClosed: c.loClosed, hiClosed: c.hiClosed };
                result.push({ kind: 'intervals', variables: [x], intervals: [mapInterval(iv)] });
              };
              if (from !== undefined && atLimit(occurrence(ca, from))) { edge(from); from += 1n; }
              if (to !== undefined && atLimit(occurrence(cb, to))) { edge(to); to -= 1n; }
              if (from !== undefined && to !== undefined && from > to) continue;
              const shift = from ?? to ?? 0n;
              const member = (e: ExprId) => inverse(s, phi as ExprId, x, s.add(occurrence(e, shift), s.mul(P, k)), sample);
              const range = { ...(from === undefined ? {} : { from: 0n }), ...(to === undefined ? {} : { to: to - shift }) };
              if (ca === cb) {
                // Point components: a family of values in k.
                const constraints: Condition[] = [];
                if (from !== undefined) constraints.push({ kind: 'nonnegative', expr: k });
                if (to !== undefined) constraints.push({ kind: 'nonnegative', expr: s.sub(s.integer(to - shift), k) });
                result.push({ kind: 'periodic', variables: [x], values: [member(ca)], integerParameters: [kName], constraints });
                continue;
              }
              const lo = member(ca), hi = member(cb);
              result.push(increasing
                ? { kind: 'interval-family', variables: [x], parameter: kName, ...range, lo, hi, loClosed: c.loClosed, hiClosed: c.hiClosed }
                : { kind: 'interval-family', variables: [x], parameter: kName, ...range, lo: hi, hi: lo, loClosed: c.hiClosed, hiClosed: c.loClosed });
            }
            return;
          }
          default: refuse(`a ${set.kind} set in the common argument`);
        }
      };
      visit(normalizeSet(s, d.set, 'real'));
      return result;
    }
  } catch (e) {
    if (e instanceof Refused) return { kind: 'refused', refusal: e.refusal };
    throw e;
  }
}

/** f with every occurrence of the subexpression u replaced by T (explicit stack). */
function replaceArgument(store: ExpressionStore, f: ExprId, u: ExprId, T: ExprId): ExprId {
  const mapped = new Map<ExprId, ExprId>();
  for (const n of store.postorder([f])) {
    if (n === u) { mapped.set(n, T); continue; }
    const node = store.node(n), m = (c: ExprId) => mapped.get(c) as ExprId;
    switch (node.kind) {
      case 'add': mapped.set(n, store.add(...node.args.map(m))); break;
      case 'mul': mapped.set(n, store.mul(...node.args.map(m))); break;
      case 'pow': mapped.set(n, store.pow(m(node.base), m(node.exponent))); break;
      case 'apply': mapped.set(n, store.apply(node.fn, m(node.arg))); break;
      default: mapped.set(n, n);
    }
  }
  return mapped.get(f) as ExprId;
}
