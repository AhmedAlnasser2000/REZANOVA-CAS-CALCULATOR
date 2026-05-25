import type { ModeId, StoredVariableValue } from '../../types/calculator';
import {
  analyzeVariablesFromLatex,
  type VariableAnalysis,
  type VariableRolePolicy,
} from './variable-core';

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

function storedNames(entries: readonly StoredVariableValue[] | undefined) {
  return entries?.map((entry) => entry.name) ?? [];
}

function displayName(name: string) {
  return RESERVED_DISPLAY_NAMES[name] ?? name;
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

function analysisPolicy(context: VariableHintContext): VariableRolePolicy {
  return {
    solveTarget: context.solveTarget ?? undefined,
    activeVariable: context.activeVariable,
    boundVariables: context.boundVariables,
    storedVariables: storedNames(context.storedVariables),
    allowSymbolicParameters: true,
  };
}

function hintsFromAnalysis(
  analysis: VariableAnalysis,
  context: VariableHintContext,
) {
  const hints: VariableHint[] = [];

  for (const reserved of analysis.reservedIdentifiers) {
    const label = displayName(reserved.name);
    addHint(hints, {
      kind: reserved.identifierKind,
      label,
      detail: reserved.identifierKind === 'reserved-function'
        ? `${label} is a reserved function name, not a variable.`
        : `${label} is a reserved constant, not a stored or solved variable.`,
    });
  }

  for (const product of analysis.implicitCharacterProducts) {
    if (new Set(product.characters).size <= 1) {
      continue;
    }
    addHint(hints, {
      kind: 'ambiguous-adjacent',
      label: product.raw,
      detail: `${product.raw} is read as multiplication of adjacent letters, not one named variable. Use @${product.raw} or var(${product.raw}) for one named variable.`,
    });
  }

  for (const symbol of analysis.symbols) {
    const stored = storedEntryForName(symbol.name, context.storedVariables);
    if (
      symbol.identifierKind === 'named-string-variable'
      || symbol.identifierKind === 'unsupported-symbol'
    ) {
      addHint(hints, {
        kind: 'unsupported-name',
        label: symbol.name,
        detail: `${symbol.name} is not enabled as one named variable yet.`,
      });
      continue;
    }

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
          detail: `${symbol.name} has stored value ${stored.valueLatex}, but Equation symbolic keeps it as a symbolic parameter.`,
        });
      } else {
        addHint(hints, {
          kind: 'stored-value',
          label: symbol.name,
          detail: `${symbol.name} has stored value ${stored.valueLatex}.`,
        });
      }
      continue;
    }

    addHint(hints, {
      kind: 'symbolic-parameter',
      label: symbol.name,
      detail: `${symbol.name} is treated as a symbolic parameter here.`,
    });
  }

  return hints;
}

export function buildVariableHints(
  latex: string,
  context: VariableHintContext,
): VariableHint[] {
  if (!latex.trim()) {
    return [];
  }

  const analysis = analyzeVariablesFromLatex(latex, analysisPolicy(context));
  return hintsFromAnalysis(analysis, context);
}
