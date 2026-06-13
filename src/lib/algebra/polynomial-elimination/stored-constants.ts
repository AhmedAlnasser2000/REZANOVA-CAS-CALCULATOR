import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  normalizeExactScalar,
  type ExactScalar,
} from '../polynomial-core';
import { normalizeExplicitNamedVariablesInLatex } from '../named-variable';
import type { StoredVariableValue, VariableSubstitutionSnapshot } from '../../../types/calculator';
import {
  bivariateStop,
  isSafeInteger,
  scalarWithinCaps,
  type BivariateResultantOptions,
  type RequiredBivariateResultantOptions,
  type SubstitutionResult,
} from './types';

const ce = new ComputeEngine();

function scalarFromDecimalString(raw: string): ExactScalar | null {
  const compact = raw.trim();
  const match = compact.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) {
    return null;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const integerPart = match[2] ?? '';
  const fractionPart = match[3] ?? match[4] ?? '';
  const exponent = Number(match[5] ?? '0');
  const digitsRaw = `${integerPart}${fractionPart}`.replace(/^0+(?=\d)/, '') || '0';
  const scale = fractionPart.length - exponent;
  const digits = Number(digitsRaw);
  if (!isSafeInteger(digits)) {
    return null;
  }
  if (scale >= 0) {
    const denominator = 10 ** scale;
    if (!isSafeInteger(denominator)) {
      return null;
    }
    return normalizeExactScalar({ numerator: sign * digits, denominator });
  }
  const factor = 10 ** -scale;
  if (!isSafeInteger(factor) || !isSafeInteger(digits * factor)) {
    return null;
  }
  return normalizeExactScalar({ numerator: sign * digits * factor, denominator: 1 });
}

function scalarFromStoredValue(entry: StoredVariableValue | VariableSubstitutionSnapshot): ExactScalar | null {
  const compact = entry.valueLatex.trim().replace(/\s+/g, '');
  const latexFraction = compact.match(/^\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}$/);
  if (latexFraction) {
    const numerator = Number(latexFraction[1]);
    const denominator = Number(latexFraction[2]);
    return isSafeInteger(numerator) && isSafeInteger(denominator) && denominator !== 0
      ? normalizeExactScalar({ numerator, denominator })
      : null;
  }
  const slashFraction = compact.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (slashFraction) {
    const numerator = Number(slashFraction[1]);
    const denominator = Number(slashFraction[2]);
    return isSafeInteger(numerator) && isSafeInteger(denominator) && denominator !== 0
      ? normalizeExactScalar({ numerator, denominator })
      : null;
  }
  return scalarFromDecimalString(compact) ?? scalarFromDecimalString(`${entry.numericValue}`);
}

function exactScalarNode(value: ExactScalar): unknown {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? normalized.numerator
    : ['Rational', normalized.numerator, normalized.denominator];
}

function substituteStoredConstantsInNode(
  node: unknown,
  replacements: Map<string, ExactScalar>,
  protectedNames: ReadonlySet<string>,
  usedNames: Set<string>,
  protectedUsedNames: Set<string>,
): unknown {
  if (typeof node === 'string') {
    if (protectedNames.has(node)) {
      protectedUsedNames.add(node);
      return node;
    }
    const replacement = replacements.get(node);
    if (replacement) {
      usedNames.add(node);
      return exactScalarNode(replacement);
    }
    return node;
  }
  if (Array.isArray(node)) {
    const [operator, ...operands] = node;
    if (operator === 'Function') {
      return [
        operator,
        operands.length > 0
          ? substituteStoredConstantsInNode(operands[0], replacements, protectedNames, usedNames, protectedUsedNames)
          : operands[0],
        ...operands.slice(1),
      ];
    }
    return [
      operator,
      ...operands.map((operand) =>
        substituteStoredConstantsInNode(operand, replacements, protectedNames, usedNames, protectedUsedNames)),
    ];
  }
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        substituteStoredConstantsInNode(value, replacements, protectedNames, usedNames, protectedUsedNames),
      ]),
    );
  }
  return node;
}

export function parseAndSubstituteExpression(
  latex: string,
  retainedVariable: string,
  eliminatedVariable: string,
  storedVariables: BivariateResultantOptions['storedVariables'],
  options: RequiredBivariateResultantOptions,
): SubstitutionResult {
  let parsed: unknown;
  try {
    parsed = ce.parse(normalizeExplicitNamedVariablesInLatex(latex).latex).json;
  } catch {
    return bivariateStop('parse-error');
  }

  const protectedNames = new Set([retainedVariable, eliminatedVariable]);
  const replacements = new Map<string, ExactScalar>();
  const storedByName = new Map<string, StoredVariableValue | VariableSubstitutionSnapshot>();
  for (const entry of storedVariables ?? []) {
    if (!Number.isFinite(entry.numericValue) || protectedNames.has(entry.name)) {
      storedByName.set(entry.name, entry);
      continue;
    }
    const scalar = scalarFromStoredValue(entry);
    if (!scalar || !scalarWithinCaps(scalar, options)) {
      return bivariateStop('stored-constant-unsafe', { storedVariable: entry.name });
    }
    replacements.set(entry.name, scalar);
    storedByName.set(entry.name, entry);
  }

  const usedNames = new Set<string>();
  const protectedUsedNames = new Set<string>();
  const node = substituteStoredConstantsInNode(parsed, replacements, protectedNames, usedNames, protectedUsedNames);
  return {
    kind: 'success',
    node,
    substitutions: [...usedNames].sort().flatMap((name) => {
      const entry = storedByName.get(name);
      return entry ? [{ name: entry.name, valueLatex: entry.valueLatex, numericValue: entry.numericValue }] : [];
    }),
    protectedSubstitutions: [...protectedUsedNames].sort().flatMap((name) => {
      const entry = storedByName.get(name);
      return entry ? [{ name: entry.name, valueLatex: entry.valueLatex, numericValue: entry.numericValue }] : [];
    }),
  };
}

export function substitutedNodeToLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}
