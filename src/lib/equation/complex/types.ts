import type {
  AngleUnit,
  ComplexExactForm,
  DisplayBranchReadback,
  OutputStyle,
} from '../../../types/calculator';
import type { ExactScalar } from '../../algebra/polynomial-core';
import type { ComplexValue } from '../../numeric/complex';
import type { EquationAlgebraicIsolationOptions } from '../equation-algebraic-isolation';
import type { PeriodicFamily } from '../solution/periodic-family';

export type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ComplexEquationOptions = EquationAlgebraicIsolationOptions & {
  outputStyle?: OutputStyle;
  complexExactForm?: ComplexExactForm;
  angleUnit?: AngleUnit;
  maxPowerDegree?: number;
};

export type ExactComplexScalar = {
  re: ExactScalar;
  im: ExactScalar;
};

export type ComplexEquationBranch = {
  exactLatex: string;
  node?: unknown;
  approxValue?: ComplexValue;
  exactComplex?: ExactComplexScalar;
};

export type ComplexPolynomialBranchResult = {
  branches: ComplexEquationBranch[];
  hasComplexBranch: boolean;
};

export type ComplexPreimageBranch = {
  latex: string;
  approxValue?: ComplexValue;
  exactComplex?: ExactComplexScalar;
  parameterLatex?: string;
  periodicFamily?: PeriodicFamily;
};

export type ComplexPreimageSolveResult = {
  answerLatex: string;
  branchReadback?: DisplayBranchReadback;
  approxText?: string;
  exactSupplementLatex: string[];
  proofLines: string[];
  expandedBranchLatex?: string[];
};

export const ZERO_SCALAR: ExactScalar = { numerator: 0, denominator: 1 };

export const ONE_SCALAR: ExactScalar = { numerator: 1, denominator: 1 };
