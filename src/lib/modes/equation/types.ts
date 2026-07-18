import type { SharedSolveRequest } from '../../equation/shared-solve';
import type { EquationAnalysisEvidence } from '../../equation/analysis-evidence';
import type { EquationOoePilotMetadata } from '../../ooe/pilots/equation-pilot';
import type {
  AngleUnit,
  CanonicalRuntimeOutcome,
  ComplexExactForm,
  ComplexSolveRegion,
  ResultProducerDraft,
  EquationDomainIntent,
  EquationScreen,
  EquationSystemCell,
  LegacyEquationAnswerMode,
  NumericSolveInterval,
  OutputStyle,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export type SharedEquationSolveRunner = (request: SharedSolveRequest) => ResultProducerDraft;
export type AsyncSharedEquationSolveRunner = (request: SharedSolveRequest) => Promise<ResultProducerDraft>;

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
  system2: EquationSystemCell[][];
  system3: EquationSystemCell[][];
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
  payload: ResultProducerDraft;
  ooe: EquationOoePilotMetadata;
};

export type EquationModeIsolatedWorkerRunResult = {
  outcome: CanonicalRuntimeOutcome;
  analysisEvidence: EquationAnalysisEvidence[];
  guardedTrace?: EquationOoePilotMetadata['guardedTrace'];
};
