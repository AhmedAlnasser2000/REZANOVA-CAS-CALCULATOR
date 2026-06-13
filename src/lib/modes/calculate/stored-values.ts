import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  applyStoredVariableSubstitutions,
  type StoredVariableSubstitutionResult,
} from '../../algebra/variable-memory';
import type {
  CalculateAction,
  CalculateScreen,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import { responseTitle } from './titles';

const ce = new ComputeEngine();

function addSingleLetterName(target: Set<string>, node: unknown) {
  if (typeof node === 'string' && /^[A-Za-z]$/.test(node)) {
    target.add(node);
  }
}

function collectBoundNamesFromMathJson(node: unknown, target: Set<string>) {
  if (!Array.isArray(node)) {
    if (node && typeof node === 'object') {
      for (const value of Object.values(node)) {
        collectBoundNamesFromMathJson(value, target);
      }
    }
    return;
  }

  const [operator, ...operands] = node;

  if (operator === 'D') {
    addSingleLetterName(target, operands[1]);
  }

  if (operator === 'Integrate') {
    const limits = operands[1];
    if (Array.isArray(limits) && limits[0] === 'Limits') {
      addSingleLetterName(target, limits[1]);
    }
  }

  if (operator === 'Limit') {
    const functionNode = operands[0];
    if (Array.isArray(functionNode) && functionNode[0] === 'Function') {
      for (const functionOperand of functionNode.slice(2)) {
        addSingleLetterName(target, functionOperand);
      }
    }
  }

  for (const operand of operands) {
    collectBoundNamesFromMathJson(operand, target);
  }
}

function collectBoundNamesFromLatex(latex: string) {
  const names = new Set<string>();
  try {
    collectBoundNamesFromMathJson(ce.parse(latex).json, names);
  } catch {
    // Keep substitution policy conservative when parsing fails.
  }
  return names;
}

function calculusProtectedNames(resolvedLatex: string, sourceLatex: string) {
  const names = new Set<string>();
  for (const name of collectBoundNamesFromLatex(resolvedLatex)) {
    names.add(name);
  }
  for (const name of collectBoundNamesFromLatex(sourceLatex)) {
    names.add(name);
  }

  return names.size > 0 ? Array.from(names) : ['x'];
}

export function storedValuesLabelForResult(title: string) {
  if (title === 'Derivative') {
    return 'derivative expression';
  }
  if (title === 'Integral') {
    return 'integral expression';
  }
  if (title === 'Limit') {
    return 'limit expression';
  }

  return 'expression';
}

export function protectedDescriptionForResult(title: string) {
  if (title === 'Derivative') {
    return 'the derivative variable';
  }
  if (title === 'Integral') {
    return 'the integration variable';
  }
  if (title === 'Limit') {
    return 'the limit variable';
  }

  return 'a protected variable';
}

export function descriptionMap(names: readonly string[], description: string) {
  return Object.fromEntries(names.map((name) => [name, description]));
}

export function calculateSubstitutionPolicy({
  action,
  calculateScreen = 'standard',
  resolvedLatex,
  sourceLatex,
}: {
  action: CalculateAction;
  calculateScreen?: CalculateScreen;
  resolvedLatex: string;
  sourceLatex: string;
}): { protectedNames: string[] } | null {
  if (action !== 'evaluate') {
    return null;
  }

  const title = responseTitle(action, resolvedLatex, sourceLatex);
  if (calculateScreen === 'standard' && title === 'Numeric') {
    return { protectedNames: [] };
  }

  if (title === 'Derivative' || title === 'Integral' || title === 'Limit') {
    return { protectedNames: calculusProtectedNames(resolvedLatex, sourceLatex) };
  }

  return null;
}

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function unwrapBlockNode(node: unknown) {
  if (isArrayNode(node) && node[0] === 'Block') {
    return node[1];
  }

  return node;
}

function derivativeAtPointSubstitution(
  latex: string,
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  protectedNames: readonly string[],
): StoredVariableSubstitutionResult | null {
  try {
    const json = ce.parse(latex).json;
    if (!isArrayNode(json) || json[0] !== 'Subscript') {
      return null;
    }

    const evaluateAt = json[1];
    const pointRule = json[2];
    if (!isArrayNode(evaluateAt) || evaluateAt[0] !== 'EvaluateAt') {
      return null;
    }
    if (!isArrayNode(pointRule) || pointRule[0] !== 'Equal') {
      return null;
    }

    const functionNode = evaluateAt[1];
    if (!isArrayNode(functionNode) || functionNode[0] !== 'Function') {
      return null;
    }

    const derivativeNode = unwrapBlockNode(functionNode[1]);
    if (!isArrayNode(derivativeNode) || derivativeNode[0] !== 'D') {
      return null;
    }

    const variable = derivativeNode[2];
    const pointVariable = pointRule[1];
    if (
      typeof variable !== 'string'
      || variable !== pointVariable
      || !/^[A-Za-z]$/.test(variable)
    ) {
      return null;
    }

    const bodyLatex = ce.box(derivativeNode[1] as Parameters<typeof ce.box>[0]).latex;
    const bodySubstitution = applyStoredVariableSubstitutions(bodyLatex, entries, {
      protectedNames: Array.from(new Set([...protectedNames, variable])),
    });
    const pointLatex = ce.box(pointRule[2] as Parameters<typeof ce.box>[0]).latex;

    return {
      latex: `\\left.\\frac{\\mathrm{d}}{\\mathrm{d}${variable}}\\left(${bodySubstitution.latex}\\right)\\right|_{${variable}=${pointLatex}}`,
      substitutions: bodySubstitution.substitutions,
      protectedSubstitutions: bodySubstitution.protectedSubstitutions,
    };
  } catch {
    return null;
  }
}

export function applyCalculateStoredVariableSubstitutions(
  latex: string,
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  protectedNames: readonly string[],
  responseTitleText: string,
) {
  if (responseTitleText === 'Derivative') {
    const derivativePoint = derivativeAtPointSubstitution(latex, entries, protectedNames);
    if (derivativePoint) {
      return derivativePoint;
    }
  }

  return applyStoredVariableSubstitutions(latex, entries, { protectedNames });
}
