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
import type { CanonicalMathValueV1, CanonicalResultDocumentV1 } from './canonical-result-types';
import type { CanonicalResultDocumentV2 } from './canonical-result-v2-types';
import type { CanonicalResultDocumentV3 } from './canonical-result-v3-types';
import type { CanonicalResultDocumentV4 } from './canonical-result-v4-types';
import type {
  CanonicalRuntimeActionV2,
  CanonicalRuntimeActionV3,
  PromptOutcome,
} from './canonical-runtime-outcome-types';

export type { CanonicalMathValueV1 } from './canonical-result-types';
export type { SerializableMathJson } from './math-payload-types';

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

export type ResultProducerActionDraft =
  | { kind: 'send'; target: TransferTarget; latex: string }
  | { kind: 'load-core-draft'; mode: 'geometry' | 'trigonometry' | 'statistics'; latex: string };

export type ResultProducerDraft =
  | {
      kind: 'success';
      title: string;
      exactLatex?: string;
      primaryMath?: CanonicalMathValueV1;
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
      actions?: ResultProducerActionDraft[];
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
      primaryMath?: CanonicalMathValueV1;
      canonicalResult?: CanonicalResultDocumentV1;
      branchReadback?: DisplayBranchReadback;
      periodicFamily?: PeriodicFamilyInfo;
      exactSupplementLatex?: string[];
      approxText?: string;
      detailSections?: DisplayDetailSection[];
      answerMode?: LegacyEquationAnswerMode;
      answerDomain?: AnswerDomain;
      solutionKind?: SolutionKind;
      actions?: ResultProducerActionDraft[];
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

export type ResultProducerDraftV2 =
  | (Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocumentV2;
      actions?: CanonicalRuntimeActionV2[];
    })
  | (Omit<Extract<ResultProducerDraft, { kind: 'error' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocumentV2;
      actions?: CanonicalRuntimeActionV2[];
    });

export type ResultProducerDraftV3 =
  | (Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocumentV3;
      actions?: CanonicalRuntimeActionV3[];
    })
  | (Omit<Extract<ResultProducerDraft, { kind: 'error' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocumentV3;
      actions?: CanonicalRuntimeActionV3[];
    });

export type ResultProducerDraftV4 =
  | (Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocumentV4;
      actions?: never;
    })
  | (Omit<Extract<ResultProducerDraft, { kind: 'error' }>, 'canonicalResult' | 'actions'> & {
      canonicalResult: CanonicalResultDocumentV4;
      actions?: never;
    });

export type VersionedResultProducerDraft =
  | ResultProducerDraft
  | ResultProducerDraftV2
  | ResultProducerDraftV3
  | ResultProducerDraftV4;
