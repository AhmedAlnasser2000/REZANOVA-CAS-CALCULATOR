import type { SolveDomainConstraint } from '../../../types/calculator';
import type { ExactScalar } from '../polynomial-core';

export type Monomial = {
  scalar: ExactScalar;
  variable?: string;
  exponent: number;
};

export type AffineExpression = {
  a: ExactScalar;
  b: ExactScalar;
};

export type SupportedRadical = {
  node: unknown;
  radicand: unknown;
  index: number;
};

export type SupportedRationalPower = {
  node: unknown;
  base: unknown;
  numerator: number;
  denominator: number;
};

export type SupportedBinomial = {
  node: unknown;
  variable?: string;
};

export type PerfectSquareRadicandProfile = {
  outsideScalar: ExactScalar;
  absInnerNode: unknown;
  normalizedNode: unknown;
};

export type SquareRootConjugateFamilyId =
  | 'two-term-other-radical'
  | 'two-term-double-radical'
  | 'three-term-scalar-double-radical';

export type SquareRootConjugateProfile = {
  denominatorNode: unknown;
  conjugateNode: unknown;
  denominatorProductNode: unknown;
  conditionConstraints: SolveDomainConstraint[];
  radicalCount: number;
  familyId: SquareRootConjugateFamilyId;
  residualCleanupEligible: boolean;
};
