import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import {
  buildCalculusFiniteLimitLatex,
  buildCalculusInfiniteLimitLatex,
  buildCalculusLimitLatex,
  buildAdvancedIntegralLatex,
  buildFirstOrderOdeLatex,
  buildImplicitDerivativeLatex,
  buildLaplaceTransformLatex,
  buildNumericIvpLatex,
  buildPartialDerivativeLatex,
  buildSecondOrderOdeLatex,
  buildSeriesPreviewLatex,
} from '../../lib/calculus/workspace/examples';
import {
  buildDerivativeAtPointLatex,
  buildDerivativeLatex,
} from '../../lib/calculus/calculus-workbench';
import { derivativeRequestStateFromEditor } from './calculus-derivative-source';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import type { RunCalculusModeRequest } from '../../lib/modes/calculus';
import type { ActiveCalculusRuntimeState } from './calculus-runtime-state';
import { normalizeWorkspaceDisplayState } from './workspace-display-state';
import type { CalculusSurfaceState } from './workspace-surface-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';
import type {
  CalculusScreen,
  Settings,
  StoredVariableValue,
} from '../../types/calculator';

type CalculusOriginContext = {
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  storedVariables: StoredVariableValue[];
};

type CalculusWorkbenchExpressionState = Pick<
  ActiveCalculusRuntimeState,
  | 'derivative'
  | 'derivativePoint'
  | 'implicitDerivative'
  | 'indefiniteIntegral'
  | 'definiteIntegral'
  | 'improperIntegral'
  | 'finiteLimit'
  | 'infiniteLimit'
  | 'limit'
  | 'maclaurin'
  | 'taylor'
  | 'laplace'
  | 'partialDerivative'
  | 'firstOrderOde'
  | 'secondOrderOde'
  | 'numericIvp'
>;

function isCalculusSurfaceState(value: WorkspaceInstanceStateSlot): value is CalculusSurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as CalculusSurfaceState).calculusScreen === 'string';
}

export function buildCalculusWorkbenchExpression(
  screen: CalculusScreen,
  state: CalculusWorkbenchExpressionState,
) {
  switch (screen) {
    case 'derivative':
      return buildDerivativeLatex(
        state.derivative.bodyLatex,
        state.derivative.variable,
        state.derivative.operatorLatex,
      );
    case 'derivativePoint':
      return buildDerivativeAtPointLatex(
        state.derivativePoint.bodyLatex,
        state.derivativePoint.point,
        state.derivativePoint.variable,
        state.derivativePoint.operatorLatex,
      );
    case 'implicitDerivative':
      return buildImplicitDerivativeLatex(state.implicitDerivative);
    case 'indefiniteIntegral':
      return buildAdvancedIntegralLatex(
        'indefinite',
        state.indefiniteIntegral,
        state.definiteIntegral,
        state.improperIntegral,
      );
    case 'definiteIntegral':
      return buildAdvancedIntegralLatex(
        'definite',
        state.indefiniteIntegral,
        state.definiteIntegral,
        state.improperIntegral,
      );
    case 'improperIntegral':
      return buildAdvancedIntegralLatex(
        'improper',
        state.indefiniteIntegral,
        state.definiteIntegral,
        state.improperIntegral,
      );
    case 'limit':
      return buildCalculusLimitLatex(state.limit);
    case 'finiteLimit':
      return buildCalculusFiniteLimitLatex(state.finiteLimit);
    case 'infiniteLimit':
      return buildCalculusInfiniteLimitLatex(state.infiniteLimit);
    case 'maclaurin':
      return buildSeriesPreviewLatex(state.maclaurin);
    case 'taylor':
      return buildSeriesPreviewLatex(state.taylor);
    case 'laplace':
      return buildLaplaceTransformLatex(state.laplace);
    case 'partialDerivative':
      return buildPartialDerivativeLatex(state.partialDerivative);
    case 'odeFirstOrder':
      return buildFirstOrderOdeLatex(state.firstOrderOde);
    case 'odeSecondOrder':
      return buildSecondOrderOdeLatex(state.secondOrderOde);
    case 'odeNumericIvp':
      return buildNumericIvpLatex(state.numericIvp);
    default:
      return '';
  }
}

