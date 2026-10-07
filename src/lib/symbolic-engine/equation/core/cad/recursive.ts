import { demand, type ExecutionContext } from '../execution';
import { iadd, iexact, igcd, imul, ipow } from '../algebra/integer';
import { rational, type Rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { MPoly } from '../parameters/mpoly';

/**
 * Recursive dense polynomials over ℤ for cylindrical algebraic decomposition (EQUATION-SEMIALGEBRAIC1).
 *
 * A polynomial of level n lives in ℤ[x₁, …, xₙ] viewed as ℤ[x₁, …, xₙ₋₁][xₙ]: level 0 is an integer, level n an
 * array of level-(n − 1) coefficients, ascending in xₙ and trimmed (zero is []). x₁ is the innermost variable, the
 * base of the decomposition. Every operation takes the level explicitly; recursion depth is the number of
 * variables. Gcds and resultants use the subresultant PRS over ℤ[x₁, …, xₙ₋₁] with exact divisions (Collins;
 * Cohen, Algorithms 3.3.1 and 3.3.7), so coefficients stay integral and no multivariate factorization is needed:
 * a square-free, pairwise coprime basis is what Lazard's projection asks for.
 */
export type RPoly = bigint | readonly RPoly[];

const arr = (a: RPoly) => a as readonly RPoly[];
const int = (a: RPoly) => a as bigint;

export const isZero = (a: RPoly): boolean => (typeof a === 'bigint' ? a === 0n : a.length === 0);
export const zero = (n: number): RPoly => (n === 0 ? 0n : Object.freeze([]));
export function constant(c: bigint, n: number): RPoly {
  let out: RPoly = c;
  for (let i = 0; i < n; i++) out = c === 0n ? Object.freeze([]) : Object.freeze([out]);
  return out;
}
/** The variable x_j at level n (1 ≤ j ≤ n). */
export function variable(j: number, n: number): RPoly {
  let out: RPoly = 1n;
  for (let i = 1; i <= n; i++) out = Object.freeze(i === j ? [zero(i - 1), out] : [out]);
  return out;
}

function trim(c: RPoly[]): RPoly {
  let k = c.length;
  while (k > 0 && isZero(c[k - 1])) k--;
  return Object.freeze(c.slice(0, k));
}

/** Degree in the main variable xₙ (−1 for zero); n ≥ 1. */
export const degree = (a: RPoly): number => arr(a).length - 1;
export const lc = (a: RPoly): RPoly => arr(a)[arr(a).length - 1];
/** The lowest nonzero coefficient in xₙ (Lazard's trailing coefficient). */
export const tc = (a: RPoly): RPoly => arr(a).find(c => !isZero(c)) as RPoly;
export const coefficient = (a: RPoly, i: number, n: number): RPoly => arr(a)[i] ?? zero(n - 1);

export function add(ctx: ExecutionContext, a: RPoly, b: RPoly, n: number): RPoly {
  if (n === 0) return iadd(ctx, int(a), int(b));
  if (isZero(a)) return b;
  if (isZero(b)) return a;
  const x = arr(a), y = arr(b), out: RPoly[] = [];
  ctx.allocate(Math.max(x.length, y.length));
  for (let i = 0; i < Math.max(x.length, y.length); i++) out.push(add(ctx, x[i] ?? zero(n - 1), y[i] ?? zero(n - 1), n - 1));
  return trim(out);
}
export function scale(ctx: ExecutionContext, a: RPoly, c: bigint, n: number): RPoly {
  if (n === 0) return imul(ctx, int(a), c);
  if (c === 0n) return zero(n);
  ctx.allocate(arr(a).length);
  return Object.freeze(arr(a).map(v => scale(ctx, v, c, n - 1)));
}
export const negate = (ctx: ExecutionContext, a: RPoly, n: number) => scale(ctx, a, -1n, n);
export const subtract = (ctx: ExecutionContext, a: RPoly, b: RPoly, n: number) => add(ctx, a, negate(ctx, b, n), n);

export function multiply(ctx: ExecutionContext, a: RPoly, b: RPoly, n: number): RPoly {
  if (n === 0) return imul(ctx, int(a), int(b));
  if (isZero(a) || isZero(b)) return zero(n);
  const x = arr(a), y = arr(b), out: RPoly[] = Array.from({ length: x.length + y.length - 1 }, () => zero(n - 1));
  ctx.allocate(out.length);
  for (let i = 0; i < x.length; i++) {
    if (isZero(x[i])) continue;
    for (let j = 0; j < y.length; j++) {
      ctx.tick();
      if (!isZero(y[j])) out[i + j] = add(ctx, out[i + j], multiply(ctx, x[i], y[j], n - 1), n - 1);
    }
  }
  return trim(out);
}
export function power(ctx: ExecutionContext, a: RPoly, e: number, n: number): RPoly {
  let out = constant(1n, n), base = a;
  for (let k = e; k > 0; k >>= 1) {
    if (k & 1) out = multiply(ctx, out, base, n);
    if (k > 1) base = multiply(ctx, base, base, n);
  }
  return out;
}
/** a·xₙᵏ. */
function shift(ctx: ExecutionContext, a: RPoly, k: number, n: number): RPoly {
  if (isZero(a) || k === 0) return a;
  ctx.allocate(arr(a).length + k);
  return Object.freeze([...Array.from({ length: k }, () => zero(n - 1)), ...arr(a)]);
}

export function equal(a: RPoly, b: RPoly): boolean {
  if (typeof a === 'bigint' || typeof b === 'bigint') return a === b;
  return a.length === b.length && a.every((c, i) => equal(c, b[i]));
}
/** A canonical text key (equal polynomials of one level have equal keys). */
export function key(a: RPoly): string { return typeof a === 'bigint' ? a.toString() : `[${a.map(key).join(',')}]`; }

/** The exact quotient a / b (b ≠ 0 divides a in ℤ[x₁…xₙ]); a failed division is a demand failure. */
export function divide(ctx: ExecutionContext, a: RPoly, b: RPoly, n: number): RPoly {
  demand(!isZero(b), 'division-by-zero', 'recursive polynomial division by zero');
  if (n === 0) return iexact(ctx, int(a), int(b));
  if (isZero(a)) return a;
  const db = degree(b), lb = lc(b), r = [...arr(a)];
  demand(r.length - 1 >= db, 'nonexact-division', 'recursive exact division');
  const q: RPoly[] = Array.from({ length: r.length - db }, () => zero(n - 1));
  ctx.allocate(q.length);
  for (let k = r.length - 1; k >= db; k--) {
    ctx.tick();
    if (isZero(r[k])) continue;
    const c = divide(ctx, r[k], lb, n - 1);
    q[k - db] = c;
    for (let j = 0; j <= db; j++) r[k - db + j] = subtract(ctx, r[k - db + j], multiply(ctx, c, arr(b)[j], n - 1), n - 1);
  }
  demand(r.every(isZero), 'nonexact-division', 'recursive exact division');
  return trim(q);
}

/**
 * The pseudo-remainder lc(b)^(deg a − deg b + 1)·a mod b in xₙ (the exact power, as the subresultant
 * algorithm needs), deg a ≥ deg b ≥ 0.
 */
export function pseudoRemainder(ctx: ExecutionContext, a: RPoly, b: RPoly, n: number): RPoly {
  const db = degree(b), lb = lc(b);
  let r = a, steps = 0;
  const target = degree(a) - db + 1;
  while (!isZero(r) && degree(r) >= db) {
    ctx.tick();
    r = subtract(ctx, scaleBy(ctx, r, lb, n), shift(ctx, scaleBy(ctx, b, lc(r), n), degree(r) - db, n), n);
    steps++;
  }
  return steps < target ? scaleBy(ctx, r, power(ctx, lb, target - steps, n - 1), n) : r;
}
/** a·c for a level-(n − 1) polynomial c (a coefficient-wise product). */
export function scaleBy(ctx: ExecutionContext, a: RPoly, c: RPoly, n: number): RPoly {
  if (isZero(c)) return zero(n);
  ctx.allocate(arr(a).length);
  return trim(arr(a).map(v => multiply(ctx, v, c, n - 1)));
}
/** a / c, exactly, for a level-(n − 1) polynomial c dividing every coefficient. */
export function divideBy(ctx: ExecutionContext, a: RPoly, c: RPoly, n: number): RPoly {
  ctx.allocate(arr(a).length);
  return trim(arr(a).map(v => divide(ctx, v, c, n - 1)));
}

/** The leading integer of a (the leading coefficient taken recursively down to level 0). */
export function baseLeading(a: RPoly, n: number): bigint {
  let v = a;
  for (let i = n; i > 0; i--) v = lc(v);
  return int(v);
}

/** The associate with a positive base leading coefficient (zero stays zero). */
export function positive(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  return !isZero(a) && baseLeading(a, n) < 0n ? negate(ctx, a, n) : a;
}

/** a divided by the gcd of its integer coefficients, with a positive base leading coefficient (contents in the variables kept). */
export function canonical(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  if (isZero(a)) return a;
  let g = 0n;
  for (const t of terms(a, n)) { g = igcd(ctx, g, t.c); if (g === 1n) break; }
  const s = baseLeading(a, n) < 0n ? -g : g;
  const walk = (v: RPoly, k: number): RPoly => (k === 0 ? iexact(ctx, v as bigint, s) : Object.freeze(arr(v).map(c => walk(c, k - 1))));
  return walk(a, n);
}

/** gcd of the coefficients in xₙ (a level-(n − 1) polynomial, positive); 0 for zero. */
export function content(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  let g = zero(n - 1);
  const one = constant(1n, n - 1);
  for (const c of arr(a)) {
    if (isZero(c)) continue;
    g = gcd(ctx, g, c, n - 1);
    if (equal(g, one)) break;
  }
  return g;
}

/** a divided by its content, with a positive base leading coefficient: the canonical primitive associate. */
export function primitive(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  if (n === 0) return isZero(a) ? 0n : 1n;
  if (isZero(a)) return a;
  return positive(ctx, divideBy(ctx, a, content(ctx, a, n), n), n);
}

/** h^(1−δ)·g^δ, exactly: h for δ = 0, g for δ = 1, g^δ / h^(δ−1) otherwise. */
function nextH(ctx: ExecutionContext, h: RPoly, g: RPoly, delta: number, n: number): RPoly {
  if (delta === 0) return h;
  if (delta === 1) return g;
  return divide(ctx, power(ctx, g, delta, n), power(ctx, h, delta - 1, n), n);
}

/** The gcd in ℤ[x₁…xₙ], with a positive base leading coefficient (gcd(0, 0) = 0). */
export function gcd(ctx: ExecutionContext, a: RPoly, b: RPoly, n: number): RPoly {
  ctx.tick();
  if (n === 0) return igcd(ctx, int(a), int(b));
  if (isZero(a)) return positive(ctx, b, n);
  if (isZero(b)) return positive(ctx, a, n);
  const c = gcd(ctx, content(ctx, a, n), content(ctx, b, n), n - 1);
  let A = primitive(ctx, a, n), B = primitive(ctx, b, n);
  if (degree(A) < degree(B)) [A, B] = [B, A];
  let g = constant(1n, n - 1), h = constant(1n, n - 1);
  for (;;) {
    ctx.tick();
    if (degree(B) === 0) return Object.freeze([c]);
    const delta = degree(A) - degree(B);
    const R = pseudoRemainder(ctx, A, B, n);
    if (isZero(R)) return scaleBy(ctx, primitive(ctx, B, n), c, n);
    A = B;
    B = divideBy(ctx, R, multiply(ctx, g, power(ctx, h, delta, n - 1), n - 1), n);
    g = lc(A);
    h = nextH(ctx, h, g, delta, n - 1);
  }
}

/** The resultant in xₙ (a level-(n − 1) polynomial), by the subresultant PRS; zero when either input is zero. */
export function resultant(ctx: ExecutionContext, a: RPoly, b: RPoly, n: number): RPoly {
  if (isZero(a) || isZero(b)) return zero(n - 1);
  let A = a, B = b, sign = 1n;
  if (degree(A) < degree(B)) {
    [A, B] = [B, A];
    if ((degree(A) * degree(B)) % 2 === 1) sign = -sign;
  }
  const da0 = degree(A), db0 = degree(B);
  if (db0 === 0) return scale(ctx, power(ctx, lc(B), da0, n - 1), sign, n - 1);
  const ca = content(ctx, A, n), cb = content(ctx, B, n);
  A = divideBy(ctx, A, ca, n); B = divideBy(ctx, B, cb, n);
  const t = multiply(ctx, power(ctx, ca, db0, n - 1), power(ctx, cb, da0, n - 1), n - 1);
  let g = constant(1n, n - 1), h = constant(1n, n - 1);
  for (;;) {
    ctx.tick();
    const dA = degree(A), dB = degree(B), delta = dA - dB;
    if (dA % 2 === 1 && dB % 2 === 1) sign = -sign;
    const R = pseudoRemainder(ctx, A, B, n);
    A = B;
    if (isZero(R)) return zero(n - 1);
    B = divideBy(ctx, R, multiply(ctx, g, power(ctx, h, delta, n - 1), n - 1), n);
    g = lc(A);
    h = nextH(ctx, h, g, delta, n - 1);
    if (degree(B) === 0) {
      const dA2 = degree(A);
      const last = divide(ctx, power(ctx, lc(B), dA2, n - 1), power(ctx, h, dA2 - 1, n - 1), n - 1);
      return scale(ctx, multiply(ctx, t, last, n - 1), sign, n - 1);
    }
  }
}

/** ∂/∂xₙ. */
export function derivative(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  ctx.allocate(arr(a).length);
  return trim(arr(a).slice(1).map((c, i) => scale(ctx, c, BigInt(i + 1), n - 1)));
}
/** ∂/∂xⱼ for 1 ≤ j ≤ n. */
export function derivativeIn(ctx: ExecutionContext, a: RPoly, n: number, j: number): RPoly {
  if (j === n) return derivative(ctx, a, n);
  ctx.allocate(arr(a).length);
  return trim(arr(a).map(c => derivativeIn(ctx, c, n - 1, j)));
}

/** The discriminant in xₙ up to sign: res(a, ∂a/∂xₙ) / lc(a), for deg a ≥ 2. */
export function discriminant(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  return divide(ctx, resultant(ctx, a, derivative(ctx, a, n), n), lc(a), n - 1);
}

/** Square-free part in xₙ of a primitive polynomial of positive degree (primitive, positive). */
export function squareFree(ctx: ExecutionContext, a: RPoly, n: number): RPoly {
  return primitive(ctx, divide(ctx, a, gcd(ctx, a, derivative(ctx, a, n), n), n), n);
}

/**
 * A square-free basis of pairwise coprime primitive polynomials of positive degree in xₙ whose products give the
 * square-free parts of the inputs' primitive parts (inputs primitive with positive degree).
 */
export function coprimeBasis(ctx: ExecutionContext, inputs: readonly RPoly[], n: number): RPoly[] {
  const basis: RPoly[] = [];
  for (const input of inputs) {
    let f = squareFree(ctx, input, n);
    for (let i = 0; i < basis.length && degree(f) > 0; i++) {
      ctx.tick();
      const g = gcd(ctx, f, basis[i], n);
      if (degree(g) === 0) continue;
      const rest = primitive(ctx, divide(ctx, basis[i], g, n), n);
      basis.splice(i, 1, primitive(ctx, g, n), ...(degree(rest) > 0 ? [rest] : []));
      f = primitive(ctx, divide(ctx, f, g, n), n);
      i += degree(rest) > 0 ? 1 : 0;
    }
    if (degree(f) > 0) basis.push(f);
  }
  return basis;
}

/** The level of the highest variable a depends on (0 for a constant), and a at that level. */
export function trueLevel(a: RPoly, n: number): { readonly level: number; readonly poly: RPoly } {
  let v = a, k = n;
  while (k > 0 && degree(v) <= 0) { v = isZero(v) ? zero(k - 1) : arr(v)[0]; k--; }
  return { level: k, poly: v };
}
/** a of level m as a polynomial of level n ≥ m. */
export function raise(a: RPoly, m: number, n: number): RPoly {
  let v = a;
  for (let k = m; k < n; k++) v = isZero(v) ? zero(k + 1) : Object.freeze([v]);
  return v;
}

/** Every level-m subpolynomial (the coefficients of a in the monomials of x_{m+1}…xₙ), m ≤ n. */
export function coefficientsBelow(a: RPoly, n: number, m: number): RPoly[] {
  if (n === m) return [a];
  return arr(a).flatMap(c => coefficientsBelow(c, n - 1, m));
}

/** Total degree bound per variable: degs[j − 1] = deg_{xⱼ} a. */
export function degrees(a: RPoly, n: number): number[] {
  const out = Array.from({ length: n }, () => -1);
  const walk = (v: RPoly, k: number) => {
    if (k === 0 || isZero(v)) return;
    out[k - 1] = Math.max(out[k - 1], degree(v));
    for (const c of arr(v)) walk(c, k - 1);
  };
  walk(a, n);
  return out;
}

/** Every term: exponent vector (index j − 1 for xⱼ) and integer coefficient. */
export function terms(a: RPoly, n: number): { readonly exps: number[]; readonly c: bigint }[] {
  const out: { exps: number[]; c: bigint }[] = [];
  const walk = (v: RPoly, k: number, exps: number[]) => {
    if (k === 0) { if (v !== 0n) out.push({ exps: [...exps], c: int(v) }); return; }
    arr(v).forEach((c, i) => { exps[k - 1] = i; walk(c, k - 1, exps); });
    exps[k - 1] = 0;
  };
  walk(a, n, Array.from({ length: n }, () => 0));
  return out;
}

/** The polynomial of level n with the given terms (exponent vectors of length n). */
export function fromTerms(ctx: ExecutionContext, list: readonly { readonly exps: readonly number[]; readonly c: bigint }[], n: number): RPoly {
  let out = zero(n);
  for (const t of list) {
    ctx.tick();
    let m: RPoly = t.c;
    for (let k = 1; k <= n; k++) m = isZero(m) ? zero(k) : Object.freeze([...Array.from({ length: t.exps[k - 1] }, () => zero(k - 1)), m]);
    out = add(ctx, out, m, n);
  }
  return out;
}

/** a with xⱼ replaced by a rational p/q, scaled by q^(deg_{xⱼ} a) > 0 so it stays integral (signs are kept). */
export function substitute(ctx: ExecutionContext, a: RPoly, n: number, j: number, q: Rational): RPoly {
  const d = Math.max(0, degrees(a, n)[j - 1]);
  const powers = Array.from({ length: d + 1 }, (_, i) => imul(ctx, ipow(ctx, q.numerator, i), ipow(ctx, q.denominator, d - i)));
  return fromTerms(ctx, terms(a, n).map(t => ({ exps: t.exps.map((e, i) => (i === j - 1 ? 0 : e)), c: imul(ctx, t.c, powers[t.exps[j - 1]]) })), n);
}

/** a with its variables renumbered: variable xⱼ of a becomes x_{order[j − 1]} of the result (level m). */
export function permute(ctx: ExecutionContext, a: RPoly, n: number, order: readonly number[], m: number): RPoly {
  return fromTerms(ctx, terms(a, n).map(t => {
    const exps = Array.from({ length: m }, () => 0);
    t.exps.forEach((e, i) => { if (e > 0) { demand(order[i] >= 1, 'invalid-input', 'a dropped variable occurs'); exps[order[i] - 1] = e; } });
    return { exps, c: t.c };
  }), m);
}

/**
 * A sparse rational polynomial as an integer polynomial of level n, scaled by a positive integer (relation signs
 * are kept): variable `vars[i]` of `a` becomes x_{levels[i]} (levels[i] ≥ 1 for every variable that occurs).
 */
export function fromMPoly(ctx: ExecutionContext, a: MPoly, levels: readonly number[], n: number): RPoly {
  let den = 1n;
  for (const c of a.terms.values()) den = iexact(ctx, imul(ctx, den, c.denominator), igcd(ctx, den, c.denominator));
  return fromTerms(ctx, [...a.terms].map(([k, c]) => {
    const exps = Array.from({ length: n }, () => 0);
    k.split(',').map(Number).forEach((e, i) => { if (e > 0) { demand(levels[i] >= 1, 'invalid-input', 'a variable without a level'); exps[levels[i] - 1] = e; } });
    return { exps, c: imul(ctx, c.numerator, iexact(ctx, den, c.denominator)) };
  }), n);
}

/** Σ c·x^e as an expression, with xⱼ named names[j − 1]. */
export function toExpression(store: ExpressionStore, a: RPoly, n: number, names: readonly string[]): ExprId {
  const parts = terms(a, n).map(t => store.mul(store.number(rational(store.ctx, t.c)), ...t.exps.flatMap((e, i) => (e === 0 ? [] : [store.pow(store.symbol(names[i]), store.integer(e))]))));
  return parts.length ? store.add(...parts) : store.integer(0);
}
