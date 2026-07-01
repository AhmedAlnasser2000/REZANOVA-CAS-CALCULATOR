import type {
  defaultEquationComplexRegionPanelState,
  defaultEquationNumericSolvePanelState,
} from '../logic/appUtils';
import type {
  EquationScreen,
  ModeId,
  Settings,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

export type ReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type EquationRequestKind = 'symbolic' | 'numeric-interval' | 'complex-region';

export type ActiveEquationRuntimeState = {
  equationLatex: string;
  equationInputLatex: string;
  equationScreen: EquationScreen;
  equationSolveTarget: string | null;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  equationNumericSolvePanel: ReturnType<typeof defaultEquationNumericSolvePanelState>;
  equationComplexRegionPanel: ReturnType<typeof defaultEquationComplexRegionPanelState>;
  settings: Pick<
    Settings,
    | 'angleUnit'
    | 'outputStyle'
    | 'equationAnswerMode'
    | 'equationDomainIntent'
    | 'complexExactForm'
  >;
  ansLatex: string;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions: ReplayVariableSubstitutions;
};

