import { nextDown, nextUp } from '../../numeric/directed-rounding';

// Interval primitives for PTX-ENGINE1 (gate E2): every result encloses the
// true range. + − × ÷ and √ are correctly rounded in IEEE arithmetic, so one
// ulp outward per operation is enough; Math.exp, Math.log, Math.sin and the
// other library functions are only nearly correctly rounded in JavaScript, so
// they are widened by a few ulps. Each result also says whether the operation
// is defined on all, some or none of its input, whether it is continuous
// there, and whether its derivative is (for proofs that need f′).

export type GraphInterval = { lo: number; hi: number };

/** 2 = defined on all of the input, 1 = on part of it, 0 = nowhere. */
export type GraphDefinedness = 0 | 1 | 2;

export type GraphIntervalValue = GraphInterval & {
  defined: GraphDefinedness;
  /** Continuous wherever it is defined on the input. */
  continuous: boolean;
  /** Continuously differentiable there (|x| at 0, max where its arguments cross, and steps are not). */
  smooth: boolean;
};

export { nextDown, nextUp };

const LIBRARY_ULPS = 3;
function down(x: number, ulps = 1) { let value = x; for (let index = 0; index < ulps; index += 1) value = nextDown(value); return value; }
function up(x: number, ulps = 1) { let value = x; for (let index = 0; index < ulps; index += 1) value = nextUp(value); return value; }

export const ENTIRE: GraphInterval = { lo: -Infinity, hi: Infinity };

export function point(value: number): GraphIntervalValue {
  return { lo: value, hi: value, defined: 2, continuous: true, smooth: true };
}

export function interval(lo: number, hi: number): GraphIntervalValue {
  return { lo, hi, defined: 2, continuous: true, smooth: true };
}

const NOWHERE: GraphIntervalValue = { lo: Number.NaN, hi: Number.NaN, defined: 0, continuous: true, smooth: true };

/** A result built from operands: definedness is the least, continuity and smoothness hold only if they hold for all. */
function from(lo: number, hi: number, operands: readonly GraphIntervalValue[], defined: GraphDefinedness = 2, continuous = true, smooth = true): GraphIntervalValue {
  let least = defined; let cont = continuous; let sm = smooth;
  for (const operand of operands) {
    if (operand.defined < least) least = operand.defined;
    cont = cont && operand.continuous; sm = sm && operand.smooth;
  }
  if (least === 0 || Number.isNaN(lo) || Number.isNaN(hi)) return { ...NOWHERE };
  return { lo, hi, defined: least, continuous: cont, smooth: sm && cont };
}

const product = (a: number, b: number) => (a === 0 || b === 0 ? 0 : a * b);

export function add(a: GraphIntervalValue, b: GraphIntervalValue) {
  // −∞ + ∞ only happens for unbounded ranges, whose sum is unbounded on that side.
  const lo = a.lo + b.lo; const hi = a.hi + b.hi;
  return from(Number.isNaN(lo) ? -Infinity : down(lo), Number.isNaN(hi) ? Infinity : up(hi), [a, b]);
}
export function negate(a: GraphIntervalValue) { return from(-a.hi, -a.lo, [a]); }
export function subtract(a: GraphIntervalValue, b: GraphIntervalValue) { return add(a, negate(b)); }

export function multiply(a: GraphIntervalValue, b: GraphIntervalValue) {
  const values = [product(a.lo, b.lo), product(a.lo, b.hi), product(a.hi, b.lo), product(a.hi, b.hi)];
  return from(down(Math.min(...values)), up(Math.max(...values)), [a, b]);
}

/** 1/a. Where a reaches 0 the reciprocal is undefined at that point and unbounded beside it. */
export function reciprocal(a: GraphIntervalValue) {
  if (a.lo > 0 || a.hi < 0) return from(down(1 / a.hi), up(1 / a.lo), [a]);
  if (a.lo === 0 && a.hi === 0) return { ...NOWHERE };
  if (a.lo === 0) return from(down(1 / a.hi), Infinity, [a], 1);
  if (a.hi === 0) return from(-Infinity, up(1 / a.lo), [a], 1);
  return from(-Infinity, Infinity, [a], 1, false, false);
}

