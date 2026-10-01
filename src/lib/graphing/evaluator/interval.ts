import * as I from './interval-math';
import type { GraphInterval, GraphIntervalValue } from './interval-math';
import type { CompiledGraphExpressionPlan } from './types';

// Interval evaluation on the same postfix tape as the scalar evaluator
// (PTX-ENGINE1, gate E2). Variables are ranges; the result encloses every
// value the expression takes over them, with definedness, continuity and
// smoothness flags. With `tangents`, each entry also carries enclosures of its
// partial derivatives (forward-mode AD over intervals), which the mean-value
// form (E3) and the Krawczyk proofs (E4) need.

export type GraphIntervalEnvironment = Readonly<Record<string, number | GraphInterval>>;

export type GraphIntervalResult = GraphIntervalValue & {
  /** Enclosures of ∂/∂tangent over the input, one per tangent variable. */
  gradient: GraphIntervalValue[];
};

export type GraphIntervalEvaluator = { evaluate(environment: GraphIntervalEnvironment): GraphIntervalResult };

type Entry = { v: GraphIntervalValue; d: GraphIntervalValue[] };

const ZERO = I.point(0);
const ONE = I.point(1);

/** f(a) with slope s(a): every partial of a times the same slope enclosure. */
function chain(a: Entry, value: GraphIntervalValue, slope: () => GraphIntervalValue): Entry {
  if (a.d.every((partial) => partial.lo === 0 && partial.hi === 0)) return { v: value, d: a.d };
  const s = slope();
  return { v: value, d: a.d.map((partial) => (partial.lo === 0 && partial.hi === 0 ? partial : I.multiply(s, partial))) };
}

function sumOf(args: Entry[], k: number): Entry {
  let v = args[0]!.v; let d = args[0]!.d;
  for (const term of args.slice(1)) { v = I.add(v, term.v); d = d.map((partial, index) => I.add(partial, term.d[index]!)); }
  return args.length ? { v, d } : { v: ZERO, d: new Array<GraphIntervalValue>(k).fill(ZERO) };
}

function productOf(a: Entry, b: Entry): Entry {
  return { v: I.multiply(a.v, b.v), d: a.d.map((partial, index) => I.add(I.multiply(partial, b.v), I.multiply(a.v, b.d[index]!))) };
}

function quotientOf(a: Entry, b: Entry): Entry {
  const v = I.divide(a.v, b.v);
  return { v, d: a.d.map((partial, index) => I.divide(I.subtract(partial, I.multiply(v, b.d[index]!)), b.v)) };
}

const square = (x: GraphIntervalValue) => I.power(x, I.point(2));

