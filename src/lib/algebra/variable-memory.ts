import { ComputeEngine } from '@cortex-js/compute-engine';
import { analyzeVariablesFromLatex } from './variable-core';
import {
  isReservedNamedVariableName,
  normalizeExplicitNamedVariablesInLatex,
  parseExplicitNamedVariableSyntax,
} from './named-variable';
import type {
  DisplayDetailSection,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

const ce = new ComputeEngine();

const NUMERIC_LITERAL_PATTERN = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;
const LATEX_FRACTION_PATTERN =
  /^([+-]?)\\frac\{([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)\}\{([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)\}$/;
const SLASH_FRACTION_PATTERN =
  /^([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)\/([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)$/;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type ParsedVariableValue = {
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
  mode: 'calculate' | 'table' | 'advanced-calc' | 'equation';
  action:
    | 'standard-evaluate'
    | 'calculus-workbench'
    | 'symbolic-transform'
    | 'table-evaluate'
    | 'advanced-calc-evaluate'
    | 'equation-numeric-solve'
    | 'equation-symbolic-solve'
    | 'equation-transform'
    | 'unsupported';
  protectedNames?: readonly string[];
  protectedNameDescriptions?: Readonly<Record<string, string>>;
};

function cloneJson<T>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
}

function isIntegerLiteral(value: string) {
  return /^[+-]?\d+$/.test(value);
}

function normalizeNumericLatex(value: number) {
  if (Object.is(value, -0)) {
    return '0';
  }

  return Number.isInteger(value) ? `${value}` : `${value}`;
}

function parseNumberLiteral(raw: string): ValidationResult<ParsedVariableValue> {
  const trimmed = raw.trim();
  if (!NUMERIC_LITERAL_PATTERN.test(trimmed)) {
    return { ok: false, error: 'Stored variable values must be finite real numbers.' };
  }

  const numericValue = Number(trimmed);
  if (!Number.isFinite(numericValue)) {
    return { ok: false, error: 'Stored variable values must be finite real numbers.' };
  }

  return {
    ok: true,
    value: {
      valueLatex: normalizeNumericLatex(numericValue),
      numericValue,
      json: numericValue,
    },
  };
}

function parseFractionLiteral(raw: string): ValidationResult<ParsedVariableValue> | null {
  const compact = raw.trim().replace(/\s+/g, '');
  const latexMatch = compact.match(LATEX_FRACTION_PATTERN);
  const slashMatch = compact.match(SLASH_FRACTION_PATTERN);
  if (!latexMatch && !slashMatch) {
    return null;
  }

  const sign = latexMatch ? latexMatch[1] : '';
  const numeratorRaw = latexMatch ? latexMatch[2] : slashMatch?.[1] ?? '';
  const denominatorRaw = latexMatch ? latexMatch[3] : slashMatch?.[2] ?? '';
  const numerator = Number(`${sign}${numeratorRaw}`);
  const denominator = Number(denominatorRaw);

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return { ok: false, error: 'Stored rational values require a finite nonzero denominator.' };
  }

  const numericValue = numerator / denominator;
  if (!Number.isFinite(numericValue)) {
    return { ok: false, error: 'Stored variable values must be finite real numbers.' };
  }

  if (isIntegerLiteral(`${sign}${numeratorRaw}`) && isIntegerLiteral(denominatorRaw)) {
    const normalizedNumerator = Number(`${sign}${numeratorRaw}`);
    const normalizedDenominator = Number(denominatorRaw);
    return {
      ok: true,
      value: {
        valueLatex: `\\frac{${normalizedNumerator}}{${normalizedDenominator}}`,
        numericValue,
        json: ['Rational', normalizedNumerator, normalizedDenominator],
      },
    };
  }

  return {
    ok: true,
    value: {
      valueLatex: normalizeNumericLatex(numericValue),
      numericValue,
      json: numericValue,
    },
  };
}

export function validateStoredVariableName(name: string): ValidationResult<string> {
  const trimmed = name.trim();

  if (!trimmed) {
    return { ok: false, error: 'Enter a variable name.' };
  }

  if (trimmed === 'Ans') {
    return { ok: false, error: 'Ans is reserved for the previous result.' };
  }

  const explicitNamedVariable = parseExplicitNamedVariableSyntax(trimmed);
  if (explicitNamedVariable) {
    return explicitNamedVariable.ok
      ? { ok: true, value: explicitNamedVariable.name }
      : { ok: false, error: explicitNamedVariable.error };
  }

  if (isReservedNamedVariableName(trimmed)) {
    return { ok: false, error: 'Reserved constants, units, and functions cannot be stored variables.' };
  }

  if (/^[A-Za-z][A-Za-z0-9_]+$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Use @name or var(name) to store a multi-character named variable.',
    };
  }

  const analysis = analyzeVariablesFromLatex(trimmed, {
    allowSymbolicParameters: true,
    storedVariables: [trimmed],
  });

  if (analysis.reservedIdentifiers.length > 0 && analysis.symbols.length === 0) {
    return { ok: false, error: 'Reserved constants, units, and functions cannot be stored variables.' };
  }

  if (!/^[A-Za-z]$/.test(trimmed)) {
    return { ok: false, error: 'Stored variables use one case-sensitive letter for now.' };
  }

  const symbol = analysis.symbols.find((entry) => entry.name === trimmed);
  if (!symbol || symbol.identifierKind !== 'single-symbol-variable') {
    return { ok: false, error: 'This identifier is not a supported stored variable name.' };
  }

  if (analysis.stops.length > 0) {
    return { ok: false, error: 'This identifier is reserved or unsupported.' };
  }

  return { ok: true, value: trimmed };
}

export function parseStoredVariableValue(valueLatex: string): ValidationResult<ParsedVariableValue> {
  const trimmed = valueLatex.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a numeric value.' };
  }

  const fraction = parseFractionLiteral(trimmed);
  if (fraction) {
    return fraction;
  }

  return parseNumberLiteral(trimmed);
}

export function buildStoredVariableValue(
  name: string,
  valueLatex: string,
  updatedAt = new Date().toISOString(),
): ValidationResult<StoredVariableValue> {
  const nameResult = validateStoredVariableName(name);
  if (!nameResult.ok) {
    return nameResult;
  }

  const valueResult = parseStoredVariableValue(valueLatex);
  if (!valueResult.ok) {
    return valueResult;
  }

  return {
    ok: true,
    value: {
      name: nameResult.value,
      valueLatex: valueResult.value.valueLatex,
      numericValue: valueResult.value.numericValue,
      updatedAt,
    },
  };
}

export function upsertStoredVariableValue(
  entries: readonly StoredVariableValue[],
  entry: StoredVariableValue,
) {
  const nextEntries = entries.filter((current) => current.name !== entry.name);
  nextEntries.push(entry);
  return nextEntries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
}

export function removeStoredVariableValue(
  entries: readonly StoredVariableValue[],
  name: string,
) {
  return entries.filter((entry) => entry.name !== name);
}

function valueJsonForEntry(entry: StoredVariableValue) {
  const parsed = parseStoredVariableValue(entry.valueLatex);
  if (parsed.ok) {
    return parsed.value.json;
  }

  return entry.numericValue;
}

function substituteMathJson(
  node: unknown,
  replacements: Map<string, unknown>,
  usedNames: Set<string>,
): unknown {
  if (typeof node === 'string') {
    if (replacements.has(node)) {
      usedNames.add(node);
      return cloneJson(replacements.get(node));
    }

    return node;
  }

  if (Array.isArray(node)) {
    const [operator, ...operands] = node;
    if (operator === 'Function') {
      return [
        operator,
        operands.length > 0
          ? substituteMathJson(operands[0], replacements, usedNames)
          : operands[0],
        ...operands.slice(1),
      ];
    }

    return [
      operator,
      ...operands.map((operand) => substituteMathJson(operand, replacements, usedNames)),
    ];
  }

  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        substituteMathJson(value, replacements, usedNames),
      ]),
    );
  }

  return node;
}

