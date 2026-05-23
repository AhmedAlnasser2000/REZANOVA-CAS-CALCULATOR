import { ComputeEngine } from '@cortex-js/compute-engine';
import { canonicalizeMathInput } from '../input/input-canonicalization';

const ce = new ComputeEngine();

export type VariableIdentifierKind =
  | 'single-symbol-variable'
  | 'indexed-symbol-variable'
  | 'named-string-variable'
  | 'reserved-constant'
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
  identifierKind: 'reserved-constant' | 'reserved-function';
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

const RESERVED_CONSTANTS = new Set([
  'Pi',
  'ExponentialE',
  'Infinity',
  'NaN',
  'Nothing',
  'True',
  'False',
]);

const RESERVED_FUNCTION_OPERATORS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Sec',
  'Csc',
  'Cot',
  'Arcsin',
  'Arccos',
  'Arctan',
  'Sinh',
  'Cosh',
  'Tanh',
  'Ln',
  'Log',
  'Sqrt',
  'Root',
  'Abs',
]);

const GREEK_SYMBOL_NAMES = new Set([
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
  'iota',
  'kappa',
  'lambda',
  'mu',
  'nu',
  'xi',
  'omicron',
  'rho',
  'sigma',
  'tau',
  'upsilon',
  'phi',
  'chi',
  'psi',
  'omega',
]);

function compareIdentifierNames(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function classifySymbolName(name: string): VariableIdentifierKind {
  if (RESERVED_CONSTANTS.has(name)) {
    return 'reserved-constant';
  }

  if (/^[A-Za-z]$/.test(name) || GREEK_SYMBOL_NAMES.has(name)) {
    return 'single-symbol-variable';
  }

  if (/^[A-Za-z]_[A-Za-z0-9]+$/.test(name)) {
    return 'indexed-symbol-variable';
  }

  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    return 'named-string-variable';
  }

  return 'unsupported-symbol';
}

function collectMathJsonIdentifiers(
  node: unknown,
  symbols: Map<string, { kind: VariableIdentifierKind; occurrences: number }>,
  reserved: Map<string, { kind: 'reserved-constant' | 'reserved-function'; occurrences: number }>,
) {
  if (typeof node === 'string') {
    const kind = classifySymbolName(node);
    if (kind === 'reserved-constant') {
      const current = reserved.get(node);
      reserved.set(node, {
        kind,
        occurrences: (current?.occurrences ?? 0) + 1,
      });
      return;
    }

    const current = symbols.get(node);
    symbols.set(node, {
      kind,
      occurrences: (current?.occurrences ?? 0) + 1,
    });
    return;
  }

  if (isNodeArray(node)) {
    const [operator, ...operands] = node;
    if (typeof operator === 'string' && RESERVED_FUNCTION_OPERATORS.has(operator)) {
      const current = reserved.get(operator);
      reserved.set(operator, {
        kind: 'reserved-function',
        occurrences: (current?.occurrences ?? 0) + 1,
      });
    }
    for (const operand of operands) {
      collectMathJsonIdentifiers(operand, symbols, reserved);
    }
    return;
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      collectMathJsonIdentifiers(value, symbols, reserved);
    }
  }
}

function scanImplicitCharacterProducts(latex: string): ImplicitCharacterProductFact[] {
  const products = new Map<string, ImplicitCharacterProductFact>();
  let index = 0;

  while (index < latex.length) {
    const char = latex[index];
    if (char === '\\') {
      index += 1;
      while (index < latex.length && /[A-Za-z]/.test(latex[index])) {
        index += 1;
      }
      continue;
    }

    if (!/[A-Za-z]/.test(char)) {
      index += 1;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < latex.length && /[A-Za-z]/.test(latex[nextIndex])) {
      nextIndex += 1;
    }

    const raw = latex.slice(index, nextIndex);
    if (raw.length > 1) {
      products.set(raw, {
        raw,
        characters: raw.split(''),
      });
    }
    index = nextIndex;
  }

  return [...products.values()].sort((left, right) => left.raw.localeCompare(right.raw));
}

