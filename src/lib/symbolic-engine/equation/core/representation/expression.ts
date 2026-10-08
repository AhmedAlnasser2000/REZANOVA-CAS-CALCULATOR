import { demand, type ExecutionContext } from '../execution';
import { igcd, ipow, iroot, perfectPower } from '../algebra/integer';
import {
  assertRational, rAdd, rational, rFromInteger, rMultiply, rSubtract, type IntegerInput, type Rational,
} from '../algebra/rational';
import type { Polynomial } from '../algebra/polynomial';
import type { RootOf } from '../algebraic/root-of';
import { sha256 } from './digest';
import { RootCatalog } from './root-identity';

/**
 * Hash-consed expression graph of the private Equation core.
 *
 * Every node is interned, so structurally equal expressions are one id and
 * shared subexpressions cost memory once. Builders canonicalize, but only in
 * ways that preserve both value and natural domain:
 * - nested sums and products are flattened and commutative arguments are
 *   ordered by store-independent SHA-256 digests;
 * - pure-number arithmetic is folded exactly (rationals, powers of i,
 *   special values such as exp(0) and |−3|);
 * - numeric coefficients of identical terms are merged, and integer
 *   exponents of identical bases are merged only when they share a sign,
 *   or for any signs when the base is a nonzero constant (so ln 8/ln 2 = 3);
 * - number-only logarithms are canonical: log q = m·log r for rational q > 0
 *   with r > 1 not a perfect power, log(q^c) = c·log q, exp(c·log q) = q^c
 *   and log(exp c) = c for real constants c;
 * - trig: a π-multiple term of a sin/cos/tan argument is reduced by whole
 *   periods (sin(x + 2π) = sin x), the classic special angles (multiples of
 *   π/6 and π/4) are exact, and asin/acos/atan at ±1/2, ±1, 0 are q·π;
 * - a zero coefficient drops a term only when that term is defined
 *   everywhere ("total"); otherwise 0·t stays, keeping t's domain.
 * Nothing cancels: x/x, x⁰, log(eˣ) and √(x²) stay as written. Every
 * domain-sensitive rewrite belongs to a recorded transform.
 *
 * Semantics: `pow` with a rational non-integer exponent p/q means the real
 * root (odd q allows a negative base) in a real problem and the principal
 * value in a complex problem. `log` is the natural logarithm. The constant
 * e is stored as exp(1). Traversals use explicit stacks: depth and size cost
 * only budget.
 */
export type ExprId = number & { readonly __equationExpression: unique symbol };

export const CONSTANT_NAMES = ['pi', 'e', 'i'] as const;
export type ConstantName = (typeof CONSTANT_NAMES)[number];
/** `lambertw` is the principal branch W₀; `lambertwm1` is the real branch W₋₁. */
export const FUNCTION_NAMES = ['exp', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'abs', 'lambertw', 'lambertwm1'] as const;
export type FunctionName = (typeof FUNCTION_NAMES)[number];

export type ExpressionNode =
  | { readonly kind: 'number'; readonly value: Rational }
  | { readonly kind: 'symbol'; readonly name: string }
  | { readonly kind: 'constant'; readonly name: Exclude<ConstantName, 'e'> }
  | { readonly kind: 'algebraic'; readonly root: RootOf; readonly poly: Polynomial<bigint>; readonly index: number }
  | { readonly kind: 'add'; readonly args: readonly ExprId[] }
  | { readonly kind: 'mul'; readonly args: readonly ExprId[] }
  | { readonly kind: 'pow'; readonly base: ExprId; readonly exponent: ExprId }
  | { readonly kind: 'apply'; readonly fn: FunctionName; readonly arg: ExprId }
  /**
   * The unique real zero of `expr` (written in the bound variable ISOLATED_VARIABLE) with lo < zero < hi, where
   * `expr` is defined and strictly monotone on [lo, hi] and has sign `loSign` just above lo
   * (EQUATION-CERTIFIED-NUMERICS1). A leaf: its bound variable is not a free symbol.
   */
  | { readonly kind: 'isolated'; readonly expr: ExprId; readonly lo: Rational; readonly hi: Rational; readonly loSign: 1 | -1 }
  /**
   * Coordinate `index` of the unique real solution of the square system `system` (written in the bound
   * variables pointVariable(0…n−1)) in the box `box`, where every equation is defined and continuously
   * differentiable and the Krawczyk test proves exactly one solution (EQUATION-CERTIFIED-NUMERICS1 PR B).
   * A leaf like `isolated`; the coordinates of one solution share their system and box.
   */
  | { readonly kind: 'isolated-point'; readonly system: readonly ExprId[]; readonly box: readonly PointBound[]; readonly index: number };

/** One coordinate's rational bounds in a point's box. */
export interface PointBound { readonly lo: Rational; readonly hi: Rational }

/** The bound variable of isolated zeros (users cannot name it: rows accept Latin letters only). */
export const ISOLATED_VARIABLE = 'ξ';

/** The bound variables of isolated points: ξ1, ξ2, … */
export const pointVariable = (i: number): string => `${ISOLATED_VARIABLE}${i + 1}`;

interface Entry {
  readonly node: ExpressionNode;
  readonly digest: string;
  /** Tree size (repeated subtrees counted each time): an exact progress measure. */
  readonly size: bigint;
  readonly height: number;
  /** Defined, finite and real for every assignment of its symbols, in ℝ and in ℂ. */
  readonly total: boolean;
  /** A number-only expression that is real by construction (conservative). */
  readonly real: boolean;
}

