import { demand, type ExecutionContext } from '../execution';
import { ipow } from '../algebra/integer';
import {
  assertRational, rAdd, rational, rFromInteger, rMultiply, type IntegerInput, type Rational,
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
 *   exponents of identical bases are merged only when they share a sign;
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
export const FUNCTION_NAMES = ['exp', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'abs'] as const;
export type FunctionName = (typeof FUNCTION_NAMES)[number];

export type ExpressionNode =
  | { readonly kind: 'number'; readonly value: Rational }
  | { readonly kind: 'symbol'; readonly name: string }
  | { readonly kind: 'constant'; readonly name: Exclude<ConstantName, 'e'> }
  | { readonly kind: 'algebraic'; readonly root: RootOf; readonly poly: Polynomial<bigint>; readonly index: number }
  | { readonly kind: 'add'; readonly args: readonly ExprId[] }
  | { readonly kind: 'mul'; readonly args: readonly ExprId[] }
  | { readonly kind: 'pow'; readonly base: ExprId; readonly exponent: ExprId }
  | { readonly kind: 'apply'; readonly fn: FunctionName; readonly arg: ExprId };

interface Entry {
  readonly node: ExpressionNode;
  readonly digest: string;
  /** Tree size (repeated subtrees counted each time): an exact progress measure. */
  readonly size: bigint;
  readonly height: number;
  /** Defined, finite and real for every assignment of its symbols, in ℝ and in ℂ. */
  readonly total: boolean;
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

  /** Canonical, store-independent order. Equal digests of distinct nodes would be a SHA-256 collision. */
  compare(a: ExprId, b: ExprId): -1 | 0 | 1 {
    if (a === b) return 0;
    const da = this.digest(a), db = this.digest(b);
    demand(da !== db, 'verification-failed', 'expression digest collision');
    return da < db ? -1 : 1;
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
    this.#entries.push(Object.freeze({ node: Object.freeze(node), digest: sha256(ctx, digestText), size, height: height + 1, total }));
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
    const flat: ExprId[] = [];
    for (const a of args) {
      const n = this.node(a);
      if (n.kind === 'mul') flat.push(...n.args); else flat.push(a);
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
      for (const e of [positive, negative]) {
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
      // (xᵃ)ⁿ = x^(a·n) for integers a, n when a > 0, or a < 0 < n: same value and domain.
      if (b.kind === 'pow') {
        const a = this.numberValue(b.exponent);
        if (a && a.denominator === 1n && a.numerator !== 0n && (a.numerator > 0n || integerExponent > 0n)) {
          return this.pow(b.base, this.integer(a.numerator * integerExponent));
        }
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
    return this.#make(`f:${fn}:${arg}`, { kind: 'apply', fn, arg }, `f|${fn}|${this.digest(arg)}`, [arg],
      TOTAL_FUNCTIONS.has(fn) && this.isTotal(arg));
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
