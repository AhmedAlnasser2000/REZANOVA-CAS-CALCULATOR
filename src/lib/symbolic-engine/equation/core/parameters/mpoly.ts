import type { ExecutionContext } from '../execution';
import { rAdd, rational, rMultiply, rNegate, type Rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';

/**
 * Sparse multivariate polynomials over ℚ in a fixed, ordered list of named
 * variables (the target first, then the parameters), for the parameters gate.
 * A term is keyed by its exponent vector; zero coefficients are never stored.
 * Expressions convert to a fraction n/d of such polynomials without any
 * cancellation (a denominator that vanishes is a recorded natural-domain
 * condition, never silently divided out).
 */
export interface MPoly { readonly vars: readonly string[]; readonly terms: ReadonlyMap<string, Rational> }

const key = (e: readonly number[]) => e.join(',');
const exps = (k: string) => k.split(',').map(Number);

export function constant(vars: readonly string[], c: Rational): MPoly {
  return { vars, terms: c.numerator === 0n ? new Map() : new Map([[key(vars.map(() => 0)), c]]) };
}
export function variable(ctx: ExecutionContext, vars: readonly string[], name: string): MPoly {
  return { vars, terms: new Map([[key(vars.map(v => (v === name ? 1 : 0))), rational(ctx, 1n)]]) };
}
export const isZero = (a: MPoly) => a.terms.size === 0;

export function add(ctx: ExecutionContext, a: MPoly, b: MPoly): MPoly {
  const t = new Map(a.terms);
  for (const [k, c] of b.terms) {
    ctx.tick();
    const s = t.has(k) ? rAdd(ctx, t.get(k) as Rational, c) : c;
    if (s.numerator === 0n) t.delete(k); else t.set(k, s);
  }
  return { vars: a.vars, terms: t };
}
export function scale(ctx: ExecutionContext, a: MPoly, c: Rational): MPoly {
  if (c.numerator === 0n) return { vars: a.vars, terms: new Map() };
  return { vars: a.vars, terms: new Map([...a.terms].map(([k, v]) => [k, rMultiply(ctx, v, c)])) };
}
export const negate = (ctx: ExecutionContext, a: MPoly) => scale(ctx, a, rational(ctx, -1n));
export const subtract = (ctx: ExecutionContext, a: MPoly, b: MPoly) => add(ctx, a, negate(ctx, b));

export function multiply(ctx: ExecutionContext, a: MPoly, b: MPoly): MPoly {
  const t = new Map<string, Rational>();
  ctx.allocate(a.terms.size * b.terms.size);
  for (const [ka, ca] of a.terms) {
    const ea = exps(ka);
    for (const [kb, cb] of b.terms) {
      ctx.tick();
      const eb = exps(kb), k = key(ea.map((x, i) => x + eb[i]));
      const s = rAdd(ctx, t.get(k) ?? rational(ctx, 0n), rMultiply(ctx, ca, cb));
      if (s.numerator === 0n) t.delete(k); else t.set(k, s);
    }
  }
  return { vars: a.vars, terms: t };
}

export function power(ctx: ExecutionContext, a: MPoly, n: bigint): MPoly {
  let out = constant(a.vars, rational(ctx, 1n)), base = a, e = n;
  while (e > 0n) {
    ctx.tick();
    if (e & 1n) out = multiply(ctx, out, base);
    e >>= 1n;
    if (e > 0n) base = multiply(ctx, base, base);
  }
  return out;
}

/** Degree in the variable at position i. */
export function degreeIn(a: MPoly, i: number): number {
  let d = -1;
  for (const k of a.terms.keys()) d = Math.max(d, exps(k)[i]);
  return d;
}

/** Coefficients of a in the variable at position i (index = power), each a polynomial in the other variables. */
export function coefficientsIn(a: MPoly, i: number): MPoly[] {
  const out: Map<string, Rational>[] = [];
  for (const [k, c] of a.terms) {
    const e = exps(k), d = e[i];
    while (out.length <= d) out.push(new Map());
    out[d].set(key(e.map((x, j) => (j === i ? 0 : x))), c);
  }
  return out.map(terms => ({ vars: a.vars, terms }));
}

/** a with the variable at position i replaced by a rational value. */
export function substitute(ctx: ExecutionContext, a: MPoly, i: number, v: Rational): MPoly {
  const t = new Map<string, Rational>();
  for (const [k, c] of a.terms) {
    ctx.tick();
    const e = exps(k), d = e[i];
    let f = c;
    for (let j = 0; j < d; j++) f = rMultiply(ctx, f, v);
    const nk = key(e.map((x, j) => (j === i ? 0 : x)));
    const s = rAdd(ctx, t.get(nk) ?? rational(ctx, 0n), f);
    if (s.numerator === 0n) t.delete(nk); else t.set(nk, s);
  }
  return { vars: a.vars, terms: t };
}

/** The single rational value of a polynomial without variables (after substitution). */
export function constantValue(ctx: ExecutionContext, a: MPoly): Rational {
  let v = rational(ctx, 0n);
  for (const [k, c] of a.terms) {
    if (exps(k).some(x => x !== 0)) throw new Error('not a constant');
    v = rAdd(ctx, v, c);
  }
  return v;
}

export function toExpression(store: ExpressionStore, a: MPoly): ExprId {
  const terms: ExprId[] = [];
  for (const [k, c] of a.terms) {
    const e = exps(k);
    terms.push(store.mul(store.number(c), ...e.flatMap((d, i) => (d === 0 ? [] : [store.pow(store.symbol(a.vars[i]), store.integer(d))]))));
  }
  return terms.length ? store.add(...terms) : store.integer(0);
}

export interface Fraction { readonly num: MPoly; readonly den: MPoly }

/**
 * An expression as n/d over ℚ[vars] (explicit stack): numbers, the listed
 * symbols, sums, products and integer powers. Anything else (a function, a
 * non-integer power, a constant such as π) gives undefined.
 */
export function fractionOf(store: ExpressionStore, id: ExprId, vars: readonly string[]): Fraction | undefined {
  const ctx = store.ctx, one = constant(vars, rational(ctx, 1n));
  const done = new Map<ExprId, Fraction | undefined>();
  for (const n of store.postorder([id])) {
    ctx.tick();
    const node = store.node(n), get = (c: ExprId) => done.get(c);
    let out: Fraction | undefined;
    switch (node.kind) {
      case 'number': out = { num: constant(vars, node.value), den: one }; break;
      case 'symbol': out = vars.includes(node.name) ? { num: variable(ctx, vars, node.name), den: one } : undefined; break;
      case 'add': {
        const parts = node.args.map(get);
        if (parts.some(p => p === undefined)) break;
        out = (parts as Fraction[]).reduce((x, y) => ({ num: add(ctx, multiply(ctx, x.num, y.den), multiply(ctx, y.num, x.den)), den: multiply(ctx, x.den, y.den) }));
        break;
      }
      case 'mul': {
        const parts = node.args.map(get);
        if (parts.some(p => p === undefined)) break;
        out = (parts as Fraction[]).reduce((x, y) => ({ num: multiply(ctx, x.num, y.num), den: multiply(ctx, x.den, y.den) }));
        break;
      }
      case 'pow': {
        const b = get(node.base), e = store.numberValue(node.exponent);
        if (!b || !e || e.denominator !== 1n) break;
        const k = e.numerator < 0n ? -e.numerator : e.numerator;
        const [p, q] = e.numerator < 0n ? [b.den, b.num] : [b.num, b.den];
        if (isZero(p) && e.numerator < 0n) break;
        out = { num: power(ctx, p, k), den: power(ctx, q, k) };
        break;
      }
      default: out = undefined;
    }
    done.set(n, out);
  }
  return done.get(id);
}

export const minusOne = (ctx: ExecutionContext) => rNegate(ctx, rational(ctx, 1n));

/** a or −a, whichever has a positive coefficient on its lexicographically largest exponent vector. */
export function positiveLead(ctx: ExecutionContext, a: MPoly): MPoly {
  let best: number[] | undefined, c: Rational | undefined;
  for (const [k, v] of a.terms) {
    const e = exps(k);
    const i = best ? e.findIndex((x, j) => x !== (best as number[])[j]) : -1;
    if (!best || (i >= 0 && e[i] > best[i])) { best = e; c = v; }
  }
  return c && c.numerator < 0n ? negate(ctx, a) : a;
}
