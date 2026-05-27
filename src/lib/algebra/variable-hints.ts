import type { ModeId, StoredVariableValue } from '../../types/calculator';
import {
  isReservedNamedVariableName,
  normalizeExplicitNamedVariablesInLatex,
} from './named-variable';

export type VariableHintKind =
  | 'stored-value'
  | 'stored-ignored'
  | 'solve-target'
  | 'symbolic-parameter'
  | 'active-variable'
  | 'bound-variable'
  | 'reserved-function'
  | 'reserved-constant'
  | 'ambiguous-adjacent'
  | 'unsupported-name';

export type VariableHint = {
  kind: VariableHintKind;
  label: string;
  detail: string;
};

export type VariableHintContext = {
  mode: ModeId;
  screenHint?: string;
  solveTarget?: string | null;
  activeVariable?: string;
  boundVariables?: readonly string[];
  storedVariables?: readonly StoredVariableValue[];
};

const RESERVED_DISPLAY_NAMES: Record<string, string> = {
  Abs: 'abs',
  Arccos: 'arccos',
  Arcsin: 'arcsin',
  Arctan: 'arctan',
  Cos: 'cos',
  Cosh: 'cosh',
  Cot: 'cot',
  Csc: 'csc',
  ExponentialE: 'e',
  Ln: 'ln',
  Log: 'log',
  Pi: 'pi',
  Root: 'root',
  Sec: 'sec',
  Sin: 'sin',
  Sinh: 'sinh',
  Sqrt: 'sqrt',
  Tan: 'tan',
  Tanh: 'tanh',
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

const RESERVED_CONSTANTS = new Set(['e', 'pi', 'infinity', 'nan']);

type HintSymbol = {
  name: string;
  identifierKind: 'single-symbol-variable' | 'named-variable';
};

function displayName(name: string) {
  const lowerName = name.toLowerCase();
  return RESERVED_DISPLAY_NAMES[name] ?? (RESERVED_CONSTANTS.has(lowerName) ? lowerName : name);
}

function storedEntryForName(
  name: string,
  entries: readonly StoredVariableValue[] | undefined,
) {
  return entries?.find((entry) => entry.name === name);
}

function shouldIgnoreStoredValuesForSymbolicEquation(context: VariableHintContext) {
  return context.mode === 'equation' && context.screenHint === 'symbolic';
}

function hasHint(hints: readonly VariableHint[], kind: VariableHintKind, label: string) {
  return hints.some((hint) => hint.kind === kind && hint.label === label);
}

function addHint(hints: VariableHint[], hint: VariableHint) {
  if (!hasHint(hints, hint.kind, hint.label)) {
    hints.push(hint);
  }
}

function hintsFromSymbols(
  input: {
    reservedIdentifiers: Array<{
      name: string;
      identifierKind: 'reserved-function' | 'reserved-constant';
    }>;
    implicitCharacterProducts: Array<{ raw: string; characters: string[] }>;
    symbols: HintSymbol[];
    unsupportedNames: string[];
  },
  context: VariableHintContext,
) {
  const hints: VariableHint[] = [];

  for (const reserved of input.reservedIdentifiers) {
    const label = displayName(reserved.name);
    addHint(hints, {
      kind: reserved.identifierKind,
      label,
      detail: reserved.identifierKind === 'reserved-function'
        ? `${label} is a reserved function name, not a variable.`
        : `${label} is a reserved constant, not a stored or solved variable.`,
    });
  }

  for (const product of input.implicitCharacterProducts) {
    if (new Set(product.characters).size <= 1) {
      continue;
    }
    addHint(hints, {
      kind: 'ambiguous-adjacent',
      label: product.raw,
      detail: `${product.raw} is read as multiplication of adjacent letters, not one named variable. Use @${product.raw} or var(${product.raw}) for one named variable.`,
    });
  }

  const ambiguousLabels = new Set(input.implicitCharacterProducts.map((product) => product.raw));
  for (const unsupportedName of input.unsupportedNames) {
    if (ambiguousLabels.has(unsupportedName)) {
      continue;
    }
    addHint(hints, {
      kind: 'unsupported-name',
      label: unsupportedName,
      detail: `${unsupportedName} is read as adjacent letters, not one named variable. Use @${unsupportedName} or var(${unsupportedName}) for one named variable.`,
    });
  }

  for (const symbol of input.symbols) {
    const stored = storedEntryForName(symbol.name, context.storedVariables);
    const isNamedVariable = symbol.identifierKind === 'named-variable';

    if (context.solveTarget === symbol.name) {
      addHint(hints, {
        kind: 'solve-target',
        label: symbol.name,
        detail: `${symbol.name} is the selected solve target.`,
      });
      continue;
    }

    if (context.boundVariables?.includes(symbol.name)) {
      addHint(hints, {
        kind: 'bound-variable',
        label: symbol.name,
        detail: `${symbol.name} stays symbolic because it is bound by this operation.`,
      });
      continue;
    }

    if (context.activeVariable === symbol.name) {
      addHint(hints, {
        kind: 'active-variable',
        label: symbol.name,
        detail: `${symbol.name} stays symbolic as the active variable for this editor.`,
      });
      continue;
    }

    if (stored) {
      if (shouldIgnoreStoredValuesForSymbolicEquation(context)) {
        addHint(hints, {
          kind: 'stored-ignored',
          label: symbol.name,
          detail: isNamedVariable
            ? `${symbol.name} is one explicit named variable with stored value ${stored.valueLatex}, but Equation symbolic keeps it as a symbolic parameter.`
            : `${symbol.name} has stored value ${stored.valueLatex}, but Equation symbolic keeps it as a symbolic parameter.`,
        });
      } else {
        addHint(hints, {
          kind: 'stored-value',
          label: symbol.name,
          detail: isNamedVariable
            ? `${symbol.name} is one explicit named variable with stored value ${stored.valueLatex}.`
            : `${symbol.name} has stored value ${stored.valueLatex}.`,
        });
      }
      continue;
    }

    addHint(hints, {
      kind: 'symbolic-parameter',
      label: symbol.name,
      detail: isNamedVariable
        ? `${symbol.name} is one explicit named variable and is treated as a symbolic parameter here.`
        : `${symbol.name} is treated as a symbolic parameter here.`,
    });
  }

  return hints;
}

function stripKnownLatexCommands(latex: string) {
  return latex
    .replace(/\\mathrm\{[A-Za-z][A-Za-z0-9_]*\}/g, ' ')
    .replace(/\\operatorname\{[A-Za-z][A-Za-z0-9_]*\}/g, ' ')
    .replace(/\\[A-Za-z]+/g, ' ');
}

function collectLightVariableAnalysis(latex: string) {
  const normalized = normalizeExplicitNamedVariablesInLatex(latex);
  const reservedIdentifiers: Array<{
    name: string;
    identifierKind: 'reserved-function' | 'reserved-constant';
  }> = [];
  const implicitCharacterProducts: Array<{ raw: string; characters: string[] }> = [];
  const symbolNames = new Map<string, HintSymbol>();
  const unsupportedNames: string[] = [];

  for (const token of normalized.tokens) {
    symbolNames.set(token.name, { name: token.name, identifierKind: 'named-variable' });
  }

  for (const command of latex.matchAll(/\\([A-Za-z]+)/g)) {
    const lower = command[1].toLowerCase();
    if (RESERVED_FUNCTIONS.has(lower)) {
      reservedIdentifiers.push({ name: command[1], identifierKind: 'reserved-function' });
    } else if (RESERVED_CONSTANTS.has(lower)) {
      reservedIdentifiers.push({ name: command[1], identifierKind: 'reserved-constant' });
    }
  }

  const searchable = stripKnownLatexCommands(normalized.latex);
  for (const match of searchable.matchAll(/[A-Za-z][A-Za-z0-9_]*/g)) {
    const raw = match[0];
    if (normalized.explicitNames.has(raw)) {
      continue;
    }

    if (isReservedNamedVariableName(raw)) {
      reservedIdentifiers.push({
        name: raw,
        identifierKind: RESERVED_FUNCTIONS.has(raw.toLowerCase())
          ? 'reserved-function'
          : 'reserved-constant',
      });
      continue;
    }

    if (/^[A-Za-z]$/.test(raw)) {
      symbolNames.set(raw, { name: raw, identifierKind: 'single-symbol-variable' });
      continue;
    }

    const characters = [...raw].filter((character) => /[A-Za-z]/.test(character));
    if (characters.length > 1) {
      implicitCharacterProducts.push({ raw, characters });
      for (const character of characters) {
        symbolNames.set(character, {
          name: character,
          identifierKind: 'single-symbol-variable',
        });
      }
      unsupportedNames.push(raw);
    }
  }

  return {
    reservedIdentifiers: [...reservedIdentifiers].sort((left, right) => {
      const leftLabel = displayName(left.name);
      const rightLabel = displayName(right.name);
      return leftLabel < rightLabel ? -1 : leftLabel > rightLabel ? 1 : 0;
    }),
    implicitCharacterProducts,
    symbols: [...symbolNames.values()].sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    ),
    unsupportedNames: [...new Set(unsupportedNames)],
  };
}

export function buildVariableHints(
  latex: string,
  context: VariableHintContext,
): VariableHint[] {
  if (!latex.trim()) {
    return [];
  }

  const analysis = collectLightVariableAnalysis(latex);
  return hintsFromSymbols(analysis, context);
}
