import type { AngleUnit, CoreDraftState, TrigScreen } from '../../types/calculator';
import type { TrigonometrySurfaceState } from './workspace-surface-state';

function copyTrigMenuSelection(selection: TrigonometrySurfaceState['trigMenuSelection']) {
  return { home: selection.home, identitiesHome: selection.identitiesHome, equationsHome: selection.equationsHome, trianglesHome: selection.trianglesHome };
}

function copyCoreDraftState(state: CoreDraftState): CoreDraftState {
  return { ...state };
}

export function captureTrigonometrySurfaceStateSnapshot(
  state: Omit<TrigonometrySurfaceState, 'trigEquationState' | 'trigDraftState' | 'trigMenuSelection'> & {
    angleUnit: AngleUnit;
    trigDraftState: CoreDraftState;
    trigEquationState: TrigonometrySurfaceState['trigEquationState'];
    trigMenuSelection: TrigonometrySurfaceState['trigMenuSelection'];
  },
): TrigonometrySurfaceState {
  return {
    ...state,
    trigMenuSelection: copyTrigMenuSelection(state.trigMenuSelection),
    trigFunctionState: { ...state.trigFunctionState },
    trigIdentityState: { ...state.trigIdentityState },
    trigEquationState: { ...state.trigEquationState, angleUnit: state.angleUnit },
    rightTriangleState: { ...state.rightTriangleState },
    sineRuleState: { ...state.sineRuleState },
    cosineRuleState: { ...state.cosineRuleState },
    angleConvertState: { ...state.angleConvertState },
    periodPhaseState: { ...state.periodPhaseState },
    trigDraftState: copyCoreDraftState(state.trigDraftState),
  };
}

export type TrigonometrySurfaceStateSetters = {
  setAngleConvertState: (state: TrigonometrySurfaceState['angleConvertState']) => void;
  setCosineRuleState: (state: TrigonometrySurfaceState['cosineRuleState']) => void;
  setPeriodPhaseState: (state: TrigonometrySurfaceState['periodPhaseState']) => void;
  setRightTriangleState: (state: TrigonometrySurfaceState['rightTriangleState']) => void;
  setSineRuleState: (state: TrigonometrySurfaceState['sineRuleState']) => void;
  setSpecialAnglesExpression: (expression: string) => void;
  setTrigDraftState: (state: CoreDraftState) => void;
  setTrigEquationState: (state: TrigonometrySurfaceState['trigEquationState']) => void;
  setTrigFunctionState: (state: TrigonometrySurfaceState['trigFunctionState']) => void;
  setTrigIdentityState: (state: TrigonometrySurfaceState['trigIdentityState']) => void;
  setTrigMenuSelection: (selection: TrigonometrySurfaceState['trigMenuSelection']) => void;
  setTrigScreen: (screen: TrigScreen) => void;
};

export function restoreTrigonometrySurfaceStateSnapshot(
  state: TrigonometrySurfaceState,
  angleUnit: AngleUnit,
  setters: TrigonometrySurfaceStateSetters,
) {
  setters.setTrigScreen(state.trigScreen);
  setters.setTrigMenuSelection(copyTrigMenuSelection(state.trigMenuSelection));
  setters.setTrigFunctionState({ ...state.trigFunctionState });
  setters.setTrigIdentityState({ ...state.trigIdentityState });
  setters.setTrigEquationState({ ...state.trigEquationState, angleUnit });
  setters.setRightTriangleState({ ...state.rightTriangleState });
  setters.setSineRuleState({ ...state.sineRuleState });
  setters.setCosineRuleState({ ...state.cosineRuleState });
  setters.setAngleConvertState({ ...state.angleConvertState });
  setters.setPeriodPhaseState({ ...state.periodPhaseState });
  setters.setSpecialAnglesExpression(state.specialAnglesExpression);
  setters.setTrigDraftState(copyCoreDraftState(state.trigDraftState));
}