export function divide(a: GraphIntervalValue, b: GraphIntervalValue) {
  if (b.lo > 0 || b.hi < 0) {
    const values = [a.lo / b.lo, a.lo / b.hi, a.hi / b.lo, a.hi / b.hi];
    return from(down(Math.min(...values)), up(Math.max(...values)), [a, b]);
  }
  return multiply(a, reciprocal(b));
}

function monotone(a: GraphIntervalValue, f: (x: number) => number, increasing: boolean, ulps = LIBRARY_ULPS, defined: GraphDefinedness = 2, lo = a.lo, hi = a.hi) {
  const atLo = f(lo); const atHi = f(hi);
  return increasing ? from(down(atLo, ulps), up(atHi, ulps), [a], defined) : from(down(atHi, ulps), up(atLo, ulps), [a], defined);
}

/** A function defined on [minimum, maximum] (either end open when `open`): the input clipped to its domain. */
function onDomain(a: GraphIntervalValue, minimum: number, maximum: number, open: boolean,
  f: (x: number) => number, increasing: boolean, beyond: { lo?: number; hi?: number } = {}) {
  const inside = (x: number) => (open ? x > minimum && x < maximum : x >= minimum && x <= maximum);
  if (a.hi < minimum || a.lo > maximum || (open && (a.hi <= minimum || a.lo >= maximum))) return { ...NOWHERE };
  const partial = !(inside(a.lo) && inside(a.hi));
  const lo = Math.max(a.lo, minimum); const hi = Math.min(a.hi, maximum);
  const result = monotone(a, f, increasing, LIBRARY_ULPS, partial ? 1 : 2, lo, hi);
  // At an open end the function grows without bound (ln at 0, artanh at ±1).
  if (open && lo === minimum && beyond.lo !== undefined) result.lo = beyond.lo;
  if (open && hi === maximum && beyond.hi !== undefined) result.hi = beyond.hi;
  if (Number.isNaN(result.lo)) result.lo = increasing ? (beyond.lo ?? -Infinity) : (beyond.hi ?? -Infinity);
  if (Number.isNaN(result.hi)) result.hi = increasing ? (beyond.hi ?? Infinity) : (beyond.lo ?? Infinity);
  return result;
}

export const sqrt = (a: GraphIntervalValue) => { const r = onDomain(a, 0, Infinity, false, Math.sqrt, true); if (r.defined) r.lo = Math.max(r.lo, 0); return r; };
export const exp = (a: GraphIntervalValue) => { const r = monotone(a, Math.exp, true); r.lo = Math.max(r.lo, 0); return r; };
export const ln = (a: GraphIntervalValue) => onDomain(a, 0, Infinity, true, Math.log, true, { lo: -Infinity });
export const atan = (a: GraphIntervalValue) => monotone(a, Math.atan, true);
export const asinh = (a: GraphIntervalValue) => monotone(a, Math.asinh, true);
export const sinh = (a: GraphIntervalValue) => monotone(a, Math.sinh, true);
export const tanh = (a: GraphIntervalValue) => monotone(a, Math.tanh, true);
export const asin = (a: GraphIntervalValue) => onDomain(a, -1, 1, false, Math.asin, true);
export const acos = (a: GraphIntervalValue) => onDomain(a, -1, 1, false, Math.acos, false);
export const acosh = (a: GraphIntervalValue) => onDomain(a, 1, Infinity, false, Math.acosh, true);
export const atanh = (a: GraphIntervalValue) => onDomain(a, -1, 1, true, Math.atanh, true, { lo: -Infinity, hi: Infinity });

