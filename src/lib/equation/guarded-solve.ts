// Compatibility facade: keep root imports stable for guarded Equation solving.
export type {
  GuardedEquationDirectSymbolicHostEvidence,
  GuardedEquationDirectSymbolicRunner,
  GuardedEquationDirectSymbolicRunnerResult,
  GuardedEquationStageId,
  GuardedEquationStageOrderedSolveResult,
  GuardedEquationStageReplayTrace,
  GuardedEquationSolveControl,
  GuardedEquationSolveOptions,
  GuardedEquationCancellationEvidence,
  GuardedEquationCancellationPhase,
} from './guarded/run';
export {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  runGuardedEquationSolveWithStageOrder,
  runGuardedEquationSolveWithStageOrderAsync,
  listGuardedEquationStageDescriptors,
  runGuardedEquationSolve,
  runGuardedDirectSymbolicFallback,
} from './guarded/run';
