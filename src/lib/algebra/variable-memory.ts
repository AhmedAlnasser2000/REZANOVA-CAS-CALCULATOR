import { ComputeEngine } from '@cortex-js/compute-engine';
import { analyzeVariablesFromLatex } from './variable-core';
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

  const analysis = analyzeVariablesFromLatex(trimmed, {
    allowSymbolicParameters: true,
    storedVariables: [trimmed],
  });

  if (analysis.reservedIdentifiers.length > 0 && analysis.symbols.length === 0) {
    return { ok: false, error: 'Reserved constants and functions cannot be stored variables.' };
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
): {
  latex: string;
  substitutions: VariableSubstitutionSnapshot[];
} {
  const protectedNames = new Set(options.protectedNames ?? []);
  const usableEntries = (entries ?? []).filter((entry) => Number.isFinite(entry.numericValue));
  if (usableEntries.length === 0) {
    return { latex, substitutions: [] };
  }

  const replacements = new Map<string, unknown>();
  for (const entry of usableEntries) {
    if (protectedNames.has(entry.name)) {
      continue;
    }
    replacements.set(entry.name, valueJsonForEntry(entry));
  }

  if (replacements.size === 0) {
    return { latex, substitutions: [] };
  }

  try {
    const parsed = ce.parse(latex);
    const usedNames = new Set<string>();
    const substitutedJson = substituteMathJson(parsed.json, replacements, usedNames);
    const substitutions = usableEntries
      .filter((entry) => usedNames.has(entry.name))
      .map((entry) => ({
        name: entry.name,
        valueLatex: entry.valueLatex,
        numericValue: entry.numericValue,
      }));

    if (substitutions.length === 0) {
      return { latex, substitutions: [] };
    }

    const boxed = ce.box(substitutedJson as Parameters<typeof ce.box>[0]);
    return {
      latex: boxed.latex,
      substitutions,
    };
  } catch {
    return { latex, substitutions: [] };
  }
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
