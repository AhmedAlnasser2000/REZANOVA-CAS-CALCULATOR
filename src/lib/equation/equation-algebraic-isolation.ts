// Compatibility facade: keep root imports stable for algebraic isolation.
export type {
  EquationAlgebraicIsolationOptions,
  EquationAlgebraicIsolationResult,
  EquationAlgebraicIsolationStop,
  EquationAlgebraicIsolationStopReason,
  EquationAlgebraicIsolationSuccess,
} from './isolation/algebraic';
export { solveEquationAlgebraicIsolation } from './isolation/algebraic';
