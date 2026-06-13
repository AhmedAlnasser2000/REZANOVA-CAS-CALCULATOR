import type {
  DisplayDetailSection,
  DisplayOutcome,
  GuardedSolveRequest,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../../types/calculator';
import type {
  SupportedRadical,
  SupportedRationalPower,
} from '../../../algebra/radical-core';

export type ExactScalar = {
  numerator: number;
  denominator: number;
};

export type PlaceholderLinearExpression = {
  a: ExactScalar;
  remainder: unknown;
};

export type RadicalTarget =
  | {
      kind: 'root';
      targetNode: unknown;
      root: SupportedRadical;
    }
  | {
      kind: 'reciprocal-root';
      targetNode: unknown;
      root: SupportedRadical;
      numeratorScalar: ExactScalar;
    }
  | {
      kind: 'power';
      targetNode: unknown;
      power: SupportedRationalPower;
    };

export type AlgebraTransform = {
  equationLatex: string;
  branchEquations?: string[];
  domainConstraints?: SolveDomainConstraint[];
  solveBadges: SolveBadge[];
  solveSummaryText: string;
  summaryMergeMode?: 'prepend' | 'replace';
  detailSections?: DisplayDetailSection[];
  unresolvedDetailSections?: DisplayDetailSection[];
  emptyDetailSections?: DisplayDetailSection[];
  guidedBranchDetailSections?: DisplayDetailSection[];
  unresolvedError: string;
  emptyBranchError?: string;
  blockOnGuidedBranchError?: boolean;
  radicalStepCost?: number;
  repeatedClearingStepCost?: number;
  polynomialCarrierHints?: unknown[];
};

export type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;
