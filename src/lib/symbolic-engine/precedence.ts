import type { PrecedenceClass } from '../../types/calculator';
import { isNodeArray } from './patterns';

function precedenceForOperator(operator: string): PrecedenceClass {
  switch (operator) {
    case 'Power':
      return 'power';
    case 'Negate':
      return 'unary';
    case 'Multiply':
    case 'Divide':
      return 'multiply-divide';
    case 'Add':
    case 'Subtract':
      return 'add-subtract';
    case 'Equal':
    case 'Less':
    case 'Greater':
      return 'relations';
    default:
      return 'grouping';
  }
}

export function getPrecedenceClass(node: unknown): PrecedenceClass {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return 'grouping';
  }

  return precedenceForOperator(node[0]);
}

export function buildPrecedenceTrace(node: unknown, trace: string[] = []): string[] {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return trace;
  }

  const precedence = precedenceForOperator(node[0]);
  trace.push(`${node[0]}:${precedence}`);

  for (const child of node.slice(1)) {
    buildPrecedenceTrace(child, trace);
  }

  return trace;
}
