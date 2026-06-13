import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../../types/calculator';
import {
  normalizeExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';

const ce = new ComputeEngine();
export const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

export function simplifyNode(node: unknown) {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

export function expandAndSimplifyNode(node: unknown) {
  try {
    const expanded = expand(ce.box(node as Parameters<typeof ce.box>[0]) as never) as { json: unknown };
    return simplifyNode(expanded.json);
  } catch {
    return simplifyNode(node);
  }
}

export function isExactIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node);
}

export function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

export function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  return normalizedLeft.numerator === normalizedRight.numerator
    && normalizedLeft.denominator === normalizedRight.denominator;
}

export function combineVariables(left?: string, right?: string) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return left === right ? left : null;
}

export function collectVariables(node: unknown, variables: Set<string>) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return;
  }

  for (let index = 1; index < node.length; index += 1) {
    collectVariables(node[index], variables);
  }
}

export function detectSingleVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  if (variables.size > 1) {
    return null;
  }

  return [...variables][0];
}

export function expressionHasVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  return variables.size > 0;
}

export function mergeSolveDomainConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of [...left, ...right]) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

export function buildConditionSupplementLatex(constraints: SolveDomainConstraint[]) {
  const supported = constraints.flatMap((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return [`${constraint.expressionLatex}\\ne0`];
      case 'nonnegative':
        return [`${constraint.expressionLatex}\\ge0`];
      case 'positive':
        return [`${constraint.expressionLatex}>0`];
      default:
        return [];
    }
  });

  if (supported.length === 0) {
    return [] as string[];
  }

  return [`\\text{Conditions: } ${supported.join(',\\;')}`];
}

export function parseInteger(node: unknown) {
  if (isExactIntegerNode(node)) {
    return node;
  }

  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : null;
}

export function parsePositiveRational(node: unknown): ExactScalar | null {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.numerator <= 0 || scalar.denominator <= 0) {
    return null;
  }

  return scalar;
}
