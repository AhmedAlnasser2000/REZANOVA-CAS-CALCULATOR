// Compatibility facade: keep root imports stable for selected-target isolation.
export type {
  SelectedTargetIsolationOptions,
  SelectedTargetIsolationResult,
  SelectedTargetIsolationStop,
  SelectedTargetIsolationStopReason,
  SelectedTargetIsolationSuccess,
} from './isolation/selected-target';
export {
  isolateSelectedTargetEquation,
  solveSelectedTargetIsolationEquation,
} from './isolation/selected-target';
