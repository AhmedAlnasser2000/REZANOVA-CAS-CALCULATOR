export type VariableIdentifierKind =
  | 'single-symbol-variable'
  | 'indexed-symbol-variable'
  | 'named-variable'
  | 'named-string-variable'
  | 'reserved-constant'
  | 'reserved-unit'
  | 'reserved-function'
  | 'unsupported-symbol';

export type VariableRole =
  | 'solve-target'
  | 'active-variable'
  | 'bound-variable'
  | 'symbolic-parameter'
  | 'stored-value-candidate'
  | 'unsupported-symbol';

export type VariableCoreStopReason =
  | 'multiple-target-candidates'
  | 'reserved-identifier-only'
  | 'unsupported-named-string-variable'
  | 'ambiguous-identifier'
  | 'mode-policy-mismatch'
  | 'parse-error';

export type VariableSymbolFact = {
  name: string;
  identifierKind: VariableIdentifierKind;
  roles: VariableRole[];
  occurrences: number;
};

export type ReservedIdentifierFact = {
  name: string;
  identifierKind: 'reserved-constant' | 'reserved-unit' | 'reserved-function';
  occurrences: number;
};

export type ImplicitCharacterProductFact = {
  raw: string;
  characters: string[];
};

export type VariableCoreStop = {
  reason: VariableCoreStopReason;
  message: string;
  symbols: string[];
};

export type VariableRolePolicy = {
  solveTarget?: string;
  activeVariable?: string;
  boundVariables?: readonly string[];
  storedVariables?: readonly string[];
  allowSymbolicParameters?: boolean;
  requireSingleTarget?: boolean;
};

export type VariableAnalysis = {
  symbols: VariableSymbolFact[];
  reservedIdentifiers: ReservedIdentifierFact[];
  implicitCharacterProducts: ImplicitCharacterProductFact[];
  stops: VariableCoreStop[];
};

