import type { SolveDomainConstraint } from '../../../types/calculator';

export type PowerLogMode =
  | 'simplify'
  | 'rewrite-root'
  | 'rewrite-power'
  | 'change-base'
  | 'equation-preprocess';

export type RationalValue = {
  numerator: number;
  denominator: number;
};

export type RadicalInfo = {
  base: unknown;
  numerator: number;
  denominator: number;
};

export type SerializedNode = {
  node: unknown;
  latex: string;
  changed: boolean;
  handled: boolean;
  conditionConstraints: SolveDomainConstraint[];
  containsTrackedNotation: boolean;
};

export type LogCall = {
  family: 'ln' | 'log';
  baseNode?: unknown;
  baseKey: string;
  argumentNode: unknown;
  argumentLatex: string;
};

export type PowerLogNormalizationResult = {
  handled: boolean;
  changed: boolean;
  normalizedNode: unknown;
  normalizedLatex: string;
  conditionConstraints: SolveDomainConstraint[];
  exactSupplementLatex: string[];
};
