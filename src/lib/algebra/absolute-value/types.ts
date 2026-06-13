import type { AbsoluteValueEquationFamily } from '../../../types/calculator';

export type RecognizedAbsoluteValueEquationFamily = AbsoluteValueEquationFamily & {
  normalizationKind: 'direct' | 'outer-polynomial' | 'outer-nonperiodic';
  blockOnGuidedBranchError?: boolean;
  emptyBranchError?: string;
};

export type AbsoluteValueBoundaryReason =
  | 'outer-sink'
  | 'outer-depth'
  | 'no-roots'
  | 'guided-branch';

export type AbsoluteValueExpressionSupportKind =
  | 'constant'
  | 'affine'
  | 'polynomial'
  | 'radical'
  | 'rational-power'
  | 'generic-expression';
