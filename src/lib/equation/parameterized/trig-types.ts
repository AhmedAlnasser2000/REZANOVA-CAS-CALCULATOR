import type { AngleUnit, ComplexExactForm, DisplayBranchReadback, DisplayDetailSection, DisplayMathPayloadV1, OutputStyle, SerializableMathJson } from '../../../types/calculator';
import type { MathJson } from './math-json';

export type ParameterizedTrigStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-trig'
  | 'multiple-carriers'
  | 'nested-trig'
  | 'unsupported-shell'
  | 'target-in-rhs'
  | 'target-in-unsupported-operation'
  | 'non-affine-argument'
  | 'zero-argument-coefficient'
  | 'unsupported-branch'
  | 'no-real-solution';

export type ParameterizedTrigSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  canonicalMath?: DisplayMathPayloadV1;
  mathJsonLeaves?: Array<{ canonicalLatex: string; mathJson: SerializableMathJson; source: string }>;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  carrierValueLatex: string;
  answerDomain?: 'real' | 'complex';
};

export type ParameterizedTrigSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedTrigStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedTrigSolveResult =
  | ParameterizedTrigSolveSuccess
  | ParameterizedTrigSolveStop;

export type ParameterizedTrigSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
  searchTrace?: import('../equation-target-shape').EquationSelectedTargetSearchTraceRecorder;
  formulaHandoff?: {
    domain: 'real';
  };
  complexPreimageHandoff?: {
    domain: 'complex';
    outputStyle: OutputStyle;
    complexExactForm: ComplexExactForm;
    angleUnit: AngleUnit;
    maxPowerDegree?: number;
  };
};

export type TrigCarrierKind = 'sin' | 'cos' | 'tan';

export type TrigCarrierProfile = {
  kind: TrigCarrierKind;
  node: MathJson;
  argument: MathJson;
  labelLatex: string;
};

export type TrigAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: TrigCarrierProfile | null;
};

export type TargetAffine = {
  coefficient: MathJson;
  constant: MathJson;
};

export type MixedTrigAffine = {
  sinCoefficient: MathJson;
  cosCoefficient: MathJson;
  constant: MathJson;
  argument: MathJson | null;
};

export type CarrierMatch =
  | { kind: 'matched'; carrier: TrigCarrierProfile }
  | { kind: 'none' };

export type CollectResult =
  | { kind: 'ok'; affine: TrigAffine }
  | { kind: 'unsupported'; reason: ParameterizedTrigStopReason; message: string };

export type TargetAffineResult =
  | { kind: 'ok'; affine: TargetAffine }
  | { kind: 'unsupported'; reason: ParameterizedTrigStopReason; message: string };

export type MixedCollectResult =
  | { kind: 'ok'; affine: MixedTrigAffine }
  | { kind: 'unsupported'; reason: ParameterizedTrigStopReason; message: string };