function collectSymbolNames(node: unknown, target: Set<string>) {
  if (typeof node === 'string') {
    target.add(node);
    return;
  }

  if (Array.isArray(node)) {
    const [operator, ...operands] = node;
    if (operator === 'Function') {
      if (operands.length > 0) {
        collectSymbolNames(operands[0], target);
      }
      return;
    }

    for (const operand of node.slice(1)) {
      collectSymbolNames(operand, target);
    }
    return;
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      collectSymbolNames(value, target);
    }
  }
}

function uniqueSnapshots(entries: readonly VariableSubstitutionSnapshot[]) {
  const unique: VariableSubstitutionSnapshot[] = [];
  for (const entry of entries) {
    if (!unique.some((current) => current.name === entry.name)) {
      unique.push({
        name: entry.name,
        valueLatex: entry.valueLatex,
        numericValue: entry.numericValue,
      });
    }
  }
  return unique;
}

function snapshotsForNames(
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[],
  names: ReadonlySet<string>,
) {
  return uniqueSnapshots(entries
    .filter((entry) => names.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      valueLatex: entry.valueLatex,
      numericValue: entry.numericValue,
    })));
}

function intersectNames(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return new Set([...left].filter((name) => right.has(name)));
}

export function snapshotStoredVariables(
  entries: readonly StoredVariableValue[],
): VariableSubstitutionSnapshot[] {
  return entries.map((entry) => ({
    name: entry.name,
    valueLatex: entry.valueLatex,
    numericValue: entry.numericValue,
  }));
}

