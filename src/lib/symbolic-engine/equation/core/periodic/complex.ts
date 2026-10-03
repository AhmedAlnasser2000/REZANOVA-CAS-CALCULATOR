import { rational, rSubtract, type Rational } from '../algebra/rational';
import type { Refusal } from '../decision/rational-form';
import { expandConstant } from '../representation/angles';
import { enclose } from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { START_BITS } from '../representation/real-order';
import type { Condition, RelationProblem } from '../representation/relation';
import {
  finiteSet, normalizeSet, resourceOutcome, unionSet, type EquationOutcome, type SolutionSet,
} from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { COMPLEX_PIPELINE } from './complex-rules';
import { complexZeros, rationalValue, type AffineFamily, type ComplexZeros, type GeneralFamily } from './complex-zeros';
import { complexIsZero, floorTurns, latticeIndex, quotient, rect } from './rectangular';

/**
 * Complex decisions of slice 4 (part B): equations and ≠ conditions in one
 * complex target with exp, log, principal powers and trig, as exact sets —
 * points, affine families a + ω·k and families in several integer parameters.
 *
 * Canonical affine families: the period is oriented (Re ω > 0, or Re ω = 0
 * and Im ω > 0); families with commensurable periods are merged over a
 * common period and split into maximal orbits, so the period is minimal
 * (e^{2z} = 1 is πi·k); the anchor a is the member with Re(a/ω) ∈ (−1/2, 1/2].
 * Conjunctions intersect lattices exactly (parallel periods by a congruence,
 * non-parallel ones in at most one point); ≠ conditions remove sublattices or
 * single members (k ≠ m).
 */
export type ComplexDecision =
  | { readonly kind: 'set'; readonly set: SolutionSet }
  | { readonly kind: 'empty' }
  | { readonly kind: 'refused'; readonly refusal: Refusal; readonly unsupported?: boolean };

class Refused { readonly refusal: Refusal; readonly unsupported: boolean; constructor(r: Refusal, unsupported = false) { this.refusal = r; this.unsupported = unsupported; } }
const refuse = (owner: string, detail: string, unsupported = false): never => { throw new Refused({ owner, detail }, unsupported); };
const COMPOSITION = 'EQUATION-COMPOSITION1', SLICE1 = 'EQUATION-POLYNOMIAL-DECISION1';
const rFloor = (_ctx: unknown, r: Rational): bigint => (r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator));

function freshNames(): (prefix: string) => string {
  let counter = 0;
  return prefix => `${prefix}${++counter}`;
}

const twoPi = (store: ExpressionStore) => store.mul(store.integer(2), store.constant('pi'));
/** c·id, with 0 for c = 0 (0·i would stay: i is undefined over ℝ). */
function times(store: ExpressionStore, c: bigint | Rational, id: ExprId): ExprId {
  const r = typeof c === 'bigint' ? rational(store.ctx, c) : c;
  return r.numerator === 0n ? store.integer(0) : store.mul(store.number(r), id);
}

/** Orient the period into the upper half-plane (or along the positive reals). */
function orient(store: ExpressionStore, f: AffineFamily): AffineFamily {
  const r = rect(store, f.period);
  if (r === undefined) return refuse(COMPOSITION, 'a period without rectangular parts');
  const si = complexIsZero(store, r.im) === true ? 0 : signOf(store, r.im), sr = signOf(store, r.re);
  if (si > 0 || (si === 0 && sr > 0)) return f;
  return { anchor: f.anchor, period: expandConstant(store, store.neg(f.period)), phase: expandConstant(store, store.neg(f.phase)) };
}

function signOf(store: ExpressionStore, id: ExprId): -1 | 0 | 1 {
  const z = complexIsZero(store, id);
  if (z === true) return 0;
  for (let bits = START_BITS; ; bits *= 2) {
    store.ctx.tick();
    const e = enclose(store, id, bits);
    if (e.kind === 'bounds' && e.lo.numerator > 0n) return 1;
    if (e.kind === 'bounds' && e.hi.numerator < 0n) return -1;
    if (e.kind !== 'bounds' && e.kind !== 'unknown') return refuse(COMPOSITION, 'a sign that cannot be enclosed');
  }
}

