import { demand, type ExecutionContext } from '../execution';
import { QQ } from '../algebra/domain';
import { multiplyArrays, PolynomialRing, type Polynomial } from '../algebra/polynomial';
import { exactQuotient } from '../algebra/polynomial-division';
import { gcdQ } from '../algebra/polynomial-gcd';
import { rAdd, rational, rNegate, type Rational } from '../algebra/rational';
import { evaluateExact, type EvaluationDomain, type ExactValue } from '../representation/evaluate';
import { safeCount, type ExprId, type ExpressionStore, type FunctionName } from '../representation/expression';

/**
 * Exact recognition of an expression as a rational function of one target
 * variable x. Number-only subexpressions are coefficients; sums, products
 * and integer powers of x-dependent parts are polynomial arithmetic. Pure
 * rational coefficients use ℚ[x] (Karatsuba, gcd cancellation); anything else
 * keeps coefficients as number-only expressions, evaluated exactly at the end.
 *
 * What this slice does not own is refused with the gate that owns it, never
 * approximated.
 */
export const QX = new PolynomialRing(QQ, 'x');

export const OWNERS = Object.freeze({
  generators: 'EQUATION-GENERATORS1',
  constraints: 'EQUATION-CONSTRAINTS1',
  periodic: 'EQUATION-PERIODIC1',
  parameters: 'EQUATION-PARAMETERS1',
  systems: 'EQUATION-SYSTEMS1',
});

export interface Refusal { readonly owner: string; readonly detail: string }

/** Ascending coefficients: rationals, or number-only expression ids. */
export type CPoly = { readonly kind: 'q'; readonly c: readonly Rational[] } | { readonly kind: 'e'; readonly c: readonly ExprId[] };
export interface RationalForm { readonly num: CPoly; readonly den: CPoly }
export type Recognition =
  | { readonly ok: true; readonly form: RationalForm }
  | { readonly ok: false; readonly refusal: Refusal }
  /** A negative power of an expression that is identically zero: defined nowhere. */
  | { readonly ok: false; readonly undefinedEverywhere: string };

const FUNCTION_OWNER: Readonly<Record<FunctionName, string>> = {
  exp: OWNERS.generators, log: OWNERS.generators, lambertw: OWNERS.generators, lambertwm1: OWNERS.generators, abs: OWNERS.constraints,
  sin: OWNERS.periodic, cos: OWNERS.periodic, tan: OWNERS.periodic, asin: OWNERS.periodic, acos: OWNERS.periodic, atan: OWNERS.periodic,
};

// ---- coefficient polynomial arithmetic ----

class Algebra {
  readonly store: ExpressionStore;
  readonly ctx: ExecutionContext;
  constructor(store: ExpressionStore) { this.store = store; this.ctx = store.ctx; }

  constant(id: ExprId): CPoly {
    const v = this.store.numberValue(id);
    return v ? this.trim({ kind: 'q', c: [v] }) : { kind: 'e', c: [id] };
  }
  q(values: readonly Rational[]): CPoly { return this.trim({ kind: 'q', c: values }); }
  one(): CPoly { return { kind: 'q', c: [rational(this.ctx, 1n)] }; }
  variable(): CPoly { return { kind: 'q', c: [rational(this.ctx, 0n), rational(this.ctx, 1n)] }; }

  trim(p: CPoly): CPoly {
    const c = [...p.c] as (Rational | ExprId)[];
    const zero = (v: Rational | ExprId) => (p.kind === 'q' ? (v as Rational).numerator === 0n : this.store.numberValue(v as ExprId)?.numerator === 0n);
    while (c.length && zero(c[c.length - 1])) c.pop();
    return Object.freeze(p.kind === 'q' ? { kind: 'q', c: Object.freeze(c as Rational[]) } : { kind: 'e', c: Object.freeze(c as ExprId[]) });
  }

  lift(p: CPoly): readonly ExprId[] { return p.kind === 'e' ? p.c : p.c.map(v => this.store.number(v)); }

