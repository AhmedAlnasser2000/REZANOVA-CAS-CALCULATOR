import { buildTrigInputLatex } from '../../lib/trigonometry/examples';
import { isTrigMenuScreen } from '../../lib/trigonometry/navigation';
import {
  serializeTrigRequest,
  trigDraftStyle,
  type RunTrigonometryRuntimeRequest,
} from '../../lib/trigonometry/runtime-request';
import type {
  AngleUnit,
  TrigIdentityState,
  TrigScreen,
} from '../../types/calculator';
import type { TrigonometrySurfaceState } from './workspace-surface-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';

function isTrigonometrySurfaceState(
  value: WorkspaceInstanceStateSlot,
): value is TrigonometrySurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as TrigonometrySurfaceState).trigScreen === 'string';
}

export function defaultTrigLeafForMenu(screen: TrigScreen): TrigScreen {
  if (screen === 'identitiesHome') {
    return 'identitySimplify';
  }
  if (screen === 'equationsHome') {
    return 'equationSolve';
  }
  if (screen === 'trianglesHome') {
    return 'rightTriangle';
  }
  return 'identitySimplify';
}

export function trigExecutionLatexForRuntime(
  inputLatex: string,
  screenHint: TrigScreen,
  targetForm: TrigIdentityState['targetForm'],
) {
  return screenHint === 'identityConvert' && trigDraftStyle(inputLatex) !== 'structured'
    ? serializeTrigRequest({
        kind: 'identityConvert',
        expressionLatex: inputLatex,
        targetForm,
      })
    : inputLatex;
}

export function trigonometryRequestFromSurfaceState(
  surfaceState: WorkspaceInstanceStateSlot,
  instance: WorkspaceInstance,
  angleUnit: AngleUnit,
) {
  if (
    instance.workspaceKind !== 'trigonometry'
    || !isTrigonometrySurfaceState(surfaceState)
  ) {
    return null;
  }

  const screenHint = isTrigMenuScreen(surfaceState.trigScreen)
    ? defaultTrigLeafForMenu(surfaceState.trigScreen)
    : surfaceState.trigScreen;
  const surfaceSnapshot = {
    trigFunction: surfaceState.trigFunctionState,
    trigIdentity: surfaceState.trigIdentityState,
    trigEquation: { ...surfaceState.trigEquationState, angleUnit },
    rightTriangle: surfaceState.rightTriangleState,
    sineRule: surfaceState.sineRuleState,
    cosineRule: surfaceState.cosineRuleState,
    angleConvert: surfaceState.angleConvertState,
    periodPhase: surfaceState.periodPhaseState,
    specialAnglesExpression: surfaceState.specialAnglesExpression,
  };
  const inputLatex =
    surfaceState.trigDraftState.rawLatex.trim()
    || buildTrigInputLatex(screenHint, surfaceSnapshot).trim();
  const executionLatex = trigExecutionLatexForRuntime(
    inputLatex,
    screenHint,
    surfaceState.trigIdentityState.targetForm,
  );
  return executionLatex
    ? ({
        inputLatex: executionLatex,
        screenHint,
        angleUnit,
        identityTargetForm: surfaceState.trigIdentityState.targetForm,
      } satisfies RunTrigonometryRuntimeRequest)
    : null;
}
