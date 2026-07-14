import type {
  ResultProducerDraft,
  DisplayBranchReadback,
  DisplaySolveSummary,
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';
import { createEquationResultOutcome } from '../solve-result/producer';

const UNSUPPORTED_FAMILY_ERROR = 'This equation is outside the supported exact symbolic solve families.';

type GuardedSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type GuardedErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

function successOutcome(
  title: string,
  exactLatex?: string,
  approxText?: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummary?: DisplaySolveSummary,
  rejectedCandidateCount?: number,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  numericMethod?: string,
  branchReadback?: DisplayBranchReadback,
): GuardedSuccessOutcome {
  return createEquationResultOutcome({
    kind: 'success',
    title,
    exactLatex,
    branchReadback,
    approxText,
    warnings,
    resultOrigin: approxText && !exactLatex ? 'numeric-fallback' : 'symbolic',
    plannerBadges,
    solveBadges,
    ...(solveSummary
      ? {
          solveSummaryParts: solveSummary.solveSummaryParts,
        }
      : {}),
    rejectedCandidateCount,
    substitutionDiagnostics,
    numericMethod,
  });
}

function errorOutcome(
  title: string,
  error: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummary?: DisplaySolveSummary,
  rejectedCandidateCount?: number,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  numericMethod?: string,
): GuardedErrorOutcome {
  return createEquationResultOutcome({
    kind: 'error',
    title,
    error,
    warnings,
    plannerBadges,
    solveBadges,
    ...(solveSummary
      ? {
          solveSummaryParts: solveSummary.solveSummaryParts,
        }
      : {}),
    rejectedCandidateCount,
    substitutionDiagnostics,
    numericMethod,
  });
}

export {
  UNSUPPORTED_FAMILY_ERROR,
  successOutcome,
  errorOutcome,
};