  add(a: CPoly, b: CPoly): CPoly {
    this.ctx.allocate(Math.max(a.c.length, b.c.length));
    if (a.kind === 'q' && b.kind === 'q') {
      return this.q(Array.from({ length: Math.max(a.c.length, b.c.length) }, (_, i) => (i >= a.c.length ? b.c[i] : i >= b.c.length ? a.c[i] : rAdd(this.ctx, a.c[i], b.c[i]))));
    }
    const x = this.lift(a), y = this.lift(b), s = this.store;
    return this.trim({ kind: 'e', c: Array.from({ length: Math.max(x.length, y.length) }, (_, i) => (i >= x.length ? y[i] : i >= y.length ? x[i] : s.add(x[i], y[i]))) });
  }

  negate(a: CPoly): CPoly {
    return a.kind === 'q' ? this.q(a.c.map(v => rNegate(this.ctx, v))) : this.trim({ kind: 'e', c: a.c.map(v => this.store.neg(v)) });
  }

  multiply(a: CPoly, b: CPoly): CPoly {
    if (a.c.length === 0 || b.c.length === 0) return { kind: 'q', c: [] };
    if (a.kind === 'q' && b.kind === 'q') return this.q(multiplyArrays(QQ, this.ctx, a.c, b.c));
    const x = this.lift(a), y = this.lift(b), s = this.store;
    this.ctx.allocate(x.length + y.length);
    const out: ExprId[][] = Array.from({ length: x.length + y.length - 1 }, () => []);
    for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) out[i + j].push(s.mul(x[i], y[j]));
    return this.trim({ kind: 'e', c: out.map(terms => s.add(...terms)) });
  }

  power(a: CPoly, k: number): CPoly {
    let result = this.one(), base = a, e = k;
    while (e > 0) {
      this.ctx.tick();
      if (e % 2 === 1) result = this.multiply(result, base);
      e = Math.floor(e / 2);
      if (e > 0) base = this.multiply(base, base);
    }
    return result;
  }

  isOne(p: CPoly): boolean { return p.kind === 'q' && p.c.length === 1 && p.c[0].numerator === 1n && p.c[0].denominator === 1n; }

  /** a/b + c/d, cancelling the common factor exactly when everything is rational. */
  sum(f: RationalForm, g: RationalForm): RationalForm {
    if (this.isOne(f.den) && this.isOne(g.den)) return { num: this.add(f.num, g.num), den: f.den };
    return this.reduce({ num: this.add(this.multiply(f.num, g.den), this.multiply(g.num, f.den)), den: this.multiply(f.den, g.den) });
  }

  product(f: RationalForm, g: RationalForm): RationalForm {
    return this.reduce({ num: this.multiply(f.num, g.num), den: this.multiply(f.den, g.den) });
  }

  /** Cancel gcd(num, den) over ℚ, normalizing den to be monic. Value-preserving where den ≠ 0. */
  reduce(f: RationalForm): RationalForm {
    if (f.num.kind !== 'q' || f.den.kind !== 'q' || this.isOne(f.den)) return f;
    const ctx = this.ctx, n = QX.make(ctx, f.num.c), d = QX.make(ctx, f.den.c);
    if (QX.isZero(ctx, n)) return { num: this.q([]), den: this.one() };
    const g = gcdQ(ctx, QX, n, d);
    const nn = exactQuotient(ctx, QX, n, g), dd = exactQuotient(ctx, QX, d, g);
    const lc = QX.leading(ctx, dd);
    return { num: this.q(QX.divideScalar(ctx, nn, lc).coefficients), den: this.q(QX.divideScalar(ctx, dd, lc).coefficients) };
  }
}