function roleForSymbol(symbol: string, kind: VariableIdentifierKind, policy: VariableRolePolicy): VariableRole[] {
  if (kind === 'named-string-variable' || kind === 'unsupported-symbol') {
    return ['unsupported-symbol'];
  }

  if (policy.solveTarget === symbol) {
    return ['solve-target'];
  }

  if (policy.activeVariable === symbol) {
    return ['active-variable'];
  }

  if (policy.boundVariables?.includes(symbol)) {
    return ['bound-variable'];
  }

  if (policy.storedVariables?.includes(symbol)) {
    return ['stored-value-candidate'];
  }

  if (policy.allowSymbolicParameters !== false) {
    return ['symbolic-parameter'];
  }

  return ['unsupported-symbol'];
}

function buildStops(
  symbols: VariableSymbolFact[],
  reserved: ReservedIdentifierFact[],
  policy: VariableRolePolicy,
): VariableCoreStop[] {
  const stops: VariableCoreStop[] = [];
  const supportedSymbols = symbols.filter((symbol) =>
    symbol.identifierKind !== 'named-string-variable'
    && symbol.identifierKind !== 'unsupported-symbol');

  for (const symbol of symbols) {
    if (symbol.identifierKind === 'named-string-variable') {
      stops.push({
        reason: 'unsupported-named-string-variable',
        message: `Named string variable '${symbol.name}' is deferred to a later milestone.`,
        symbols: [symbol.name],
      });
    } else if (symbol.identifierKind === 'unsupported-symbol') {
      stops.push({
        reason: 'ambiguous-identifier',
        message: `Identifier '${symbol.name}' cannot be classified safely.`,
        symbols: [symbol.name],
      });
    }
  }

  if (policy.requireSingleTarget && !policy.solveTarget) {
    if (supportedSymbols.length > 1) {
      stops.push({
        reason: 'multiple-target-candidates',
        message: 'Multiple variable candidates are present; a solve target must be chosen explicitly.',
        symbols: supportedSymbols.map((symbol) => symbol.name),
      });
    } else if (supportedSymbols.length === 0 && reserved.length > 0) {
      stops.push({
        reason: 'reserved-identifier-only',
        message: 'Only reserved identifiers were found; no solve variable candidate is available.',
        symbols: reserved.map((entry) => entry.name),
      });
    }
  }

  if (policy.solveTarget && !supportedSymbols.some((symbol) => symbol.name === policy.solveTarget)) {
    stops.push({
      reason: 'mode-policy-mismatch',
      message: `Requested solve target '${policy.solveTarget}' was not found as a supported variable.`,
      symbols: [policy.solveTarget],
    });
  }

  return stops;
}

export function analyzeVariablesFromMathJson(
  node: unknown,
  policy: VariableRolePolicy = {},
  sourceLatex = '',
): VariableAnalysis {
  const symbolCounts = new Map<string, { kind: VariableIdentifierKind; occurrences: number }>();
  const reservedCounts = new Map<string, { kind: 'reserved-constant' | 'reserved-function'; occurrences: number }>();
  collectMathJsonIdentifiers(node, symbolCounts, reservedCounts);

  const symbols = [...symbolCounts.entries()]
    .map(([name, entry]) => ({
      name,
      identifierKind: entry.kind,
      roles: roleForSymbol(name, entry.kind, policy),
      occurrences: entry.occurrences,
    }))
    .sort((left, right) => compareIdentifierNames(left.name, right.name));

  const reservedIdentifiers = [...reservedCounts.entries()]
    .map(([name, entry]) => ({
      name,
      identifierKind: entry.kind,
      occurrences: entry.occurrences,
    }))
    .sort((left, right) => compareIdentifierNames(left.name, right.name));

  return {
    symbols,
    reservedIdentifiers,
    implicitCharacterProducts: sourceLatex ? scanImplicitCharacterProducts(sourceLatex) : [],
    stops: buildStops(symbols, reservedIdentifiers, policy),
  };
}

export function analyzeVariablesFromLatex(
  latex: string,
  policy: VariableRolePolicy = {},
): VariableAnalysis {
  const canonicalized = canonicalizeMathInput(latex, {
    mode: 'calculate',
    screenHint: 'standard',
  });
  const source = canonicalized.ok ? canonicalized.canonicalLatex : latex;

  try {
    const parsed = ce.parse(source);
    return analyzeVariablesFromMathJson(parsed.json, policy, source);
  } catch {
    return {
      symbols: [],
      reservedIdentifiers: [],
      implicitCharacterProducts: scanImplicitCharacterProducts(source),
      stops: [{
        reason: 'parse-error',
        message: 'Variable analysis could not parse this input.',
        symbols: [],
      }],
    };
  }
}
