import type { CompiledGraphExpressionPlan, GraphEvaluationEnvironment } from './types';

// Double-double arithmetic (PTX-ENGINE1, gate E8): a number is the unevaluated
// sum hi + lo of two doubles, about 32 significant digits. It is the
// escalation lane for values ordinary doubles cannot decide: cancellation
// such as (eˣ − 1)/x near 0, or readouts at extreme zoom. Each result carries
// a running bound on its absolute error, propagated operation by operation,
// so callers can show only the digits it supports.

export type GraphDoubleDouble = { hi: number; lo: number };
export type GraphPreciseResult = { value: GraphDoubleDouble; error: number };

const SPLIT = 134217729; // 2^27 + 1
const U = 2 ** -104; // unit roundoff of double-double, roughly
const LIBRARY_RELATIVE = 2 ** -88; // series, range reduction and exp's nine squarings (measured near 1e-29 relative), with margin

function twoSum(a: number, b: number): GraphDoubleDouble {
  const s = a + b; const bb = s - a;
  return { hi: s, lo: (a - (s - bb)) + (b - bb) };
}
function quickTwoSum(a: number, b: number): GraphDoubleDouble {
  const s = a + b; return { hi: s, lo: b - (s - a) };
}
function split(a: number) {
  const t = SPLIT * a; const hi = t - (t - a); return [hi, a - hi] as const;
}
function twoProduct(a: number, b: number): GraphDoubleDouble {
  const p = a * b;
  const [ah, al] = split(a); const [bh, bl] = split(b);
  return { hi: p, lo: ((ah * bh - p) + ah * bl + al * bh) + al * bl };
}

export const dd = (hi: number, lo = 0): GraphDoubleDouble => ({ hi, lo });
export const ddToNumber = (a: GraphDoubleDouble) => a.hi + a.lo;

export function ddAdd(a: GraphDoubleDouble, b: GraphDoubleDouble): GraphDoubleDouble {
  const s = twoSum(a.hi, b.hi); const t = twoSum(a.lo, b.lo);
  let r = quickTwoSum(s.hi, s.lo + t.hi);
  r = quickTwoSum(r.hi, r.lo + t.lo);
  return r;
}
export const ddNegate = (a: GraphDoubleDouble): GraphDoubleDouble => ({ hi: -a.hi, lo: -a.lo });
export const ddSubtract = (a: GraphDoubleDouble, b: GraphDoubleDouble) => ddAdd(a, ddNegate(b));
export function ddMultiply(a: GraphDoubleDouble, b: GraphDoubleDouble): GraphDoubleDouble {
  const p = twoProduct(a.hi, b.hi);
  return quickTwoSum(p.hi, p.lo + (a.hi * b.lo + a.lo * b.hi));
}
export function ddDivide(a: GraphDoubleDouble, b: GraphDoubleDouble): GraphDoubleDouble {
  const q1 = a.hi / b.hi;
  let r = ddSubtract(a, ddMultiply(b, dd(q1)));
  const q2 = r.hi / b.hi;
  r = ddSubtract(r, ddMultiply(b, dd(q2)));
  const q3 = r.hi / b.hi;
  return ddAdd(quickTwoSum(q1, q2), dd(q3));
}
export function ddSqrt(a: GraphDoubleDouble): GraphDoubleDouble {
  if (a.hi <= 0) return dd(a.hi === 0 ? 0 : Number.NaN);
  const x = Math.sqrt(a.hi);
  // One Newton step from the double square root: x + (a − x²)/(2x).
  const residual = ddSubtract(a, twoProduct(x, x));
  return ddAdd(dd(x), dd(residual.hi / (2 * x)));
}
const scale = (a: GraphDoubleDouble, factor: number): GraphDoubleDouble => ({ hi: a.hi * factor, lo: a.lo * factor });

const LN2 = dd(0.6931471805599453, 2.3190468138462996e-17);
const PI = dd(3.141592653589793, 1.2246467991473532e-16);
const HALF_PI = scale(PI, 0.5);

