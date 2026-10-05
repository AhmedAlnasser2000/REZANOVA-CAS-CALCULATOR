import type { DifferentialElement as E } from './differential-field';
import type { MultivariatePolynomial, MultivariateRing } from './multivariate-polynomial';
import type { MultivariateGcd } from './multivariate-gcd';
import type { ExponentialBasisEvidence } from './exponential-normalization-basis';

export type ExponentialExpression =
  | Readonly<{kind: 'rational' | 'exponential'; value: E}>
  | Readonly<{kind: 'add' | 'subtract' | 'multiply' | 'divide'; left: ExponentialExpression; right: ExponentialExpression}>
  | Readonly<{kind: 'negate'; value: ExponentialExpression}>
  | Readonly<{kind: 'power'; value: ExponentialExpression; exponent: bigint}>;
export interface ExponentialNormalizationInput {
  readonly expression: ExponentialExpression;
  /** Already discovered restrictions, including exclusions lost inside normalized rational atoms. */
  readonly restrictions: readonly {readonly expression: ExponentialExpression; readonly provenance: string}[];
}
export interface ExponentialFraction {
  readonly numerator: MultivariatePolynomial<E>;
  readonly denominator: MultivariatePolynomial<E>;
}
export interface ExponentialNormalizationStep {
  readonly value: ExponentialFraction;
  readonly cancellation: MultivariateGcd<E>;
}
export interface ExponentialRestriction {
  readonly node: number;
  readonly kind: 'rational-denominator' | 'argument-denominator' | 'division' | 'nonpositive-power' | 'supplied';
  readonly provenance: string;
  readonly value: ExponentialFraction;
}
export interface ExponentialPowerTerm { readonly power: bigint; readonly coefficient: E }
export type ExponentialClassification =
  | Readonly<{kind: 'rational'; value: E}>
  | Readonly<{kind: 'exponential'; argument: E; numerator: readonly ExponentialPowerTerm[]; denominator: readonly ExponentialPowerTerm[] }>
  | Readonly<{kind: 'unsupported'; reason: 'constant-extension' | 'independent-families'}>;
export interface ExponentialNormalization {
  readonly ring: MultivariateRing<E>;
  readonly basis: ExponentialBasisEvidence;
  readonly steps: readonly ExponentialNormalizationStep[];
  readonly restrictions: readonly ExponentialRestriction[];
  readonly classification: ExponentialClassification;
}
