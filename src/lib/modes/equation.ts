// Compatibility facade: keep root Equation mode imports stable.
export {
  buildEquationOoeInputRevisionId,
  buildEquationOoeSnapshot,
} from './equation/ooe-snapshot';
export {
  EQUATION_USE_STORED_VALUES_ACTION,
  getEquationAlgebraActionLabel,
  runEquationAlgebraTransform,
  type EquationAlgebraAction,
} from './equation/transforms';
export {
  prepareEquationStoredValueSolveConsent,
  shouldOfferEquationStoredValueConsent,
  type EquationStoredValueConsentResult,
} from './equation/stored-values';
export {
  classifyEquationNumericShape,
  type EquationNumericDomainFact,
  type EquationNumericDomainFactKind,
  type EquationNumericIntervalNeed,
  type EquationNumericShapeClassification,
  type EquationNumericShapeRoute,
} from './equation/numeric-shape-classifier';
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
