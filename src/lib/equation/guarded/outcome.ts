import type {
  DisplayOutcome,
  DisplayBranchReadback,
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';

const UNSUPPORTED_FAMILY_ERROR = 'This equation is outside the supported exact symbolic solve families.';

type GuardedSuccessOutcome = Extract<DisplayOutcome, { kind: 'success' }>;
type GuardedErrorOutcome = Extract<DisplayOutcome, { kind: 'error' }>;

function successOutcome(
  title: string,
  exactLatex?: string,
  approxText?: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummaryText?: string,
  rejectedCandidateCount?: number,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  numericMethod?: string,
  branchReadback?: DisplayBranchReadback,
): GuardedSuccessOutcome {
  return {
    kind: 'success',
    title,
    exactLatex,
    branchReadback,
    approxText,
    warnings,
    resultOrigin: approxText && !exactLatex ? 'numeric-fallback' : 'symbolic',
    plannerBadges,
    solveBadges,
    solveSummaryText,
    rejectedCandidateCount,
    substitutionDiagnostics,
    numericMethod,
  };
}

function errorOutcome(
  title: string,
  error: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummaryText?: string,
  rejectedCandidateCount?: number,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  numericMethod?: string,
): GuardedErrorOutcome {
  return {
    kind: 'error',
    title,
    error,
    warnings,
    plannerBadges,
    solveBadges,
    solveSummaryText,
    rejectedCandidateCount,
    substitutionDiagnostics,
    numericMethod,
  };
}

export {
  UNSUPPORTED_FAMILY_ERROR,
  successOutcome,
  errorOutcome,
};
