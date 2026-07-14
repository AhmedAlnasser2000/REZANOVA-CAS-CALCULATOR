import type {
  CalculateAction,
  EquationAction,
  ExpressionExecutionBudget,
  EvaluateRequest,
  EvaluateResponse,
  TableResponse,
} from '../../../types/calculator';

export type SymbolicAction =
  | CalculateAction
  | EquationAction;

import type { SerializableMathJson } from '../../../types/calculator';

export type BoxedLike = {
  latex: string;
  json: SerializableMathJson;
  operator?: string;
  solve?: (symbol: string) => unknown;
  simplify: () => BoxedLike;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type PreparedExpressionRequest =
  | {
      kind: 'ready';
      rawLatex: string;
      limitDirectionOverride?: 'left' | 'right';
    }
  | {
      kind: 'done';
      response: EvaluateResponse;
    };

export type PreparedExpressionRuntime =
  | {
      kind: 'ready';
      expr: BoxedLike;
      sourceLatex: string;
      warnings: string[];
    }
  | {
      kind: 'done';
      response: EvaluateResponse;
    };

export type PreparedExpressionRequestReady = Extract<PreparedExpressionRequest, { kind: 'ready' }>;
export type PreparedExpressionRuntimeReady = Extract<PreparedExpressionRuntime, { kind: 'ready' }>;

export type ExpressionActionContext = {
  request: EvaluateRequest;
  action: SymbolicAction;
  executionBudget: ExpressionExecutionBudget;
  preparedRequest: PreparedExpressionRequestReady;
  preparedRuntime: PreparedExpressionRuntimeReady;
};

export type ExpressionActionDescriptor = {
  id: SymbolicAction;
  label: string;
  execute: (context: ExpressionActionContext) => EvaluateResponse;
  publicCapabilityId?: 'expression.evaluate' | 'expression.simplify' | 'expression.factor' | 'expression.expand';
};

export type PreparedTableBuild =
  | {
      kind: 'error';
      response: TableResponse;
    }
  | {
      kind: 'ready';
      primaryLatex: string;
      secondaryLatex: string | null | undefined;
      estimatedRows: number;
    };

export type TableMathJsonCellEvidence = {
  canonicalLatex: string;
  mathJson?: SerializableMathJson;
  undefinedReason?: 'outside-real-domain' | 'pole';
};

export type TableMathJsonEvidence = {
  functions: TableMathJsonCellEvidence;
  variable: TableMathJsonCellEvidence;
  rows: Array<{
    x: TableMathJsonCellEvidence;
    primary: TableMathJsonCellEvidence;
    secondary?: TableMathJsonCellEvidence;
  }>;
};

export type TableBuildWithEvidence = {
  response: TableResponse;
  evidence?: TableMathJsonEvidence;
};

export type CooperativeTableBuildWithEvidenceResult =
  | {
      kind: 'completed';
      response: TableResponse;
      evidence?: TableMathJsonEvidence;
    }
  | {
      kind: 'cancelled';
    };

export type CooperativeTableBuildOptions = {
  rowsPerBatch?: number;
  shouldCancel?: () => boolean;
  onCheckpoint?: (checkpoint: {
    completedRows: number;
    totalRows: number;
  }) => void;
  yieldIfBudgetExceeded?: (message?: string) => Promise<unknown>;
};

export type CooperativeTableBuildResult =
  | {
      kind: 'completed';
      response: TableResponse;
    }
  | {
      kind: 'cancelled';
    };
