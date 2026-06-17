import type {
  CalculateScreen,
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
  CalculusInfiniteLimitState,
  CalculusScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  FirstOrderOdeState,
  IntegralWorkbenchState,
  LimitWorkbenchState,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
  VariableSubstitutionSnapshot,
  EquationScreen,
} from '../../types/calculator';
import type { defaultEquationNumericSolvePanelState } from '../logic/appUtils';

type CalculateReplayVariableSubstitutions = {
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type CalculateSurfaceState = {
  calculateLatex: string;
  calculateScreen: CalculateScreen;
  calculateAlgebraTrayOpen: boolean;
  calculateMenuSelection: number;
  calculateReplayVariableSubstitutions: CalculateReplayVariableSubstitutions;
  derivativeWorkbench: DerivativeWorkbenchState;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  integralWorkbench: IntegralWorkbenchState;
  limitWorkbench: LimitWorkbenchState;
};

export type EquationSurfaceState = {
  equationLatex: string;
  equationSolveTarget: string | null;
  equationScreen: EquationScreen;
  equationAlgebraTrayOpen: boolean;
  equationNumericSolvePanel: ReturnType<typeof defaultEquationNumericSolvePanelState>;
  equationMenuSelection: {
    home: number;
    polynomialMenu: number;
    simultaneousMenu: number;
  };
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
};

export type CalculusMenuSelectionState = {
  home: number;
  derivativesHome: number;
  integralsHome: number;
  limitsHome: number;
  seriesHome: number;
  partialsHome: number;
  odeHome: number;
};

export type CalculusSurfaceState = {
  calculusScreen: CalculusScreen;
  calculusMenuSelection: CalculusMenuSelectionState;
  derivativeWorkbench: DerivativeWorkbenchState;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  calculusIndefiniteIntegral: CalculusIndefiniteIntegralState;
  calculusDefiniteIntegral: CalculusDefiniteIntegralState;
  calculusImproperIntegral: CalculusImproperIntegralState;
  calculusFiniteLimit: CalculusFiniteLimitState;
  calculusInfiniteLimit: CalculusInfiniteLimitState;
  maclaurinState: SeriesState;
  taylorState: SeriesState;
  partialDerivativeState: PartialDerivativeWorkbenchState;
  firstOrderOdeState: FirstOrderOdeState;
  secondOrderOdeState: SecondOrderOdeState;
  numericIvpState: NumericIvpState;
};
