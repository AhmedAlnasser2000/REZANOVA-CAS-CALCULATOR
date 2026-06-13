import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { normalizeExactScalar, type ExactScalar } from '../polynomial-core';
import { ROOT_TOLERANCE } from './types';

const ce = new ComputeEngine();

export function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isExactInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

export function exactScalarIsInteger(value: ExactScalar) {
  return normalizeExactScalar(value).denominator === 1;
}

export function exactScalarSign(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return 0;
  }
  return normalized.numerator > 0 ? 1 : -1;
}

export function simplifyNode(node: unknown) {
  try {
    return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
  } catch {
    return normalizeAst(node);
  }
}

export function nodeLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

export function numericValueForNode(node: unknown): number | null {
  try {
    const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function sortAndDedupeApprox(values: number[]) {
  return values
    .slice()
    .sort((left, right) => left - right)
    .filter((value, index, list) =>
      index === 0 || Math.abs(value - list[index - 1]) > ROOT_TOLERANCE);
}

export function collectPolynomialSymbols(node: unknown, result = new Set<string>()) {
  if (typeof node === 'string') {
    result.add(node);
    return result;
  }

  if (!isNodeArray(node)) {
    return result;
  }

  node.forEach((child, index) => {
    if (index > 0) {
      collectPolynomialSymbols(child, result);
    }
  });

  return result;
}

export function containsPolynomialVariable(node: unknown, variable: string) {
  return collectPolynomialSymbols(node).has(variable);
}

