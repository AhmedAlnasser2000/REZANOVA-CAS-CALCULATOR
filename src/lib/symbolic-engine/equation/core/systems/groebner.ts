import { demand, type ExecutionContext } from '../execution';
import { rAdd, rational, rDivide, rIsZero, rMultiply, rNegate, type Rational } from '../algebra/rational';

/**
 * Sparse multivariate polynomials over ℚ in a fixed number of variables, with
 * terms sorted by a monomial order (leading term first), and Gröbner bases
 * by Buchberger's algorithm with the Gebauer–Möller criteria and the normal
 * selection strategy. Optionally every basis element carries its cofactors
 * over the input polynomials (g = Σ cⱼ·fⱼ), so membership of the basis in
 * the input ideal is checked by an exact identity.
 */
export interface Term { readonly e: readonly number[]; readonly c: Rational }
/** Terms in decreasing order; zero is []. */
export type Poly = readonly Term[];
export type Order = 'grevlex' | 'lex';

export function compareMonomials(order: Order, a: readonly number[], b: readonly number[]): number {
  if (order === 'grevlex') {
    const da = a.reduce((s, v) => s + v, 0), db = b.reduce((s, v) => s + v, 0);
    if (da !== db) return da - db;
    for (let i = a.length - 1; i >= 0; i--) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  }
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const key = (e: readonly number[]) => e.join(',');

export function normalize(ctx: ExecutionContext, order: Order, terms: readonly Term[]): Poly {
  const byKey = new Map<string, Term>();
  for (const t of terms) {
    ctx.tick();
    const k = key(t.e), old = byKey.get(k);
    byKey.set(k, old ? { e: t.e, c: rAdd(ctx, old.c, t.c) } : t);
  }
  return [...byKey.values()].filter(t => !rIsZero(ctx, t.c)).sort((x, y) => compareMonomials(order, y.e, x.e));
}

/** a + s·m·b for a term m (exponents and coefficient s). */
function addMultiple(ctx: ExecutionContext, order: Order, a: Poly, b: Poly, me: readonly number[], s: Rational): Poly {
  if (b.length === 0 || rIsZero(ctx, s)) return a;
  ctx.allocate(a.length + b.length);
  const shifted = b.map(t => ({ e: t.e.map((v, i) => v + me[i]), c: rMultiply(ctx, t.c, s) }));
  // Merge two sorted lists.
  const out: Term[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < shifted.length) {
    ctx.tick();
    if (j === shifted.length) { out.push(a[i++]); continue; }
    if (i === a.length) { out.push(shifted[j++]); continue; }
    const c = compareMonomials(order, a[i].e, shifted[j].e);
    if (c > 0) out.push(a[i++]);
    else if (c < 0) out.push(shifted[j++]);
    else {
      const sum = rAdd(ctx, a[i].c, shifted[j].c);
      if (!rIsZero(ctx, sum)) out.push({ e: a[i].e, c: sum });
      i++; j++;
    }
  }
  return out;
}

export const add = (ctx: ExecutionContext, order: Order, a: Poly, b: Poly) => addMultiple(ctx, order, a, b, a[0]?.e.map(() => 0) ?? b[0]?.e.map(() => 0) ?? [], rational(ctx, 1n));
export const scalePoly = (ctx: ExecutionContext, a: Poly, s: Rational): Poly => (rIsZero(ctx, s) ? [] : a.map(t => ({ e: t.e, c: rMultiply(ctx, t.c, s) })));
export function multiplyPoly(ctx: ExecutionContext, order: Order, a: Poly, b: Poly): Poly {
  let out: Poly = [];
  for (const t of a) out = addMultiple(ctx, order, out, b, t.e, t.c);
  return out;
}

const divides = (a: readonly number[], b: readonly number[]) => a.every((v, i) => v <= b[i]);
const lcm = (a: readonly number[], b: readonly number[]) => a.map((v, i) => Math.max(v, b[i]));
const diff = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v - b[i]);

/** An element with optional cofactors over the inputs. */
export interface Tracked { readonly p: Poly; readonly cof?: readonly Poly[] }

/** Full reduction of f by G; cofactors (when tracked) follow every step. */
export function reduce(ctx: ExecutionContext, order: Order, f: Tracked, G: readonly Tracked[]): Tracked {
  let p = f.p, r: Term[] = [], cof = f.cof ? [...f.cof] : undefined;
  while (p.length) {
    ctx.tick();
    const t = p[0], g = G.find(h => h.p.length && divides(h.p[0].e, t.e));
    if (!g) { r.push(t); p = p.slice(1); continue; }
    const m = diff(t.e, g.p[0].e), s = rNegate(ctx, rDivide(ctx, t.c, g.p[0].c));
    p = addMultiple(ctx, order, p, g.p, m, s);
    if (cof && g.cof) cof = cof.map((c, i) => addMultiple(ctx, order, c, (g.cof as Poly[])[i], m, s));
  }
  r = [...r];
  return cof ? { p: r, cof } : { p: r };
}

function monic(ctx: ExecutionContext, f: Tracked): Tracked {
  if (!f.p.length) return f;
  const s = rDivide(ctx, rational(ctx, 1n), f.p[0].c);
  return f.cof ? { p: scalePoly(ctx, f.p, s), cof: f.cof.map(c => scalePoly(ctx, c, s)) } : { p: scalePoly(ctx, f.p, s) };
}

