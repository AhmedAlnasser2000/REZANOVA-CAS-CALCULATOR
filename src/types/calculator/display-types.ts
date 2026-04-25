import type { ModeId } from './mode-types';
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

export type DisplayDetailSection = {
  title: string;
  lines: string[];
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

export type DisplayOutcomeAction =
  | { kind: 'send'; target: TransferTarget; latex: string }
  | { kind: 'load-core-draft'; mode: 'geometry' | 'trigonometry' | 'statistics'; latex: string };

export type DisplayOutcome =
  | {
      kind: 'success';
      title: string;
      exactLatex?: string;
      periodicFamily?: PeriodicFamilyInfo;
      exactSupplementLatex?: string[];
      approxText?: string;
      detailSections?: DisplayDetailSection[];
      warnings: string[];
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
      periodicFamily?: PeriodicFamilyInfo;
      exactSupplementLatex?: string[];
      approxText?: string;
      detailSections?: DisplayDetailSection[];
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
