import type {
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
  CalculusInfiniteLimitState,
  CalculusLimitState,
  CalculusScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  CanonicalRuntimeOutcome,
  FirstOrderOdeState,
  HistoryEntry,
  ImplicitDerivativeState,
  LaplaceTransformState,
  ModeId,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
  Settings,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { derivativeHistorySeedFromState } from './calculus-derivative-source';

export type ReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type ActiveCalculusRuntimeState = {
  screen: CalculusScreen;
  generatedLatex: string;
  derivative: DerivativeWorkbenchState;
  derivativePoint: DerivativePointWorkbenchState;
  implicitDerivative: ImplicitDerivativeState;
  indefiniteIntegral: CalculusIndefiniteIntegralState;
  definiteIntegral: CalculusDefiniteIntegralState;
  improperIntegral: CalculusImproperIntegralState;
  finiteLimit: CalculusFiniteLimitState;
  infiniteLimit: CalculusInfiniteLimitState;
  limit: CalculusLimitState;
  maclaurin: SeriesState;
  taylor: SeriesState;
  laplace: LaplaceTransformState;
  partialDerivative: PartialDerivativeWorkbenchState;
  firstOrderOde: FirstOrderOdeState;
  secondOrderOde: SecondOrderOdeState;
  numericIvp: NumericIvpState;
  angleUnit: Settings['angleUnit'];
  outputStyle: Settings['outputStyle'];
  ansLatex: string;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions: ReplayVariableSubstitutions;
};

export type CommitCalculusOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'calculus',
  context?: Partial<Pick<HistoryEntry, 'calculusScreen' | 'calculusSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

export function calculusHistoryContextFromState(
  state: ActiveCalculusRuntimeState,
): Pick<HistoryEntry, 'calculusScreen'> & Partial<Pick<HistoryEntry, 'calculusSeed'>> {
  switch (state.screen) {
    case 'derivative':
      return {
        calculusScreen: state.screen,
        calculusSeed: derivativeHistorySeedFromState('derivative', state.derivative),
      };
    case 'derivativePoint':
      return {
        calculusScreen: state.screen,
        calculusSeed: derivativeHistorySeedFromState('derivativePoint', state.derivativePoint),
      };
    case 'implicitDerivative':
      return { calculusScreen: state.screen, calculusSeed: { ...state.implicitDerivative } };
    case 'indefiniteIntegral':
      return { calculusScreen: state.screen, calculusSeed: { ...state.indefiniteIntegral } };
    case 'definiteIntegral':
      return { calculusScreen: state.screen, calculusSeed: { ...state.definiteIntegral } };
    case 'improperIntegral':
      return { calculusScreen: state.screen, calculusSeed: { ...state.improperIntegral } };
    case 'limit':
      return { calculusScreen: state.screen, calculusSeed: { ...state.limit } };
    case 'finiteLimit':
      return { calculusScreen: state.screen, calculusSeed: { ...state.finiteLimit } };
    case 'infiniteLimit':
      return { calculusScreen: state.screen, calculusSeed: { ...state.infiniteLimit } };
    case 'maclaurin':
      return { calculusScreen: state.screen, calculusSeed: { ...state.maclaurin } };
    case 'taylor':
      return { calculusScreen: state.screen, calculusSeed: { ...state.taylor } };
    case 'laplace':
      return { calculusScreen: state.screen, calculusSeed: { ...state.laplace } };
    case 'partialDerivative':
      return {
        calculusScreen: state.screen,
        calculusSeed: derivativeHistorySeedFromState('partialDerivative', state.partialDerivative),
      };
    case 'odeFirstOrder':
      return { calculusScreen: state.screen, calculusSeed: { ...state.firstOrderOde } };
    case 'odeSecondOrder':
      return { calculusScreen: state.screen, calculusSeed: { ...state.secondOrderOde } };
    case 'odeNumericIvp':
      return { calculusScreen: state.screen, calculusSeed: { ...state.numericIvp } };
    default:
      return { calculusScreen: state.screen };
  }
}
