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

export type DisplayDetailLineKind = 'text' | 'math';

export type DisplayDetailLinePart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; latex: string };

export type DisplayDetailSection = {
  title: string;
  lines: string[];
  lineKind?: DisplayDetailLineKind;
  lineKinds?: DisplayDetailLineKind[];
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
  label?: string;
  source?: string;
};

export type DisplayOutcomeAction =
  | { kind: 'send'; target: TransferTarget; latex: string }
  | { kind: 'load-core-draft'; mode: 'geometry' | 'trigonometry' | 'statistics'; latex: string };

export type DisplayOutcome =
  | {
      kind: 'success';
      title: string;
      exactLatex?: string;
      branchReadback?: DisplayBranchReadback;
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
      solveSummaryText?: string;
      transformBadges?: TransformBadge[];
      transformSummaryText?: string;
      transformSummaryLatex?: string;
      candidateValues?: number[];
      rejectedCandidateCount?: number;
      substitutionDiagnostics?: SubstitutionSolveDiagnostics;
      numericMethod?: string;
      runtimeAdvisories?: RuntimeAdvisories;
      variableSubstitutions?: VariableSubstitutionSnapshot[];
    }
  | {
      kind: 'prompt';
      title: string;
      message: string;
      targetMode: ModeId;
      carryLatex: string;
      warnings: string[];
      runtimeAdvisories?: RuntimeAdvisories;
    }
  | {
      kind: 'error';
      title: string;
      error: string;
      warnings: string[];
      exactLatex?: string;
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
      solveSummaryText?: string;
      transformBadges?: TransformBadge[];
      transformSummaryText?: string;
      transformSummaryLatex?: string;
      rejectedCandidateCount?: number;
      substitutionDiagnostics?: SubstitutionSolveDiagnostics;
      numericMethod?: string;
      runtimeAdvisories?: RuntimeAdvisories;
    };
