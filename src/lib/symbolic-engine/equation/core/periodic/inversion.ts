import { igcd, imul, iquot } from '../algebra/integer';
import { rational, type Rational } from '../algebra/rational';
import { OWNERS } from '../decision/rational-form';
import { canonicalAngle, angleLinearIsZero } from '../representation/angles';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import type { RelationOperator } from '../representation/relation';
import { eliminateRadicals } from '../constraints/elimination';
import { bivariateTerms, CERTIFIED_NUMERICS, polynomialCoefficients, replaceSubexpressions, scanKernels } from '../generators/lattice';
import { linearForm } from '../generators/inversion';
import { affineIn, residueGroups, restrictParam, trigResidues, type FamilyZeros, type Param, type PeriodicZeros } from './families';

/**
 * Periodic inversion steps of the zero finder's goal worklist.
 *
 * - One trig kernel f(u) = c: the residues of u modulo f's period, made
 *   canonical; an affine u gives affine families directly, any other u a
 *   parametric goal u = r + P·κ with a fresh integer parameter κ.
 * - Parametric goals h(v) = L(κ…): each inversion step restricts the
 *   parameter to where the step is defined (L > 0 for exp, |L| ≤ 1 for sin and
 *   cos, …) by an exact one-dimensional decision; bounded ranges are
 *   enumerated, unbounded ones stay symbolic, and the goal ends as a family.
 * - Several trig kernels of commensurable affine arguments: Chebyshev
 *   expansion and the half-angle substitution t = tan(w/2), with the
 *   exceptional point w = π checked exactly.
 * - Sums of inverse trig kernels with rational coefficients: sin(F − C) = 0 as
 *   a radical equation (tower elimination), each candidate confirmed exactly.
 */
export const COMPOSITION = 'EQUATION-COMPOSITION1';

export interface PeriodicGoal {
  readonly h: ExprId; readonly level: ExprId; readonly variable: string; readonly back: ExprId; readonly top: boolean;
  readonly params: readonly Param[];
}

export interface Sink {
  push(goal: PeriodicGoal): void;
  /** A zero of the goal's variable (the caller maps it through `back`). */
  value(goal: PeriodicGoal, v: ExprId): void;
  periodic(z: PeriodicZeros): void;
  family(f: FamilyZeros): void;
  refuse(owner: string, detail: string): never;
  fresh(prefix: string): string;
  solveRational(h: ExprId, level: ExprId, v: string, quadratic: boolean | 'any'): { kind: 'values'; values: ExprId[] } | { kind: 'all' };
}

export const TRIG = new Set(['sin', 'cos', 'tan']);
export const ARCS = new Set(['asin', 'acos', 'atan']);

const half = (store: ExpressionStore) => store.mul(store.number(rational(store.ctx, 1n, 2n)), store.constant('pi'));

/** The goal f(u) = c for one trig kernel and a constant c. */
export function invertTrig(store: ExpressionStore, g: PeriodicGoal, fn: 'sin' | 'cos' | 'tan', u: ExprId, c: ExprId, sink: Sink): void {
  const { period, residues } = trigResidues(store, fn, c);
  const affine = g.params.length === 0 && g.back === store.symbol(g.variable) ? affineIn(store, u, g.variable) : undefined;
  for (const group of residueGroups(store, residues, period)) {
    if (affine) {
      const a = affine.a, abs = realSign(store, a) < 0 ? store.neg(a) : a;
      sink.periodic({ period: store.div(group.period, abs), points: group.points.map(r => store.div(store.sub(r, affine.b), a)) });
      continue;
    }
    const k = sink.fresh('κ');
    for (const r of group.points) {
      sink.push({ ...g, h: u, level: store.add(r, store.mul(group.period, store.symbol(k))), top: false, params: [...g.params, { name: k }] });
    }
  }
}

