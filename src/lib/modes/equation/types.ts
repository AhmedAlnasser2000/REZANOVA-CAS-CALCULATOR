import type { SharedSolveRequest } from '../../equation/shared-solve';
import type { EquationResultOutcomeBoundaryV1 } from '../../equation/equation-solve-result';
import type { EquationOoePilotMetadata } from '../../ooe/pilots/equation-pilot';
import type {
  AngleUnit,
  ComplexExactForm,
  ComplexSolveRegion,
  DisplayOutcome,
  EquationDomainIntent,
  EquationScreen,
  LegacyEquationAnswerMode,
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
  equationAnswerMode?: LegacyEquationAnswerMode;
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
  complexRegion?: ComplexSolveRegion;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
  useStoredValueSubstitution?: boolean;
  sharedSolveRunner?: SharedEquationSolveRunner;
};

export type EquationModeOoePilotRunResult = {
  payload: DisplayOutcome;
  ooe: EquationOoePilotMetadata;
};

export type EquationModeIsolatedWorkerRunResult = {
  boundary: EquationResultOutcomeBoundaryV1;
  guardedTrace?: EquationOoePilotMetadata['guardedTrace'];
};
