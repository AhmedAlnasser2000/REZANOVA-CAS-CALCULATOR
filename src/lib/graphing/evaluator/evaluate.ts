import type {
  CompiledGraphExpressionPlan,
  GraphEvaluationEnvironment,
  GraphEvaluationResult,
  GraphExpressionEvaluator,
} from './types';

const nonFinite = (
  reason: Extract<GraphEvaluationResult, { status: 'non-finite' }>['reason'],
  symbol?: string,
): GraphEvaluationResult => ({
  status: 'non-finite',
  reason,
  ...(symbol ? { symbol } : {}),
});

function oddIntegerRoot(value: number, degree: number) {
  if (value < 0 && Number.isInteger(degree) && Math.abs(degree % 2) === 1) {
    return -Math.pow(-value, 1 / degree);
  }
  return Math.pow(value, 1 / degree);
}

function applyGraphOperator(
  operator: string,
  stack: Float64Array,
  start: number,
  arity: number,
): number {
  const first = stack[start];
  const second = stack[start + 1];
  switch (operator) {
    case 'Abs': return Math.abs(first);
    case 'Add': {
      let result = 0;
      for (let index = 0; index < arity; index += 1) result += stack[start + index];
      return result;
    }
    case 'Arccos': return Math.acos(first);
    case 'Arcosh': return Math.acosh(first);
    case 'Arcsin': return Math.asin(first);
    case 'Arctan': return Math.atan(first);
    case 'Arsinh': return Math.asinh(first);
    case 'Artanh': return Math.atanh(first);
    case 'Ceil': return Math.ceil(first);
    case 'Cos': return Math.cos(first);
    case 'Cosh': return Math.cosh(first);
    case 'Cot': return 1 / Math.tan(first);
    case 'Csc': return 1 / Math.sin(first);
    case 'Divide': return first / second;
    case 'Exp': return Math.exp(first);
    case 'Floor': return Math.floor(first);
    case 'Ln': return Math.log(first);
    case 'Log': return arity === 1
      ? Math.log10(first)
      : Math.log(first) / Math.log(second);
    case 'Max': {
      let result = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < arity; index += 1) result = Math.max(result, stack[start + index]);
      return result;
    }
    case 'Min': {
      let result = Number.POSITIVE_INFINITY;
      for (let index = 0; index < arity; index += 1) result = Math.min(result, stack[start + index]);
      return result;
    }
    case 'Mod': return first % second;
    case 'Multiply': {
      let result = 1;
      for (let index = 0; index < arity; index += 1) result *= stack[start + index];
      return result;
    }
    case 'Negate': return -first;
    case 'Power': return Math.pow(first, second);
    case 'Rational': return first / second;
    case 'Root': return oddIntegerRoot(first, second);
    case 'Round': return Math.round(first);
    case 'Sec': return 1 / Math.cos(first);
    case 'Sign': return Math.sign(first);
    case 'Sin': return Math.sin(first);
    case 'Sinh': return Math.sinh(first);
    case 'Sqrt': return Math.sqrt(first);
    case 'Tan': return Math.tan(first);
    case 'Tanh': return Math.tanh(first);
    default: return Number.NaN;
  }
}

export function evaluateCompiledGraphExpression(
  plan: CompiledGraphExpressionPlan,
  environment: GraphEvaluationEnvironment,
): GraphEvaluationResult {
  return createGraphExpressionEvaluator(plan).evaluate(environment);
}

export function createGraphExpressionEvaluator(
  plan: CompiledGraphExpressionPlan,
): GraphExpressionEvaluator {
  const stack = new Float64Array(Math.max(1, plan.instructions.length));
  return {
    evaluate(environment) {
      let stackSize = 0;
      for (const instruction of plan.instructions) {
        if (instruction.kind === 'literal') {
          stack[stackSize] = instruction.value;
          stackSize += 1;
          continue;
        }
        if (instruction.kind === 'symbol') {
          const value = environment[instruction.symbol];
          if (value === undefined || !Number.isFinite(value)) {
            return nonFinite('missing-symbol', instruction.symbol);
          }
          stack[stackSize] = value;
          stackSize += 1;
          continue;
        }
        if (stackSize < instruction.arity) return nonFinite('invalid-plan');
        const start = stackSize - instruction.arity;
        if ((instruction.operator === 'Divide'
          || instruction.operator === 'Rational'
          || instruction.operator === 'Mod')
          && stack[start + 1] === 0) {
          return nonFinite('division-by-zero');
        }
        const value = applyGraphOperator(instruction.operator, stack, start, instruction.arity);
        if (Number.isNaN(value)) return nonFinite('domain');
        if (!Number.isFinite(value)) return nonFinite('overflow');
        stack[start] = value;
        stackSize = start + 1;
      }
      if (stackSize !== 1) return nonFinite('invalid-plan');
      return { status: 'finite', value: stack[0] };
    },
  };
}
