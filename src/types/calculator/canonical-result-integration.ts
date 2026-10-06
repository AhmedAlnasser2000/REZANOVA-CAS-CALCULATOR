import type { CanonicalMathValue } from './canonical-result-common';

/** All distinct roots are bound once; no individual root or logarithm branch is selected. */
export interface CanonicalRootLogTerm {
  rootVariable: string;
  modulus: CanonicalMathValue;
  weight: CanonicalMathValue;
  argument: CanonicalMathValue;
  norm: CanonicalMathValue;
}

export interface CanonicalRationalPrimitivePrimary {
  kind: 'rational-antiderivative';
  semantics: 'formal-local-complex';
  variable: string;
  integrationConstant: string;
  rationalPart: CanonicalMathValue;
  terms: CanonicalRootLogTerm[];
  conditions: {
    sourceExclusions: CanonicalMathValue[];
    inputDenominator: CanonicalMathValue;
    rationalDenominator: CanonicalMathValue;
    logNorms: CanonicalMathValue[];
  };
}

/** A binding for exactly exp(argument), including the argument's additive constant. */
export interface CanonicalExponentialConstruction {
  kind: 'rational-exponential';
  generator: string;
  argument: CanonicalMathValue;
}

export interface CanonicalIntegrationRestriction {
  kind: 'nonzero';
  value: CanonicalMathValue;
  origins: Array<{
    category: 'source' | 'argument-denominator' | 'input-denominator'
      | 'primitive-denominator' | 'coefficient-denominator' | 'log-norm';
    path: string;
  }>;
}

export interface CanonicalExponentialPrimitivePrimary {
  kind: 'exponential-antiderivative';
  semantics: 'formal-local-complex';
  variable: string;
  integrationConstant: string;
  construction: CanonicalExponentialConstruction;
  /** Rational in variable and the explicitly bound exponential generator. */
  fieldPart: CanonicalMathValue;
  /** Argument is polynomial in its root variable with coefficients in the exponential field. */
  terms: CanonicalRootLogTerm[];
  /** Source restrictions may contain canceled exponential families. */
  restrictions: CanonicalIntegrationRestriction[];
}

export interface CanonicalNonElementaryPrimary {
  kind: 'non-elementary';
  variable: string;
  subject: CanonicalMathValue;
  supportedClass: 'rational-in-one-rational-exponential';
  construction: CanonicalExponentialConstruction;
  obstruction: 'nonconstant-residue' | 'laurent-component';
  restrictions: CanonicalIntegrationRestriction[];
}
