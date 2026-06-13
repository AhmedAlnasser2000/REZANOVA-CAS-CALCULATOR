import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  type MathJson,
  isNegativeOneNode,
  isOneNode,
} from './math-json';

export function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

export function nodeHasSymbol(node: MathJson, latexForNode: (node: MathJson) => string) {
  return analyzeVariablesFromLatex(latexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

export function nonzeroFactForNode(node: MathJson, latexForNode: (node: MathJson) => string): string | null {
  if (!nodeHasSymbol(node, latexForNode) || isOneNode(node) || isNegativeOneNode(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ne0`;
}

export function positiveFactForNode(node: MathJson, latexForNode: (node: MathJson) => string): string | null {
  if (!nodeHasSymbol(node, latexForNode)) {
    return null;
  }
  return `${latexForNode(node)}>0`;
}
