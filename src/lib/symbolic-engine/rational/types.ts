import type { SolveDomainConstraint } from '../../../types/calculator';
import type { AssumptionFact } from '../../algebra/assumptions-core';
import type { FactorMap } from '../patterns';

export type ExactScalar = {
  numerator: number;
  denominator: number;
};

export type RationalNormalizationMode = 'simplify' | 'factor' | 'lcd';

export type RationalTerm = {
  scalar: ExactScalar;
  numeratorFactors: FactorMap;
  denominatorFactors: FactorMap;
};

export type RationalNormalizationResult = {
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  numeratorNode: unknown;
  numeratorLatex: string;
  denominatorNode?: unknown;
  denominatorLatex?: string;
  exclusionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
  assumptionFacts?: AssumptionFact[];
  variable?: string;
};
