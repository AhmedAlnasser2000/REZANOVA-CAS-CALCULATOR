import type {
  DisplayOutcome,
} from '../../../types/calculator';
import type { InequalitySet, PeriodicInequalitySet } from '../../algebra/inequality-core';
import type { EquationPolynomialRelation } from '../equation-polynomial-domain';

export type InequalityRelation = Exclude<EquationPolynomialRelation, 'Equal'>;
export type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type RealRoot = {
  numeric: number;
  latex: string;
};

export type TopLevelInequality = {
  relation: InequalityRelation;
  left: MathJson;
  right: MathJson;
};

export type FiniteInequalityResult = {
  kind: 'finite';
  set: InequalitySet;
  route: string;
  lines: string[];
  proofDetails: string[];
  validWhenLatex: string[];
};

export type PeriodicInequalityResult = {
  kind: 'periodic';
  set: PeriodicInequalitySet;
  route: string;
  lines: string[];
  proofDetails: string[];
  validWhenLatex: string[];
  exactLatexOverride?: string;
  readbackTextOverride?: string;
  approxText?: string;
};

export type InternalInequalityResult =
  | FiniteInequalityResult
  | PeriodicInequalityResult
  | { kind: 'stop'; reason: string };

export type TrigThresholdResult =
  | { kind: 'all' }
  | { kind: 'empty' }
  | {
    kind: 'intervals';
    intervals: readonly (readonly [number, number])[];
    period: number;
  };

export type TrigFunctionKind = 'sin' | 'cos' | 'tan';

export type TrigCall = {
  kind: TrigFunctionKind;
  argument: unknown;
};

export type NumericPeriodicInterval = {
  lower: number;
  lowerInclusive: boolean;
  upper: number;
  upperInclusive: boolean;
};

export type NumericPeriodicSet = {
  period: number;
  intervals: readonly NumericPeriodicInterval[];
};

export type InequalityDisplayOutcome = DisplayOutcome;

export const ROOT_EPSILON = 1e-9;
export const DEFAULT_MAX_REDUCTION_DEPTH = 4;
export const TRIG_EPSILON = 1e-10;
export const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);
export const INNER_TRIG_VARIABLE = '__innerTrigValue';
