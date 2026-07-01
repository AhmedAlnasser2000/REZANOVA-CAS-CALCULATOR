import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../symbolic-engine/normalize';
import type { EquationNumericDomainFact } from './numeric-domain-segmentation';

const ce = new ComputeEngine();

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function containsTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (!node || typeof node !== 'object') {
    return false;
  }
  const entries = isArrayNode(node) ? node : Object.values(node);
  return entries.some((entry) => containsTarget(entry, target));
}

function nodeLatex(node: unknown) {
  try {
    return ce.box(normalizeAst(node) as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return undefined;
  }
}

function factMessage(expressionLatex: string | undefined, fallback: string) {
  return expressionLatex ? `${expressionLatex} =0` : fallback;
}

function addPiecewiseBreakpointFact(
  facts: EquationNumericDomainFact[],
  expression: unknown,
  fallback: string,
) {
  const expressionLatex = nodeLatex(expression);
  const fact: EquationNumericDomainFact = {
    kind: 'piecewise-breakpoint',
    expressionLatex,
    relationLatex: '=0',
    message: factMessage(expressionLatex, fallback),
    source: 'symbolic-scan',
  };
  const key = `${fact.kind}|${fact.expressionLatex ?? ''}|${fact.message}`;
  if (!facts.some((entry) => `${entry.kind}|${entry.expressionLatex ?? ''}|${entry.message}` === key)) {
    facts.push(fact);
  }
}

function collectPiecewiseBreakpointFacts(
  node: unknown,
  target: string,
  facts: EquationNumericDomainFact[],
) {
  if (!isArrayNode(node) || node.length === 0) {
    return;
  }

  const [operator, ...operands] = node;
  if (operator === 'Abs' && operands.length === 1 && containsTarget(operands[0], target)) {
    addPiecewiseBreakpointFact(
      facts,
      operands[0],
      'Absolute-value branch changes where its argument is zero.',
    );
  }

  if ((operator === 'Min' || operator === 'Max') && operands.length >= 2) {
    const hasTargetOperand = operands.some((operand) => containsTarget(operand, target));
    if (hasTargetOperand) {
      for (let leftIndex = 0; leftIndex < operands.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < operands.length; rightIndex += 1) {
          if (!containsTarget(operands[leftIndex], target) && !containsTarget(operands[rightIndex], target)) {
            continue;
          }
          addPiecewiseBreakpointFact(
            facts,
            ['Subtract', operands[leftIndex], operands[rightIndex]],
            `${operator} branch changes where two arguments are equal.`,
          );
        }
      }
    }
  }

  for (const operand of operands) {
    collectPiecewiseBreakpointFacts(operand, target, facts);
  }
}

export function collectEquationNumericPiecewiseBreakpointFacts(node: unknown, target: string) {
  const facts: EquationNumericDomainFact[] = [];
  collectPiecewiseBreakpointFacts(node, target, facts);
  return facts;
}
