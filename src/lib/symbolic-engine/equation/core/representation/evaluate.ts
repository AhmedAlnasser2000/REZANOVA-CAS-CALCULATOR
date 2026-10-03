import { demand, type ExecutionContext } from '../execution';
import {
  rAbs, rAdd, rational, rCompare, rInverse, rMultiply, rNegate, type Rational,
} from '../algebra/rational';
import * as algebraic from '../algebraic/arithmetic';
import { compareRational } from '../algebraic/real-roots';
import { ALGEBRAIC_RING, compareReal, realRoots, refineReal, rootsOfIrreducible, type RealRootOf, type RootOf } from '../algebraic/root-of';
import { minusInverseE } from './enclosure';
import { childrenOf as childrenOfNode, safeCount, type ExprId, type ExpressionStore } from './expression';

/**
 * Exact evaluation of number-only subgraphs. A value is returned only when it
 * is exactly a rational or an algebraic number (RootOf); there is never a
 * floating-point answer. Otherwise the result says why:
 * - `free-symbol`: the expression is not a number;
 * - `transcendental`: the value is provably not algebraic (Lindemann–Weierstrass,
 *   Gelfond–Schneider), or involves π;
 * - `incomplete-implementation`: an exact algebraic value exists but this
 *   gate does not compute it yet (principal roots of non-real or negative
 *   numbers above square roots);
 * - `undefined`: the expression has no value in the problem's domain.
 */
export type EvaluationDomain = 'real' | 'complex';
export type ExactValue = { readonly kind: 'rational'; readonly value: Rational } | { readonly kind: 'algebraic'; readonly root: RootOf };
export type Evaluation =
  | { readonly kind: 'exact'; readonly value: ExactValue }
  | { readonly kind: 'not-exact'; readonly reason: 'free-symbol' | 'transcendental' | 'incomplete-implementation'; readonly detail: string }
  | { readonly kind: 'undefined'; readonly detail: string };

class Stop {
  readonly result: Exclude<Evaluation, { kind: 'exact' }>;
  constructor(result: Exclude<Evaluation, { kind: 'exact' }>) { this.result = result; }
}
const notExact = (reason: 'free-symbol' | 'transcendental' | 'incomplete-implementation', detail: string): never => { throw new Stop({ kind: 'not-exact', reason, detail }); };
const undefinedValue = (detail: string): never => { throw new Stop({ kind: 'undefined', detail }); };

const q = (value: Rational): ExactValue => ({ kind: 'rational', value });

export function asRoot(ctx: ExecutionContext, v: ExactValue): RootOf {
  if (v.kind === 'algebraic') return v.root;
  return realRoots(ctx, ALGEBRAIC_RING.make(ctx, [-v.value.numerator, v.value.denominator]))[0].root;
}

/** Rational algebraic numbers are reported as rationals. */
export function normalizeValue(v: RootOf): ExactValue {
  if (v.kind === 'real' && v.poly.coefficients.length === 2) return q(v.lo);
  return { kind: 'algebraic', root: v };
}

function isZero(v: ExactValue): boolean { return v.kind === 'rational' && v.value.numerator === 0n; }
function isOne(v: ExactValue): boolean { return v.kind === 'rational' && v.value.numerator === 1n && v.value.denominator === 1n; }

/** Sign of a real value; undefined for non-real values. */
function realSign(ctx: ExecutionContext, v: ExactValue): -1 | 0 | 1 | undefined {
  if (v.kind === 'rational') return v.value.numerator === 0n ? 0 : v.value.numerator < 0n ? -1 : 1;
  if (v.root.kind !== 'real') return undefined;
  return compareReal(ctx, v.root, asRoot(ctx, q(rational(ctx, 0n))) as RealRootOf) as -1 | 1;
}

function compareToRational(ctx: ExecutionContext, v: ExactValue, r: Rational): -1 | 0 | 1 | undefined {
  if (v.kind === 'rational') return rCompare(ctx, v.value, r);
  if (v.root.kind !== 'real') return undefined;
  return compareReal(ctx, v.root, asRoot(ctx, q(r)) as RealRootOf);
}

