import type {
  CandidateValidationResult,
  CanonicalResultBranchReadbackV1,
  CanonicalResultDocumentV1,
  PlannerBadge,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';
import type { EquationAnalysisEvidence } from '../analysis-evidence';

export const EQUATION_SOLVE_RESULT_VERSION = 1 as const;
export const EQUATION_SOLVE_RESULT_MAX_NODES = 20_000;
export const EQUATION_SOLVE_RESULT_MAX_DEPTH = 64;
export const EQUATION_SOLVE_RESULT_MAX_BYTES = 1_280_000;
export const EQUATION_SOLVE_RESULT_MAX_CANDIDATES = 2_048;
export const EQUATION_SOLVE_RESULT_MAX_VALIDATIONS = 4_096;
export const EQUATION_SOLVE_RESULT_MAX_ANALYSIS_EVIDENCE = 2_048;

export type EquationSolveCandidateEvidenceV1 = {
  acceptedValues?: number[];
  rejectedCount?: number;
  validation?: CandidateValidationResult[];
};

export type EquationSolveBadgeEvidenceV1 = {
  planner: PlannerBadge[];
  solve: SolveBadge[];
};

export type EquationSolveDiagnosticsV1 = {
  substitutionDiagnostics?: SubstitutionSolveDiagnostics;
  numericMethod?: string;
  analysisEvidence: EquationAnalysisEvidence[];
};

export type EquationControlledStopV1 = {
  code: string;
  message: string;
  source: 'producer' | 'compatibility-boundary';
  stageId?: string;
};

type EquationSolveResultBaseV1 = {
  version: typeof EQUATION_SOLVE_RESULT_VERSION;
  document: CanonicalResultDocumentV1;
  candidates?: EquationSolveCandidateEvidenceV1;
  branchEvidence?: CanonicalResultBranchReadbackV1;
  badges: EquationSolveBadgeEvidenceV1;
  diagnostics: EquationSolveDiagnosticsV1;
};

export type EquationSolvedResultV1 = EquationSolveResultBaseV1 & {
  status: 'solved';
  stop?: never;
};

export type EquationControlledStopResultV1 = EquationSolveResultBaseV1 & {
  status: 'controlled-stop';
  stop: EquationControlledStopV1;
};

export type EquationSolveResultContractV1 =
  | EquationSolvedResultV1
  | EquationControlledStopResultV1;
