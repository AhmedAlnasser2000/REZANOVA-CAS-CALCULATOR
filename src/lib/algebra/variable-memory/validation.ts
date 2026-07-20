import {
  isReservedNamedVariableName,
  parseExplicitNamedVariableSyntax,
} from '../named-variable';
import type { StoredVariableValue } from '../../../types/calculator';
import type { ParsedVariableValue, ValidationResult } from './types';

const NUMERIC_LITERAL_PATTERN = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;
const LATEX_FRACTION_PATTERN =
  /^([+-]?)\\frac\{([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)\}\{([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)\}$/;
const SLASH_FRACTION_PATTERN =
  /^([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)\/([+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?)$/;

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

  if (!/^[A-Za-z]$/.test(trimmed)) {
    return { ok: false, error: 'Stored variables use one case-sensitive letter for now.' };
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