function apply(operator: string, args: Entry[], k: number): Entry {
  const [a, b] = args as [Entry, Entry];
  switch (operator) {
    case 'Abs': return chain(a, I.abs(a.v), () => I.sign(a.v));
    case 'Add': return sumOf(args, k);
    case 'Arccos': return chain(a, I.acos(a.v), () => I.negate(I.reciprocal(I.sqrt(I.subtract(ONE, square(a.v))))));
    case 'Arcosh': return chain(a, I.acosh(a.v), () => I.reciprocal(I.sqrt(I.subtract(square(a.v), ONE))));
    case 'Arcsin': return chain(a, I.asin(a.v), () => I.reciprocal(I.sqrt(I.subtract(ONE, square(a.v)))));
    case 'Arctan': return chain(a, I.atan(a.v), () => I.reciprocal(I.add(ONE, square(a.v))));
    case 'Arsinh': return chain(a, I.asinh(a.v), () => I.reciprocal(I.sqrt(I.add(square(a.v), ONE))));
    case 'Artanh': return chain(a, I.atanh(a.v), () => I.reciprocal(I.subtract(ONE, square(a.v))));
    case 'Ceil': return chain(a, I.ceil(a.v), () => ZERO);
    case 'Cos': return chain(a, I.cos(a.v), () => I.negate(I.sin(a.v)));
    case 'Cosh': return chain(a, I.cosh(a.v), () => I.sinh(a.v));
    case 'Cot': return chain(a, I.divide(I.cos(a.v), I.sin(a.v)), () => I.negate(I.reciprocal(square(I.sin(a.v)))));
    case 'Csc': return chain(a, I.reciprocal(I.sin(a.v)), () => I.negate(I.divide(I.cos(a.v), square(I.sin(a.v)))));
    case 'Divide': case 'Rational': return quotientOf(a, b);
    case 'Exp': { const v = I.exp(a.v); return chain(a, v, () => v); }
    case 'Floor': return chain(a, I.floor(a.v), () => ZERO);
    case 'Ln': return chain(a, I.ln(a.v), () => I.reciprocal(a.v));
    case 'Log': {
      if (args.length === 1) return chain(a, I.divide(I.ln(a.v), I.point(Math.LN10)), () => I.reciprocal(I.multiply(a.v, I.point(Math.LN10))));
      return quotientOf(chain(a, I.ln(a.v), () => I.reciprocal(a.v)), chain(b, I.ln(b.v), () => I.reciprocal(b.v)));
    }
    case 'Max': case 'Min': {
      const v = operator === 'Max' ? I.maximum(args.map((arg) => arg.v)) : I.minimum(args.map((arg) => arg.v));
      // The slope is one of the arguments' slopes: their hull encloses it.
      const d = args[0]!.d.map((_, index) => {
        const slopes = args.map((arg) => arg.d[index]!);
        const lo = Math.min(...slopes.map((s) => s.lo)); const hi = Math.max(...slopes.map((s) => s.hi));
        const defined = Math.min(v.defined, ...slopes.map((slope) => slope.defined)) as typeof v.defined;
        return { ...I.interval(Number.isNaN(lo) ? -Infinity : lo, Number.isNaN(hi) ? Infinity : hi), defined, continuous: v.smooth, smooth: v.smooth };
      });
      return { v, d };
    }
    case 'Mod': {
      const v = I.mod(a.v, b.v);
      // Away from its jumps a % b has slope a′ for a fixed b; with b varying the slope is not bounded here.
      const fixed = b.d.every((partial) => partial.lo === 0 && partial.hi === 0);
      return { v, d: a.d.map((partial) => (fixed ? partial : { ...I.interval(-Infinity, Infinity), continuous: false, smooth: false })) };
    }
    case 'Multiply': return args.slice(1).reduce(productOf, args[0]!);
    case 'Negate': return { v: I.negate(a.v), d: a.d.map(I.negate) };
    case 'Power': {
      const v = I.power(a.v, b.v);
      const exponentFixed = b.d.every((partial) => partial.lo === 0 && partial.hi === 0);
      if (exponentFixed) {
        if (b.v.lo === 0 && b.v.hi === 0) return { v, d: a.d.map(() => ZERO) };
        // A fixed exponent n gives n·a^(n−1); n − 1 must stay exact so an integer exponent stays an integer.
        const reduced = b.v.lo === b.v.hi ? I.point(b.v.lo - 1) : I.subtract(b.v, ONE);
        return chain(a, v, () => I.multiply(b.v, I.power(a.v, reduced)));
      }
      const lnA = I.ln(a.v);
      return { v, d: a.d.map((partial, index) => I.multiply(v, I.add(I.multiply(b.d[index]!, lnA), I.divide(I.multiply(b.v, partial), a.v)))) };
    }
    case 'Root': { const v = I.root(a.v, b.v); return chain(a, v, () => I.divide(v, I.multiply(b.v, a.v))); }
    case 'Round': return chain(a, I.round(a.v), () => ZERO);
    case 'Sec': return chain(a, I.reciprocal(I.cos(a.v)), () => I.divide(I.sin(a.v), square(I.cos(a.v))));
    case 'Sign': return chain(a, I.sign(a.v), () => ZERO);
    case 'Sin': return chain(a, I.sin(a.v), () => I.cos(a.v));
    case 'Sinh': return chain(a, I.sinh(a.v), () => I.cosh(a.v));
    case 'Sqrt': { const v = I.sqrt(a.v); return chain(a, v, () => I.reciprocal(I.multiply(I.point(2), v))); }
    case 'Tan': return chain(a, I.tan(a.v), () => I.reciprocal(square(I.cos(a.v))));
    case 'Tanh': { const v = I.tanh(a.v); return chain(a, v, () => I.subtract(ONE, square(v))); }
    default: return { v: { lo: Number.NaN, hi: Number.NaN, defined: 0, continuous: false, smooth: false }, d: [] };
  }
}

/** Interval evaluation of a compiled plan; `tangents` are the variables to differentiate by (none for ranges alone). */
export function createGraphIntervalEvaluator(plan: CompiledGraphExpressionPlan, tangents: readonly string[] = []): GraphIntervalEvaluator {
  const k = tangents.length;
  const nowhere = (): GraphIntervalResult => ({ lo: Number.NaN, hi: Number.NaN, defined: 0, continuous: false, smooth: false, gradient: [] });
  return {
    evaluate(environment) {
      const stack: Entry[] = [];
      for (const instruction of plan.instructions) {
        if (instruction.kind === 'literal') { stack.push({ v: I.point(instruction.value), d: new Array<GraphIntervalValue>(k).fill(ZERO) }); continue; }
        if (instruction.kind === 'symbol') {
          const value = environment[instruction.symbol];
          if (value === undefined) return nowhere();
          const v = typeof value === 'number' ? I.point(value) : I.interval(value.lo, value.hi);
          if (!(v.lo <= v.hi)) return nowhere();
          stack.push({ v, d: tangents.map((tangent) => (tangent === instruction.symbol ? ONE : ZERO)) });
          continue;
        }
        if (stack.length < instruction.arity) return nowhere();
        const args = stack.splice(stack.length - instruction.arity, instruction.arity);
        const result = apply(instruction.operator, args, k);
        if (result.v.defined === 0) return nowhere();
        stack.push(result);
      }
      if (stack.length !== 1) return nowhere();
      const top = stack[0]!;
      return { ...top.v, gradient: top.d };
    },
  };
}