export function addValues(ctx: ExecutionContext, a: ExactValue, b: ExactValue): ExactValue {
  if (a.kind === 'rational' && b.kind === 'rational') return q(rAdd(ctx, a.value, b.value));
  return normalizeValue(algebraic.add(ctx, asRoot(ctx, a), asRoot(ctx, b)));
}

export function multiplyValues(ctx: ExecutionContext, a: ExactValue, b: ExactValue): ExactValue {
  if (a.kind === 'rational' && b.kind === 'rational') return q(rMultiply(ctx, a.value, b.value));
  if (isZero(a) || isZero(b)) return q(rational(ctx, 0n));
  return normalizeValue(algebraic.multiply(ctx, asRoot(ctx, a), asRoot(ctx, b)));
}

function inverseValue(ctx: ExecutionContext, a: ExactValue): ExactValue {
  if (isZero(a)) return undefinedValue('division by zero');
  return a.kind === 'rational' ? q(rInverse(ctx, a.value)) : normalizeValue(algebraic.inverse(ctx, a.root));
}

function integerPower(ctx: ExecutionContext, a: ExactValue, n: bigint): ExactValue {
  if (n === 0n) return isZero(a) ? undefinedValue('0^0') : q(rational(ctx, 1n));
  let base = n < 0n ? inverseValue(ctx, a) : a, e = n < 0n ? -n : n, result: ExactValue = q(rational(ctx, 1n));
  while (e > 0n) {
    ctx.tick();
    if (e & 1n) result = multiplyValues(ctx, result, base);
    e >>= 1n;
    if (e > 0n) base = multiplyValues(ctx, base, base);
  }
  return result;
}

/**
 * The positive real k-th root of a positive real value b. With m the minimal
 * polynomial of b, r ↦ rᵏ is an increasing bijection between the positive
 * roots of m(xᵏ) (square-free, since m is) and those of m, so the root keeps
 * b's rank among the positive roots.
 */
function positiveRoot(ctx: ExecutionContext, b: ExactValue, k: number): ExactValue {
  const root = asRoot(ctx, b) as RealRootOf, m = root.poly.coefficients;
  ctx.allocate((m.length - 1) * k + 1);
  const spread = Array<bigint>((m.length - 1) * k + 1).fill(0n);
  m.forEach((c, i) => { spread[i * k] = c; });
  const zero = asRoot(ctx, q(rational(ctx, 0n))) as RealRootOf;
  const positive = (list: { root: RealRootOf }[]) => list.map(x => x.root).filter(r => compareReal(ctx, r, zero) > 0);
  const ofM = positive(realRoots(ctx, root.poly)), ofSpread = positive(realRoots(ctx, ALGEBRAIC_RING.make(ctx, spread)));
  const rank = ofM.findIndex(r => compareReal(ctx, r, root) === 0);
  demand(rank >= 0 && ofSpread.length === ofM.length, 'verification-failed', 'positive root correspondence');
  return normalizeValue(ofSpread[rank]);
}

function imaginaryUnit(ctx: ExecutionContext): ExactValue {
  const roots = algebraicRootsOf(ctx, [1n, 0n, 1n]);
  const i = roots.find(r => r.kind === 'complex' && r.im.numerator > 0n);
  demand(i !== undefined, 'verification-failed', 'imaginary unit');
  return { kind: 'algebraic', root: i };
}

function algebraicRootsOf(ctx: ExecutionContext, coefficients: bigint[]): RootOf[] {
  return rootsOfIrreducible(ctx, ALGEBRAIC_RING.make(ctx, coefficients));
}

