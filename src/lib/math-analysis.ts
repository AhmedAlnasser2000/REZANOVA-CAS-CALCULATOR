import { ComputeEngine } from '@cortex-js/compute-engine';
import type { MathAnalysis } from '../types/calculator';

type BoxedAnalysisExpr = {
  json: unknown;
  operator?: string;
};

const ce = new ComputeEngine();
const RELATIONAL_OPERATORS = new Set([
  'NotEqual',
  'Less',
  'Greater',
  'LessEqual',
  'GreaterEqual',
]);

function containsSymbol(node: unknown, symbol: string): boolean {
  if (typeof node === 'string') {
    return node === symbol;
  }

  if (Array.isArray(node)) {
    return node.some((entry) => containsSymbol(entry, symbol));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => containsSymbol(entry, symbol));
  }

  return false;
}

export function analyzeLatex(latex: string): MathAnalysis {
  const source = latex.trim();
  if (!source) {
    return {
      kind: 'empty',
      containsSymbolX: false,
    };
  }

  try {
    const expr = ce.parse(source) as BoxedAnalysisExpr;
    const topLevelOperator = expr.operator;
    return {
      kind: topLevelOperator === 'Equal' ? 'equation' : 'expression',
      containsSymbolX: containsSymbol(expr.json, 'x'),
      topLevelOperator,
    };
  } catch {
    return {
      kind: 'invalid',
      containsSymbolX: /\bx\b/.test(source),
    };
  }
}

export function isRelationalOperator(operator?: string) {
  return operator ? RELATIONAL_OPERATORS.has(operator) : false;
}
