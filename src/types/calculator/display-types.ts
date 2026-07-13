import type { AnswerDomain, LegacyEquationAnswerMode, ModeId, SolutionKind } from './mode-types';
import type { RuntimeAdvisories } from './runtime-policy-types';
import type {
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  ResultOrigin,
  TransferTarget,
} from './execution-types';
import type {
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
  TransformBadge,
} from './solver-types';
import type { DisplayMathPayloadV1 } from './math-payload-types';
import type { CanonicalResultDocumentV1 } from './canonical-result-types';
import type { PromptOutcome } from './canonical-runtime-outcome-types';

export type { DisplayMathPayloadV1, SerializableMathJson } from './math-payload-types';

export type DisplayDetailLineKind = 'text' | 'math';

export type DisplayDetailLinePart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; latex: string };

export type DisplaySolveSummary = {
  solveSummaryParts: DisplayDetailLinePart[][];
};

export type DisplayDetailSection = {
  title: string;
  /** Compatibility projection for storage and older consumers. */
  lines: string[];
  /** Legacy uniform intent; new mixed producers should derive lines from lineParts. */
  lineKind?: DisplayDetailLineKind;
  /** Legacy per-line intent retained for stored History compatibility. */
  lineKinds?: DisplayDetailLineKind[];
  /** Canonical live-producer shape for mixed text and canonical LaTeX. */
  lineParts?: DisplayDetailLinePart[][];
};

export type VariableSubstitutionSnapshot = {
  name: string;
  valueLatex: string;
  numericValue: number;
};

export type PeriodicFamilyRepresentative = {
  label: string;
  exactLatex?: string;
  approxText?: string;
};

export type PeriodicIntervalSuggestion = {
  label: string;
  start: string;
  end: string;
};

export type PeriodicPiecewiseBranch = {
  conditionLatex: string;
  resultLatex: string;
};

export type PeriodicFamilyInfo = {
  carrierLatex: string;
  parameterLatex: string;
  parameterConstraintLatex?: string[];
  branchesLatex: string[];
  discoveredFamilies?: string[];
  representatives?: PeriodicFamilyRepresentative[];
  suggestedIntervals?: PeriodicIntervalSuggestion[];
  piecewiseBranches?: PeriodicPiecewiseBranch[];
  principalRangeLatex?: string;
  reducedCarrierLatex?: string;
  structuredStopReason?:
    | 'second-periodic-parameter'
    | 'outside-principal-range'
    | 'unsupported-sawtooth-closure'
    | 'multi-parameter-periodic-family'
    | 'periodic-depth-cap'
    | 'unmerged-periodic-branches';
};

export type DisplayBranchReadbackRelation = '=' | '\\in' | '\\approx';

export type DisplayBranchReadback = {
  targetLatex: string;
  relationLatex: DisplayBranchReadbackRelation;
  branchesLatex: string[];
  countLabel?: 'roots' | 'candidateRoots';
  label?: string;
  source?: string;
};

export type DisplaySystemSolutionReadback = {
  variablesLatex: string[];
  rows: Array<{
    valuesLatex: string[];
    approxText?: string;
  }>;
  label?: string;
  source?: string;
};

export type DisplayAnswerRowsReadback = {
  label?: string;
  rows: Array<{
    latex: string;
    label?: string;
  }>;
};

export type DisplayOutcomeAction =
  | { kind: 'send'; target: TransferTarget; latex: string }
  | { kind: 'load-core-draft'; mode: 'geometry' | 'trigonometry' | 'statistics'; latex: string };

export type DisplayOutcome =
  | {
      kind: 'success';
      title: string;
      exactLatex?: string;
      canonicalMath?: DisplayMathPayloadV1;
      canonicalResult?: CanonicalResultDocumentV1;
      answerRows?: DisplayAnswerRowsReadback;
      branchReadback?: DisplayBranchReadback;
      systemReadback?: DisplaySystemSolutionReadback;
      periodicFamily?: PeriodicFamilyInfo;
      exactSupplementLatex?: string[];
      approxText?: string;
      detailSections?: DisplayDetailSection[];
      warnings: string[];
      answerMode?: LegacyEquationAnswerMode;
      answerDomain?: AnswerDomain;
      solutionKind?: SolutionKind;
      resultOrigin?: ResultOrigin;
      calculusStrategy?: CalculusIntegrationStrategy;
      calculusDerivativeStrategies?: CalculusDerivativeStrategy[];
      actions?: DisplayOutcomeAction[];
      resolvedInputLatex?: string;
      plannerBadges?: PlannerBadge[];
      solveBadges?: SolveBadge[];
      solveSummaryParts?: DisplayDetailLinePart[][];
      transformBadges?: TransformBadge[];
      transformSummaryText?: string;
      transformSummaryLatex?: string;
      candidateValues?: number[];
      rejectedCandidateCount?: number;
      substitutionDiagnostics?: SubstitutionSolveDiagnostics;
      numericMethod?: string;
      sourceMode?: ModeId;
      runtimeAdvisories?: RuntimeAdvisories;
      variableSubstitutions?: VariableSubstitutionSnapshot[];
    }
  | PromptOutcome
  | {
      kind: 'error';
      title: string;
      error: string;
      warnings: string[];
      exactLatex?: string;
      canonicalMath?: DisplayMathPayloadV1;
      canonicalResult?: CanonicalResultDocumentV1;
      branchReadback?: DisplayBranchReadback;
      periodicFamily?: PeriodicFamilyInfo;
      exactSupplementLatex?: string[];
      approxText?: string;
      detailSections?: DisplayDetailSection[];
      answerMode?: LegacyEquationAnswerMode;
      answerDomain?: AnswerDomain;
      solutionKind?: SolutionKind;
      actions?: DisplayOutcomeAction[];
      resolvedInputLatex?: string;
      plannerBadges?: PlannerBadge[];
      solveBadges?: SolveBadge[];
      solveSummaryParts?: DisplayDetailLinePart[][];
      transformBadges?: TransformBadge[];
      transformSummaryText?: string;
      transformSummaryLatex?: string;
      rejectedCandidateCount?: number;
      substitutionDiagnostics?: SubstitutionSolveDiagnostics;
      numericMethod?: string;
      sourceMode?: ModeId;
      runtimeAdvisories?: RuntimeAdvisories;
    };
