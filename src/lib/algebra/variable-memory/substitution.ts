import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  normalizeExplicitNamedVariablesInLatex,
} from '../named-variable';
import type {
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import { parseStoredVariableValue } from './validation';
import { intersectNames, snapshotsForNames } from './snapshots';
import type { StoredVariableSubstitutionResult } from './types';

const ce = new ComputeEngine();

function cloneJson<T>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
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
