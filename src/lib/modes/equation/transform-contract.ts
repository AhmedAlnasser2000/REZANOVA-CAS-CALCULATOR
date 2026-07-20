import {
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../../algebra/algebra-transform-ui';

export const EQUATION_USE_STORED_VALUES_ACTION = 'useStoredValues' as const;

export type EquationAlgebraAction =
  | AlgebraTransformAction
  | typeof EQUATION_USE_STORED_VALUES_ACTION;

export function getEquationAlgebraActionLabel(action: EquationAlgebraAction) {
  return action === EQUATION_USE_STORED_VALUES_ACTION
    ? 'Use Stored Values'
    : getAlgebraTransformLabel(action);
}
