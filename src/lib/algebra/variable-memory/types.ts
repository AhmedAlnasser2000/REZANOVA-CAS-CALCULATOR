import type {
  DisplayDetailSection,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type ParsedVariableValue = {
  valueLatex: string;
  numericValue: number;
  json: unknown;
};

export type StoredVariableSubstitutionResult = {
  latex: string;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

export type StoredValueReadbackInput = {
  substitutions: readonly VariableSubstitutionSnapshot[];
  protectedSubstitutions?: readonly VariableSubstitutionSnapshot[];
  protectedNameDescriptions?: Readonly<Record<string, string>>;
  originalLatex?: string;
  effectiveLatex?: string;
  effectiveLabel?: string;
  replayedSnapshot?: boolean;
  ignoredLines?: readonly string[];
};

export type StoredValueModePolicy =
  | {
      kind: 'apply';
      protectedNames: readonly string[];
      protectedNameDescriptions?: Readonly<Record<string, string>>;
    }
  | {
      kind: 'ignore';
      explanation: string;
    }
  | {
      kind: 'unsupported';
    };

export type StoredValueModePolicyInput = {
  mode: 'calculate' | 'table' | 'calculus' | 'equation';
  action:
    | 'standard-evaluate'
    | 'calculus-workbench'
    | 'symbolic-transform'
    | 'table-evaluate'
    | 'calculus-workspace-evaluate'
    | 'equation-numeric-solve'
    | 'equation-symbolic-solve'
    | 'equation-transform'
    | 'unsupported';
  protectedNames?: readonly string[];
  protectedNameDescriptions?: Readonly<Record<string, string>>;
};

export type StoredValueReadbackSection = DisplayDetailSection;
