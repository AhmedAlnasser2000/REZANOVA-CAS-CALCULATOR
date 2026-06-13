import { ComputeEngine } from '@cortex-js/compute-engine';
import { canonicalizeMathInput } from '../../input/input-canonicalization';
import { normalizeExplicitNamedVariablesInLatex } from '../named-variable';
import { compareIdentifierNames } from './identifiers';
import {
  expandImplicitCharacterProductsInLatex,
  scanImplicitCharacterProducts,
} from './implicit-products';
import { collectMathJsonIdentifiers } from './math-json';
import type {
  ReservedIdentifierFact,
  VariableAnalysis,
  VariableCoreStop,
  VariableIdentifierKind,
  VariableRole,
  VariableRolePolicy,
  VariableSymbolFact,
} from './types';

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
        message: `Raw multi-letter input '${symbol.name}' is read as adjacent letters, not one named variable. Use @${symbol.name} or var(${symbol.name}) for one named variable.`,
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
  explicitNamedVariables: ReadonlySet<string> = new Set(),
): VariableAnalysis {
  const symbolCounts = new Map<string, { kind: VariableIdentifierKind; occurrences: number }>();
  const reservedCounts = new Map<string, { kind: ReservedIdentifierFact['identifierKind']; occurrences: number }>();
  collectMathJsonIdentifiers(node, symbolCounts, reservedCounts, explicitNamedVariables);

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
  const namedVariables = normalizeExplicitNamedVariablesInLatex(source);

  try {
    const ce = new ComputeEngine();
    const parsed = ce.parse(namedVariables.latex);
    return analyzeVariablesFromMathJson(
      parsed.json,
      policy,
      namedVariables.latex,
      namedVariables.explicitNames,
    );
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

export { expandImplicitCharacterProductsInLatex };