export function ddExp(a: GraphDoubleDouble): GraphDoubleDouble {
  if (a.hi > 709.7) return dd(Infinity);
  if (a.hi < -745) return dd(0);
  // eᵃ = 2ᵏ · (e^(r/512))^512 with r = a − k ln 2 small.
  const k = Math.round(a.hi / LN2.hi);
  const r = scale(ddSubtract(a, scale(LN2, k)), 1 / 512);
  let term = dd(1); let sum = dd(1);
  for (let n = 1; n < 30; n += 1) {
    term = ddDivide(ddMultiply(term, r), dd(n));
    sum = ddAdd(sum, term);
    if (Math.abs(term.hi) < 1e-36) break;
  }
  for (let squaring = 0; squaring < 9; squaring += 1) sum = ddMultiply(sum, sum);
  return scale(sum, 2 ** k);
}

export function ddLog(a: GraphDoubleDouble): GraphDoubleDouble {
  if (!(a.hi > 0)) return dd(a.hi === 0 ? -Infinity : Number.NaN);
  // Newton on eʸ = a from the double logarithm: y ← y + a·e^(−y) − 1, twice.
  let y = dd(Math.log(a.hi));
  for (let step = 0; step < 2; step += 1) y = ddAdd(y, ddSubtract(ddMultiply(a, ddExp(ddNegate(y))), dd(1)));
  return y;
}

function sinCosReduced(r: GraphDoubleDouble) {
  // Taylor series on |r| ≤ π/4.
  const r2 = ddMultiply(r, r);
  let sinTerm = r; let sinSum = r; let cosTerm = dd(1); let cosSum = dd(1);
  for (let n = 1; n < 25; n += 1) {
    sinTerm = ddDivide(ddMultiply(sinTerm, ddNegate(r2)), dd((2 * n) * (2 * n + 1)));
    cosTerm = ddDivide(ddMultiply(cosTerm, ddNegate(r2)), dd((2 * n - 1) * (2 * n)));
    sinSum = ddAdd(sinSum, sinTerm); cosSum = ddAdd(cosSum, cosTerm);
    if (Math.abs(sinTerm.hi) < 1e-36 && Math.abs(cosTerm.hi) < 1e-36) break;
  }
  return { sin: sinSum, cos: cosSum };
}

/** sin and cos together, reduced by multiples of π/2 (accurate while |a| is modest; large arguments lose the lane). */
export function ddSinCos(a: GraphDoubleDouble) {
  const k = Math.round(a.hi / HALF_PI.hi);
  const r = ddSubtract(a, ddMultiply(HALF_PI, dd(k)));
  const { sin, cos } = sinCosReduced(r);
  switch (((k % 4) + 4) % 4) {
    case 0: return { sin, cos };
    case 1: return { sin: cos, cos: ddNegate(sin) };
    case 2: return { sin: ddNegate(sin), cos: ddNegate(cos) };
    default: return { sin: ddNegate(cos), cos: sin };
  }
}

type Entry = { v: GraphDoubleDouble; e: number };
const magnitude = (a: GraphDoubleDouble) => Math.abs(a.hi);

/** Value and error bound of a library function f(a) with |f′| ≤ `slope` near a. */
function unary(a: Entry, value: GraphDoubleDouble, slope: number): Entry {
  return { v: value, e: 2 * Math.abs(slope) * a.e + LIBRARY_RELATIVE * magnitude(value) + 1e-300 };
}