const SYMBOL_NAME = /^\p{L}[\p{L}\p{N}_]*$/u;
const TOTAL_FUNCTIONS: ReadonlySet<FunctionName> = new Set(['exp', 'sin', 'cos', 'abs']);
/** Largest chunk handed to a single allocation charge. */
const ALLOCATION_CHUNK = 2n ** 52n;

/**
 * A nonnegative count that sizes later work, as a number. A count beyond the
 * safe-integer range would need more units than any budget holds, so it is
 * charged as allocation, which stops with the typed `allocation` stop.
 */
export function safeCount(ctx: ExecutionContext, n: bigint): number {
  demand(n >= 0n, 'invalid-input', 'negative count');
  if (n <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(n);
  for (let left = n; left > 0n; left -= ALLOCATION_CHUNK) ctx.allocate(Number(left < ALLOCATION_CHUNK ? left : ALLOCATION_CHUNK));
  return demand(false, 'invalid-input', 'count beyond any budget') as never;
}

export function isSymbolName(name: unknown): name is string { return typeof name === 'string' && SYMBOL_NAME.test(name); }

export function childrenOf(node: ExpressionNode): readonly ExprId[] {
  switch (node.kind) {
    case 'add': case 'mul': return node.args;
    case 'pow': return [node.base, node.exponent];
    case 'apply': return [node.arg];
    default: return [];
  }
}

export class ExpressionStore {
  readonly ctx: ExecutionContext;
  readonly roots = new RootCatalog();
  readonly #entries: Entry[] = [];
  readonly #intern = new Map<string, ExprId>();

  constructor(ctx: ExecutionContext) {
    this.ctx = ctx;
    Object.freeze(this);
  }

  get count(): number { return this.#entries.length; }

  has(id: unknown): id is ExprId { return typeof id === 'number' && Number.isSafeInteger(id) && id >= 0 && id < this.#entries.length; }

  #entry(id: ExprId): Entry {
    demand(this.has(id), 'domain-mismatch', 'expression from another store');
    return this.#entries[id];
  }

  node(id: ExprId): ExpressionNode { return this.#entry(id).node; }
  digest(id: ExprId): string { return this.#entry(id).digest; }
  size(id: ExprId): bigint { return this.#entry(id).size; }
  height(id: ExprId): number { return this.#entry(id).height; }
  isTotal(id: ExprId): boolean { return this.#entry(id).total; }
  /** Number-only and real by construction (conservative: false means unknown). */
  isRealConstant(id: ExprId): boolean { return this.#entry(id).real; }

  /** Canonical, store-independent order. Equal digests of distinct nodes would be a SHA-256 collision. */
  compare(a: ExprId, b: ExprId): -1 | 0 | 1 {
    if (a === b) return 0;
    const da = this.digest(a), db = this.digest(b);
    demand(da !== db, 'verification-failed', 'expression digest collision');
    return da < db ? -1 : 1;
  }

  #realByConstruction(node: ExpressionNode): boolean {
    const real = (c: ExprId) => this.#entries[c].real;
    const positiveNumber = (c: ExprId) => { const n = this.#entries[c].node; return n.kind === 'number' && n.value.numerator > 0n; };
    switch (node.kind) {
      case 'number': return true;
      case 'symbol': return false;
      case 'constant': return node.name === 'pi';
      case 'algebraic': return node.root.kind === 'real';
      case 'isolated': case 'isolated-point': return true;
      case 'add': case 'mul': return node.args.every(real);
      case 'pow': {
        const e = this.#entries[node.exponent].node;
        const positiveInteger = e.kind === 'number' && e.value.denominator === 1n && e.value.numerator > 0n;
        // Real and defined: a positive integer power of a real constant, or any real power of a positive one.
        return real(node.base) && real(node.exponent) && (positiveInteger || positiveNumber(node.base) || this.#isPositiveConstant(node.base));
      }
      case 'apply':
        if (!real(node.arg)) return false;
        if (node.fn === 'exp' || node.fn === 'sin' || node.fn === 'cos' || node.fn === 'atan' || node.fn === 'abs') return true;
        if (node.fn === 'log') return positiveNumber(node.arg) || this.#isPositiveConstant(node.arg);
        if (node.fn === 'asin' || node.fn === 'acos') {
          // Defined for a rational argument in [−1, 1].
          const n = this.#entries[node.arg].node;
          return n.kind === 'number' && (n.value.numerator < 0n ? -n.value.numerator : n.value.numerator) <= n.value.denominator;
        }
        return false;
    }
  }

  /** Positive by construction: π, exp(real), positive numbers and real algebraic numbers known positive, products and powers of these. */
  #isPositiveConstant(id: ExprId): boolean {
    const n = this.#entries[id].node;
    if (n.kind === 'number') return n.value.numerator > 0n;
    if (n.kind === 'constant') return n.name === 'pi';
    if (n.kind === 'apply') {
      if (n.fn === 'exp') return this.#entries[n.arg].real;
      // log q > 0 for a rational q > 1.
      const q = n.fn === 'log' ? this.numberValue(n.arg) : undefined;
      return q !== undefined && q.numerator > q.denominator;
    }
    if (n.kind === 'mul') return n.args.every(a => this.#isPositiveConstant(a));
    if (n.kind === 'pow') return this.#isPositiveConstant(n.base) && this.#entries[n.exponent].real;
    return false;
  }

  /** Never zero wherever defined: nonzero constants, and exp of anything. */
  #knownNonzero(id: ExprId): boolean {
    const n = this.#entries[id].node;
    if (n.kind === 'apply' && n.fn === 'exp') return true;
    if (n.kind === 'constant' || n.kind === 'algebraic') return true;
    if (n.kind === 'apply' && n.fn === 'log') {
      const v = this.numberValue(n.arg);
      return v !== undefined && !(v.numerator === v.denominator);
    }
    return this.#isPositiveConstant(id);
  }

  numberValue(id: ExprId): Rational | undefined {
    const n = this.node(id);
    return n.kind === 'number' ? n.value : undefined;
  }

  #make(key: string, node: ExpressionNode, digestText: string, children: readonly ExprId[], total: boolean): ExprId {
    const ctx = this.ctx;
    ctx.tick();
    const existing = this.#intern.get(key);
    if (existing !== undefined) return existing;
    ctx.allocate(4 + children.length);
    let size = 1n, height = 0;
    for (const c of children) {
      const e = this.#entries[c];
      size += e.size;
      if (e.height > height) height = e.height;
    }
    const id = this.#entries.length as ExprId;
    const real = this.#realByConstruction(node);
    // A number-only expression that is real by construction is defined, hence total.
    this.#entries.push(Object.freeze({ node: Object.freeze(node), digest: sha256(ctx, digestText), size, height: height + 1, total: total || real, real }));
    this.#intern.set(key, id);
    return id;
  }

  // ---- leaves ----

  number(value: Rational): ExprId {
    assertRational(this.ctx, value);
    const text = `${value.numerator}/${value.denominator}`;
    return this.#make(`n:${text}`, { kind: 'number', value }, `n|${text}`, [], true);
  }

  integer(value: IntegerInput): ExprId { return this.number(rational(this.ctx, value)); }
  fraction(numerator: IntegerInput, denominator: IntegerInput): ExprId { return this.number(rational(this.ctx, numerator, denominator)); }

  symbol(name: string): ExprId {
    demand(isSymbolName(name), 'invalid-input', 'invalid symbol name');
    this.ctx.charge(name.length / 16, name.length / 16);
    return this.#make(`s:${name}`, { kind: 'symbol', name }, `s|${name}`, [], true);
  }

  constant(name: ConstantName): ExprId {
    demand((CONSTANT_NAMES as readonly string[]).includes(name), 'invalid-input', 'unknown constant');
    if (name === 'e') return this.exp(this.integer(1));
    return this.#make(`c:${name}`, { kind: 'constant', name }, `c|${name}`, [], name === 'pi');
  }

  /** An algebraic number, stored by canonical identity; rational roots become numbers. */
  algebraic(root: RootOf): ExprId {
    const canonical = this.roots.canonical(this.ctx, root);
    const c = canonical.poly.coefficients;
    if (c.length === 2) return this.number(rational(this.ctx, -c[0], c[1]));
    return this.#make(`r:${canonical.key}`, { kind: 'algebraic', root: canonical.root, poly: canonical.poly, index: canonical.index },
      `r|${canonical.key}`, [], canonical.root.kind === 'real');
  }

  /**
   * An isolated real zero of `f` in `variable` (see the node). The certificate is checked by its producers and
   * verifiers, not here; the same zero from any variable name is one node.
   */
  isolated(f: ExprId, variable: string, lo: Rational, hi: Rational, loSign: 1 | -1): ExprId {
    assertRational(this.ctx, lo); assertRational(this.ctx, hi);
    demand(lo.numerator * hi.denominator < hi.numerator * lo.denominator, 'invalid-input', 'an isolating interval needs lo < hi');
    const expr = variable === ISOLATED_VARIABLE ? f : this.substitute(f, new Map([[variable, this.symbol(ISOLATED_VARIABLE)]]));
    demand(this.freeSymbols(expr).every(s => s === ISOLATED_VARIABLE), 'invalid-input', 'an isolated zero has one variable');
    const text = `${this.digest(expr)}|${lo.numerator}/${lo.denominator}|${hi.numerator}/${hi.denominator}|${loSign}`;
    return this.#make(`i:${text}`, { kind: 'isolated', expr, lo, hi, loSign }, `i|${text}`, [], true);
  }

  /**
   * Coordinate `index` of the solution of `system` (in `variables`) in `box` (see the node). The certificate is
   * checked by its producers and verifiers, not here.
   */
  isolatedPoint(system: readonly ExprId[], variables: readonly string[], box: readonly PointBound[], index: number): ExprId {
    const n = variables.length;
    demand(n >= 2 && system.length === n && box.length === n && Number.isInteger(index) && index >= 0 && index < n, 'invalid-input', 'an isolated point needs a square system');
    for (const b of box) {
      assertRational(this.ctx, b.lo); assertRational(this.ctx, b.hi);
      demand(b.lo.numerator * b.hi.denominator < b.hi.numerator * b.lo.denominator, 'invalid-input', 'a point box needs lo < hi');
    }
    const bound = new Map(variables.map((v, i) => [v, this.symbol(pointVariable(i))] as const));
    const exprs = system.map(f => this.substitute(f, bound)), names = variables.map((_, i) => pointVariable(i));
    demand(exprs.every(e => this.freeSymbols(e).every(s => names.includes(s))), 'invalid-input', 'an isolated point has only its own variables');
    const text = `${exprs.map(e => this.digest(e)).join(',')}|${box.map(b => `${b.lo.numerator}/${b.lo.denominator}:${b.hi.numerator}/${b.hi.denominator}`).join(',')}|${index}`;
    return this.#make(`p:${text}`, { kind: 'isolated-point', system: Object.freeze([...exprs]), box: Object.freeze(box.map(b => Object.freeze({ lo: b.lo, hi: b.hi }))), index }, `p|${text}`, [], true);
  }

  /** The system of an isolated point, in `variables`. */
  isolatedPointSystem(id: ExprId, variables: readonly string[]): ExprId[] {
    const n = this.node(id);
    demand(n.kind === 'isolated-point', 'invalid-input', 'not an isolated point');
    const node = n as Extract<ExpressionNode, { kind: 'isolated-point' }>;
    const map = new Map(variables.map((v, i) => [pointVariable(i), this.symbol(v)] as const));
    return node.system.map(e => this.substitute(e, map));
  }

  /** The function of an isolated zero, in `variable`. */
  isolatedIn(id: ExprId, variable: string): ExprId {
    const n = this.node(id);
    demand(n.kind === 'isolated', 'invalid-input', 'not an isolated zero');
    return this.substitute((n as { expr: ExprId }).expr, new Map([[ISOLATED_VARIABLE, this.symbol(variable)]]));
  }

  // ---- sums ----

  add(...args: ExprId[]): ExprId {
    const ctx = this.ctx;
    ctx.allocate(args.length);
    const flat: ExprId[] = [];
    for (const a of args) {
      const n = this.node(a);
      if (n.kind === 'add') flat.push(...n.args); else flat.push(a);
    }
    let constant = rational(ctx, 0n);
    const coefficients = new Map<ExprId, Rational>();
    for (const t of flat) {
      ctx.tick();
      const v = this.numberValue(t);
      if (v) { constant = rAdd(ctx, constant, v); continue; }
      const { coefficient, rest } = this.#splitCoefficient(t);
      const prior = coefficients.get(rest);
      coefficients.set(rest, prior ? rAdd(ctx, prior, coefficient) : coefficient);
    }
    const terms: ExprId[] = [];
    for (const [rest, coefficient] of coefficients) {
      if (coefficient.numerator === 0n && this.isTotal(rest)) continue;
      terms.push(coefficient.numerator === 1n && coefficient.denominator === 1n ? rest : this.#scaled(coefficient, rest));
    }
    if (terms.length === 0) return this.number(constant);
    if (constant.numerator === 0n && terms.length === 1) return terms[0];
    terms.sort((a, b) => this.compare(a, b));
    if (constant.numerator !== 0n) terms.unshift(this.number(constant));
    return this.#make(`+:${terms.join(',')}`, { kind: 'add', args: Object.freeze(terms) },
      `+|${terms.map(t => this.digest(t)).join('|')}`, terms, terms.every(t => this.isTotal(t)));
  }

  neg(a: ExprId): ExprId { return this.mul(this.integer(-1), a); }
  sub(a: ExprId, b: ExprId): ExprId { return this.add(a, this.neg(b)); }

  /** Numeric coefficient and the remaining (already canonical) product. */
  #splitCoefficient(t: ExprId): { coefficient: Rational; rest: ExprId } {
    const n = this.node(t);
    if (n.kind === 'mul') {
      const c = this.numberValue(n.args[0]);
      if (c) {
        const rest = n.args.slice(1);
        return { coefficient: c, rest: rest.length === 1 ? rest[0] : this.#product(rest) };
      }
    }
    return { coefficient: rational(this.ctx, 1n), rest: t };
  }

  /** c·t for a canonical non-numeric product or factor t. */
  #scaled(c: Rational, t: ExprId): ExprId {
    const n = this.node(t);
    return this.#product([this.number(c), ...(n.kind === 'mul' ? n.args : [t])]);
  }

  /** Intern an already canonical argument list (numeric coefficient first, rest in canonical order). */
  #product(args: readonly ExprId[]): ExprId {
    const frozen = Object.freeze([...args]);
    const c = this.numberValue(frozen[0]);
    const total = frozen.every(a => this.isTotal(a)) && !(c && c.numerator === 0n);
    return this.#make(`*:${frozen.join(',')}`, { kind: 'mul', args: frozen }, `*|${frozen.map(a => this.digest(a)).join('|')}`, frozen, total);
  }

  // ---- products ----

  mul(...args: ExprId[]): ExprId {
    const ctx = this.ctx;
    ctx.allocate(args.length);
    let flat: ExprId[] = [];
    for (const a of args) {
      const n = this.node(a);
      if (n.kind === 'mul') flat.push(...n.args); else flat.push(a);
    }
    // exp(a)·exp(b) = exp(a + b): same value, and exp is defined wherever its argument is.
    const isExp = (f: ExprId) => { const n = this.node(f); return n.kind === 'apply' && n.fn === 'exp'; };
    const exps = flat.filter(isExp);
    if (exps.length >= 2) {
      const combined = this.exp(this.add(...exps.map(f => (this.node(f) as { arg: ExprId }).arg)));
      const c = this.node(combined);
      flat = [...flat.filter(f => !isExp(f)), ...(c.kind === 'mul' ? c.args : [combined])];
    }
    let coefficient = rational(ctx, 1n);
    let iPower = 0n;
    const groups = new Map<ExprId, { positive: bigint; negative: bigint }>();
    for (const f of flat) {
      ctx.tick();
      const v = this.numberValue(f);
      if (v) { coefficient = rMultiply(ctx, coefficient, v); continue; }
      const { base, exponent } = this.#integerPower(f);
      if (this.#isConstant(base, 'i')) { iPower += exponent; continue; }
      const g = groups.get(base) ?? { positive: 0n, negative: 0n };
      if (exponent > 0n) g.positive += exponent; else g.negative += exponent;
      groups.set(base, g);
    }
    const factors: ExprId[] = [];
    const residue = ((iPower % 4n) + 4n) % 4n;
    if (residue >= 2n) coefficient = rMultiply(ctx, coefficient, rational(ctx, -1n));
    if (residue % 2n === 1n) factors.push(this.constant('i'));
    for (const [base, { positive, negative }] of groups) {
      // A base that is never zero has the same domain at every integer exponent: merge across signs.
      const merged = this.#knownNonzero(base) ? [positive + negative] : [positive, negative];
      for (const e of merged) {
        if (e === 0n) continue;
        const f = e === 1n ? base : this.pow(base, this.integer(e));
        const v = this.numberValue(f);
        if (v) coefficient = rMultiply(ctx, coefficient, v); else factors.push(f);
      }
    }
    if (coefficient.numerator === 0n && factors.every(f => this.isTotal(f))) return this.number(coefficient);
    if (factors.length === 0) return this.number(coefficient);
    const unit = coefficient.numerator === 1n && coefficient.denominator === 1n;
    if (unit && factors.length === 1) return factors[0];
    factors.sort((a, b) => this.compare(a, b));
    return this.#product(unit ? factors : [this.number(coefficient), ...factors]);
  }

  div(a: ExprId, b: ExprId): ExprId { return this.mul(a, this.pow(b, this.integer(-1))); }

  #isConstant(id: ExprId, name: string): boolean {
    const n = this.node(id);
    return n.kind === 'constant' && n.name === name;
  }

  /** f = base^exponent with an integer exponent (1 when f is not an integer power). */
  #integerPower(f: ExprId): { base: ExprId; exponent: bigint } {
    const n = this.node(f);
    if (n.kind === 'pow') {
      const e = this.numberValue(n.exponent);
      if (e && e.denominator === 1n && e.numerator !== 0n) return { base: n.base, exponent: e.numerator };
    }
    return { base: f, exponent: 1n };
  }

  // ---- powers ----

  pow(base: ExprId, exponent: ExprId): ExprId {
    const ctx = this.ctx;
    ctx.tick();
    const b = this.node(base), e = this.numberValue(exponent);
    const integerExponent = e && e.denominator === 1n ? e.numerator : undefined;
    if (integerExponent === 1n) return base;
    // exp(u)^w = exp(w·u) when w is an integer, or when u is a real number (Log(exp u) = u).
    if (b.kind === 'apply' && b.fn === 'exp' && (integerExponent !== undefined || this.numberValue(b.arg))) return this.exp(this.mul(exponent, b.arg));
    if (integerExponent !== undefined) {
      if (b.kind === 'number' && (b.value.numerator !== 0n || integerExponent > 0n)) return this.number(this.#rationalPower(b.value, integerExponent));
      if (b.kind === 'constant' && b.name === 'i') {
        const r = ((integerExponent % 4n) + 4n) % 4n;
        return r === 0n ? this.integer(1) : r === 1n ? base : r === 2n ? this.integer(-1) : this.neg(base);
      }
      // (c·A)ⁿ = cⁿ·Aⁿ for a nonzero number c and integer n: same value, and the same domain (A ≠ 0 ⇔ c·A ≠ 0).
      if (b.kind === 'mul') {
        const c = this.numberValue(b.args[0]);
        if (c && c.numerator !== 0n && b.args.length > 1) {
          const rest = b.args.length === 2 ? b.args[1] : this.#product(b.args.slice(1));
          return this.mul(this.number(this.#rationalPower(c, integerExponent)), this.pow(rest, exponent));
        }
      }
      // (A·B…)ⁿ = Aⁿ·Bⁿ… for never-zero constant factors (π, i, exp(·), …): same value, defined everywhere.
      if (b.kind === 'mul' && b.args.every(a => this.#knownNonzero(a) && this.freeSymbols(a).length === 0)) return this.mul(...b.args.map(a => this.pow(a, exponent)));
      // (xᵃ)ⁿ = x^(a·n) for integers a, n when a > 0, or a < 0 < n, or x is never zero: same value and domain.
      if (b.kind === 'pow') {
        const a = this.numberValue(b.exponent);
        if (a && a.denominator === 1n && a.numerator !== 0n && (a.numerator > 0n || integerExponent > 0n || this.#knownNonzero(b.base))) {
          return this.pow(b.base, this.integer(a.numerator * integerExponent));
        }
      }
    }
    // (c·A)^r = c^r·A^r for a positive number c and rational r: same value (real root or principal) and domain.
    if (e && e.denominator > 1n && b.kind === 'mul') {
      const c = this.numberValue(b.args[0]);
      if (c && c.numerator > 0n && b.args.length > 1) {
        const rest = b.args.length === 2 ? b.args[1] : this.#product(b.args.slice(1));
        return this.mul(this.pow(b.args[0], exponent), this.pow(rest, exponent));
      }
    }
    // (A^p)^r = A^(p·r) for a positive constant A, real p and rational r: same value, defined everywhere.
    if (e && b.kind === 'pow' && this.#isPositiveConstant(b.base) && this.numberValue(b.exponent)) {
      return this.pow(b.base, this.number(rMultiply(ctx, this.numberValue(b.exponent) as Rational, e)));
    }
    // q^(m/k) for a positive rational q that is a perfect k-th power: exact.
    if (b.kind === 'number' && b.value.numerator > 0n && e && e.denominator > 1n && e.denominator <= BigInt(Number.MAX_SAFE_INTEGER)) {
      const k = Number(e.denominator), rn = iroot(ctx, b.value.numerator, k), rd = iroot(ctx, b.value.denominator, k);
      if (ipow(ctx, rn, k) === b.value.numerator && ipow(ctx, rd, k) === b.value.denominator) {
        return this.pow(this.number(rational(ctx, rn, rd)), this.number(rational(ctx, e.numerator)));
      }
    }
    const positiveBase = (b.kind === 'number' && b.value.numerator > 0n) || (b.kind === 'constant' && b.name === 'pi');
    const total = (integerExponent !== undefined && integerExponent > 0n && this.isTotal(base)) || (positiveBase && this.isTotal(exponent));
    return this.#make(`^:${base},${exponent}`, { kind: 'pow', base, exponent }, `^|${this.digest(base)}|${this.digest(exponent)}`, [base, exponent], total);
  }

  #rationalPower(r: Rational, n: bigint): Rational {
    const ctx = this.ctx;
    const magnitude = n < 0n ? -n : n;
    if (r.denominator === 1n && (r.numerator === 1n || r.numerator === 0n)) return r;
    if (r.denominator === 1n && r.numerator === -1n) return magnitude % 2n === 0n ? rFromInteger(ctx, 1n) : r;
    // |r| ≥ 2 here, so the result needs more than `magnitude` bits.
    const k = safeCount(ctx, magnitude);
    const num = ipow(ctx, r.numerator, k), den = ipow(ctx, r.denominator, k);
    return n < 0n ? rational(ctx, den, num) : rational(ctx, num, den);
  }

  sqrt(a: ExprId): ExprId { return this.pow(a, this.fraction(1, 2)); }

  root(a: ExprId, index: IntegerInput): ExprId {
    const n = rational(this.ctx, index);
    demand(n.numerator >= 2n, 'invalid-input', 'root index must be an integer ≥ 2');
    return this.pow(a, this.number(rational(this.ctx, 1n, n.numerator)));
  }

  // ---- functions ----

  apply(fn: FunctionName, arg: ExprId): ExprId {
    demand((FUNCTION_NAMES as readonly string[]).includes(fn), 'invalid-input', 'unknown function');
    const v = this.numberValue(arg);
    if (v) {
      const zero = v.numerator === 0n, one = v.numerator === 1n && v.denominator === 1n;
      if (fn === 'abs') return this.number(v.numerator < 0n ? rational(this.ctx, -v.numerator, v.denominator) : v);
      if (zero && (fn === 'exp' || fn === 'cos')) return this.integer(1);
      if (zero && (fn === 'sin' || fn === 'tan' || fn === 'asin' || fn === 'atan')) return this.integer(0);
      if (one && (fn === 'log' || fn === 'acos')) return this.integer(0);
    }
    if (fn === 'abs' && this.node(arg).kind === 'apply' && (this.node(arg) as { fn: FunctionName }).fn === 'abs') return arg;
    if ((fn === 'lambertw') && v?.numerator === 0n) return this.integer(0);
    if (fn === 'lambertw' || fn === 'lambertwm1') {
      // W(s·e^s) = s for rational s on the matching branch (s ≥ −1 for W₀, s ≤ −1 for W₋₁).
      const { coefficient, rest } = this.#splitCoefficient(arg);
      const r = this.node(rest);
      const s = r.kind === 'apply' && r.fn === 'exp' ? this.numberValue(r.arg) : undefined;
      if (s && s.numerator === coefficient.numerator && s.denominator === coefficient.denominator) {
        const atLeastMinusOne = s.numerator + s.denominator >= 0n; // s ≥ −1 with a positive denominator
        const atMostMinusOne = s.numerator + s.denominator <= 0n;
        if ((fn === 'lambertw' && atLeastMinusOne) || (fn === 'lambertwm1' && atMostMinusOne)) return this.number(s);
      }
    }
    if (fn === 'log') { const folded = this.#foldLog(arg); if (folded !== undefined) return folded; }
    if (fn === 'exp') { const folded = this.#foldExp(arg); if (folded !== undefined) return folded; }
    if (v && (fn === 'asin' || fn === 'acos' || fn === 'atan')) { const folded = this.#arcSpecial(fn, v); if (folded !== undefined) return folded; }
    if (fn === 'sin' || fn === 'cos' || fn === 'tan') { const folded = this.#foldTrig(fn, arg); if (folded !== undefined) return folded; }
    return this.#make(`f:${fn}:${arg}`, { kind: 'apply', fn, arg }, `f|${fn}|${this.digest(arg)}`, [arg],
      TOTAL_FUNCTIONS.has(fn) && this.isTotal(arg));
  }

  /** c when id is c·π (or π itself). */
  #piCoefficient(id: ExprId): Rational | undefined {
    const n = this.node(id);
    if (n.kind === 'constant' && n.name === 'pi') return rational(this.ctx, 1n);
    if (n.kind === 'mul' && n.args.length === 2) {
      const c = this.numberValue(n.args[0]), r = this.node(n.args[1]);
      if (c && r.kind === 'constant' && r.name === 'pi') return c;
    }
    return undefined;
  }

  /** c reduced by whole periods into (−p/2, p/2]. */
  #reduceModulo(c: Rational, p: bigint): Rational {
    const ctx = this.ctx, den = c.denominator, P = p * den;
    let num = ((c.numerator % P) + P) % P; // [0, p)
    if (2n * num > P) num -= P;
    return rational(ctx, num, den);
  }

  /** sin(qπ) for q ∈ (−1, 1] at the classic special angles (multiples of π/6 and π/4); undefined elsewhere. */
  #sinSpecial(q: Rational): ExprId | undefined {
    const ctx = this.ctx, sign = q.numerator < 0n ? -1n : 1n;
    let a = rational(ctx, sign * q.numerator, q.denominator);
    if (2n * a.numerator > a.denominator) a = rational(ctx, a.denominator - a.numerator, a.denominator); // sin(π − x) = sin x
    const key = `${a.numerator}/${a.denominator}`;
    const half = this.number(rational(ctx, 1n, 2n));
    const table: Record<string, () => ExprId> = {
      '0/1': () => this.integer(0), '1/6': () => half, '1/4': () => this.mul(half, this.sqrt(this.integer(2))),
      '1/3': () => this.mul(half, this.sqrt(this.integer(3))), '1/2': () => this.integer(1),
    };
    const value = table[key]?.();
    return value === undefined ? undefined : sign < 0n ? this.neg(value) : value;
  }

  /**
   * sin/cos/tan: a π-multiple term of the argument is reduced by whole periods
   * (2π, or π for tan), and the classic special angles are exact. Value- and
   * domain-preserving over ℝ and ℂ.
   */
  #foldTrig(fn: 'sin' | 'cos' | 'tan', arg: ExprId): ExprId | undefined {
    const ctx = this.ctx, n = this.node(arg);
    const terms = n.kind === 'add' ? n.args : [arg];
    const j = terms.findIndex(t => this.#piCoefficient(t) !== undefined);
    if (j < 0) return undefined;
    const c = this.#piCoefficient(terms[j]) as Rational, reduced = this.#reduceModulo(c, fn === 'tan' ? 1n : 2n);
    if (terms.length === 1) {
      if (fn === 'sin') { const v = this.#sinSpecial(reduced); if (v !== undefined) return v; }
      if (fn === 'cos') { const v = this.#sinSpecial(this.#reduceModulo(rSubtract(ctx, rational(ctx, 1n, 2n), reduced), 2n)); if (v !== undefined) return v; }
      if (fn === 'tan' && 2n * reduced.numerator !== reduced.denominator) {
        const s = this.#sinSpecial(reduced), co = this.#sinSpecial(this.#reduceModulo(rSubtract(ctx, rational(ctx, 1n, 2n), reduced), 2n));
        if (s !== undefined && co !== undefined) return this.div(s, co);
      }
    }
    if (reduced.numerator === c.numerator && reduced.denominator === c.denominator) return undefined;
    const others = terms.filter((_, i) => i !== j);
    const piTerm = reduced.numerator === 0n ? [] : [this.mul(this.number(reduced), this.constant('pi'))];
    return this.apply(fn, others.length || piTerm.length ? this.add(...others, ...piTerm) : this.integer(0));
  }

  /** asin, acos, atan at the rational special values (±1/2, ±1, 0). */
  #arcSpecial(fn: 'asin' | 'acos' | 'atan', v: Rational): ExprId | undefined {
    const ctx = this.ctx, key = `${v.numerator}/${v.denominator}`;
    const asin: Record<string, [bigint, bigint]> = { '1/2': [1n, 6n], '-1/2': [-1n, 6n], '1/1': [1n, 2n], '-1/1': [-1n, 2n] };
    const acos: Record<string, [bigint, bigint]> = { '0/1': [1n, 2n], '1/2': [1n, 3n], '-1/2': [2n, 3n], '-1/1': [1n, 1n] };
    const atan: Record<string, [bigint, bigint]> = { '1/1': [1n, 4n], '-1/1': [-1n, 4n] };
    const hit = (fn === 'asin' ? asin : fn === 'acos' ? acos : atan)[key];
    return hit ? this.mul(this.number(rational(ctx, hit[0], hit[1])), this.constant('pi')) : undefined;
  }

  /** Canonical number-only logarithms (value-preserving for positive arguments). */
  #foldLog(arg: ExprId): ExprId | undefined {
    const ctx = this.ctx, n = this.node(arg);
    if (n.kind === 'number' && n.value.numerator > 0n) {
      const { numerator: p, denominator: q } = n.value;
      if (p === q) return this.integer(0);
      if (p < q) return this.neg(this.log(this.number(rational(ctx, q, p))));
      // q = r^m with m = gcd of the perfect-power exponents of numerator and denominator.
      const a = perfectPower(ctx, p), b = q === 1n ? undefined : perfectPower(ctx, q);
      const m = b === undefined ? a.exponent : Number(igcd(ctx, BigInt(a.exponent), BigInt(b.exponent)));
      if (m <= 1) return undefined;
      const r = rational(ctx, iroot(ctx, p, m), q === 1n ? 1n : iroot(ctx, q, m));
      return this.mul(this.integer(m), this.log(this.number(r)));
    }
    // log(q^c) = c·log q for rational q > 0 and real rational c.
    if (n.kind === 'pow') {
      const base = this.numberValue(n.base), c = this.numberValue(n.exponent);
      if (base && base.numerator > 0n && c) return this.mul(n.exponent, this.log(n.base));
    }
    // log(exp c) = c for a real constant c.
    if (n.kind === 'apply' && n.fn === 'exp' && this.isRealConstant(n.arg)) return n.arg;
    return undefined;
  }

  /**
   * exp(c·log A + rest) = A^c·exp(rest) for rational c and a positive constant A (exp(a + b) = exp a·exp b);
   * exp(q·π·i + rest): q reduced by whole turns into (−1, 1], and cos qπ + i·sin qπ at the classic
   * special angles.
   */
  #foldExp(arg: ExprId): ExprId | undefined {
    const ctx = this.ctx, n = this.node(arg);
    const terms = n.kind === 'add' ? n.args : [arg];
    const kept: ExprId[] = [], factors: ExprId[] = [];
    let turn: Rational | undefined;
    for (const t of terms) {
      const { coefficient, rest } = this.#splitCoefficient(t);
      const r = this.node(rest);
      const positive = r.kind === 'apply' && r.fn === 'log' && (this.numberValue(r.arg)?.numerator ?? 0n) > 0n;
      // exp(c·log A) = A^c also for a positive constant A other than a number (π, e^a, …): same value, total.
      if (positive || (r.kind === 'apply' && r.fn === 'log' && this.#isPositiveConstant(r.arg))) factors.push(this.pow(r.kind === 'apply' ? r.arg : rest, this.number(coefficient)));
      else if (r.kind === 'mul' && r.args.length === 2 && this.#isConstant(r.args[0], 'pi') !== this.#isConstant(r.args[1], 'pi')
        && r.args.every(a => this.#isConstant(a, 'pi') || this.#isConstant(a, 'i'))) turn = turn ? rAdd(ctx, turn, coefficient) : coefficient;
      else kept.push(t);
    }
    if (turn) {
      const reduced = this.#reduceModulo(turn, 2n), angle = this.mul(this.number(reduced), this.constant('pi'));
      const c = this.cos(angle), s = this.sin(angle), plain = (x: ExprId) => { const m = this.node(x); return !(m.kind === 'apply' && (m.fn === 'sin' || m.fn === 'cos')); };
      if (plain(c) && plain(s)) factors.push(this.numberValue(s)?.numerator === 0n ? c : this.add(c, this.mul(this.constant('i'), s)));
      else if (reduced.numerator !== turn.numerator || reduced.denominator !== turn.denominator) kept.push(this.mul(angle, this.constant('i')));
      else kept.push(this.mul(this.number(turn), this.constant('pi'), this.constant('i')));
      if (factors.length === 0) return reduced.numerator === turn.numerator && reduced.denominator === turn.denominator ? undefined : this.exp(this.add(...kept));
    }
    if (factors.length === 0) return undefined;
    const rest = this.add(...kept);
    const restValue = this.numberValue(rest);
    return this.mul(...factors, ...(restValue?.numerator === 0n ? [] : [this.exp(rest)]));
  }

  exp(a: ExprId) { return this.apply('exp', a); }
  log(a: ExprId) { return this.apply('log', a); }
  /** log_b(a) = log(a)/log(b). */
  logBase(a: ExprId, b: ExprId) { return this.div(this.log(a), this.log(b)); }
  sin(a: ExprId) { return this.apply('sin', a); }
  cos(a: ExprId) { return this.apply('cos', a); }
  tan(a: ExprId) { return this.apply('tan', a); }
  asin(a: ExprId) { return this.apply('asin', a); }
  acos(a: ExprId) { return this.apply('acos', a); }
  atan(a: ExprId) { return this.apply('atan', a); }
  abs(a: ExprId) { return this.apply('abs', a); }
  lambertW(a: ExprId, branch: 0 | -1 = 0) { return this.apply(branch === 0 ? 'lambertw' : 'lambertwm1', a); }

  // ---- queries ----

  /** Distinct nodes reachable from `roots`, children before parents (explicit stack). */
  postorder(roots: readonly ExprId[]): ExprId[] {
    const out: ExprId[] = [], seen = new Set<ExprId>();
    const stack: { id: ExprId; next: number }[] = [];
    for (const r of roots) {
      this.#entry(r);
      if (seen.has(r)) continue;
      seen.add(r);
      stack.push({ id: r, next: 0 });
      while (stack.length) {
        this.ctx.tick();
        const top = stack[stack.length - 1], kids = childrenOf(this.#entries[top.id].node);
        if (top.next < kids.length) {
          const c = kids[top.next++];
          if (!seen.has(c)) { seen.add(c); stack.push({ id: c, next: 0 }); }
        } else {
          out.push(top.id);
          stack.pop();
        }
      }
    }
    return out;
  }

  freeSymbols(...roots: ExprId[]): string[] {
    const names: string[] = [];
    for (const id of this.postorder(roots)) {
      const n = this.#entries[id].node;
      if (n.kind === 'symbol') names.push(n.name);
    }
    return names.sort();
  }

  /** Rebuild through the canonical builders, so a node maps to a node with the same canonical form. */
  rebuild(id: ExprId, leaf: (id: ExprId, node: ExpressionNode) => ExprId): ExprId {
    const mapped = new Map<ExprId, ExprId>();
    for (const n of this.postorder([id])) {
      const node = this.#entries[n].node, m = (c: ExprId) => mapped.get(c) as ExprId;
      let out: ExprId;
      switch (node.kind) {
        case 'add': out = this.add(...node.args.map(m)); break;
        case 'mul': out = this.mul(...node.args.map(m)); break;
        case 'pow': out = this.pow(m(node.base), m(node.exponent)); break;
        case 'apply': out = this.apply(node.fn, m(node.arg)); break;
        default: out = leaf(n, node);
      }
      mapped.set(n, out);
    }
    return mapped.get(id) as ExprId;
  }

  substitute(id: ExprId, replacements: ReadonlyMap<string, ExprId>): ExprId {
    for (const v of replacements.values()) this.#entry(v);
    return this.rebuild(id, (n, node) => (node.kind === 'symbol' ? replacements.get(node.name) ?? n : n));
  }
}