export function buildCalculusRequestFromState(
  state: ActiveCalculusRuntimeState,
): RunCalculusModeRequest {
  return {
    screen: state.screen,
    derivative: derivativeRequestStateFromEditor('derivative', state.derivative),
    derivativePoint: derivativeRequestStateFromEditor('derivativePoint', state.derivativePoint),
    implicitDerivative: state.implicitDerivative,
    indefiniteIntegral: state.indefiniteIntegral,
    definiteIntegral: state.definiteIntegral,
    improperIntegral: state.improperIntegral,
    finiteLimit: state.finiteLimit,
    infiniteLimit: state.infiniteLimit,
    limit: state.limit,
    maclaurin: state.maclaurin,
    taylor: state.taylor,
    laplace: state.laplace,
    partialDerivative: derivativeRequestStateFromEditor('partialDerivative', state.partialDerivative),
    firstOrderOde: state.firstOrderOde,
    secondOrderOde: state.secondOrderOde,
    numericIvp: state.numericIvp,
    angleUnit: state.angleUnit,
    outputStyle: state.outputStyle,
    ansLatex: state.ansLatex,
    storedVariables: state.variableMemory,
    variableSubstitutionSnapshot:
      isCalculusMode(state.replayVariableSubstitutions?.mode)
      && state.replayVariableSubstitutions.inputLatex === state.generatedLatex
        ? state.replayVariableSubstitutions.substitutions
        : undefined,
  };
}

export function calculusRevisionRequestFromSurfaceState(
  surfaceState: WorkspaceInstanceStateSlot,
  instance: WorkspaceInstance,
  context: CalculusOriginContext,
) {
  if (!isCalculusMode(instance.workspaceKind) || !isCalculusSurfaceState(surfaceState)) {
    return null;
  }

  const displayState = normalizeWorkspaceDisplayState(instance.displayState);
  const calculusLimit = surfaceState.calculusLimit ?? { requestLatex: '' };
  const generatedLatex = trimHarmlessTrailingMathSpacing(buildCalculusWorkbenchExpression(
    surfaceState.calculusScreen,
    {
      derivative: surfaceState.derivativeWorkbench,
      derivativePoint: surfaceState.derivativePointWorkbench,
      implicitDerivative: surfaceState.implicitDerivativeState,
      indefiniteIntegral: surfaceState.calculusIndefiniteIntegral,
      definiteIntegral: surfaceState.calculusDefiniteIntegral,
      improperIntegral: surfaceState.calculusImproperIntegral,
      finiteLimit: surfaceState.calculusFiniteLimit,
      infiniteLimit: surfaceState.calculusInfiniteLimit,
      limit: calculusLimit,
      maclaurin: surfaceState.maclaurinState,
      taylor: surfaceState.taylorState,
      laplace: surfaceState.laplaceState,
      partialDerivative: surfaceState.partialDerivativeState,
      firstOrderOde: surfaceState.firstOrderOdeState,
      secondOrderOde: surfaceState.secondOrderOdeState,
      numericIvp: surfaceState.numericIvpState,
    },
  ));
  if (!generatedLatex) {
    return null;
  }

  const activeState: ActiveCalculusRuntimeState = {
    screen: surfaceState.calculusScreen,
    generatedLatex,
    derivative: surfaceState.derivativeWorkbench,
    derivativePoint: surfaceState.derivativePointWorkbench,
    implicitDerivative: surfaceState.implicitDerivativeState,
    indefiniteIntegral: surfaceState.calculusIndefiniteIntegral,
    definiteIntegral: surfaceState.calculusDefiniteIntegral,
    improperIntegral: surfaceState.calculusImproperIntegral,
    finiteLimit: surfaceState.calculusFiniteLimit,
    infiniteLimit: surfaceState.calculusInfiniteLimit,
    limit: calculusLimit,
    maclaurin: surfaceState.maclaurinState,
    taylor: surfaceState.taylorState,
    laplace: surfaceState.laplaceState,
    partialDerivative: surfaceState.partialDerivativeState,
    firstOrderOde: surfaceState.firstOrderOdeState,
    secondOrderOde: surfaceState.secondOrderOdeState,
    numericIvp: surfaceState.numericIvpState,
    angleUnit: context.settings.angleUnit,
    outputStyle: context.settings.outputStyle,
    ansLatex: displayState.ansLatex,
    variableMemory: context.storedVariables,
    replayVariableSubstitutions: displayState.replayVariableSubstitutions,
  };

  return {
    generatedLatex,
    request: buildCalculusRequestFromState(activeState),
  };
}
