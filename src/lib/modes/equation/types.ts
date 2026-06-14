import type { SharedSolveRequest } from '../../equation/shared-solve';
import type { EquationOoePilotMetadata } from '../../ooe/pilots/equation-pilot';
import type {
  AngleUnit,
  ComplexExactForm,
  DisplayOutcome,
  EquationAnswerMode,
  EquationDomainIntent,
  EquationScreen,
  NumericSolveInterval,
  OutputStyle,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export type SharedEquationSolveRunner = (request: SharedSolveRequest) => DisplayOutcome;
export type AsyncSharedEquationSolveRunner = (request: SharedSolveRequest) => Promise<DisplayOutcome>;

export type RunEquationModeRequest = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationSolveTarget?: string | null;
  equationAnswerMode?: EquationAnswerMode;
  equationDomainIntent?: EquationDomainIntent;
  complexExactForm?: ComplexExactForm;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  numericInterval?: NumericSolveInterval;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
  sharedSolveRunner?: SharedEquationSolveRunner;
};

export type EquationModeOoePilotRunResult = {
  payload: DisplayOutcome;
  ooe: EquationOoePilotMetadata;
};

export type EquationModeIsolatedWorkerRunResult = {
  payload: DisplayOutcome;
  guardedTrace?: EquationOoePilotMetadata['guardedTrace'];
};
