import type { AlgebraTransformAction } from '../../algebra/algebra-transform';
import type {
  AngleUnit,
  CalculateAction,
  CalculateScreen,
  LimitDirection,
  LimitTargetKind,
  OutputStyle,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export type RunCalculateModeRequest = {
  action: CalculateAction;
  latex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  calculateScreen?: CalculateScreen;
  limitDirection?: LimitDirection;
  limitTargetKind?: LimitTargetKind;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
};

export type RunCalculateAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  latex: string;
  angleUnit: AngleUnit;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
};

export type RunCalculateRuntimeRequest =
  | {
      kind: 'standard';
      request: RunCalculateModeRequest;
    }
  | {
      kind: 'algebraTransform';
      request: RunCalculateAlgebraTransformRequest;
    }
  | {
      kind: 'legacyWorkbench';
      request: RunCalculateModeRequest;
      title?: string;
    };