/** The member with Re(a/ω) ∈ (−1/2, 1/2]: a + f·ω with f = ⌊(π − φ)/2π⌋. */
function windowed(store: ExpressionStore, f: AffineFamily): AffineFamily {
  const pi = store.constant('pi'), n = floorTurns(store, expandConstant(store, store.sub(pi, f.phase)));
  if (n === 0n) return { ...f, anchor: expandConstant(store, f.anchor) };
  return {
    anchor: expandConstant(store, store.add(f.anchor, times(store, n, f.period))),
    period: f.period,
    phase: expandConstant(store, store.add(f.phase, times(store, n, twoPi(store)))),
  };
}

function lcm(a: bigint, b: bigint): bigint { return (a / gcd(a, b)) * b; }
function gcd(a: bigint, b: bigint): bigint { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
function frac(store: ExpressionStore, q: Rational): Rational { return rSubtract(store.ctx, q, rational(store.ctx, rFloor(store.ctx, q))); }

/** Canonical families: oriented, merged over common periods, split into maximal orbits, windowed. */
export function canonicalFamilies(store: ExpressionStore, families: readonly AffineFamily[]): AffineFamily[] {
  const ctx = store.ctx, oriented = families.map(f => orient(store, f));
  const groups: { base: ExprId; members: { f: AffineFamily; ratio: Rational }[] }[] = [];
  for (const f of oriented) {
    let placed = false;
    for (const g of groups) {
      const ratio = rationalValue(store, quotient(store, f.period, g.base));
      if (ratio && ratio.numerator > 0n) { g.members.push({ f, ratio }); placed = true; break; }
    }
    if (!placed) groups.push({ base: f.period, members: [{ f, ratio: rational(ctx, 1n) }] });
  }
  const out: AffineFamily[] = [];
  for (const g of groups) {
    // Ω = base·(lcm of numerators)/(gcd of denominators): every period divides it.
    const num = g.members.reduce((a, m) => lcm(a, m.ratio.numerator), 1n), den = g.members.reduce((a, m) => gcd(a, m.ratio.denominator), 0n);
    const omega = expandConstant(store, store.mul(store.number(rational(ctx, num, den)), g.base));
    const elements: { anchor: ExprId; phase: ExprId }[] = [];
    for (const { f, ratio } of g.members) {
      const R = rational(ctx, num * ratio.denominator, den * ratio.numerator); // Ω / ω_f, an integer
      ctx.allocate(Number(R.numerator));
      for (let s = 0n; s < R.numerator; s++) {
        elements.push({
          anchor: expandConstant(store, store.add(f.anchor, times(store, s, f.period))),
          phase: expandConstant(store, store.mul(store.number(rational(ctx, 1n, R.numerator)), store.add(f.phase, times(store, s, twoPi(store))))),
        });
      }
    }
    // Classes of anchors differing by rational multiples of Ω; offsets in [0, 1).
    const classes: { rep: { anchor: ExprId; phase: ExprId }; offsets: Rational[] }[] = [];
    for (const e of elements) {
      ctx.tick();
      let placed = false;
      for (const c of classes) {
        const q = rationalValue(store, quotient(store, expandConstant(store, store.sub(e.anchor, c.rep.anchor)), omega));
        if (q === undefined) continue;
        const o = frac(store, q);
        if (!c.offsets.some(x => x.numerator === o.numerator && x.denominator === o.denominator)) c.offsets.push(o);
        placed = true;
        break;
      }
      if (!placed) classes.push({ rep: e, offsets: [rational(ctx, 0n)] });
    }
    for (const c of classes) {
      for (const { s, m } of maximalOrbits(store, c.offsets)) {
        const anchor = expandConstant(store, store.add(c.rep.anchor, times(store, s, omega)));
        const period = expandConstant(store, store.mul(store.number(rational(ctx, 1n, m)), omega));
        const phase = expandConstant(store, times(store, m, store.add(c.rep.phase, times(store, s, twoPi(store)))));
        out.push(windowed(store, { anchor, period, phase }));
      }
    }
  }
  return out;
}

/** Offsets (rationals in [0, 1)) as disjoint maximal orbits s + j/m, largest m first, then smallest s. */
function maximalOrbits(store: ExpressionStore, offsets: readonly Rational[]): { s: Rational; m: bigint }[] {
  const ctx = store.ctx, key = (r: Rational) => `${r.numerator}/${r.denominator}`;
  const left = new Map(offsets.map(o => [key(o), o] as const)), out: { s: Rational; m: bigint }[] = [];
  while (left.size) {
    let found: { s: Rational; m: bigint } | undefined;
    const sorted = [...left.values()].sort((a, b) => (a.numerator * b.denominator < b.numerator * a.denominator ? -1 : 1));
    for (let m = BigInt(left.size); m >= 1n && !found; m--) {
      ctx.tick();
      for (const s of sorted) {
        const orbit = Array.from({ length: Number(m) }, (_, j) => frac(store, rational(ctx, s.numerator * m + BigInt(j) * s.denominator, s.denominator * m)));
        if (orbit.every(o => left.has(key(o)))) { found = { s, m }; break; }
      }
    }
    const f = found as { s: Rational; m: bigint };
    for (let j = 0n; j < f.m; j++) left.delete(key(frac(store, rational(ctx, f.s.numerator * f.m + j * f.s.denominator, f.s.denominator * f.m))));
    out.push(f);
  }
  return out;
}

/** The integer nearest to a real closed form, from enclosures (a candidate, confirmed exactly by the caller). */
function nearestInteger(store: ExpressionStore, id: ExprId): bigint {
  for (let bits = START_BITS; ; bits *= 2) {
    store.ctx.tick();
    const e = enclose(store, id, bits);
    if (e.kind !== 'bounds') { if (e.kind === 'unknown') continue; return refuse(COMPOSITION, 'an intersection index that cannot be enclosed'); }
    const ctx = store.ctx, half = rational(ctx, 1n, 2n);
    const a = rFloor(ctx, rSubtract(ctx, e.lo, half)) + 1n, b = rFloor(ctx, rSubtract(ctx, e.hi, half)) + 1n;
    if (a === b) return a;
  }
}

function modInverse(b: bigint, a: bigint): bigint {
  let [r0, r1, s0, s1] = [((b % a) + a) % a, a, 1n, 0n];
  while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return ((s0 % a) + a) % a;
}

type Meet = { kind: 'family'; family: AffineFamily } | { kind: 'point'; point: ExprId } | { kind: 'none' };

/** F₁ ∩ F₂ exactly: a congruence for parallel periods, at most one point otherwise. */
function intersect(store: ExpressionStore, F: AffineFamily, G: AffineFamily): Meet {
  const ctx = store.ctx, f = orient(store, F), g = orient(store, G);
  const ratio = rationalValue(store, quotient(store, g.period, f.period));
  if (ratio && ratio.numerator > 0n) {
    const a = ratio.numerator, b = ratio.denominator, delta = quotient(store, f.period, store.integer(b));
    const N = latticeIndex(store, g.anchor, f.anchor, delta);
    if (N === undefined) return { kind: 'none' };
    // b·k − a·m = N: k ≡ N·b⁻¹ (mod a).
    const k0 = a === 1n ? 0n : (((N % a) + a) % a * modInverse(b, a)) % a;
    return {
      kind: 'family', family: {
        anchor: expandConstant(store, store.add(f.anchor, times(store, k0, f.period))),
        period: expandConstant(store, store.mul(store.integer(a), f.period)),
        phase: expandConstant(store, store.mul(store.number(rational(ctx, 1n, a)), store.add(f.phase, times(store, k0, twoPi(store))))),
      },
    };
  }
  const w1 = rect(store, f.period), w2 = rect(store, g.period), D = rect(store, expandConstant(store, store.sub(g.anchor, f.anchor)));
  if (!w1 || !w2 || !D) return refuse(COMPOSITION, 'an intersection without rectangular parts');
  const det = expandConstant(store, store.sub(store.mul(w2.re, w1.im), store.mul(w1.re, w2.im)));
  if (complexIsZero(store, det) === true) return refuse(CERTIFIED(), 'families with incommensurable parallel periods');
  // k·ω₁ − m·ω₂ = D over ℝ²: one real solution; the nearest integers are confirmed exactly.
  const k = nearestInteger(store, quotient(store, expandConstant(store, store.sub(store.mul(w2.re, D.im), store.mul(w2.im, D.re))), det));
  const m = nearestInteger(store, quotient(store, expandConstant(store, store.sub(store.mul(w1.re, D.im), store.mul(w1.im, D.re))), det));
  const point = expandConstant(store, store.add(f.anchor, times(store, k, f.period)));
  return complexIsZero(store, store.sub(point, store.add(g.anchor, times(store, m, g.period)))) === true ? { kind: 'point', point } : { kind: 'none' };
}
const CERTIFIED = () => 'EQUATION-CERTIFIED-NUMERICS1';

/** F without G (G ⊂ F a sublattice of index q, or all of F). */
function remove(store: ExpressionStore, F: AffineFamily, G: AffineFamily): AffineFamily[] {
  const ctx = store.ctx, f = orient(store, F);
  const q = rationalValue(store, quotient(store, orient(store, G).period, f.period)) as Rational;
  if (q.numerator === 1n && q.denominator === 1n) return [];
  const k0 = latticeIndex(store, G.anchor, f.anchor, f.period) as bigint, Q = q.numerator, out: AffineFamily[] = [];
  for (let s = 0n; s < Q; s++) {
    if ((((s - k0) % Q) + Q) % Q === 0n) continue;
    out.push({
      anchor: expandConstant(store, store.add(f.anchor, times(store, s, f.period))),
      period: expandConstant(store, store.mul(store.integer(Q), f.period)),
      phase: expandConstant(store, store.mul(store.number(rational(ctx, 1n, Q)), store.add(f.phase, times(store, s, twoPi(store))))),
    });
  }
  return out;
}

/** e(p) = 0 exactly (undefined values count as not satisfied). */
function vanishesAt(store: ExpressionStore, e: ExprId, x: string, p: ExprId): boolean {
  const z = complexIsZero(store, store.substitute(e, new Map([[x, p]])));
  if (z === 'unknown') return refuse(COMPOSITION, 'a candidate that cannot be checked exactly');
  return z === true;
}
function definedNonzeroAt(store: ExpressionStore, e: ExprId, x: string, p: ExprId): boolean {
  const z = complexIsZero(store, store.substitute(e, new Map([[x, p]])));
  if (z === 'unknown') return refuse(COMPOSITION, 'a candidate that cannot be checked exactly');
  return z === false;
}

const zerosOrThrow = (z: ComplexZeros): Exclude<ComplexZeros, { kind: 'refused' }> => (z.kind === 'refused' ? refuse(z.refusal.owner, z.refusal.detail) : z);

function parameterNames(x: string, count: number): string[] {
  const base = x === 'k' ? 'n' : 'k';
  return count === 1 ? [base] : Array.from({ length: count }, (_, i) => `${base}${i + 1}`);
}

export function decideComplexLeaf(leaf: RelationProblem): ComplexDecision {
  try {
    const s = leaf.store, x = leaf.targets[0], fresh = freshNames();
    const eqs: ExprId[] = [], nes: ExprId[] = [];
    for (const r of leaf.relations) (r.op === 'eq' ? eqs : r.op === 'ne' ? nes : refuse(SLICE1, 'order relations over ℂ', true)).push(s.sub(r.lhs, r.rhs));
    for (const c of leaf.conditions as readonly Condition[]) {
      if (c.kind === 'in-domain') continue;
      if (c.kind === 'nonzero') nes.push(c.expr);
      else if (c.kind === 'not-equal') nes.push(s.sub(c.expr, c.other));
      else if (c.kind === 'equal') eqs.push(s.sub(c.expr, c.other));
      else refuse(SLICE1, 'order conditions over ℂ', true);
    }
    const zeroSets = eqs.map(e => zerosOrThrow(complexZeros(s, e, x, fresh))).filter(z => z.kind === 'zeros') as Extract<ComplexZeros, { kind: 'zeros' }>[];
    const exclusions = nes.map(e => zerosOrThrow(complexZeros(s, e, x, fresh)));
    if (exclusions.some(z => z.kind === 'all')) return { kind: 'empty' };
    const excluded = exclusions as Extract<ComplexZeros, { kind: 'zeros' }>[];
    if (zeroSets.length === 0) {
      if (excluded.some(z => z.affine.length || z.general.length)) refuse('EQUATION-RESULT-CONTRACT1', 'the complement of an infinite family over ℂ');
      const holes = excluded.flatMap(z => z.points);
      return { kind: 'set', set: { kind: 'cofinite', variables: [x], except: holes.map(p => [{ kind: 'expression', id: p }]) } };
    }
    // Equations: candidate points from every zero set, families intersected across equations.
    let affine: AffineFamily[] = [...zeroSets[0].affine];
    const general: GeneralFamily[] = [...zeroSets[0].general], candidates = zeroSets.flatMap(z => [...z.points]);
    for (const z of zeroSets.slice(1)) {
      if (general.length || z.general.length) refuse(COMPOSITION, 'an intersection with a non-affine family');
      const next: AffineFamily[] = [];
      for (const F of affine) {
        for (const G of z.affine) {
          const meet = intersect(s, F, G);
          if (meet.kind === 'family') next.push(meet.family);
          if (meet.kind === 'point') candidates.push(meet.point);
        }
      }
      affine = next;
    }
    // ≠ conditions: sublattices removed, single members become holes.
    const holes: ExprId[] = [];
    for (const z of excluded) {
      if (general.length && (z.affine.length || z.general.length)) refuse(COMPOSITION, 'an exclusion from a non-affine family');
      if (z.general.length && affine.length) refuse(COMPOSITION, 'a non-affine exclusion from a family');
      for (const G of z.affine) {
        const next: AffineFamily[] = [];
        for (const F of affine) {
          const meet = intersect(s, F, G);
          if (meet.kind === 'family') next.push(...remove(s, F, meet.family));
          else { next.push(F); if (meet.kind === 'point') holes.push(meet.point); }
        }
        affine = next;
      }
      holes.push(...z.points);
    }
    const families = canonicalFamilies(s, affine);
    const holds = (p: ExprId) => eqs.every(e => vanishesAt(s, e, x, p)) && nes.every(e => definedNonzeroAt(s, e, x, p));
    const points: ExprId[] = [];
    for (const p of candidates) {
      if (points.some(q => complexIsZero(s, s.sub(p, q)) === true)) continue;
      if (families.some(F => latticeIndex(s, p, F.anchor, F.period) !== undefined)) continue;
      if (holds(p)) points.push(p);
    }
    for (const h of holes) if (general.length && eqs.every(e => vanishesAt(s, e, x, h))) refuse(COMPOSITION, 'an excluded point on a non-affine family');
    const sets: SolutionSet[] = [];
    if (points.length) sets.push(finiteSet([x], points.map(p => [{ kind: 'expression', id: p }])));
    const [k] = parameterNames(x, 1), kId = s.symbol(k);
    for (const F of families) {
      const constraints: Condition[] = [];
      for (const h of holes) {
        const m = latticeIndex(s, h, F.anchor, F.period);
        if (m !== undefined) constraints.push({ kind: 'not-equal', expr: kId, other: s.integer(m) });
      }
      sets.push({ kind: 'periodic', variables: [x], values: [expandConstant(s, s.add(F.anchor, s.mul(F.period, kId)))], integerParameters: [k], constraints });
    }
    for (const G of general) {
      const names = parameterNames(x, G.params.length), map = new Map(G.params.map((p, i) => [p, s.symbol(names[i])]));
      const rename = (e: ExprId) => s.substitute(e, map);
      sets.push({
        kind: 'periodic', variables: [x], values: [rename(G.value)], integerParameters: names,
        constraints: G.constraints.map(c => ('other' in c ? { ...c, expr: rename(c.expr), other: rename(c.other) } : { ...c, expr: rename(c.expr) }) as Condition),
      });
    }
    if (sets.length === 0) return { kind: 'empty' };
    return { kind: 'set', set: sets.length === 1 ? sets[0] : unionSet(sets) };
  } catch (e) {
    if (e instanceof Refused) return { kind: 'refused', refusal: e.refusal, ...(e.unsupported ? { unsupported: true } : {}) };
    throw e;
  }
}

/** Kernel normal form, log domain, denominators, zero form, each recorded. */
export function rewriteComplex(problem: RelationProblem) {
  const log = new ProofLogBuilder(problem);
  let state = problem;
  for (const rule of COMPLEX_PIPELINE) {
    const step = rule.apply(state);
    if (!step) continue;
    log.append(step);
    state = step.outputs[0];
  }
  return { log, leaf: state };
}

/** Decide a complex problem in one target with exp/log/power/trig kernels (the dispatcher has checked the shape). */
export function decideComplexProblem(problem: RelationProblem): EquationOutcome {
  try {
    const { log, leaf } = rewriteComplex(problem);
    const decision = decideComplexLeaf(leaf);
    if (decision.kind === 'refused') {
      return decision.unsupported ? { kind: 'unsupported', reason: decision.refusal.detail } : { kind: 'incomplete-implementation', reason: `${decision.refusal.owner}: ${decision.refusal.detail}` };
    }
    const proof = log.build();
    return decision.kind === 'empty' ? { kind: 'empty', proof } : { kind: 'solved', set: normalizeSet(problem.store, decision.set, 'complex'), proof };
  } catch (e) {
    return resourceOutcome(e);
  }
}
