import type { SolveDomainConstraint } from '../../../types/calculator';
import type { SquareRootConjugateFamilyId } from '../../algebra/radical-core';

export type RadicalNormalizationMode = 'simplify' | 'factor' | 'expand' | 'equation';

export type NormalizedNodeResult = {
  node: unknown;
  changed: boolean;
  conditionConstraints: SolveDomainConstraint[];
  rationalized: boolean;
};

export type RadicalNormalizationResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  conditionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
  rationalized: boolean;
};

export type RadicalConjugateTransformResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  conditionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
};

export type SquareRootRationalizationResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  conditionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
  familyId: SquareRootConjugateFamilyId;
  usedResidualCleanup: boolean;
};

export type SquareRootRationalizedQuotient = {
  node: unknown;
  conditionConstraints: SolveDomainConstraint[];
  familyId: SquareRootConjugateFamilyId;
  usedResidualCleanup: boolean;
};