/** b^(p/k) for k ≥ 2 (reduced), following the pow semantics of the expression graph. */
function rationalPower(ctx: ExecutionContext, b: ExactValue, p: bigint, k: bigint, domain: EvaluationDomain): ExactValue {
  const s = realSign(ctx, b);
  if (s === 0) return p > 0n ? b : undefinedValue('nonpositive power of zero');
  const kn = safeCount(ctx, k);
  if (s === 1) return integerPower(ctx, positiveRoot(ctx, b, kn), p);
  if (s === -1 && domain === 'real') {
    if (k % 2n === 0n) return undefinedValue('even root of a negative number');
    return integerPower(ctx, negateValue(ctx, positiveRoot(ctx, negateValue(ctx, b), kn)), p);
  }
  if (s === -1 && k === 2n) {
    // Principal square root of b < 0 is i·√|b|.
    return integerPower(ctx, multiplyValues(ctx, imaginaryUnit(ctx), positiveRoot(ctx, negateValue(ctx, b), 2)), p);
  }
  return notExact('incomplete-implementation', 'principal root of a negative or non-real number');
}

function negateValue(ctx: ExecutionContext, a: ExactValue): ExactValue {
  return a.kind === 'rational' ? q(rNegate(ctx, a.value)) : normalizeValue(algebraic.negate(ctx, a.root));
}

function absoluteValue(ctx: ExecutionContext, a: ExactValue): ExactValue {
  if (a.kind === 'rational') return q(rAbs(ctx, a.value));
  const s = realSign(ctx, a);
  if (s !== undefined) return s < 0 ? negateValue(ctx, a) : a;
  // |z| = √(z·z̄); the conjugate disk isolates the conjugate root of the same real polynomial.
  const z = a.root as Extract<RootOf, { kind: 'complex' }>;
  const conjugate: RootOf = Object.freeze({ ...z, im: rNegate(ctx, z.im) });
  return positiveRoot(ctx, normalizeValue(algebraic.multiply(ctx, z, conjugate)), 2);
}

/** Whether a negative real algebraic value lies below −1/e (never equal, by Lindemann–Weierstrass). */
function belowMinusInverseE(ctx: ExecutionContext, v: ExactValue): boolean {
  for (let bits = 32; ; bits *= 2) {
    ctx.tick();
    const t = minusInverseE(ctx, bits);
    const lo = v.kind === 'rational' ? v.value : refineReal(ctx, v.root as RealRootOf, rational(ctx, 1n, 1n << BigInt(bits))).lo;
    const hi = v.kind === 'rational' ? v.value : refineReal(ctx, v.root as RealRootOf, rational(ctx, 1n, 1n << BigInt(bits))).hi;
    if (compareRational(ctx, hi, t.lo) < 0) return true;
    if (compareRational(ctx, t.hi, lo) < 0) return false;
  }
}

function applyFunction(ctx: ExecutionContext, fn: string, v: ExactValue, domain: EvaluationDomain): ExactValue {
  const one = rational(ctx, 1n), minusOne = rational(ctx, -1n);
  switch (fn) {
    case 'abs': return absoluteValue(ctx, v);
    case 'exp': return isZero(v) ? q(one) : notExact('transcendental', 'exp of a nonzero algebraic number');
    case 'sin': case 'tan': return isZero(v) ? q(rational(ctx, 0n)) : notExact('transcendental', `${fn} of a nonzero algebraic number`);
    case 'cos': return isZero(v) ? q(one) : notExact('transcendental', 'cos of a nonzero algebraic number');
    case 'log': {
      if (isZero(v)) return undefinedValue('log of zero');
      if (domain === 'real' && realSign(ctx, v) !== 1) return undefinedValue('log of a non-positive or non-real number');
      return isOne(v) ? q(rational(ctx, 0n)) : notExact('transcendental', 'log of an algebraic number other than 1');
    }
    case 'asin': case 'acos': {
      if (domain === 'real') {
        const lo = compareToRational(ctx, v, minusOne), hi = compareToRational(ctx, v, one);
        if (lo === undefined || hi === undefined || lo < 0 || hi > 0) return undefinedValue(`${fn} outside [−1, 1]`);
      }
      if (fn === 'asin' && isZero(v)) return q(rational(ctx, 0n));
      if (fn === 'acos' && isOne(v)) return q(rational(ctx, 0n));
      return notExact('transcendental', `${fn} of an algebraic number`);
    }
    case 'atan': {
      if (domain === 'real' && realSign(ctx, v) === undefined) return undefinedValue('atan of a non-real number');
      if (v.kind === 'algebraic' && v.root.kind === 'complex' && v.root.poly.coefficients.join(',') === '1,0,1') return undefinedValue('atan pole at ±i');
      return isZero(v) ? q(rational(ctx, 0n)) : notExact('transcendental', 'atan of a nonzero algebraic number');
    }
    case 'lambertw': case 'lambertwm1': {
      // W(0) = 0 on the principal branch; W₋₁ is defined on [−1/e, 0) over ℝ. A nonzero
      // algebraic argument gives a transcendental value (W·e^W = v with W algebraic contradicts Lindemann–Weierstrass).
      if (isZero(v)) return fn === 'lambertw' ? q(rational(ctx, 0n)) : undefinedValue('W₋₁(0)');
      if (domain === 'real') {
        const s = realSign(ctx, v);
        if (s === undefined) return undefinedValue('Lambert W of a non-real number');
        if (fn === 'lambertwm1' && s > 0) return undefinedValue('W₋₁ of a positive number');
        if (s < 0 && belowMinusInverseE(ctx, v)) return undefinedValue('Lambert W below −1/e');
      }
      return notExact('transcendental', `${fn} of a nonzero algebraic number`);
    }
    default: return demand(false, 'invalid-input', 'unknown function') as never;
  }
}

