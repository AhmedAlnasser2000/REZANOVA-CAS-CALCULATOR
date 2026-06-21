import type { ExactPolynomial, ExactScalar } from '../polynomial-core';

export const ROOT_TOLERANCE = 1e-8;

export type PolynomialFactorizationStrategy = 'rational-root' | 'biquadratic' | 'quadratic-pair';

export type BoundedPolynomialFactorOptions = {
  maxDegree?: number;
};

export type BoundedPolynomialFactor = {
  node: unknown;
  latex: string;
  multiplicity: number;
  degree: number;
};

export type BoundedPolynomialFactorization = {
  variable: string;
  scalar: ExactScalar;
  factorizedNode: unknown;
  factorizedLatex: string;
  factors: BoundedPolynomialFactor[];
  strategy: PolynomialFactorizationStrategy;
};

export type BoundedPolynomialSolveResult = {
  variable: string;
  exactLatex: string;
  approxText: string;
  exactSolutions: string[];
  approxSolutions: number[];
  factorization: BoundedPolynomialFactorization;
};

export type RecognizedPolynomialEquation = {
  variable: string;
  polynomial: ExactPolynomial;
};

export type PrimitiveIntegerPolynomial = {
  polynomial: ExactPolynomial;
  scalar: ExactScalar;
};

export type QuadraticExactRoots =
  | { kind: 'real'; roots: Array<{ node: unknown; latex: string; numeric: number }> }
  | { kind: 'complex' };
