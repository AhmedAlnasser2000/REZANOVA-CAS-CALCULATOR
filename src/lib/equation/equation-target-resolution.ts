import { isReservedNamedVariableName, normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import type {
  ReservedIdentifierFact,
  VariableAnalysis,
  VariableIdentifierKind,
  VariableSymbolFact,
} from '../algebra/variable-core';

export type EquationSolveTargetCandidate = {
  name: string;
  label: string;
};

export type EquationSolveTargetStatus =
  | 'ready'
  | 'no-target'
  | 'unsupported'
  | 'parameterized-unsupported';

export type EquationSolveTargetResolution = {
  candidates: EquationSolveTargetCandidate[];
  selectedTarget: string | null;
  shouldShowSelector: boolean;
  status: EquationSolveTargetStatus;
  message?: string;
  analysis: VariableAnalysis;
};

const RESERVED_FUNCTIONS = new Set([
  'abs',
  'acos',
  'arccos',
  'asin',
  'arcsin',
  'atan',
  'arctan',
  'cos',
  'cosh',
  'cot',
  'csc',
  'exp',
  'ln',
  'log',
  'root',
  'sec',
  'sin',
  'sinh',
  'sqrt',
  'tan',
  'tanh',
]);

function uniqueSymbols(symbols: VariableSymbolFact[]) {
  const byName = new Map<string, VariableSymbolFact>();
  for (const symbol of symbols) {
    const existing = byName.get(symbol.name);
    if (existing) {
      byName.set(symbol.name, {
        ...existing,
        occurrences: existing.occurrences + symbol.occurrences,
      });
      continue;
    }
    byName.set(symbol.name, symbol);
  }
  return [...byName.values()].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
}

function variableSymbol(name: string, identifierKind: VariableIdentifierKind): VariableSymbolFact {
  return {
    name,
    identifierKind,
    roles: ['symbolic-parameter'],
    occurrences: 1,
  };
}

function reservedIdentifier(name: string): ReservedIdentifierFact {
  return {
    name,
    identifierKind: RESERVED_FUNCTIONS.has(name.toLowerCase())
      ? 'reserved-function'
      : 'reserved-constant',
    occurrences: 1,
  };
}

function stripKnownLatexCommands(latex: string) {
  return latex
    .replace(/\\mathrm\{[A-Za-z][A-Za-z0-9_]*\}/g, ' ')
    .replace(/\\operatorname\{[A-Za-z][A-Za-z0-9_]*\}/g, ' ')
    .replace(/\\[A-Za-z]+/g, ' ');
}

function analyzeEquationTargetVariables(equationLatex: string): VariableAnalysis {
  const normalized = normalizeExplicitNamedVariablesInLatex(equationLatex);
  const symbols: VariableSymbolFact[] = normalized.tokens.map((token) =>
    variableSymbol(token.name, 'named-variable'));
  const reservedIdentifiers: ReservedIdentifierFact[] = [];
  const implicitCharacterProducts: VariableAnalysis['implicitCharacterProducts'] = [];

  for (const command of equationLatex.matchAll(/\\([A-Za-z]+)/g)) {
    if (command[1] === 'mathrm' || command[1] === 'operatorname') {
      continue;
    }
    if (isReservedNamedVariableName(command[1])) {
      reservedIdentifiers.push(reservedIdentifier(command[1]));
    }
  }

  const searchable = stripKnownLatexCommands(normalized.latex);
  for (const match of searchable.matchAll(/[A-Za-z][A-Za-z0-9_]*/g)) {
    const raw = match[0];
    if (normalized.explicitNames.has(raw)) {
      continue;
    }

    if (isReservedNamedVariableName(raw)) {
      reservedIdentifiers.push(reservedIdentifier(raw));
      continue;
    }

    if (/^[A-Za-z]$/.test(raw)) {
      symbols.push(variableSymbol(raw, 'single-symbol-variable'));
      continue;
    }

    const characters = [...raw].filter((character) => /[A-Za-z]/.test(character));
    if (characters.length > 1) {
      implicitCharacterProducts.push({ raw, characters });
      for (const character of characters) {
        symbols.push(variableSymbol(character, 'single-symbol-variable'));
      }
    }
  }

  return {
    symbols: uniqueSymbols(symbols),
    reservedIdentifiers,
    implicitCharacterProducts,
    stops: [],
  };
}

function isSupportedEquationTarget(symbol: VariableSymbolFact) {
  return (
    symbol.identifierKind === 'named-variable'
    || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
  );
}

function targetLabel(name: string) {
  return name;
}

export function resolveEquationSolveTarget(
  equationLatex: string,
  selectedTarget?: string | null,
): EquationSolveTargetResolution {
  const analysis = analyzeEquationTargetVariables(equationLatex);
  const candidates = analysis.symbols
    .filter(isSupportedEquationTarget)
    .map((symbol) => ({
      name: symbol.name,
      label: targetLabel(symbol.name),
    }));
  const selectedCandidate = selectedTarget && candidates.some((candidate) => candidate.name === selectedTarget)
    ? selectedTarget
    : candidates.find((candidate) => candidate.name === 'x')?.name ?? candidates[0]?.name ?? null;

  if (candidates.length === 0) {
    return {
      candidates,
      selectedTarget: null,
      shouldShowSelector: false,
      status: 'no-target',
      message: analysis.reservedIdentifiers.length > 0
        ? 'Only reserved constants or functions were found; no solve target is available.'
        : 'Enter an equation containing a supported variable.',
      analysis,
    };
  }

  if (candidates.length > 1) {
    return {
      candidates,
      selectedTarget: selectedCandidate,
      shouldShowSelector: true,
      status: 'parameterized-unsupported',
      message: selectedCandidate
        ? `Choose ${selectedCandidate} as the solve target to preserve the other symbols as parameters.`
        : 'Choose a solve target before solving this multi-symbol equation.',
      analysis,
    };
  }

  return {
    candidates,
    selectedTarget: candidates[0].name,
    shouldShowSelector: false,
    status: 'ready',
    analysis,
  };
}
