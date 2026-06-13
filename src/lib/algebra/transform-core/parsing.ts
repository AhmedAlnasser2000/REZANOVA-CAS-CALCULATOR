import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { flattenAdd, isNodeArray } from '../../symbolic-engine/patterns';
import type { ParsedEquationNode } from './types';

const ce = new ComputeEngine();

export function hasAdditiveStructure(node: unknown) {
  return flattenAdd(normalizeAst(node)).length > 1;
}

export function parseExpressionNode(latex: string) {
  try {
    return normalizeAst(ce.parse(latex).json);
  } catch {
    return null;
  }
}

export function parseEquationNode(latex: string): ParsedEquationNode | null {
  const parsed = parseExpressionNode(latex);
  if (!parsed || !isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  return {
    left: normalizeAst(parsed[1]),
    right: normalizeAst(parsed[2]),
  };
}

export function normalizeLatexForComparison(latex: string) {
  return latex.replace(/\s+/g, '');
}

export function supportsPowerSource(latex: string) {
  return latex.includes('^');
}

export function supportsRootSource(latex: string) {
  return latex.includes('\\sqrt');
}

export function supportsChangeBaseSource(latex: string) {
  return /\\log_\{/.test(latex);
}

export function supportsAnySource() {
  return true;
}
