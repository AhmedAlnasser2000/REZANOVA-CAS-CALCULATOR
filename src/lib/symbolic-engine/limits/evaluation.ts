import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../normalize';
import {
  formatLimitValueLatex,
  limitMethodRowsSection,
  type LimitDetailRow,
} from './detail-readback';
import type { BoxedLike, FiniteLimitRuleOrigin, FiniteLimitRuleSuccess, FiniteLimitRuleValue } from './types';
import { profileSymbolicLimitsResult } from '../../display/printer';

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
    if (
      Array.isArray(evaluated.json)
      && evaluated.json[0] === 'Rational'
      && typeof evaluated.json[1] === 'number'
      && typeof evaluated.json[2] === 'number'
      && evaluated.json[2] !== 0
    ) {
      return evaluated.json[1] / evaluated.json[2];
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

export function success(
  value: FiniteLimitRuleValue,
  origin: FiniteLimitRuleOrigin,
  rows: readonly LimitDetailRow[],
): FiniteLimitRuleSuccess {
  return profileSymbolicLimitsResult({
    kind: 'success',
    value,
    exactLatex: formatLimitValueLatex(value),
    origin,
    detailSections: limitMethodRowsSection(rows),
  });
}

export function isEquivalentNode(left: unknown, right: unknown) {
  return JSON.stringify(normalizeAst(left)) === JSON.stringify(normalizeAst(right));
}
