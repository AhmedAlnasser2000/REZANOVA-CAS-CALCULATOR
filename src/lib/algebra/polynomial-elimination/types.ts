import type { ExactMatrixStopReason } from '../../linear-algebra/exact-matrix-core';
import {
  normalizeExactScalar,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import type { StoredVariableValue, VariableSubstitutionSnapshot } from '../../../types/calculator';

export const DEFAULT_RESULTANT_MAX_SYLVESTER_DIMENSION = 6;

export const DEFAULT_BIVARIATE_RESULTANT_MAX_SYLVESTER_DIMENSION = 6;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_ELIMINATED_DEGREE = 4;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_RETAINED_DEGREE = 8;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_TERMS = 24;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_SCALAR_ABS = 1_000_000_000;

export type PolynomialEliminationStopReason =
  | 'variable-mismatch'
  | 'zero-polynomial'
  | 'constant-polynomial'
  | 'sylvester-dimension-limit'
  | 'exact-matrix-determinant-stop';

export type PolynomialEliminationOptions = {
  maxSylvesterDimension?: number;
  maxScalarAbs?: number;
};

export type PolynomialEliminationStop = {
  kind: 'stop';
  reason: PolynomialEliminationStopReason;
  exactMatrixReason?: ExactMatrixStopReason;
};

export type BivariateResultantStopReason =
  | 'parse-error'
  | 'unsupported-symbolic-parameter'
  | 'non-polynomial-input'
  | 'degree-limit'
  | 'term-limit'
  | 'scalar-growth-limit'
  | 'zero-polynomial'
  | 'constant-polynomial'
  | 'sylvester-dimension-limit'
  | 'projection-ambiguity'
  | 'stored-constant-unsafe';

export type BivariateResultantOptions = {
  storedVariables?: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  maxSylvesterDimension?: number;
  maxEliminatedDegree?: number;
  maxRetainedDegree?: number;
  maxTerms?: number;
  maxScalarAbs?: number;
};

export type RequiredBivariateResultantOptions = Required<Omit<BivariateResultantOptions, 'storedVariables'>>;

export type BivariateResultantStop = {
  kind: 'stop';
  reason: BivariateResultantStopReason;
  constantContext?: 'resultant';
  symbols?: string[];
  storedVariable?: string;
};

export type BivariatePolynomial = {
  retainedVariable: string;
  eliminatedVariable: string;
  terms: Map<number, ExactPolynomial>;
};

export type BivariateResultantSuccess = {
  kind: 'success';
  retainedVariable: string;
  eliminatedVariable: string;
  leftDegree: number;
  rightDegree: number;
  sylvesterDimension: number;
  projectedPolynomial: ExactPolynomial;
  projectedLatex: string;
  substitutedLeftLatex: string;
  substitutedRightLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

export type BivariateResultantResult = BivariateResultantSuccess | BivariateResultantStop;

export type BivariateParseResult =
  | { kind: 'success'; polynomial: BivariatePolynomial }
  | BivariateResultantStop;

export type PolynomialResult =
  | { kind: 'success'; polynomial: ExactPolynomial }
  | BivariateResultantStop;

export type SubstitutionResult =
  | {
      kind: 'success';
      node: unknown;
      substitutions: VariableSubstitutionSnapshot[];
      protectedSubstitutions: VariableSubstitutionSnapshot[];
    }
  | BivariateResultantStop;

export function polynomialEliminationStop(
  reason: PolynomialEliminationStopReason,
): PolynomialEliminationStop {
  return { kind: 'stop', reason };
}

export function maxSylvesterDimension(options: PolynomialEliminationOptions = {}) {
  return options.maxSylvesterDimension ?? DEFAULT_RESULTANT_MAX_SYLVESTER_DIMENSION;
}

export function bivariateOptionsWithDefaults(
  options: BivariateResultantOptions = {},
): RequiredBivariateResultantOptions {
  return {
    maxSylvesterDimension: options.maxSylvesterDimension ?? DEFAULT_BIVARIATE_RESULTANT_MAX_SYLVESTER_DIMENSION,
    maxEliminatedDegree: options.maxEliminatedDegree ?? DEFAULT_BIVARIATE_RESULTANT_MAX_ELIMINATED_DEGREE,
    maxRetainedDegree: options.maxRetainedDegree ?? DEFAULT_BIVARIATE_RESULTANT_MAX_RETAINED_DEGREE,
    maxTerms: options.maxTerms ?? DEFAULT_BIVARIATE_RESULTANT_MAX_TERMS,
    maxScalarAbs: options.maxScalarAbs ?? DEFAULT_BIVARIATE_RESULTANT_MAX_SCALAR_ABS,
  };
}

export function bivariateStop(
  reason: BivariateResultantStopReason,
  extras: Omit<BivariateResultantStop, 'kind' | 'reason'> = {},
): BivariateResultantStop {
  return { kind: 'stop', reason, ...extras };
}

export function isSafeInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value) && Number.isSafeInteger(value);
}

export function scalarWithinCaps(value: ExactScalar, options: RequiredBivariateResultantOptions) {
  const normalized = normalizeExactScalar(value);
  return isSafeInteger(normalized.numerator)
    && isSafeInteger(normalized.denominator)
    && normalized.denominator > 0
    && Math.abs(normalized.numerator) <= options.maxScalarAbs
    && Math.abs(normalized.denominator) <= options.maxScalarAbs;
}
