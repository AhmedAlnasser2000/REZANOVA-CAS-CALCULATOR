import { EquationAlgebraError } from '../execution';
import { ipow } from '../algebra/integer';
import { rational, rMultiply, type Rational } from '../algebra/rational';
import { isSymbolName, safeCount, type ExprId, type ExpressionStore, type FunctionName } from './expression';
import type { Relation, RelationInput, RelationOperator } from './relation';
import { minimalPolynomial } from './root-identity';

/**
 * Pure-data MathJSON reader and writer for the subset the app produces. No
 * Compute Engine import: input is plain JSON. An unknown head or constant is
 * the typed `unsupported` result naming it; malformed input is `invalid`.
 * Nesting depth costs only budget (explicit stack).
 */
export type ReadResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'unsupported'; readonly head: string; readonly reason: string }
  | { readonly kind: 'invalid'; readonly reason: string };

class ReadFailure {
  readonly result: Exclude<ReadResult<never>, { kind: 'ok' }>;
  constructor(result: Exclude<ReadResult<never>, { kind: 'ok' }>) { this.result = result; }
}
const invalid = (reason: string): never => { throw new ReadFailure({ kind: 'invalid', reason }); };
const unsupported = (head: string, reason: string): never => { throw new ReadFailure({ kind: 'unsupported', head, reason }); };

const FUNCTION_HEADS: Readonly<Record<string, FunctionName>> = {
  Exp: 'exp', Ln: 'log', Sin: 'sin', Cos: 'cos', Tan: 'tan', Arcsin: 'asin', Arccos: 'acos', Arctan: 'atan', Abs: 'abs',
};
const FUNCTION_WRITE: Readonly<Record<FunctionName, string>> = Object.fromEntries(Object.entries(FUNCTION_HEADS).map(([k, v]) => [v, k])) as Record<FunctionName, string>;
/** Heads with a fixed arity, or [min, max]. */
const ARITY: Readonly<Record<string, number | readonly [number, number]>> = {
  Add: [0, Infinity], Multiply: [0, Infinity], Subtract: [1, Infinity], Negate: 1, Divide: 2, Power: 2, Square: 1, Sqrt: 1, Root: 2,
  Log: [1, 2], Lb: 1, Lg: 1, LambertW: [1, 2], Sec: 1, Csc: 1, Cot: 1, Sinh: 1, Cosh: 1, Tanh: 1, Rational: 2, Delimiter: 1,
  ...Object.fromEntries(Object.keys(FUNCTION_HEADS).map(k => [k, 1])),
};
const RELATION_HEADS: Readonly<Record<string, RelationOperator>> = {
  Equal: 'eq', NotEqual: 'ne', Less: 'lt', LessEqual: 'le', Greater: 'gt', GreaterEqual: 'ge',
};
const RELATION_WRITE: Readonly<Record<Relation['op'], string>> = { eq: 'Equal', ne: 'NotEqual', lt: 'Less', le: 'LessEqual' };
/** MathJSON constants outside the elementary vocabulary of this core. */
const UNSUPPORTED_SYMBOLS = new Set([
  'Infinity', 'PositiveInfinity', 'NegativeInfinity', 'ComplexInfinity', 'NaN', 'Nothing', 'Undefined', 'True', 'False',
  'EulerGamma', 'CatalanConstant', 'MachineEpsilon', 'Missing', 'None', 'All',
]);

const DECIMAL = /^([+-])?(\d*)(?:\.(\d*?)(?:\((\d+)\))?)?(?:[eE]([+-]?\d+))?$/;

/** Exact value of a MathJSON decimal text, including repeating digits "0.(3)" and exponents. */
function decimal(store: ExpressionStore, text: string): Rational {
  const ctx = store.ctx;
  ctx.charge(text.length / 16, text.length / 16);
  const m = DECIMAL.exec(text);
  if (!m || (!m[2] && !m[3] && !m[4])) return invalid(`not a number: ${text}`);
  const [, sign, int = '', frac = '', repeat = '', exponent = '0'] = m;
  const fixed = BigInt(`${int}${frac}` || '0');
  let value = rational(ctx, fixed, ipow(ctx, 10n, frac.length));
  if (repeat) {
    const withRepeat = BigInt(`${int}${frac}${repeat}`);
    value = rational(ctx, withRepeat - fixed, ipow(ctx, 10n, frac.length) * (ipow(ctx, 10n, repeat.length) - 1n));
  }
  const e = BigInt(exponent), scale = ipow(ctx, 10n, safeCount(ctx, e < 0n ? -e : e));
  value = rMultiply(ctx, value, e < 0n ? rational(ctx, 1n, scale) : rational(ctx, scale));
  return sign === '-' ? rMultiply(ctx, value, rational(ctx, -1n)) : value;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function symbolLeaf(store: ExpressionStore, name: string): ExprId {
  switch (name) {
    case 'Pi': return store.constant('pi');
    case 'ExponentialE': return store.constant('e');
    case 'ImaginaryUnit': return store.constant('i');
    case 'Half': return store.fraction(1, 2);
    case 'GoldenRatio': return store.div(store.add(store.integer(1), store.sqrt(store.integer(5))), store.integer(2));
  }
  if (UNSUPPORTED_SYMBOLS.has(name)) return unsupported(name, `constant ${name} is outside the elementary vocabulary`);
  if (!isSymbolName(name)) return invalid(`invalid symbol name: ${name}`);
  return store.symbol(name);
}

function integerArgument(value: unknown): bigint | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (plainObject(value) && typeof value.num === 'string' && /^-?\d+$/.test(value.num)) return BigInt(value.num);
  return undefined;
}

