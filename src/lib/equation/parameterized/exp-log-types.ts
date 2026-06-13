import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import type { MathJson } from './math-json';

export type ParameterizedExpLogStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-exp-log'
  | 'multiple-carriers'
  | 'nested-exp-log'
  | 'symbolic-base'
  | 'invalid-base'
  | 'unsupported-shell'
  | 'target-in-unsupported-operation'
  | 'domain-empty'
  | 'handoff-unsupported';

export type ParameterizedExpLogSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string;
};

export type ParameterizedExpLogSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedExpLogStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedExpLogSolveResult =
  | ParameterizedExpLogSolveSuccess
  | ParameterizedExpLogSolveStop;

export type ParameterizedExpLogSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

export type BaseProfile = {
  kind: 'natural' | 'common' | 'numeric';
  value: number;
  latex: string;
} | {
  kind: 'symbolic';
  node: MathJson;
  latex: string;
};

export type ExpLogCarrierKind = 'exponential' | 'logarithm';

export type ExpLogCarrierProfile = {
  kind: ExpLogCarrierKind;
  node: MathJson;
  inner: MathJson;
  labelLatex: string;
  base: BaseProfile;
};

export type ExpLogAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: ExpLogCarrierProfile | null;
};

export type CarrierMatch =
  | { kind: 'matched'; carrier: ExpLogCarrierProfile }
  | { kind: 'blocked'; reason: ParameterizedExpLogStopReason; message: string }
  | { kind: 'none' };

export type CollectResult =
  | { kind: 'ok'; affine: ExpLogAffine }
  | { kind: 'unsupported'; reason: ParameterizedExpLogStopReason; message: string };

export type HandoffSolveResult =
  | { kind: 'success'; exactLatex: string; exactSupplementLatex?: string[] }
  | { kind: 'unsupported'; message: string };

export type TargetBaseCarrierProfile = {
  kind: 'power-base' | 'log-base';
  node: MathJson;
  base: MathJson;
  exponentOrValue: MathJson;
  argument?: MathJson;
  labelLatex: string;
};

export type TargetBaseCarrierMatch =
  | { kind: 'matched'; carrier: TargetBaseCarrierProfile }
  | { kind: 'blocked'; reason: ParameterizedExpLogStopReason; message: string }
  | { kind: 'none' };
