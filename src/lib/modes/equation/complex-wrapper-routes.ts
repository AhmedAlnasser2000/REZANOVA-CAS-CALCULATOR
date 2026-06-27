import type {
  AngleUnit,
  ComplexExactForm,
  DisplayOutcome,
  OutputStyle,
  PlannerBadge,
} from '../../../types/calculator';
import type {
  EquationSelectedTargetRoutePlan,
  EquationSelectedTargetSearchTraceRecorder,
} from '../../equation/equation-target-shape';
import { tryComplexMixedAlgebraicWrapperRoute } from './complex-mixed-algebraic-wrapper-route';
import { tryComplexPowerWrapperRoute } from './complex-power-wrapper-route';
import { tryComplexPreimageWrapperRoute } from './complex-preimage-wrapper-route';
import { tryComplexRootWrapperRoute } from './complex-root-wrapper-route';

type ComplexWrapperRoutesInput = {
  equationLatex: string;
  parameterizedEquationLatex: string;
  selectedTarget: string;
  parameterizedOptions: { allowGeneratedImplicitProducts?: boolean };
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  complexExactForm: ComplexExactForm;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  routePlan?: EquationSelectedTargetRoutePlan;
  stopOnRecognizedPreimageUnsupported?: boolean;
};

export function tryComplexWrapperRoutes(input: ComplexWrapperRoutesInput): DisplayOutcome | undefined {
  const root = tryComplexRootWrapperRoute(input);
  if (root) {
    return root;
  }
  const mixedAlgebraic = tryComplexMixedAlgebraicWrapperRoute(input);
  if (mixedAlgebraic) {
    return mixedAlgebraic;
  }
  const power = tryComplexPowerWrapperRoute(input);
  if (power) {
    return power;
  }
  return tryComplexPreimageWrapperRoute({
    ...input,
    stopOnRecognizedUnsupported: input.stopOnRecognizedPreimageUnsupported,
  });
}