function rootOfLeaf(store: ExpressionStore, args: readonly unknown[]): ExprId {
  const [list, index] = args;
  if (args.length !== 2 || !Array.isArray(list) || list[0] !== 'List') return invalid('RootOf expects ["List", coefficients…] and an index');
  const coefficients = list.slice(1).map(c => integerArgument(c) ?? invalid('RootOf coefficient must be an integer'));
  const k = integerArgument(index);
  const poly = minimalPolynomial(store.ctx, coefficients);
  const roots = store.roots.roots(store.ctx, poly);
  if (k === undefined || k < 0n || k >= BigInt(roots.length)) return invalid('RootOf index out of range');
  return store.algebraic(roots[Number(k)]);
}

type Frame = { readonly head: string; readonly children: readonly unknown[]; readonly results: ExprId[] };

/** A leaf id, or a frame whose children must be read first. */
function start(store: ExpressionStore, json: unknown): ExprId | Frame {
  store.ctx.tick();
  if (typeof json === 'number') {
    if (!Number.isFinite(json)) return unsupported(String(json), 'non-finite number');
    return store.number(decimal(store, String(json)));
  }
  if (typeof json === 'string') return symbolLeaf(store, json);
  if (plainObject(json)) {
    if (typeof json.num === 'string') {
      if (/^[+-]?(Infinity|NaN)$/.test(json.num)) return unsupported(json.num, 'non-finite number');
      return store.number(decimal(store, json.num));
    }
    if (typeof json.sym === 'string') return symbolLeaf(store, json.sym);
    if (Array.isArray(json.fn)) return start(store, json.fn);
    if (typeof json.str === 'string') return unsupported('String', 'string literals are not expressions');
    return invalid('unrecognized MathJSON object');
  }
  if (!Array.isArray(json) || json.length === 0) return invalid('expected a MathJSON expression');
  const [rawHead, ...children] = json;
  const head = typeof rawHead === 'string' ? rawHead : plainObject(rawHead) && typeof rawHead.sym === 'string' ? rawHead.sym : invalid('head must be a name');
  store.ctx.allocate(children.length);
  if (head === 'RootOf') return rootOfLeaf(store, children);
  if (head in RELATION_HEADS) return unsupported(head, 'a relation inside an expression');
  const arity = ARITY[head];
  if (arity === undefined) return unsupported(head, `MathJSON head ${head} is not supported`);
  const [lo, hi] = typeof arity === 'number' ? [arity, arity] : arity;
  if (children.length < lo || children.length > hi) return invalid(`${head} expects ${lo === hi ? lo : `${lo}–${hi}`} arguments, got ${children.length}`);
  return { head, children, results: [] };
}

function combine(store: ExpressionStore, head: string, a: readonly ExprId[]): ExprId {
  const s = store;
  switch (head) {
    case 'Add': return s.add(...a);
    case 'Multiply': return s.mul(...a);
    case 'Subtract': return a.length === 1 ? s.neg(a[0]) : a.slice(1).reduce((acc, x) => s.sub(acc, x), a[0]);
    case 'Negate': return s.neg(a[0]);
    case 'Divide': return s.div(a[0], a[1]);
    case 'Power': return s.pow(a[0], a[1]);
    case 'Square': return s.pow(a[0], s.integer(2));
    case 'Sqrt': return s.sqrt(a[0]);
    case 'Root': return s.pow(a[0], s.div(s.integer(1), a[1]));
    case 'Log': return s.logBase(a[0], a[1] ?? s.integer(10));
    case 'Lb': return s.logBase(a[0], s.integer(2));
    case 'Lg': return s.logBase(a[0], s.integer(10));
    case 'Sec': return s.pow(s.cos(a[0]), s.integer(-1));
    case 'Csc': return s.pow(s.sin(a[0]), s.integer(-1));
    case 'Cot': return s.div(s.cos(a[0]), s.sin(a[0]));
    // sinh, cosh, tanh by their exponential definitions (same value and domain).
    case 'Sinh': return s.div(s.sub(s.exp(a[0]), s.exp(s.neg(a[0]))), s.integer(2));
    case 'Cosh': return s.div(s.add(s.exp(a[0]), s.exp(s.neg(a[0]))), s.integer(2));
    case 'Tanh': return s.div(s.sub(s.exp(a[0]), s.exp(s.neg(a[0]))), s.add(s.exp(a[0]), s.exp(s.neg(a[0]))));
    case 'Rational': {
      const [n, d] = a.map(x => s.numberValue(x));
      if (!n || !d || n.denominator !== 1n || d.denominator !== 1n) return invalid('Rational expects two integers');
      if (d.numerator === 0n) return invalid('Rational with zero denominator');
      return s.number(rational(s.ctx, n.numerator, d.numerator));
    }
    case 'Delimiter': return a[0];
    case 'LambertW': {
      // ["LambertW", z] is the principal branch W₀; ["LambertW", z, -1] is W₋₁.
      const k = a.length === 2 ? s.numberValue(a[1]) : rational(s.ctx, 0n);
      if (!k || k.denominator !== 1n || (k.numerator !== 0n && k.numerator !== -1n)) return unsupported('LambertW', 'only the real branches 0 and −1 are supported');
      return s.lambertW(a[0], k.numerator === 0n ? 0 : -1);
    }
    default: return s.apply(FUNCTION_HEADS[head], a[0]);
  }
}

