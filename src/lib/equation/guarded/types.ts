import { runExpressionAction } from '../../engine/math-engine';
import type {
  DisplayOutcome,
  EquationExecutionBudget,
  GuardedSolveRequest,
} from '../../../types/calculator';

export type GuardedEquationStageId =
  | 'numeric-interval'
  | 'bounded-polynomial'
  | 'algebra-transform'
  | 'composition'
  | 'direct-trig'
  | 'rewrite-trig'
  | 'substitution'
  | 'direct-symbolic';

export type SymbolicSolveResult = ReturnType<typeof runExpressionAction>;

export type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

export type AsyncGuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => Promise<DisplayOutcome>;

export type GuardedEquationDirectSymbolicHostEvidence = {
  helperId: 'direct-symbolic';
  stageId: 'direct-symbolic';
  depth: number;
  selectedHostId: string;
  fallbackFromHostId?: string;
  fallbackReason?: string;
  isolated: boolean;
  terminalStatus: 'completed' | 'fallback' | 'cancelled' | 'failed';
  termination?: 'hardStop';
};

export type GuardedEquationDirectSymbolicRunnerResult = {
  outcome: DisplayOutcome;
  hostEvidence: GuardedEquationDirectSymbolicHostEvidence;
};

export type GuardedEquationDirectSymbolicRunner = (input: {
  request: GuardedSolveRequest;
  depth: number;
  stageId: 'direct-symbolic';
}) => Promise<GuardedEquationDirectSymbolicRunnerResult>;

export const EQUATION_SOLVE_CANCELLED_MESSAGE =
  'Equation solve was stopped before it finished.';

export type GuardedEquationCancellationPhase =
  | 'before-stage'
  | 'after-stage-no-outcome'
  | 'before-recursive-handoff'
  | 'before-direct-symbolic'
  | 'helper-checkpoint'
  | 'helper-yield';

export type GuardedEquationCancellationEvidence = {
  depth: number;
  stageId?: GuardedEquationStageId;
  phase: GuardedEquationCancellationPhase;
  reason: string;
  helperId?: string;
  family?: string;
  branchIndex?: number;
  candidateIndex?: number;
  message?: string;
};

export type GuardedEquationSolveControl = {
  shouldCancel?: () => boolean;
  checkpoint?: (message: string) => void;
  yieldIfBudgetExceeded?: (message?: string) => Promise<unknown>;
};

export type GuardedEquationSolveOptions = {
  control?: GuardedEquationSolveControl;
  directSymbolicRunner?: GuardedEquationDirectSymbolicRunner;
};

export type GuardedEquationStageContext = {
  preparedRequest: GuardedSolveRequest;
  originalResolvedLatex: string;
  depth: number;
  trail: Set<string>;
  executionBudget: EquationExecutionBudget;
  getSymbolic: () => SymbolicSolveResult;
  runner: GuardedSolveRunner;
  asyncRunner?: AsyncGuardedSolveRunner;
  control?: GuardedEquationSolveControl;
  trace?: GuardedEquationStageReplayTrace;
  directSymbolicRunner?: GuardedEquationDirectSymbolicRunner;
};

export type GuardedEquationCooperativeCheckpointInput = {
  helperId: string;
  family?: string;
  branchIndex?: number;
  candidateIndex?: number;
  message?: string;
};

export type GuardedEquationCooperativeCheckpoint = (
  input: GuardedEquationCooperativeCheckpointInput,
) => Promise<DisplayOutcome | null>;

export type GuardedEquationStageAsyncContext = GuardedEquationStageContext & {
  asyncRunner: AsyncGuardedSolveRunner;
  cooperativeCheckpoint: GuardedEquationCooperativeCheckpoint;
};

export type GuardedEquationStageDescriptor = {
  id: GuardedEquationStageId;
  label: string;
  execute: (context: GuardedEquationStageContext) => DisplayOutcome | null | undefined;
  executeAsync?: (context: GuardedEquationStageAsyncContext) => Promise<DisplayOutcome | null | undefined>;
  canRecurse?: boolean;
};

export type GuardedEquationStageTraceAttempt = {
  depth: number;
  stageId: GuardedEquationStageId;
  returnedOutcome: boolean;
};

export type GuardedEquationStageReplayTrace = {
  attempts: GuardedEquationStageTraceAttempt[];
  winningStageId?: GuardedEquationStageId;
  cancellation?: GuardedEquationCancellationEvidence;
  directSymbolicHostExecutions?: GuardedEquationDirectSymbolicHostEvidence[];
};

export type GuardedEquationStageOrderedSolveResult = {
  outcome: DisplayOutcome;
  trace: GuardedEquationStageReplayTrace;
};
