import { ComputeEngine } from '@cortex-js/compute-engine';
import type { BoxedLike } from './types';

export const ce = new ComputeEngine();

export function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isNumericConstantSymbol(symbol: string) {
  return symbol === 'Pi' || symbol === 'ExponentialE';
}

export function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return isNumericConstantSymbol(node);
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericOnlyNode(child));
}

export function numericExpression(expr: BoxedLike) {
  if (typeof expr.N === 'function') {
    return expr.N();
  }

  return expr.evaluate?.().N?.() ?? expr;
}

export function readNumericValue(node: unknown): number | null {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value) ? value : null;
  }

  if (typeof node === 'string') {
    const value = Number(node);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}
