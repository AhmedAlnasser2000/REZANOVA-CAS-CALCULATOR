import type { CompiledGraphExpressionPlan, GraphEvaluationEnvironment } from './types';

// Forward-mode automatic differentiation on the same postfix tape as the
// scalar evaluator (PTX-ENGINE1, gate E1): every stack entry carries its value
// and its derivatives with respect to the chosen variables, pushed through
// each operator by the chain rule. Derivatives are exact up to rounding, unlike
// finite differences, which lose about half the digits.

export type GraphDualResult =
  | { status: 'finite'; value: number; gradient: number[] }
  | { status: 'non-finite' };

export type GraphDualEvaluator = { evaluate(environment: GraphEvaluationEnvironment): GraphDualResult };

type Dual = { v: number; d: number[] };

function oddIntegerRoot(value: number, degree: number) {
  if (value < 0 && Number.isInteger(degree) && Math.abs(degree % 2) === 1) return -Math.pow(-value, 1 / degree);
  return Math.pow(value, 1 / degree);
}

/** f(a) with f'(a): the chain rule scales every partial of a by the same factor. */
const chain = (a: Dual, value: number, slope: number): Dual => ({ v: value, d: a.d.map((partial) => (partial === 0 ? 0 : slope * partial)) });
const constant = (value: number, k: number): Dual => ({ v: value, d: new Array<number>(k).fill(0) });

function product(a: Dual, b: Dual): Dual {
  return { v: a.v * b.v, d: a.d.map((partial, index) => partial * b.v + a.v * b.d[index]!) };
}

function quotient(a: Dual, b: Dual): Dual {
  const v = a.v / b.v;
  return { v, d: a.d.map((partial, index) => (partial - v * b.d[index]!) / b.v) };
}

function power(a: Dual, b: Dual): Dual {
  const v = Math.pow(a.v, b.v);
  const exponentVaries = b.d.some((partial) => partial !== 0);
  if (!exponentVaries) {
    // A constant exponent works for negative bases too: (a^n)' = n a^(n−1) a'.
    const slope = b.v === 0 ? 0 : b.v * Math.pow(a.v, b.v - 1);
    return chain(a, v, slope);
  }
  // a^b = e^(b ln a): (a^b)' = a^b (b' ln a + b a'/a), which needs a > 0.
  const ln = Math.log(a.v);
  return { v, d: a.d.map((partial, index) => v * (b.d[index]! * ln + b.v * partial / a.v)) };
}