/** Recognize `id` as a rational function of `variable` (explicit-stack walk). */
export function rationalForm(store: ExpressionStore, id: ExprId, variable: string): Recognition {
  const alg = new Algebra(store), ctx = store.ctx;
  const forms = new Map<ExprId, RationalForm>(), free = new Map<ExprId, boolean>();
  const refuse = (owner: string, detail: string): Recognition => ({ ok: false, refusal: Object.freeze({ owner, detail }) });
  for (const n of store.postorder([id])) {
    ctx.tick();
    const node = store.node(n);
    if (node.kind === 'symbol') {
      if (node.name !== variable) return refuse(OWNERS.parameters, `symbol ${node.name} is a parameter`);
      free.set(n, false);
      forms.set(n, { num: alg.variable(), den: alg.one() });
      continue;
    }
    const kids = node.kind === 'add' || node.kind === 'mul' ? node.args : node.kind === 'pow' ? [node.base, node.exponent] : node.kind === 'apply' ? [node.arg] : [];
    if (kids.every(k => free.get(k) !== false)) {
      free.set(n, true);
      forms.set(n, { num: alg.constant(n), den: alg.one() });
      continue;
    }
    free.set(n, false);
    const f = (k: ExprId) => forms.get(k) as RationalForm;
    switch (node.kind) {
      case 'add': forms.set(n, node.args.map(f).reduce((a, b) => alg.sum(a, b))); break;
      case 'mul': forms.set(n, node.args.map(f).reduce((a, b) => alg.product(a, b))); break;
      case 'pow': {
        if (free.get(node.exponent) === false) return refuse(OWNERS.generators, 'the variable appears in an exponent');
        const e = store.numberValue(node.exponent);
        if (!e || e.denominator !== 1n) return refuse(OWNERS.constraints, 'a non-integer power of the variable (radical)');
        const k = safeCount(ctx, e.numerator < 0n ? -e.numerator : e.numerator);
        const base = f(node.base);
        if (e.numerator <= 0n && base.num.c.length === 0) return { ok: false, undefinedEverywhere: 'a non-positive power of an expression that is identically zero' };
        const raised = { num: alg.power(base.num, k), den: alg.power(base.den, k) };
        forms.set(n, e.numerator < 0n ? alg.reduce({ num: raised.den, den: raised.num }) : raised);
        break;
      }
      case 'apply': return refuse(FUNCTION_OWNER[node.fn], `${node.fn} of the variable`);
      default: demand(false, 'invalid-input', 'leaf node cannot depend on the variable');
    }
  }
  return { ok: true, form: forms.get(id) as RationalForm };
}

/** The polynomial as a canonical expression Σ cᵢ·xⁱ. */
export function polynomialExpression(store: ExpressionStore, p: CPoly, variable: string): ExprId {
  const alg = new Algebra(store), x = store.symbol(variable);
  // xⁱ only for i ≥ 1: x⁰ is deliberately not simplified and would add the condition x ≠ 0.
  return store.add(...alg.lift(p).map((c, i) => (i === 0 ? c : store.mul(c, store.pow(x, store.integer(i))))));
}

export function multiplyForms(store: ExpressionStore, a: CPoly, b: CPoly): CPoly { return new Algebra(store).multiply(a, b); }

/** A polynomial with exact coefficients: over ℚ, or with algebraic coefficients (trimmed, leading nonzero). */
export type LeafPoly =
  | { readonly kind: 'rational'; readonly poly: Polynomial<Rational> }
  | { readonly kind: 'algebraic'; readonly coefficients: readonly ExactValue[] };

export type ExactPoly =
  | { readonly kind: 'ok'; readonly poly: LeafPoly }
  | { readonly kind: 'undefined'; readonly detail: string }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

/** Evaluate the coefficients exactly in the problem's domain. */
export function exactPolynomial(store: ExpressionStore, p: CPoly, domain: EvaluationDomain): ExactPoly {
  const ctx = store.ctx;
  if (p.kind === 'q') return { kind: 'ok', poly: { kind: 'rational', poly: QX.make(ctx, p.c) } };
  const values: ExactValue[] = [];
  for (const id of p.c) {
    const e = evaluateExact(store, id, domain);
    if (e.kind === 'undefined') return { kind: 'undefined', detail: e.detail };
    if (e.kind === 'not-exact') {
      return { kind: 'refused', refusal: e.reason === 'transcendental'
        ? { owner: OWNERS.parameters, detail: `transcendental coefficient (${e.detail})` }
        : { owner: 'EQUATION-POLYNOMIAL-DECISION1', detail: `coefficient not evaluated exactly yet: ${e.detail}` } };
    }
    values.push(e.value);
  }
  while (values.length && values[values.length - 1].kind === 'rational' && (values[values.length - 1] as { value: Rational }).value.numerator === 0n) values.pop();
  if (values.every(v => v.kind === 'rational')) {
    return { kind: 'ok', poly: { kind: 'rational', poly: QX.make(ctx, values.map(v => (v as { value: Rational }).value)) } };
  }
  return { kind: 'ok', poly: { kind: 'algebraic', coefficients: Object.freeze(values) } };
}