/** Inverse trig of the target: asin(h) = c needs c ∈ [−π/2, π/2] (acos: [0, π]; atan: (−π/2, π/2)). */
export function invertArc(store: ExpressionStore, fn: 'asin' | 'acos' | 'atan', arg: ExprId, c: ExprId): { h: ExprId; level: ExprId }[] {
  const h = half(store), pi = store.constant('pi');
  const above = (x: ExprId) => realSign(store, store.sub(c, x)), below = (x: ExprId) => realSign(store, store.sub(x, c));
  switch (fn) {
    case 'asin': return above(store.neg(h)) >= 0 && below(h) >= 0 ? [{ h: arg, level: store.sin(c) }] : [];
    case 'acos': return above(store.integer(0)) >= 0 && below(pi) >= 0 ? [{ h: arg, level: store.cos(c) }] : [];
    case 'atan': return above(store.neg(h)) > 0 && below(h) > 0 ? [{ h: arg, level: store.tan(c) }] : [];
  }
}

// ---- several trig kernels: half-angle algebraization ----

function binomial(n: number, k: number): bigint {
  let r = 1n;
  for (let i = 0; i < k; i++) r = (r * BigInt(n - i)) / BigInt(i + 1);
  return r;
}

/**
 * cos(n·w)·(1 + t²)^M and sin(n·w)·(1 + t²)^M as polynomials in t = tan(w/2)
 * (M ≥ |n|): (c + i·s)ⁿ = (1 + i·t)^{2n}/(1 + t²)ⁿ.
 */
function multipleAngle(store: ExpressionStore, n: bigint, t: ExprId, M: number): { cos: ExprId; sin: ExprId } {
  const m = Number(n < 0n ? -n : n);
  store.ctx.allocate(2 * m + 1);
  const re: ExprId[] = [], im: ExprId[] = [];
  for (let k = 0; k <= 2 * m; k++) {
    store.ctx.tick();
    const term = store.mul(store.integer(binomial(2 * m, k)), store.pow(t, store.integer(k)));
    // i^k: 1, i, −1, −i.
    const r = k % 4;
    if (r === 0) re.push(term); else if (r === 2) re.push(store.neg(term)); else if (r === 1) im.push(term); else im.push(store.neg(term));
  }
  const scale = store.pow(store.add(store.integer(1), store.pow(t, store.integer(2))), store.integer(M - m));
  const cos = store.mul(store.add(...re), scale), sin = store.mul(im.length ? store.add(...im) : store.integer(0), scale);
  return { cos, sin: n < 0n ? store.neg(sin) : sin };
}

function rationalGcd(values: readonly Rational[], ctx: ExpressionStore['ctx']): Rational {
  let num = 0n, den = 1n;
  for (const v of values) {
    num = igcd(ctx, num, v.numerator < 0n ? -v.numerator : v.numerator);
    den = iquot(ctx, imul(ctx, den, v.denominator), igcd(ctx, den, v.denominator));
  }
  return rational(ctx, num, den);
}

/**
 * Zeros of h(v) − level when every occurrence of v is in sin/cos/tan of
 * affine arguments with commensurable slopes. Returns residue groups in v, or
 * 'all' for an identity.
 */
