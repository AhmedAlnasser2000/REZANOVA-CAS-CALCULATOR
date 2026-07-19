import type {
  GraphConditionIR,
  GraphExpressionIR,
  GraphStopReason,
} from '../contracts';
import {
  createGraphExpressionEvaluator,
  GraphExpressionPlanCache,
  type GraphEvaluationEnvironment,
  type GraphExpressionEvaluator,
} from '../evaluator';

type CompiledExpression = { evaluator: GraphExpressionEvaluator };

export type CompiledGraphCondition = {
  test(environment: GraphEvaluationEnvironment): boolean | null;
};

type CompileResult =
  | { ok: true; condition: CompiledGraphCondition }
  | { ok: false; stopReason: GraphStopReason };

function compare(left: number, operator: string, right: number) {
  if (operator === '<') return left < right;
  if (operator === '<=') return left <= right;
  if (operator === '=') return left === right;
  if (operator === '>=') return left >= right;
  return left > right;
}

export function compileGraphCondition(input: {
  condition: GraphConditionIR;
  itemId: string;
  branchId: string;
  sourceRevision: number;
  cache: GraphExpressionPlanCache;
}): CompileResult {
  let expressionIndex = 0;
  const compile = (expression: GraphExpressionIR): CompiledExpression | GraphStopReason => {
    const index = expressionIndex++;
    const compiled = input.cache.getOrCompile({
      planId: `${input.itemId}:${input.branchId}:condition:${index}`,
      sourceRevision: input.sourceRevision,
      expression,
    });
    return compiled.ok
      ? { evaluator: createGraphExpressionEvaluator(compiled.plan) }
      : compiled.stopReason;
  };
  const build = (
    condition: GraphConditionIR,
  ): ((environment: GraphEvaluationEnvironment) => boolean | null) | GraphStopReason => {
    if (condition.kind === 'constant') return () => condition.value;
    if (condition.kind === 'and') {
      const clauses = condition.clauses.map(build);
      const failure = clauses.find((clause): clause is GraphStopReason => typeof clause !== 'function');
      if (failure) return failure;
      const compiledClauses = clauses as Array<(
        environment: GraphEvaluationEnvironment
      ) => boolean | null>;
      return (environment) => {
        for (const clause of compiledClauses) {
          const value = clause(environment);
          if (value === null) return null;
          if (!value) return false;
        }
        return true;
      };
    }
    const expressions = condition.kind === 'comparison'
      ? [condition.left, condition.right]
      : condition.kind === 'chain'
        ? condition.operands
        : [condition.value, condition.minimum, condition.maximum].filter(
            (value): value is GraphExpressionIR => value !== undefined,
          );
    const compiled = expressions.map(compile);
    const failure = compiled.find((entry): entry is GraphStopReason => !('evaluator' in entry));
    if (failure) return failure;
    const evaluators = (compiled as CompiledExpression[]).map((entry) => entry.evaluator);
    return (environment) => {
      const values = evaluators.map((evaluator) => evaluator.evaluate(environment));
      if (values.some((value) => value.status !== 'finite')) return null;
      const finite = values.map((value) => value.status === 'finite' ? value.value : Number.NaN);
      if (condition.kind === 'comparison') return compare(finite[0], condition.operator, finite[1]);
      if (condition.kind === 'chain') {
        return condition.operators.every((operator, index) => (
          compare(finite[index], operator, finite[index + 1])
        ));
      }
      let cursor = 1;
      if (condition.minimum) {
        const minimum = finite[cursor++];
        if (condition.minimumInclusive ? finite[0] < minimum : finite[0] <= minimum) return false;
      }
      if (condition.maximum) {
        const maximum = finite[cursor];
        if (condition.maximumInclusive ? finite[0] > maximum : finite[0] >= maximum) return false;
      }
      return true;
    };
  };
  const condition = build(input.condition);
  return typeof condition === 'function'
    ? { ok: true, condition: { test: condition } }
    : { ok: false, stopReason: condition };
}
