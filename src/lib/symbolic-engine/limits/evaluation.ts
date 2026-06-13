import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../normalize';
import type { BoxedLike, FiniteLimitRuleOrigin, FiniteLimitRuleSuccess, FiniteLimitRuleValue } from './types';

const ce = new ComputeEngine();

export function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

export function latexToNumber(latex: string) {
  const normalized = latex
    .replaceAll('\\cdot', '')
    .replaceAll('\\,', '')
    .replaceAll(' ', '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function evaluateNodeAt(node: unknown, value: number, variable = 'x') {
  try {
    const evaluated = box(node).subs({ [variable]: value }).evaluate();
    if (typeof evaluated.json === 'number' && Number.isFinite(evaluated.json)) {
      return evaluated.json;
    }
    return latexToNumber((evaluated.N?.() ?? evaluated).latex);
  } catch {
    return undefined;
  }
}

export function isZeroish(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) < 1e-8;
}

export function isHuge(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) > 1e8;
}

export function isNonZeroish(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && !isZeroish(value);
}

export function isNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value < 0;
}

export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function factorial(value: number) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }
  return result;
}

function limitMethodSection(...lines: string[]) {
  return [{
    title: 'Limit Method',
    lines,
  }];
}

export function success(
  value: FiniteLimitRuleValue,
  origin: FiniteLimitRuleOrigin,
  lines: string[],
): FiniteLimitRuleSuccess {
  return {
    kind: 'success',
    value,
    origin,
    detailSections: limitMethodSection(...lines),
  };
}

export function isEquivalentNode(left: unknown, right: unknown) {
  return JSON.stringify(normalizeAst(left)) === JSON.stringify(normalizeAst(right));
}