function power(ctx: ExecutionContext, b: ExactValue, e: ExactValue, domain: EvaluationDomain): ExactValue {
  if (e.kind === 'rational') {
    const { numerator: p, denominator: k } = e.value;
    return k === 1n ? integerPower(ctx, b, p) : rationalPower(ctx, b, p, k, domain);
  }
  if (isOne(b)) return b;
  if (isZero(b)) {
    const s = realSign(ctx, e);
    if (s === 1) return b;
    if (s === -1) return undefinedValue('negative power of zero');
    return notExact('incomplete-implementation', 'zero to a non-real power');
  }
  return notExact('transcendental', 'algebraic number to an irrational algebraic power (Gelfond–Schneider)');
}

export function evaluateExact(store: ExpressionStore, id: ExprId, domain: EvaluationDomain): Evaluation {
  const ctx = store.ctx;
  demand(domain === 'real' || domain === 'complex', 'invalid-input', 'evaluation domain');
  const values = new Map<ExprId, ExactValue>();
  const get = (c: ExprId) => values.get(c) as ExactValue;
  try {
    // Undefined anywhere makes the whole undefined, so independent subtrees are
    // still evaluated after another reason appears; nodes above it are skipped.
    let deferred: Stop | undefined;
    const unknown = new Set<ExprId>();
    for (const n of store.postorder([id])) {
      const node = store.node(n);
      if (childrenOfNode(node).some(c => unknown.has(c))) { unknown.add(n); continue; }
      try {
        let v: ExactValue;
        switch (node.kind) {
          case 'number': v = q(node.value); break;
          case 'symbol': v = notExact('free-symbol', node.name); break;
          case 'constant':
            v = node.name === 'pi' ? notExact('transcendental', 'π') : domain === 'real' ? undefinedValue('i is not real') : imaginaryUnit(ctx);
            break;
          case 'algebraic':
            v = domain === 'real' && node.root.kind !== 'real' ? undefinedValue('non-real algebraic number') : normalizeValue(node.root);
            break;
          case 'add': v = node.args.map(get).reduce((acc, x) => addValues(ctx, acc, x)); break;
          case 'mul': v = node.args.map(get).reduce((acc, x) => multiplyValues(ctx, acc, x)); break;
          case 'pow': v = power(ctx, get(node.base), get(node.exponent), domain); break;
          case 'apply': v = applyFunction(ctx, node.fn, get(node.arg), domain); break;
        }
        values.set(n, v);
      } catch (e) {
        if (!(e instanceof Stop) || e.result.kind === 'undefined') throw e;
        deferred ??= e;
        unknown.add(n);
      }
    }
    if (deferred) throw deferred;
    return { kind: 'exact', value: get(id) };
  } catch (e) {
    if (e instanceof Stop) return e.result;
    throw e;
  }
}