function apply(operator: string, args: Entry[]): Entry | null {
  const [a, b] = args as [Entry, Entry];
  switch (operator) {
    case 'Add': return args.slice(1).reduce((s, t) => { const v = ddAdd(s.v, t.v); return { v, e: s.e + t.e + U * magnitude(v) }; }, args[0]!);
    case 'Negate': return { v: ddNegate(a.v), e: a.e };
    case 'Multiply': return args.slice(1).reduce((s, t) => {
      const v = ddMultiply(s.v, t.v);
      return { v, e: magnitude(s.v) * t.e + magnitude(t.v) * s.e + s.e * t.e + U * magnitude(v) };
    }, args[0]!);
    case 'Divide': case 'Rational': {
      if (magnitude(b.v) <= b.e) return null;
      const v = ddDivide(a.v, b.v);
      // |a/b − ã/b̃| ≤ (|ã|·e_b/|b̃| + e_a)/(|b̃| − e_b)
      return { v, e: (a.e + magnitude(v) * b.e) / (magnitude(b.v) - b.e) + 2 * U * magnitude(v) };
    }
    case 'Power': {
      const exponent = ddToNumber(b.v);
      if (b.e === 0 && Number.isInteger(exponent) && Math.abs(exponent) <= 64) {
        let result: Entry = { v: dd(1), e: 0 }; const base = exponent < 0 ? null : a;
        if (!base) { const inverse = apply('Divide', [{ v: dd(1), e: 0 }, a]); if (!inverse) return null; return apply('Power', [inverse, { v: dd(-exponent), e: 0 }]); }
        for (let index = 0; index < exponent; index += 1) result = apply('Multiply', [result, base])!;
        return result;
      }
      if (!(a.v.hi > 0)) return null;
      const logged = apply('Ln', [a]); if (!logged) return null;
      const product = apply('Multiply', [b, logged])!;
      return apply('Exp', [product]);
    }
    case 'Sqrt': {
      if (a.v.hi < 0 || magnitude(a.v) <= a.e) return null;
      const v = ddSqrt(a.v);
      return unary(a, v, 1 / (2 * Math.sqrt(Math.max(magnitude(a.v) - a.e, Number.MIN_VALUE))));
    }
    case 'Exp': { const v = ddExp(a.v); return unary(a, v, Math.exp(a.v.hi + a.e)); }
    case 'Ln': {
      if (!(a.v.hi - a.e > 0)) return null;
      return unary(a, ddLog(a.v), 1 / (a.v.hi - a.e));
    }
    case 'Sin': case 'Cos': {
      if (Math.abs(a.v.hi) > 1e6) return null;
      const both = ddSinCos(a.v);
      return unary(a, operator === 'Sin' ? both.sin : both.cos, 1);
    }
    case 'Tan': {
      if (Math.abs(a.v.hi) > 1e6) return null;
      const both = ddSinCos(a.v);
      const cos = ddToNumber(both.cos);
      if (Math.abs(cos) <= 2 * a.e) return null;
      return unary(a, ddDivide(both.sin, both.cos), 1 / ((Math.abs(cos) - a.e) ** 2));
    }
    case 'Abs': return { v: a.v.hi < 0 ? ddNegate(a.v) : a.v, e: a.e };
    default: return null;
  }
}

/**
 * Double-double evaluation of a plan: the value and a bound on its absolute
 * error, or null where an operation is outside this lane (inverse trig and
 * hyperbolic functions, steps, huge trig arguments) or undefined.
 */
export function createGraphDoubleDoubleEvaluator(plan: CompiledGraphExpressionPlan) {
  return {
    evaluate(environment: GraphEvaluationEnvironment): GraphPreciseResult | null {
      const stack: Entry[] = [];
      for (const instruction of plan.instructions) {
        // A typed decimal such as 0.1 is not a double: its literal carries half an ulp of doubt (integers are exact).
        if (instruction.kind === 'literal') { stack.push({ v: dd(instruction.value), e: Number.isInteger(instruction.value) ? 0 : Math.abs(instruction.value) * 2 ** -53 }); continue; }
        if (instruction.kind === 'symbol') {
          const value = environment[instruction.symbol];
          if (value === undefined || !Number.isFinite(value)) return null;
          stack.push({ v: dd(value), e: 0 });
          continue;
        }
        if (stack.length < instruction.arity) return null;
        const result = apply(instruction.operator, stack.splice(stack.length - instruction.arity, instruction.arity));
        if (!result || !Number.isFinite(result.v.hi) || !Number.isFinite(result.e)) return null;
        stack.push(result);
      }
      return stack.length === 1 ? { value: stack[0]!.v, error: stack[0]!.e } : null;
    },
  };
}
