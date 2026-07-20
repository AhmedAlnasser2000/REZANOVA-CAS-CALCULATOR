import type { GraphExpressionIR, GraphStopReason } from '../contracts';

export type GraphEvaluationInstruction =
  | { kind: 'literal'; value: number }
  | { kind: 'symbol'; symbol: string }
  | { kind: 'operator'; operator: string; arity: number };

export type GraphPeriodicSamplingHintV1 = {
  operator: 'Sin' | 'Cos' | 'Tan';
  independentSymbol: string;
  coefficient: { kind: 'constant'; value: number } | { kind: 'symbol'; symbol: string };
};

export type CompiledGraphExpressionPlan = {
  planId: string;
  sourceRevision: number;
  instructions: readonly GraphEvaluationInstruction[];
  requiredSymbols: readonly string[];
  samplingHints: {
    periodic: readonly GraphPeriodicSamplingHintV1[];
  };
};

export type GraphExpressionCompileInput = {
  planId: string;
  sourceRevision: number;
  expression: GraphExpressionIR;
};

export type GraphExpressionCompileResult =
  | { ok: true; plan: CompiledGraphExpressionPlan }
  | { ok: false; stopReason: GraphStopReason };

export type GraphEvaluationEnvironment = Readonly<Record<string, number>>;

export type GraphExpressionEvaluator = {
  evaluate(environment: GraphEvaluationEnvironment): GraphEvaluationResult;
};

export type GraphEvaluationResult =
  | { status: 'finite'; value: number }
  | {
      status: 'non-finite';
      reason: 'domain' | 'division-by-zero' | 'missing-symbol' | 'overflow' | 'invalid-plan';
      symbol?: string;
    };
