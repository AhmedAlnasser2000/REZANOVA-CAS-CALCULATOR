import type {
  AngleUnit,
  ComplexExactForm,
  EquationAnswerMode,
  EquationDomainIntent,
  MathNotationDisplay,
  NumericNotationMode,
  OutputStyle,
  ScientificNotationStyle,
} from './mode-types';

export type HistoryReplaySnapshotV1 = {
  version: 1;
  ansLatex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  equationAnswerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  complexExactForm: ComplexExactForm;
  mathNotationDisplay: MathNotationDisplay;
  historyInspectorNotationMode: MathNotationDisplay;
  historyPageNotationMode: MathNotationDisplay;
  symbolicDisplayMode: 'roots' | 'powers' | 'auto';
  flattenNestedRootsWhenSafe: boolean;
  approxDigits: number;
  numericNotationMode: NumericNotationMode;
  scientificNotationStyle: ScientificNotationStyle;
  detailedFactsEnabled: boolean;
};

export type HistoryReplayClassification =
  | 'versioned-deterministic'
  | 'legacy-nondeterministic';
