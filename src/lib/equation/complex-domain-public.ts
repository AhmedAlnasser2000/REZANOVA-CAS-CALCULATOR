/**
 * Reviewed domain-neutral complex evaluation and branch-analysis seam.
 * Equation retains implementation ownership; Graphing and other domains consume only this facade.
 */
export {
  createComplexNumericEvaluator,
  type ComplexNumericEvaluationDiagnostic,
  type ComplexNumericEvaluationResult,
  type ComplexNumericEvaluationStatus,
  type ComplexNumericEvaluator,
} from './complex/numeric-evaluator';
export {
  diagnosePrincipalBranchPolicyForLatex,
  diagnosePrincipalBranchPolicyForNode,
  type ComplexBranchCutSeverity,
  type ComplexPrincipalBranchDiagnostic,
  type ComplexPrincipalBranchFamily,
  type ComplexPrincipalBranchPolicyReport,
  type ComplexRectangularRegion,
} from './complex/branch-cut-policy';
export {
  findComplexNewtonCandidates,
  type ComplexNewtonCandidate,
  type ComplexSeedGridNewtonResult,
} from './complex/seed-grid-newton';
