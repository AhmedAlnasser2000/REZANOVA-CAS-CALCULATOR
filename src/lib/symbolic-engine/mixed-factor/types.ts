import type { ExactScalar } from '../../algebra/polynomial-core';

export type MixedCarrierCandidate = {
  variable: string;
  base: unknown;
  baseKey: string;
  denominator: number;
  carrierNode: unknown;
};

export type MixedCarrierTerm = {
  coefficient: ExactScalar;
  degree: number;
};

export type MixedCarrierFactorization = {
  node: unknown;
  strategy: 'mixed-carrier-factorization';
  carrierNode: unknown;
  polynomialNode: unknown;
};
