import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import {
  derivativeVariableLatex,
  parseDerivativeVariable,
} from './derivative-target';
import {
  buildNaturalLimitRequestLatex,
  type NaturalLimitRequest,
} from './limit-request';

const ce = new ComputeEngine();

type LimitVariableMismatch = {
  limitVariable: string;
  bodyVariables: string[];
  suggestedLatex?: string;
};

export type LimitVariableAnalysis = {
  bodyVariables: string[];
  mismatch?: LimitVariableMismatch;
};

function collectVariablesFromNode(node: unknown, variables: Set<string>) {
  if (typeof node === 'string') {
    const parsed = parseDerivativeVariable(node);
    if (parsed.ok) {
      variables.add(parsed.variable);
    }
    return;
  }

  if (Array.isArray(node)) {
    for (let index = 1; index < node.length; index += 1) {
      collectVariablesFromNode(node[index], variables);
    }
    return;
  }

  if (!node || typeof node !== 'object') {
    return;
  }

  for (const value of Object.values(node as Record<string, unknown>)) {
    collectVariablesFromNode(value, variables);
  }
}

export function collectNaturalLimitBodyVariables(bodyLatex: string): string[] {
  const variables = new Set<string>();
  try {
    collectVariablesFromNode(ce.parse(bodyLatex).json, variables);
  } catch {
    return [];
  }

  return [...variables].sort((left, right) => left.localeCompare(right));
}

function formatVariableList(variables: readonly string[]) {
  return variables.map(derivativeVariableLatex).join(', ');
}

export function analyzeNaturalLimitVariables(request: NaturalLimitRequest): LimitVariableAnalysis {
  const bodyVariables = collectNaturalLimitBodyVariables(request.bodyLatex);
  if (bodyVariables.length === 0 || bodyVariables.includes(request.variable)) {
    return { bodyVariables };
  }

  const suggestedVariable = bodyVariables.length === 1 ? bodyVariables[0] : undefined;
  const suggestedLatex = suggestedVariable
    ? buildNaturalLimitRequestLatex({
        variableLatex: derivativeVariableLatex(suggestedVariable),
        target: request.target,
        bodyLatex: request.bodyLatex,
      })
    : undefined;

  return {
    bodyVariables,
    mismatch: {
      limitVariable: request.variable,
      bodyVariables,
      suggestedLatex,
    },
  };
}

export function limitVariableMismatchError(mismatch: LimitVariableMismatch) {
  const limitVariable = derivativeVariableLatex(mismatch.limitVariable);
  const bodyVariables = formatVariableList(mismatch.bodyVariables);
  const base = `The limit approaches ${limitVariable}, but the expression uses ${bodyVariables}.`;
  if (!mismatch.suggestedLatex) {
    return `${base} Choose the variable that the expression should approach before evaluating.`;
  }
  return `${base} Did you mean ${mismatch.suggestedLatex}?`;
}

export function limitVariableMismatchDetails(mismatch: LimitVariableMismatch): DisplayDetailSection[] {
  const lines = [
    `Limit variable: ${derivativeVariableLatex(mismatch.limitVariable)}`,
    `Expression variables: ${formatVariableList(mismatch.bodyVariables)}`,
  ];
  if (mismatch.suggestedLatex) {
    lines.push(`Suggested expression: ${mismatch.suggestedLatex}`);
  }

  return [{
    title: 'Limit Variable Check',
    lines,
  }];
}