export function applyStoredVariableSubstitutions(
  latex: string,
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  options: {
    protectedNames?: readonly string[];
  } = {},
): StoredVariableSubstitutionResult {
  const protectedNames = new Set(options.protectedNames ?? []);
  const usableEntries = (entries ?? []).filter((entry) => Number.isFinite(entry.numericValue));
  const normalized = normalizeExplicitNamedVariablesInLatex(latex);
  const parseLatex = normalized.latex;
  if (usableEntries.length === 0) {
    return { latex, substitutions: [], protectedSubstitutions: [] };
  }

  const replacements = new Map<string, unknown>();
  for (const entry of usableEntries) {
    if (protectedNames.has(entry.name)) {
      continue;
    }
    replacements.set(entry.name, valueJsonForEntry(entry));
  }

  if (replacements.size === 0) {
    try {
      const parsed = ce.parse(parseLatex);
      const usedNames = new Set<string>();
      collectSymbolNames(parsed.json, usedNames);
      return {
        latex,
        substitutions: [],
        protectedSubstitutions: snapshotsForNames(usableEntries, intersectNames(protectedNames, usedNames)),
      };
    } catch {
      return { latex, substitutions: [], protectedSubstitutions: [] };
    }
  }

  try {
    const parsed = ce.parse(parseLatex);
    const usedNames = new Set<string>();
    const originalNames = new Set<string>();
    collectSymbolNames(parsed.json, originalNames);
    const substitutedJson = substituteMathJson(parsed.json, replacements, usedNames);
    const substitutions = usableEntries
      .filter((entry) => usedNames.has(entry.name))
      .map((entry) => ({
        name: entry.name,
        valueLatex: entry.valueLatex,
        numericValue: entry.numericValue,
      }));

    if (substitutions.length === 0) {
      return {
        latex,
        substitutions: [],
        protectedSubstitutions: snapshotsForNames(usableEntries, intersectNames(protectedNames, originalNames)),
      };
    }

    const boxed = ce.box(substitutedJson as Parameters<typeof ce.box>[0]);
    return {
      latex: boxed.latex,
      substitutions,
      protectedSubstitutions: snapshotsForNames(usableEntries, intersectNames(protectedNames, originalNames)),
    };
  } catch {
    return { latex, substitutions: [], protectedSubstitutions: [] };
  }
}

function entriesText(entries: readonly VariableSubstitutionSnapshot[]) {
  return entries.map((entry) => `${entry.name}=${entry.valueLatex}`).join(', ');
}