function apply(operator: string, args: Dual[], k: number): Dual {
  const [a, b] = args as [Dual, Dual];
  switch (operator) {
    case 'Abs': return chain(a, Math.abs(a.v), Math.sign(a.v));
    case 'Add': return args.reduce((sum, term) => ({ v: sum.v + term.v, d: sum.d.map((partial, index) => partial + term.d[index]!) }), constant(0, k));
    case 'Arccos': return chain(a, Math.acos(a.v), -1 / Math.sqrt(1 - a.v * a.v));
    case 'Arcosh': return chain(a, Math.acosh(a.v), 1 / Math.sqrt(a.v * a.v - 1));
    case 'Arcsin': return chain(a, Math.asin(a.v), 1 / Math.sqrt(1 - a.v * a.v));
    case 'Arctan': return chain(a, Math.atan(a.v), 1 / (1 + a.v * a.v));
    case 'Arsinh': return chain(a, Math.asinh(a.v), 1 / Math.sqrt(a.v * a.v + 1));
    case 'Artanh': return chain(a, Math.atanh(a.v), 1 / (1 - a.v * a.v));
    case 'Ceil': return chain(a, Math.ceil(a.v), 0);
    case 'Cos': return chain(a, Math.cos(a.v), -Math.sin(a.v));
    case 'Cosh': return chain(a, Math.cosh(a.v), Math.sinh(a.v));
    case 'Cot': { const s = Math.sin(a.v); return chain(a, Math.cos(a.v) / s, -1 / (s * s)); }
    case 'Csc': { const s = Math.sin(a.v); return chain(a, 1 / s, -Math.cos(a.v) / (s * s)); }
    case 'Divide': case 'Rational': return quotient(a, b);
    case 'Exp': { const value = Math.exp(a.v); return chain(a, value, value); }
    case 'Floor': return chain(a, Math.floor(a.v), 0);
    case 'Ln': return chain(a, Math.log(a.v), 1 / a.v);
    case 'Log': {
      if (args.length === 1) return chain(a, Math.log10(a.v), 1 / (a.v * Math.LN10));
      return quotient(chain(a, Math.log(a.v), 1 / a.v), chain(b, Math.log(b.v), 1 / b.v));
    }
    case 'Max': case 'Min': {
      let best = a;
      for (const candidate of args) if (operator === 'Max' ? candidate.v > best.v : candidate.v < best.v) best = candidate;
      return { v: best.v, d: [...best.d] };
    }
    case 'Mod': {
      // a % b = a − trunc(a/b)·b, so its slope is a' − trunc(a/b)·b' away from the jumps.
      const q = Math.trunc(a.v / b.v);
      return { v: a.v % b.v, d: a.d.map((partial, index) => partial - q * b.d[index]!) };
    }
    case 'Multiply': return args.reduce(product, constant(1, k));
    case 'Negate': return chain(a, -a.v, -1);
    case 'Power': return power(a, b);
    case 'Root': {
      const value = oddIntegerRoot(a.v, b.v);
      return chain(a, value, value / (b.v * a.v));
    }
    case 'Round': return chain(a, Math.round(a.v), 0);
    case 'Sec': { const c = Math.cos(a.v); return chain(a, 1 / c, Math.sin(a.v) / (c * c)); }
    case 'Sign': return chain(a, Math.sign(a.v), 0);
    case 'Sin': return chain(a, Math.sin(a.v), Math.cos(a.v));
    case 'Sinh': return chain(a, Math.sinh(a.v), Math.cosh(a.v));
    case 'Sqrt': { const value = Math.sqrt(a.v); return chain(a, value, 1 / (2 * value)); }
    case 'Tan': { const c = Math.cos(a.v); return chain(a, Math.tan(a.v), 1 / (c * c)); }
    case 'Tanh': { const value = Math.tanh(a.v); return chain(a, value, 1 - value * value); }
    default: return { v: Number.NaN, d: new Array<number>(k).fill(Number.NaN) };
  }
}

/**
 * Value and gradient of a compiled plan with respect to `variables` (x, or x
 * and y, or t). A result whose value is not finite is `non-finite`; a finite
 * value whose derivative does not exist there (|x| at 0 is reported as 0,
 * √x at 0 as ∞) keeps a non-finite partial for the caller to check.
 */
export function createGraphDualEvaluator(plan: CompiledGraphExpressionPlan, variables: readonly string[]): GraphDualEvaluator {
  const k = variables.length;
  return {
    evaluate(environment) {
      const stack: Dual[] = [];
      for (const instruction of plan.instructions) {
        if (instruction.kind === 'literal') { stack.push(constant(instruction.value, k)); continue; }
        if (instruction.kind === 'symbol') {
          const value = environment[instruction.symbol];
          if (value === undefined || !Number.isFinite(value)) return { status: 'non-finite' };
          stack.push({ v: value, d: variables.map((variable) => (variable === instruction.symbol ? 1 : 0)) });
          continue;
        }
        if (stack.length < instruction.arity) return { status: 'non-finite' };
        const args = stack.splice(stack.length - instruction.arity, instruction.arity);
        if ((instruction.operator === 'Divide' || instruction.operator === 'Rational' || instruction.operator === 'Mod') && args[1]!.v === 0) {
          return { status: 'non-finite' };
        }
        const result = apply(instruction.operator, args, k);
        if (!Number.isFinite(result.v)) return { status: 'non-finite' };
        stack.push(result);
      }
      if (stack.length !== 1) return { status: 'non-finite' };
      return { status: 'finite', value: stack[0]!.v, gradient: stack[0]!.d };
    },
  };
}
