import type { SolveDomainConstraint } from '../../../types/calculator';
import type { AssumptionFact } from '../assumptions-core';
import type { ExactPolynomial, ExactScalar } from '../polynomial-core';

export type RationalFunctionStopReason =
  | 'unsupported-expression'
  | 'multivariable'
  | 'degree-limit'
  | 'zero-denominator'
  | 'variable-mismatch'
  | 'not-proper'
  | 'denominator-not-distinct-linear'
  | 'repeated-linear-factor'
  | 'unsupported-factorization'
  | 'irreducible-quadratic-factor'
  | 'algebraic-root-required'
  | 'factorization-degree-limit'
  | 'unsupported-factor-multiplicity';

export type ExactRationalFunction = {
  variable: string;
  numerator: ExactPolynomial;
  denominator: ExactPolynomial;
};

export type ExactRationalFunctionSuccess = {
  kind: 'success';
  rational: ExactRationalFunction;
  normalizedNode: unknown;
  normalizedLatex: string;
  numeratorLatex: string;
  denominatorLatex?: string;
  exclusionConstraints: SolveDomainConstraint[];
  assumptionFacts?: AssumptionFact[];
};

export type ExactRationalFunctionStop = {
  kind: 'stop';
  reason: RationalFunctionStopReason;
};

export type ExactRationalFunctionResult =
  | ExactRationalFunctionSuccess
  | ExactRationalFunctionStop;

export type PartialFractionTerm = {
  coefficient: ExactScalar;
  root: ExactScalar;
  denominator: ExactPolynomial;
  node: unknown;
  latex: string;
};

export type PartialFractionReadinessResult =
  | {
    kind: 'success';
    variable: string;
    terms: PartialFractionTerm[];
    reconstructedNode: unknown;
    reconstructedLatex: string;
  }
  | {
    kind: 'stop';
    reason: RationalFunctionStopReason;
  };

export type LinearRationalFactor = {
  kind: 'linear';
  root: ExactScalar;
  multiplicity: number;
  polynomial: ExactPolynomial;
  latex: string;
};

export type IrreducibleQuadraticFactor = {
  kind: 'irreducible-quadratic';
  multiplicity: 1;
  polynomial: ExactPolynomial;
  latex: string;
  linearCoefficient: ExactScalar;
  constantCoefficient: ExactScalar;
  discriminant: ExactScalar;
};

export type RationalDenominatorFactor =
  | LinearRationalFactor
  | IrreducibleQuadraticFactor;

export type RationalFactorizationResult =
  | {
    kind: 'success';
    variable: string;
    denominator: ExactPolynomial;
    factors: RationalDenominatorFactor[];
    squareFree: boolean;
  }
  | {
    kind: 'stop';
    reason: RationalFunctionStopReason;
  };

export type LinearPowerPartialFractionTerm = {
  kind: 'linear-power';
  coefficient: ExactScalar;
  root: ExactScalar;
  power: number;
  denominator: ExactPolynomial;
  node: unknown;
  latex: string;
};

export type QuadraticPartialFractionTerm = {
  kind: 'irreducible-quadratic';
  linearCoefficient: ExactScalar;
  constantCoefficient: ExactScalar;
  derivativeCoefficient: ExactScalar;
  residualConstant: ExactScalar;
  factor: IrreducibleQuadraticFactor;
  numerator: ExactPolynomial;
  node: unknown;
  latex: string;
};

export type RationalPartialFractionReadinessTerm =
  | LinearPowerPartialFractionTerm
  | QuadraticPartialFractionTerm;

export type RationalPartialFractionReadinessResult =
  | {
    kind: 'success';
    variable: string;
    factorization: Extract<RationalFactorizationResult, { kind: 'success' }>;
    terms: RationalPartialFractionReadinessTerm[];
    reconstructedNode: unknown;
    reconstructedLatex: string;
  }
  | {
    kind: 'stop';
    reason: RationalFunctionStopReason;
  };

export type ParseOptions = {
  maxDegree: number;
};