export function halfAngle(store: ExpressionStore, g: PeriodicGoal, sink: Sink): PeriodicZeros[] | 'all' {
  const ctx = store.ctx, v = g.variable, scan = scanKernels(store, g.h, v);
  if (scan.variableOutside) return sink.refuse(CERTIFIED_NUMERICS, 'the variable outside trig kernels');
  const kernels = scan.kernels.map(k => {
    const n = store.node(k);
    if (n.kind !== 'apply' || !TRIG.has(n.fn)) return sink.refuse(CERTIFIED_NUMERICS, 'trig kernels mixed with other kernels');
    const aff = affineIn(store, n.arg, v);
    if (!aff) return sink.refuse(COMPOSITION, 'several trig kernels with a non-affine argument');
    return { kernel: k, fn: n.fn as 'sin' | 'cos' | 'tan', ...aff };
  });
  const ratios = kernels.map(k => store.numberValue(store.div(k.a, kernels[0].a)));
  if (ratios.some(r => r === undefined)) return sink.refuse(CERTIFIED_NUMERICS, 'incommensurable trig frequencies');
  const G = rationalGcd(ratios as Rational[], ctx);
  const gSlope = store.mul(store.number(G), kernels[0].a);
  const multiples = ratios.map(r => ((r as Rational).numerator * G.denominator) / ((r as Rational).denominator * G.numerator));
  const harmonic = harmonicForm(store, g, kernels, multiples, sink);
  if (harmonic !== undefined) {
    // α·sin w + β·cos w + γ = R·sin(w + φ) + γ: w = r − φ for the residues r of sin(·) = −γ/R.
    if (harmonic === 'constant') return sink.refuse(COMPOSITION, 'a constant trig combination');
    const { period, residues } = trigResidues(store, 'sin', harmonic.level);
    const abs = realSign(store, gSlope) < 0 ? store.neg(gSlope) : gSlope;
    return residueGroups(store, residues.map(r => store.div(store.sub(r, harmonic.phase), gSlope)), store.div(period, abs));
  }
  const tName = sink.fresh('t'), t = store.symbol(tName);
  const M = Number(multiples.reduce((a, b) => (a > (b < 0n ? -b : b) ? a : b < 0n ? -b : b), 0n));
  // Every sin/cos kernel is Nᵢ(t)/D with D = (1 + t²)^M; for H polynomial of degree d in the kernels,
  // D^d·(H − level) = Σⱼ hⱼ(N)·D^{d−j} is a polynomial in t with the same real zeros (D > 0).
  const lambda = store.symbol(sink.fresh('λ')), numerators = new Map<ExprId, ExprId>(), D = store.pow(store.add(store.integer(1), store.pow(t, store.integer(2))), store.integer(M));
  kernels.forEach((k, i) => {
    const m = multipleAngle(store, multiples[i], t, M), cb = store.cos(k.b), sb = store.sin(k.b);
    const sin = store.add(store.mul(m.sin, cb), store.mul(m.cos, sb)), cos = store.sub(store.mul(m.cos, cb), store.mul(m.sin, sb));
    numerators.set(k.kernel, k.fn === 'sin' ? sin : k.fn === 'cos' ? cos : store.div(sin, cos));
  });
  const lambdaName = (store.node(lambda) as { name: string }).name;
  const terms = kernels.some(k => k.fn === 'tan') ? undefined
    : bivariateTerms(store, replaceSubexpressions(store, store.sub(g.h, g.level), new Map([...numerators].map(([k, n]) => [k, store.mul(lambda, n)]))), tName, lambdaName);
  let cleared: ExprId;
  if (terms && [...terms.keys()].every(k => Number(k.split(',')[1]) >= 0)) {
    const d = Math.max(0, ...[...terms.keys()].map(k => Number(k.split(',')[1])));
    cleared = store.add(...[...terms].map(([k, c]) => {
      const [i, j] = k.split(',').map(Number);
      return store.mul(c, store.pow(t, store.integer(i)), store.pow(D, store.integer(d - j)));
    }));
  } else {
    cleared = replaceSubexpressions(store, store.sub(g.h, g.level), new Map([...numerators].map(([k, n]) => [k, store.div(n, D)])));
  }
  const r = sink.solveRational(cleared, store.integer(0), tName, 'any');
  if (r.kind === 'all') return 'all';
  // w = g·v = 2·atan(t) + 2πk, and the exceptional w = π (t = ∞).
  const residues = r.values.map(c => store.div(canonicalAngle(store, store.mul(store.integer(2), store.apply('atan', c))), gSlope));
  const exceptional = store.div(store.constant('pi'), gSlope);
  try {
    if (realSign(store, store.sub(store.substitute(g.h, new Map([[v, exceptional]])), g.level)) === 0) residues.push(exceptional);
  } catch {
    // Undefined at w = π (a tangent pole): not a zero.
  }
  const abs = realSign(store, gSlope) < 0 ? store.neg(gSlope) : gSlope;
  return residueGroups(store, residues, store.div(store.mul(store.integer(2), store.constant('pi')), abs));
}

