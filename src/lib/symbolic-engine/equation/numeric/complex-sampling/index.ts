/**
 * Complex sampling for Graphing: numeric evaluation, principal-branch diagnostics and seed-grid Newton candidates.
 * TEMPORARY, MUST BE REPLACED LATER. This is the old Equation engine's numeric complex code, moved here unchanged
 * when that engine was retired (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B). It is floating-point sampling, not a
 * decision: certified complex roots of non-polynomial f(z) (C5, Phase 2) replace it. New Equation's core does not
 * use it; Graphing consumes only this facade.
 */
export {
  createComplexNumericEvaluator,
  type ComplexNumericEvaluationDiagnostic,
  type ComplexNumericEvaluationResult,
  type ComplexNumericEvaluationStatus,
  type ComplexNumericEvaluator,
} from './numeric-evaluator';
export {
  diagnosePrincipalBranchPolicyForLatex,
  diagnosePrincipalBranchPolicyForNode,
  type ComplexBranchCutSeverity,
  type ComplexPrincipalBranchDiagnostic,
  type ComplexPrincipalBranchFamily,
  type ComplexPrincipalBranchPolicyReport,
  type ComplexRectangularRegion,
} from './branch-cut-policy';
export {
  findComplexNewtonCandidates,
  type ComplexNewtonCandidate,
  type ComplexSeedGridNewtonResult,
} from './seed-grid-newton';