export function cosh(a: GraphIntervalValue) {
  if (a.lo >= 0) return monotone(a, Math.cosh, true);
  if (a.hi <= 0) return monotone(a, Math.cosh, false);
  return from(1, up(Math.cosh(Math.max(-a.lo, a.hi)), LIBRARY_ULPS), [a]);
}

export function abs(a: GraphIntervalValue) {
  if (a.lo >= 0) return from(a.lo, a.hi, [a], 2, true, a.lo > 0);
  if (a.hi <= 0) return from(-a.hi, -a.lo, [a], 2, true, a.hi < 0);
  return from(0, Math.max(-a.lo, a.hi), [a], 2, true, false);
}

/**
 * Whether some point c + k·period (k an integer) lies in [lo, hi], erring towards yes near the ends: the
 * computed c + k·period is within a few ulps of the true point, so 16 ulps of slack keeps the answer safe.
 */
function containsLattice(lo: number, hi: number, c: number, period: number) {
  const slack = 16 * Number.EPSILON * Math.max(1, Math.abs(lo), Math.abs(hi));
  const k = Math.ceil((lo - slack - c) / period);
  const at = c + k * period;
  return at <= hi + slack;
}

function periodic(a: GraphIntervalValue, f: (x: number) => number, maxAt: number, minAt: number) {
  if (!Number.isFinite(a.lo) || !Number.isFinite(a.hi) || a.hi - a.lo >= 2 * Math.PI) return from(-1, 1, [a]);
  const ends = [f(a.lo), f(a.hi)];
  const hi = containsLattice(a.lo, a.hi, maxAt, 2 * Math.PI) ? 1 : Math.min(1, up(Math.max(...ends), LIBRARY_ULPS));
  const lo = containsLattice(a.lo, a.hi, minAt, 2 * Math.PI) ? -1 : Math.max(-1, down(Math.min(...ends), LIBRARY_ULPS));
  return from(lo, hi, [a]);
}

export const sin = (a: GraphIntervalValue) => periodic(a, Math.sin, Math.PI / 2, -Math.PI / 2);
export const cos = (a: GraphIntervalValue) => periodic(a, Math.cos, 0, Math.PI);

export function tan(a: GraphIntervalValue) {
  if (!Number.isFinite(a.lo) || !Number.isFinite(a.hi) || a.hi - a.lo >= Math.PI || containsLattice(a.lo, a.hi, Math.PI / 2, Math.PI)) {
    return from(-Infinity, Infinity, [a], 1, false, false);
  }
  return monotone(a, Math.tan, true);
}

/** Steps (floor, ceil, round): monotone, continuous only when the input does not cross a step. */
function step(a: GraphIntervalValue, f: (x: number) => number) {
  const lo = f(a.lo); const hi = f(a.hi);
  return from(lo, hi, [a], 2, lo === hi, lo === hi);
}
export const floor = (a: GraphIntervalValue) => step(a, Math.floor);
export const ceil = (a: GraphIntervalValue) => step(a, Math.ceil);
export const round = (a: GraphIntervalValue) => step(a, Math.round);
export function sign(a: GraphIntervalValue) {
  const lo = Math.sign(a.lo); const hi = Math.sign(a.hi);
  return from(lo, hi, [a], 2, lo === hi && lo !== 0, lo === hi && lo !== 0);
}

export function minimum(values: readonly GraphIntervalValue[]) {
  const lo = Math.min(...values.map((value) => value.lo)); const hi = Math.min(...values.map((value) => value.hi));
  const overlapping = values.some((value, index) => values.some((other, j) => j !== index && value.lo < other.hi && other.lo < value.hi));
  return from(lo, hi, values, 2, true, !overlapping);
}
export function maximum(values: readonly GraphIntervalValue[]) {
  const lo = Math.max(...values.map((value) => value.lo)); const hi = Math.max(...values.map((value) => value.hi));
  const overlapping = values.some((value, index) => values.some((other, j) => j !== index && value.lo < other.hi && other.lo < value.hi));
  return from(lo, hi, values, 2, true, !overlapping);
}

