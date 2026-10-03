import { EquationAlgebraError } from '../execution';
import type { Refusal } from '../decision/rational-form';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign } from '../representation/real-order';
import { replaceSubexpressions } from '../generators/lattice';
import { dependsOn } from '../generators/normal-form';
import type { ZeroInterval, ZeroResult } from '../generators/inversion';

/**
 * Absolute values by lazy branching.
 *
 * The outermost |vⱼ| of H change form only where some vⱼ changes sign or stops
 * being defined: at the zeros of vⱼ and of its domain boundaries (even-radical
 * bases, log arguments, denominators, Lambert thresholds). Between consecutive
 * such points every |vⱼ| equals σⱼ·vⱼ for one sign σⱼ (read at one sample), so
 * H equals an abs-free formula H_p there; its zeros inside the piece are zeros
 * of H. A piece where H_p is identically zero is a zero interval. At a
 * critical point H equals the adjacent piece formula, so it is a zero exactly
 * when it is one of that formula's zeros (or H evaluates to 0 there).
 * Branches are created only where an argument changes sign.
 */
export type PieceSolver = (expression: ExprId) => ZeroResult;
export type Piecewise = { readonly values: ExprId[]; readonly intervals: ZeroInterval[] } | { readonly refusal: Refusal };

function outermostAbs(store: ExpressionStore, h: ExprId, x: string): ExprId[] {
  const out: ExprId[] = [], stack = [h], seen = new Set<ExprId>();
  while (stack.length) {
    const n = stack.pop() as ExprId;
    if (seen.has(n) || !dependsOn(store, n, x)) continue;
    seen.add(n);
    const node = store.node(n);
    if (node.kind === 'apply' && node.fn === 'abs') { out.push(n); continue; }
    if (node.kind === 'add' || node.kind === 'mul') stack.push(...node.args);
    else if (node.kind === 'pow') stack.push(node.base, node.exponent);
    else if (node.kind === 'apply') stack.push(node.arg);
  }
  return out;
}

export function containsAbs(store: ExpressionStore, h: ExprId, x: string): boolean { return outermostAbs(store, h, x).length > 0; }

/** Expressions whose zeros bound the domain of v (where v may start or stop being defined). */
function domainBoundaries(store: ExpressionStore, v: ExprId, x: string): ExprId[] {
  const out: ExprId[] = [];
  for (const n of store.postorder([v])) {
    const node = store.node(n);
    if (node.kind === 'pow' && dependsOn(store, node.base, x)) {
      const e = store.numberValue(node.exponent);
      if (e && (e.numerator < 0n || (e.denominator > 1n && e.denominator % 2n === 0n))) out.push(node.base);
    }
    if (node.kind === 'apply' && dependsOn(store, node.arg, x)) {
      if (node.fn === 'log') out.push(node.arg);
      if (node.fn === 'lambertw' || node.fn === 'lambertwm1') out.push(store.add(node.arg, store.exp(store.integer(-1))));
      if (node.fn === 'lambertwm1') out.push(node.arg);
    }
  }
  return out;
}

function signOrUndefined(store: ExpressionStore, id: ExprId): -1 | 0 | 1 | undefined {
  try {
    return realSign(store, id);
  } catch (e) {
    if (e instanceof EquationAlgebraError && e.code === 'invalid-input') return undefined;
    throw e;
  }
}

export function absPiecewise(store: ExpressionStore, h: ExprId, x: string, solve: PieceSolver, samplesBetween: (a: ExprId | undefined, b: ExprId | undefined) => ExprId): Piecewise {
  const abs = outermostAbs(store, h, x);
  const args = abs.map(a => (store.node(a) as { arg: ExprId }).arg);
  const critical = new Set<ExprId>(), argZeros: ZeroResult[] = [];
  for (const e of [...args, ...args.flatMap(v => domainBoundaries(store, v, x))]) {
    const z = solve(e);
    if (z.kind === 'refused') return { refusal: z.refusal };
    if (argZeros.length < args.length) argZeros.push(z);
    if (z.kind === 'all') continue;
    z.values.forEach(c => critical.add(c));
    for (const i of z.intervals ?? []) { if (i.lo !== undefined) critical.add(i.lo); if (i.hi !== undefined) critical.add(i.hi); }
  }
  // Sign of argument j at a sample (never a critical point): 0 where it vanishes identically (σ·v then keeps
  // v's domain, since 0·v is not folded for non-total v), else certified.
  const argSign = (j: number, sample: ExprId) => {
    const z = argZeros[j];
    if (z.kind === 'all') return 0;
    const inside = (i: ZeroInterval) => (i.lo === undefined || realCompare(store, sample, i.lo) > 0) && (i.hi === undefined || realCompare(store, sample, i.hi) < 0);
    if (z.kind === 'zeros' && (z.intervals ?? []).some(inside)) return 0;
    return signOrUndefined(store, store.substitute(args[j], new Map([[x, sample]])));
  };
  const points = [...critical].sort((a, b) => realCompare(store, a, b));
  const values = new Set<ExprId>(), intervals: ZeroInterval[] = [];
  const rawZeros = new Map<number, { set: Set<ExprId>; all: boolean }>();
  for (let i = 0; i <= points.length; i++) {
    store.ctx.tick();
    const lo = i > 0 ? points[i - 1] : undefined, hi = i < points.length ? points[i] : undefined;
    const sample = samplesBetween(lo, hi);
    const signs = args.map((_, j) => argSign(j, sample));
    if (signs.some(s => s === undefined)) continue; // the expression is undefined on this whole piece
    const piece = replaceSubexpressions(store, h, new Map(abs.map((a, j) => [a, store.mul(store.integer(signs[j] as number), args[j])])));
    const z = solve(piece);
    if (z.kind === 'refused') return { refusal: z.refusal };
    if (z.kind === 'all') {
      rawZeros.set(i, { set: new Set(), all: true });
      intervals.push({ lo, hi, loClosed: false, hiClosed: false });
      continue;
    }
    rawZeros.set(i, { set: new Set(z.values), all: false });
    const inside = (c: ExprId) => (lo === undefined || realCompare(store, c, lo) > 0) && (hi === undefined || realCompare(store, c, hi) < 0);
    for (const c of z.values) if (c !== lo && c !== hi && inside(c)) values.add(c);
    for (const iv of z.intervals ?? []) {
      // Clip the formula's zero interval to the open piece.
      const clipLo = iv.lo === undefined || (lo !== undefined && realCompare(store, iv.lo, lo) < 0) ? lo : iv.lo;
      const clipHi = iv.hi === undefined || (hi !== undefined && realCompare(store, iv.hi, hi) > 0) ? hi : iv.hi;
      if (clipLo !== undefined && clipHi !== undefined && realCompare(store, clipLo, clipHi) >= 0) continue;
      intervals.push({ lo: clipLo, hi: clipHi, loClosed: clipLo === iv.lo && iv.loClosed, hiClosed: clipHi === iv.hi && iv.hiClosed });
    }
  }
  // Critical points: zero when an adjacent formula vanishes there, or when H evaluates to 0.
  points.forEach((c, k) => {
    const near = [rawZeros.get(k), rawZeros.get(k + 1)].filter(z => z !== undefined);
    if (near.some(z => z.all || z.set.has(c))) { values.add(c); return; }
    if (signOrUndefined(store, store.substitute(h, new Map([[x, c]]))) === 0) values.add(c);
  });
  return { values: [...values], intervals };
}
