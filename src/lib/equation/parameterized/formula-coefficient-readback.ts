import {
  readExactScalarNode,
} from '../../algebra/polynomial-core';
import type { MathJson } from './math-json';

export type FormulaCoefficientReadbackKind =
  | 'generic-template'
  | 'concrete-exact-rational'
  | 'specialized-symbolic';

function hasSymbol(node: MathJson): boolean {
  if (typeof node === 'string') {
    return true;
  }
  if (Array.isArray(node)) {
    return node.slice(1).some((entry) => hasSymbol(entry as MathJson));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => entry !== undefined && hasSymbol(entry));
  }
  return false;
}

function isBareSymbol(node: MathJson): node is string {
  return typeof node === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/u.test(node);
}

export function classifyFormulaCoefficientReadback(
  coefficients: readonly MathJson[],
): FormulaCoefficientReadbackKind {
  if (coefficients.every(isBareSymbol)) {
    return 'generic-template';
  }

  if (coefficients.every((coefficient) => readExactScalarNode(coefficient) !== null)) {
    return 'concrete-exact-rational';
  }

  return coefficients.some(hasSymbol) ? 'specialized-symbolic' : 'concrete-exact-rational';
}

export function shouldUseGenericFormulaTemplate(coefficients: readonly MathJson[]) {
  return classifyFormulaCoefficientReadback(coefficients) === 'generic-template';
}