/**
 * H − level = α·sin w + β·cos w + γ when every kernel is sin or cos of ±w + b
 * and H is linear in them: the phase φ (sin(w + φ) = (α·sin w + β·cos w)/R,
 * R = √(α² + β²) > 0) and the level −γ/R; 'constant' when α = β = 0.
 */
function harmonicForm(
  store: ExpressionStore, g: PeriodicGoal, kernels: readonly { kernel: ExprId; fn: 'sin' | 'cos' | 'tan'; b: ExprId }[], multiples: readonly bigint[], sink: Sink,
): { phase: ExprId; level: ExprId } | 'constant' | undefined {
  if (kernels.some((k, i) => k.fn === 'tan' || (multiples[i] !== 1n && multiples[i] !== -1n))) return undefined;
  const symbols = kernels.map(() => store.symbol(sink.fresh('μ')));
  const lin = linearForm(store, replaceSubexpressions(store, store.sub(g.h, g.level), new Map(kernels.map((k, i) => [k.kernel, symbols[i]]))), symbols);
  if (!lin || store.freeSymbols(lin.constant).length) return undefined;
  let alpha: ExprId = store.integer(0), beta: ExprId = store.integer(0);
  kernels.forEach((k, i) => {
    const c = lin.coefficients.get(symbols[i]) ?? store.integer(0), n = store.integer(multiples[i]);
    // sin(n·w + b) = n·sin w·cos b + cos w·sin b; cos(n·w + b) = cos w·cos b − n·sin w·sin b (n = ±1).
    const [sw, cw] = k.fn === 'sin' ? [store.mul(n, store.cos(k.b)), store.sin(k.b)] : [store.neg(store.mul(n, store.sin(k.b))), store.cos(k.b)];
    alpha = store.add(alpha, store.mul(c, sw));
    beta = store.add(beta, store.mul(c, cw));
  });
  const sa = realSignOrZero(store, alpha), sb = realSignOrZero(store, beta);
  if (sa === 0 && sb === 0) return 'constant';
  const R = store.sqrt(store.add(store.pow(alpha, store.integer(2)), store.pow(beta, store.integer(2))));
  const pi = store.constant('pi');
  // φ = atan2(β, α).
  const phase = sa === 0 ? store.mul(store.number(rational(store.ctx, sb, 2n)), pi)
    : sa > 0 ? store.apply('atan', store.div(beta, alpha))
      : store.add(store.apply('atan', store.div(beta, alpha)), sb >= 0 ? pi : store.neg(pi));
  const constant = store.numberValue(lin.constant);
  return { phase: canonicalAngle(store, phase), level: constant?.numerator === 0n ? store.integer(0) : store.neg(store.div(lin.constant, R)) };
}

function realSignOrZero(store: ExpressionStore, id: ExprId): -1 | 0 | 1 {
  const v = store.numberValue(id);
  return v ? (v.numerator === 0n ? 0 : v.numerator < 0n ? -1 : 1) : realSign(store, id);
}

// ---- sums of inverse trig kernels ----

function unitParts(store: ExpressionStore, fn: string, h: ExprId): { re: ExprId; im: ExprId } {
  const one = store.integer(1), h2 = store.pow(h, store.integer(2));
  if (fn === 'asin') return { re: store.sqrt(store.sub(one, h2)), im: h };
  if (fn === 'acos') return { re: h, im: store.sqrt(store.sub(one, h2)) };
  const r = store.sqrt(store.add(one, h2));
  return { re: store.div(one, r), im: store.div(h, r) };
}

function exactConstant(store: ExpressionStore, id: ExprId): ExprId {
  const e = evaluateExact(store, id, 'real');
  if (e.kind !== 'exact') return id;
  return e.value.kind === 'rational' ? store.number(e.value.value) : store.algebraic(e.value.root);
}

