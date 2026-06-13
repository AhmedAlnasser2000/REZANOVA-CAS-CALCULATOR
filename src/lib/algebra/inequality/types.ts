export const INEQUALITY_EPSILON = 1e-12;

export type InequalityInterval = {
  lower?: number;
  lowerLatex?: string;
  lowerInclusive: boolean;
  upper?: number;
  upperLatex?: string;
  upperInclusive: boolean;
};

export type InequalitySet = {
  variable: string;
  intervals: readonly InequalityInterval[];
};

export type InequalityFactOptions = {
  expressionLatex?: string;
  details?: readonly string[];
};

export type PeriodicInequalityInterval = {
  lowerLatex: string;
  lowerInclusive: boolean;
  upperLatex: string;
  upperInclusive: boolean;
};

export type PeriodicInequalitySet = {
  variable: string;
  intervals: readonly PeriodicInequalityInterval[];
  periodLatex: string;
};