function sPolynomial(ctx: ExecutionContext, order: Order, f: Tracked, g: Tracked): Tracked {
  const l = lcm(f.p[0].e, g.p[0].e), mf = diff(l, f.p[0].e), mg = diff(l, g.p[0].e);
  const sf = rDivide(ctx, rational(ctx, 1n), f.p[0].c), sg = rNegate(ctx, rDivide(ctx, rational(ctx, 1n), g.p[0].c));
  const p = addMultiple(ctx, order, addMultiple(ctx, order, [], f.p, mf, sf), g.p, mg, sg);
  if (!f.cof || !g.cof) return { p };
  const gc = g.cof;
  return { p, cof: f.cof.map((c, i) => addMultiple(ctx, order, addMultiple(ctx, order, [], c, mf, sf), gc[i], mg, sg)) };
}

/**
 * A reduced Gröbner basis of the inputs (monic, sorted by leading monomial),
 * with cofactors when `track` is set. Buchberger with the Gebauer–Möller
 * pair criteria; pairs are taken by smallest lcm (normal strategy).
 */
export function groebner(ctx: ExecutionContext, order: Order, inputs: readonly Poly[], track = false): Tracked[] {
  const n = inputs.length;
  const unit = (i: number): Poly[] => inputs.map((f, j) => (j === i ? [{ e: (f[0]?.e ?? []).map(() => 0), c: rational(ctx, 1n) }] : []));
  const G: Tracked[] = [];
  let pairs: [number, number, readonly number[]][] = [];
  const insert = (h: Tracked) => {
    const lt = h.p[0].e, k = G.length;
    G.push(h);
    // Gebauer–Möller: drop new pairs whose lcm is a proper multiple of another new pair's lcm, or coprime pairs.
    let fresh = G.slice(0, k).map((g, i) => [i, k, lcm(g.p[0].e, lt)] as [number, number, readonly number[]]).filter(([i]) => G[i].p.length);
    fresh = fresh.filter(([i, , l]) => !fresh.some(([j, , m]) => j !== i && divides(m, l) && key(m) !== key(l)));
    const seen = new Set<string>();
    fresh = fresh.filter(([, , l]) => { const s = key(l); if (seen.has(s)) return false; seen.add(s); return true; });
    fresh = fresh.filter(([i, , l]) => key(l) !== key(G[i].p[0].e.map((v, j) => v + lt[j])));
    // Old pairs whose lcm is divisible by lt and differs from both new lcms are redundant.
    pairs = pairs.filter(([i, j, l]) => !(divides(lt, l) && key(lcm(G[i].p[0].e, lt)) !== key(l) && key(lcm(G[j].p[0].e, lt)) !== key(l)));
    pairs.push(...fresh);
  };
  for (let i = 0; i < n; i++) {
    const f = reduce(ctx, order, track ? { p: inputs[i], cof: unit(i) } : { p: inputs[i] }, G);
    if (f.p.length) insert(monic(ctx, f));
  }
  while (pairs.length) {
    ctx.tick();
    pairs.sort((a, b) => compareMonomials(order, b[2], a[2]));
    const [i, j] = pairs.pop() as [number, number, readonly number[]];
    const h = reduce(ctx, order, sPolynomial(ctx, order, G[i], G[j]), G);
    if (h.p.length) insert(monic(ctx, h));
  }
  // Interreduce to the reduced basis.
  const minimal = G.filter((g, i) => !G.some((h, j) => j !== i && divides(h.p[0].e, g.p[0].e) && (key(h.p[0].e) !== key(g.p[0].e) || j < i)));
  const reduced = minimal.map((g, i) => monic(ctx, reduce(ctx, order, g, minimal.filter((_, j) => j !== i))));
  return reduced.sort((a, b) => compareMonomials(order, b.p[0].e, a.p[0].e));
}

/** Buchberger's criterion: every S-polynomial reduces to zero (an independent check that G is a Gröbner basis). */
export function isGroebner(ctx: ExecutionContext, order: Order, G: readonly Poly[]): boolean {
  const T = G.map(p => ({ p }));
  for (let i = 0; i < T.length; i++) {
    for (let j = i + 1; j < T.length; j++) {
      ctx.tick();
      const a = T[i].p[0].e, b = T[j].p[0].e;
      if (a.every((v, k) => v === 0 || b[k] === 0)) continue;
      if (reduce(ctx, order, sPolynomial(ctx, order, T[i], T[j]), T).p.length) return false;
    }
  }
  return true;
}

export function isZeroPoly(p: Poly): boolean { return p.length === 0; }
export function checkCofactors(ctx: ExecutionContext, order: Order, inputs: readonly Poly[], g: Tracked): void {
  demand(g.cof !== undefined && g.cof.length === inputs.length, 'verification-failed', 'missing cofactors');
  let sum: Poly = [];
  (g.cof as Poly[]).forEach((c, i) => { sum = add(ctx, order, sum, multiplyPoly(ctx, order, c, inputs[i])); });
  demand(normalize(ctx, order, [...sum, ...g.p.map(t => ({ e: t.e, c: rNegate(ctx, t.c) }))]).length === 0, 'verification-failed', 'a basis element is not the combination its cofactors claim');
}
