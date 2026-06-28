// Compatibility facade: keep root Equation mode imports stable.
export {
  buildEquationOoeInputRevisionId,
  buildEquationOoeSnapshot,
} from './equation/ooe-snapshot';
export {
  EQUATION_PREPARE_NUMERIC_SOLVE_ACTION,
  getEquationAlgebraActionLabel,
  runEquationAlgebraTransform,
  type EquationAlgebraAction,
} from './equation/transforms';
export {
  prepareEquationNumericSolve,
  shouldOfferEquationNumericPreparation,
} from './equation/stored-values';
export {
  runEquationMode,
  runEquationModeForIsolatedWorker,
  runEquationModeWithOoePilot,
} from './equation/run';
export type {
  EquationModeIsolatedWorkerRunResult,
  EquationModeOoePilotRunResult,
  RunEquationModeRequest,
} from './equation/types';
export {
  buildPolynomialEquationLatex,
  DEFAULT_POLYNOMIAL_COEFFICIENTS,
  equationInputLatexForScreen,
  POLYNOMIAL_VIEW_META,
} from './equation-ui-model';