/**
 * Σ qᵢ·arcᵢ(hᵢ(v)) + d = level. With N the common denominator of the qᵢ, the
 * equation forces e^{i·Σ N·qᵢ·arcᵢ} = e^{i·N·(level − d)}; the imaginary part of
 * the quotient is an algebraic equation in v whose zeros contain every
 * solution (tower elimination), and each is confirmed by the exact angle test.
 */
export function arcSum(store: ExpressionStore, g: PeriodicGoal, kernels: readonly ExprId[], sink: Sink): ExprId[] {
  const ctx = store.ctx;
  const symbols = kernels.map(() => store.symbol(sink.fresh('λ')));
  const linear = linearForm(store, replaceSubexpressions(store, g.h, new Map(kernels.map((k, i) => [k, symbols[i]]))), symbols);
  if (!linear || store.freeSymbols(linear.constant).length) return sink.refuse(COMPOSITION, 'inverse trig kernels combined non-linearly');
  const q = symbols.map(sy => store.numberValue(linear.coefficients.get(sy) ?? store.integer(0)));
  if (q.some(c => c === undefined)) return sink.refuse(OWNERS.parameters, 'non-rational multiples of inverse trig kernels');
  let N = 1n;
  for (const c of q as Rational[]) N = iquot(ctx, imul(ctx, N, c.denominator), igcd(ctx, N, c.denominator));
  const target = store.mul(store.integer(N), store.sub(g.level, linear.constant));
  const turns = store.numberValue(store.div(target, store.constant('pi')));
  if (turns === undefined) return sink.refuse(CERTIFIED_NUMERICS, 'inverse trig kernels equal to a constant that is not a rational multiple of π');
  let re: ExprId = store.integer(1), im: ExprId = store.integer(0);
  const times = (a: { re: ExprId; im: ExprId }) => {
    const r = store.sub(store.mul(re, a.re), store.mul(im, a.im)), i = store.add(store.mul(re, a.im), store.mul(im, a.re));
    re = r; im = i;
  };
  kernels.forEach((k, j) => {
    const node = store.node(k) as { fn: string; arg: ExprId };
    const w = unitParts(store, node.fn, node.arg), n = ((q[j] as Rational).numerator * N) / (q[j] as Rational).denominator;
    const step = n < 0n ? { re: w.re, im: store.neg(w.im) } : w;
    for (let e = 0n; e < (n < 0n ? -n : n); e++) { ctx.tick(); times(step); }
  });
  const angle = store.mul(store.number(turns), store.constant('pi'));
  times({ re: exactConstant(store, store.cos(angle)), im: exactConstant(store, store.neg(store.sin(angle))) });
  const el = eliminateRadicals(store, im, g.variable);
  if (el.kind === 'refused') return sink.refuse(el.refusal.owner, el.refusal.detail);
  if (el.kind === 'all') return sink.refuse(COMPOSITION, 'an inverse trig identity');
  const out: ExprId[] = [];
  for (const c of el.values) {
    const z = angleLinearIsZero(store, store.sub(store.substitute(g.h, new Map([[g.variable, c]])), g.level));
    if (z === undefined) return sink.refuse(COMPOSITION, 'an inverse trig candidate that cannot be confirmed exactly');
    if (z) out.push(c);
  }
  return out;
}

// ---- parametric goals ----

function onlyParam(store: ExpressionStore, level: ExprId, params: readonly Param[], sink: Sink): Param | undefined {
  const used = params.filter(p => store.freeSymbols(level).includes(p.name));
  if (used.length > 1) return sink.refuse(COMPOSITION, 'a level in several integer parameters');
  return used[0];
}

/**
 * Restrict the goal's level parameter by conditions on the level, then call
 * `next` with each resulting goal: enumerated for bounded integer ranges,
 * symbolic (with the narrowed range) otherwise.
 */