export function resolveStoredValueModePolicy({
  mode,
  action,
  protectedNames = [],
  protectedNameDescriptions,
}: StoredValueModePolicyInput): StoredValueModePolicy {
  if (
    (mode === 'calculate' && (action === 'standard-evaluate' || action === 'calculus-workbench'))
    || (mode === 'table' && action === 'table-evaluate')
    || (mode === 'advanced-calc' && action === 'advanced-calc-evaluate')
    || (mode === 'equation' && action === 'equation-numeric-solve')
  ) {
    return { kind: 'apply', protectedNames, protectedNameDescriptions };
  }

  if (mode === 'calculate' && action === 'symbolic-transform') {
    return {
      kind: 'ignore',
      explanation: 'Symbolic transforms keep variables symbolic.',
    };
  }

  if (mode === 'equation' && action === 'equation-symbolic-solve') {
    return {
      kind: 'ignore',
      explanation: 'Equation symbolic solve keeps solve targets and symbolic parameters symbolic.',
    };
  }

  if (mode === 'equation' && action === 'equation-transform') {
    return {
      kind: 'ignore',
      explanation: 'Equation algebra transforms keep variables symbolic.',
    };
  }

  return { kind: 'unsupported' };
}

export function storedVariableSnapshotsInLatex(
  latex: string,
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
) {
  const usableEntries = (entries ?? []).filter((entry) => Number.isFinite(entry.numericValue));
  if (usableEntries.length === 0) {
    return [];
  }

  try {
    const names = new Set<string>();
    collectSymbolNames(ce.parse(normalizeExplicitNamedVariablesInLatex(latex).latex).json, names);
    return snapshotsForNames(usableEntries, names);
  } catch {
    return [];
  }
}

export function ignoredStoredValuePolicyLines({
  latex,
  entries,
  policy,
}: {
  latex: string;
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined;
  policy: StoredValueModePolicy;
}) {
  if (policy.kind !== 'ignore') {
    return [];
  }

  const matched = storedVariableSnapshotsInLatex(latex, entries);
  if (matched.length === 0) {
    return [];
  }

  return [`Ignored stored values: ${entriesText(matched)}. ${policy.explanation}`];
}

function sameLatex(left: string | undefined, right: string | undefined) {
  return (left ?? '').trim() === (right ?? '').trim();
}

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

export function storedValueReadbackSections({
  substitutions,
  protectedSubstitutions = [],
  protectedNameDescriptions = {},
  originalLatex,
  effectiveLatex,
  effectiveLabel = 'Effective expression',
  replayedSnapshot = false,
  ignoredLines = [],
}: StoredValueReadbackInput): DisplayDetailSection[] {
  const sections: DisplayDetailSection[] = [];

  if (substitutions.length > 0) {
    const lines = [`Used stored values: ${entriesText(substitutions)}.`];
    if (replayedSnapshot) {
      lines.push('Replayed with the stored-value snapshot saved with this history entry.');
    }
    if (effectiveLatex && !sameLatex(originalLatex, effectiveLatex)) {
      lines.push(`${effectiveLabel}: ${effectiveLatex}.`);
    }
    sections.push({ title: 'Stored Values', lines });
  }

  const policyLines = [
    ...protectedSubstitutions.map((entry) => {
      const description = protectedNameDescriptions[entry.name] ?? 'a protected variable';
      return `Kept ${entry.name} symbolic as ${description}.`;
    }),
    ...ignoredLines,
  ];

  if (policyLines.length > 0) {
    sections.push({ title: 'Variable Policy', lines: uniqueLines(policyLines) });
  }

  return sections;
}

export function storedValuesDetailSection(
  substitutions: readonly VariableSubstitutionSnapshot[],
  label = 'expression',
): DisplayDetailSection | undefined {
  if (substitutions.length === 0) {
    return undefined;
  }

  return {
    title: 'Stored Values',
    lines: [
      `Substituted ${substitutions
        .map((entry) => `${entry.name}=${entry.valueLatex}`)
        .join(', ')} before evaluating this ${label}.`,
    ],
  };
}