function readTree(store: ExpressionStore, json: unknown): ExprId {
  const first = start(store, json);
  if (typeof first === 'number') return first;
  const stack: Frame[] = [first];
  for (;;) {
    store.ctx.tick();
    const top = stack[stack.length - 1];
    if (top.results.length < top.children.length) {
      const next = start(store, top.children[top.results.length]);
      if (typeof next === 'number') top.results.push(next); else stack.push(next);
      continue;
    }
    stack.pop();
    const value = combine(store, top.head, top.results);
    if (stack.length === 0) return value;
    stack[stack.length - 1].results.push(value);
  }
}

function guarded<T>(read: () => T): ReadResult<T> {
  try {
    return { kind: 'ok', value: read() };
  } catch (e) {
    if (e instanceof ReadFailure) return e.result;
    if (e instanceof EquationAlgebraError && e.code !== 'resource') return { kind: 'invalid', reason: e.reason };
    throw e;
  }
}

export function readExpression(store: ExpressionStore, json: unknown): ReadResult<ExprId> {
  return guarded(() => readTree(store, json));
}

/**
 * A relation, a chain such as ["Less", a, b, c] (a < b and b < c), or
 * ["And", …] of relations.
 */
export function readRelations(store: ExpressionStore, json: unknown): ReadResult<readonly RelationInput[]> {
  return guarded(() => {
    const out: RelationInput[] = [];
    const pending: unknown[] = [json];
    while (pending.length) {
      store.ctx.tick();
      const item = pending.shift();
      const list = plainObject(item) && Array.isArray(item.fn) ? item.fn : item;
      if (!Array.isArray(list) || typeof list[0] !== 'string') return invalid('expected a relation');
      if (list[0] === 'And') { pending.unshift(...list.slice(1)); continue; }
      const op = RELATION_HEADS[list[0]];
      if (op === undefined) return list[0] in ARITY || list[0] in FUNCTION_HEADS ? invalid('expected a relation, got an expression') : unsupported(list[0], `relation ${list[0]} is not supported`);
      if (list.length < 3) return invalid(`${list[0]} needs at least two sides`);
      const sides = list.slice(1).map(x => readTree(store, x));
      for (let i = 0; i + 1 < sides.length; i++) out.push(Object.freeze({ op, lhs: sides[i], rhs: sides[i + 1] }));
    }
    return Object.freeze(out);
  });
}

// ---- writer ----

function integerJson(n: bigint): unknown {
  return n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : { num: n.toString() };
}

export function writeExpression(store: ExpressionStore, id: ExprId): unknown {
  const out = new Map<ExprId, unknown>();
  for (const n of store.postorder([id])) {
    const node = store.node(n), get = (c: ExprId) => out.get(c);
    let json: unknown;
    switch (node.kind) {
      case 'number': {
        const { numerator, denominator } = node.value;
        json = denominator === 1n ? integerJson(numerator) : ['Rational', integerJson(numerator), integerJson(denominator)];
        break;
      }
      case 'symbol': json = node.name; break;
      case 'constant': json = node.name === 'pi' ? 'Pi' : 'ImaginaryUnit'; break;
      case 'algebraic': json = ['RootOf', ['List', ...node.poly.coefficients.map(integerJson)], node.index]; break;
      case 'add': json = ['Add', ...node.args.map(get)]; break;
      case 'mul': json = ['Multiply', ...node.args.map(get)]; break;
      case 'pow': json = ['Power', get(node.base), get(node.exponent)]; break;
      case 'apply':
        json = node.fn === 'lambertw' ? ['LambertW', get(node.arg)] : node.fn === 'lambertwm1' ? ['LambertW', get(node.arg), -1] : [FUNCTION_WRITE[node.fn], get(node.arg)];
        break;
    }
    out.set(n, json);
  }
  return out.get(id);
}

export function writeRelation(store: ExpressionStore, r: Relation): unknown {
  return [RELATION_WRITE[r.op], writeExpression(store, r.lhs), writeExpression(store, r.rhs)];
}