function restricted(store: ExpressionStore, g: PeriodicGoal, conditions: readonly { op: RelationOperator; against: ExprId }[], sink: Sink, next: (goal: PeriodicGoal) => void): void {
  const p = onlyParam(store, g.level, g.params, sink);
  if (!p) {
    // Constant level: check the conditions exactly.
    for (const c of conditions) {
      const s = realSign(store, store.sub(g.level, c.against));
      const ok = c.op === 'lt' ? s < 0 : c.op === 'le' ? s <= 0 : c.op === 'gt' ? s > 0 : c.op === 'ge' ? s >= 0 : c.op === 'eq' ? s === 0 : s !== 0;
      if (!ok) return;
    }
    next(g);
    return;
  }
  const ranges = restrictParam(store, g.level, p, conditions);
  if ('refusal' in ranges) return sink.refuse(ranges.refusal.owner, ranges.refusal.detail);
  const others = g.params.filter(x => x.name !== p.name);
  for (const r of ranges) {
    if (r.from !== undefined && r.to !== undefined) {
      for (let k = r.from; k <= r.to; k++) {
        store.ctx.tick();
        const at = new Map([[p.name, store.integer(k)]]);
        next({ ...g, level: store.substitute(g.level, at), back: store.substitute(g.back, at), params: others });
      }
      continue;
    }
    next({ ...g, params: [...others, { name: p.name, from: r.from, to: r.to }] });
  }
}