/** a % b (JavaScript remainder): exact when no wrap happens across the input, otherwise bounded by |b|. */
export function mod(a: GraphIntervalValue, b: GraphIntervalValue) {
  if (b.lo <= 0 && b.hi >= 0) return from(-Infinity, Infinity, [a, b], b.lo === 0 && b.hi === 0 ? 0 : 1, false, false);
  const bound = Math.max(Math.abs(b.lo), Math.abs(b.hi));
  if (b.lo === b.hi) {
    const qLo = Math.trunc(a.lo / b.lo); const qHi = Math.trunc(a.hi / b.lo);
    if (qLo === qHi) return subtract(a, multiply(point(qLo), b));
  }
  const lo = a.lo >= 0 ? 0 : -bound; const hi = a.hi <= 0 ? 0 : bound;
  return from(lo, hi, [a, b], 2, false, false);
}

/** a^n for an integer n. */
function integerPower(a: GraphIntervalValue, n: number): GraphIntervalValue {
  if (n === 0) return from(1, 1, [a]);
  if (n < 0) return reciprocal(integerPower(a, -n));
  const p = (x: number) => Math.pow(x, n);
  if (n % 2 === 1) return monotone(a, p, true, 2);
  // An even power falls to 0 where the input crosses 0, and is smooth there (unlike |x|).
  const atLo = p(a.lo); const atHi = p(a.hi);
  const lo = a.lo <= 0 && a.hi >= 0 ? 0 : down(Math.min(atLo, atHi), 2);
  return from(lo, up(Math.max(atLo, atHi), 2), [a]);
}

/** a^b. An integer exponent works for any base; otherwise the base must be positive (0 allowed for b > 0). */
export function power(a: GraphIntervalValue, b: GraphIntervalValue): GraphIntervalValue {
  if (b.lo === b.hi && Number.isInteger(b.lo)) return { ...integerPower(a, b.lo), ...joinFlags(integerPower(a, b.lo), b) };
  if (b.lo === b.hi) {
    const exponent = b.lo;
    if (exponent > 0) return joinTo(onDomain(a, 0, Infinity, false, (x) => Math.pow(x, exponent), true), b);
    return joinTo(onDomain(a, 0, Infinity, true, (x) => Math.pow(x, exponent), false, { hi: Infinity }), b);
  }
  // a^b = e^(b ln a) for a varying exponent.
  return exp(multiply(b, ln(a)));
}

function joinFlags(value: GraphIntervalValue, other: GraphIntervalValue) {
  return { defined: Math.min(value.defined, other.defined) as GraphDefinedness, continuous: value.continuous && other.continuous, smooth: value.smooth && other.smooth };
}
function joinTo(value: GraphIntervalValue, other: GraphIntervalValue): GraphIntervalValue { return { ...value, ...joinFlags(value, other) }; }

/** The n-th root (real for odd n and negative values, as the scalar evaluator does). */
export function root(a: GraphIntervalValue, n: GraphIntervalValue): GraphIntervalValue {
  if (n.lo !== n.hi) return power(a, reciprocal(n));
  const degree = n.lo;
  if (Number.isInteger(degree) && Math.abs(degree % 2) === 1) {
    const r = (x: number) => (x < 0 ? -Math.pow(-x, 1 / degree) : Math.pow(x, 1 / degree));
    return joinTo(monotone(a, r, degree > 0), n);
  }
  return power(a, reciprocal(n));
}

/** The intersection of two enclosures of the same quantity (both are true, so the overlap is too). */
export function intersect(a: GraphIntervalValue, b: GraphInterval): GraphIntervalValue {
  return { ...a, lo: Math.max(a.lo, b.lo), hi: Math.min(a.hi, b.hi) };
}