/** One step for a goal whose level contains integer parameters. */
export function parametricStep(store: ExpressionStore, g: PeriodicGoal, sink: Sink): void {
  if (g.params.every(p => !store.freeSymbols(g.level, g.back).includes(p.name))) { sink.push({ ...g, params: [] }); return; }
  const v = g.variable, scan = scanKernels(store, g.h, v), L = g.level;
  if (scan.kernels.length === 0) {
    const c = polynomialCoefficients(store, g.h, v);
    if (!c || c.length > 3 || store.freeSymbols(...c).length) return sink.refuse(COMPOSITION, 'a family level for a non-quadratic inner equation');
    if (c.length === 2) {
      const value = store.div(store.sub(L, c[0]), c[1]);
      emitFamily(store, g, value, sink);
      return;
    }
    // a·v² + b·v + c0 = L: v = (−b ± √D)/(2a), D = b² − 4a(c0 − L).
    const [c0, b, a] = c, D = store.sub(store.pow(b, store.integer(2)), store.mul(store.integer(4), a, store.sub(c0, L)));
    const twoA = store.mul(store.integer(2), a);
    const dGoal = { ...g, level: D };
    restricted(store, dGoal, [{ op: 'gt', against: store.integer(0) }], sink, goal => {
      const r = store.sqrt(goal.level);
      emitFamily(store, goal, store.div(store.sub(r, b), twoA), sink);
      emitFamily(store, goal, store.div(store.neg(store.add(r, b)), twoA), sink);
    });
    restricted(store, dGoal, [{ op: 'eq', against: store.integer(0) }], sink, goal => emitFamily(store, goal, store.neg(store.div(b, twoA)), sink));
    return;
  }
  if (scan.kernels.length !== 1 || scan.variableOutside) return sink.refuse(COMPOSITION, 'a family level for several kernels');
  const k = scan.kernels[0], node = store.node(k);
  const hole = sink.fresh('η');
  // The kernel must be the whole goal up to an affine map: h = α·κ + β.
  const aff = affineIn(store, replaceSubexpressions(store, g.h, new Map([[k, store.symbol(hole)]])), hole);
  if (!aff) return sink.refuse(COMPOSITION, 'a family level for a non-affine use of a kernel');
  const kLevel = (level: ExprId) => store.div(store.sub(level, aff.b), aff.a);
  const goalFor = (goal: PeriodicGoal) => ({ ...goal, level: kLevel(goal.level) });
  const zero = store.integer(0), one = store.integer(1);
  if (node.kind === 'apply') {
    const arg = node.arg;
    switch (node.fn) {
      case 'exp': return restricted(store, goalFor(g), [{ op: 'gt', against: zero }], sink, goal => sink.push({ ...goal, h: arg, level: store.log(goal.level) }));
      case 'log': return sink.push({ ...goalFor(g), h: arg, level: store.exp(kLevel(L)) });
      case 'abs':
        restricted(store, goalFor(g), [{ op: 'gt', against: zero }], sink, goal => { sink.push({ ...goal, h: arg }); sink.push({ ...goal, h: arg, level: store.neg(goal.level) }); });
        return restricted(store, goalFor(g), [{ op: 'eq', against: zero }], sink, goal => sink.push({ ...goal, h: arg, level: zero }));
      case 'sin': case 'cos': {
        const fn = node.fn;
        restricted(store, goalFor(g), [{ op: 'gt', against: store.integer(-1) }, { op: 'lt', against: one }], sink, goal => {
          if (onlyParam(store, goal.level, goal.params, sink) === undefined) { invertTrig(store, goal, fn, arg, goal.level, sink); return; }
          const m = sink.fresh('κ'), P = store.mul(store.integer(2), store.constant('pi')), M = store.mul(P, store.symbol(m));
          const residues = fn === 'sin' ? [store.apply('asin', goal.level), store.sub(store.constant('pi'), store.apply('asin', goal.level))] : [store.apply('acos', goal.level), store.neg(store.apply('acos', goal.level))];
          for (const r of residues) sink.push({ ...goal, h: arg, level: store.add(r, M), params: [...goal.params, { name: m }] });
        });
        // Levels ±1 (finitely many parameter values, by monotonicity).
        for (const end of [one, store.integer(-1)]) restricted(store, goalFor(g), [{ op: 'eq', against: end }], sink, goal => invertTrig(store, goal, fn, arg, goal.level, sink));
        return;
      }
      case 'tan': {
        const m = sink.fresh('κ'), goal = goalFor(g);
        return sink.push({ ...goal, h: arg, level: store.add(store.apply('atan', goal.level), store.mul(store.constant('pi'), store.symbol(m))), params: [...goal.params, { name: m }] });
      }
      case 'asin': case 'acos': case 'atan': {
        const h = half(store), lo = node.fn === 'acos' ? zero : store.neg(h), hi = node.fn === 'acos' ? store.constant('pi') : h;
        const strict = node.fn === 'atan';
        const fnInverse = node.fn === 'asin' ? 'sin' : node.fn === 'acos' ? 'cos' : 'tan';
        return restricted(store, goalFor(g), [{ op: strict ? 'gt' : 'ge', against: lo }, { op: strict ? 'lt' : 'le', against: hi }], sink, goal => sink.push({ ...goal, h: arg, level: store.apply(fnInverse, goal.level) }));
      }
      default: return sink.refuse(COMPOSITION, `a family level through ${node.fn}`);
    }
  }
  const e = store.numberValue((node as { exponent: ExprId }).exponent);
  if (node.kind === 'pow' && e && e.numerator === 1n) {
    const base = node.base, q = e.denominator;
    if (q % 2n === 1n) return sink.push({ ...goalFor(g), h: base, level: store.pow(kLevel(L), store.integer(q)) });
    return restricted(store, goalFor(g), [{ op: 'ge', against: zero }], sink, goal => sink.push({ ...goal, h: base, level: store.pow(goal.level, store.integer(q)) }));
  }
  return sink.refuse(COMPOSITION, 'a family level through this kernel');
}

/** v = value(params): an affine family when the value is c₀ + c₁·κ over all of ℤ, else a parametric family. */
function emitFamily(store: ExpressionStore, g: PeriodicGoal, value: ExprId, sink: Sink): void {
  const x = g.back === store.symbol(g.variable) ? value : store.substitute(g.back, new Map([[g.variable, value]]));
  const live = g.params.filter(p => store.freeSymbols(x).includes(p.name));
  if (live.length === 0) { sink.value(g, value); return; }
  if (live.length === 1 && live[0].from === undefined && live[0].to === undefined) {
    const aff = affineIn(store, x, live[0].name);
    if (aff) {
      const abs = realSign(store, aff.a) < 0 ? store.neg(aff.a) : aff.a;
      sink.periodic({ period: abs, points: [aff.b] });
      return;
    }
  }
  sink.family({ value: x, params: live });
}
