import type { DisplayBranchReadback } from '../../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarEquals,
  exactScalarIsZero,
  normalizeExactScalar,
  subtractExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import type { AngleUnit } from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';

export type PeriodicFamilyDomain = 'real' | 'complex';

export type PeriodicFamily = {
  kind: 'periodic-family';
  targetLatex: string;
  offset: ExactScalar;
  period: ExactScalar;
  parameter: string;
  domain: PeriodicFamilyDomain;
};

export type PeriodicFamilyRender = {
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  branchesLatex: string[];
  families: PeriodicFamily[];
  parameterLatex: string;
  exactSupplementLatex?: string[];
};

type RenderPeriodicFamiliesOptions = {
  source: string;
  parameterPlacement?: 'supplement' | 'inline';
  angleUnit?: AngleUnit;
};

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };

export function rational(numerator: number, denominator = 1): ExactScalar {
  return normalizeExactScalar({ numerator, denominator });
}

export function piRationalFromDegrees(degrees: number): ExactScalar {
  return rational(degrees, 180);
}

export function createPeriodicFamily(input: Omit<PeriodicFamily, 'kind'>): PeriodicFamily {
  return {
    kind: 'periodic-family',
    ...input,
    offset: normalizeExactScalar(input.offset),
    period: positiveScalar(input.period),
  };
}

export function transformPeriodicFamilyForAffineTarget(
  family: PeriodicFamily,
  input: {
    targetLatex: string;
    coefficient: ExactScalar;
    constant?: ExactScalar;
  },
): PeriodicFamily | null {
  if (exactScalarIsZero(input.coefficient)) {
    return null;
  }

  const constant = input.constant ?? ZERO;
  const offsetNumerator = subtractExactScalars(family.offset, constant);
  const offset = divideExactScalars(offsetNumerator, input.coefficient);
  const period = divideExactScalars(family.period, input.coefficient);
  if (!offset || !period) {
    return null;
  }

  return createPeriodicFamily({
    ...family,
    targetLatex: input.targetLatex,
    offset,
    period,
  });
}

export function renderPeriodicFamilyExpression(family: PeriodicFamily, angleUnit: AngleUnit = 'rad') {
  const offset = formatAngleScalar(family.offset, angleUnit);
  const period = formatAngleParameterTerm(family.period, family.parameter, angleUnit);
  if (offset === '0') {
    return period;
  }
  return `${offset}+${period}`;
}

export function integerParameterLatexForPeriodicFamilies(families: readonly PeriodicFamily[]) {
  const parameters = [...new Set(families.map((family) => family.parameter))];
  return `${parameters.join(',')}\\in\\mathbb{Z}`;
}

export function uniquePeriodicFamilies(families: readonly PeriodicFamily[]) {
  const byKey = new Map<string, PeriodicFamily>();
  for (const family of families) {
    byKey.set(periodicFamilyKey(family), family);
  }
  return [...byKey.values()];
}

export function renderPeriodicFamilies(
  families: readonly PeriodicFamily[],
  options: RenderPeriodicFamiliesOptions,
): PeriodicFamilyRender {
  const unique = compressEvenlySpacedFamilies(uniquePeriodicFamilies(families));
  const angleUnit = options.angleUnit ?? 'rad';
  const branchesLatex = unique.map((family) => renderPeriodicFamilyExpression(family, angleUnit));
  const targetLatex = unique[0]?.targetLatex ?? '';
  const baseExactLatex = branchesLatex.length === 1
    ? `${targetLatex}=${branchesLatex[0]}`
    : `${targetLatex}\\in\\left\\{${branchesLatex.join(',\\ ')}\\right\\}`;
  const parameterLatex = integerParameterLatexForPeriodicFamilies(unique);
  const exactLatex = options.parameterPlacement === 'inline'
    ? `${baseExactLatex},\\ ${parameterLatex}`
    : baseExactLatex;

  return {
    exactLatex,
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\in',
      branchesLatex,
      source: options.source,
    }),
    branchesLatex,
    families: unique,
    parameterLatex,
    exactSupplementLatex: options.parameterPlacement === 'inline' ? undefined : [parameterLatex],
  };
}

function periodicFamilyKey(family: PeriodicFamily) {
  const normalized = createPeriodicFamily(family);
  return [
    normalized.targetLatex,
    normalized.domain,
    normalized.parameter,
    scalarKey(normalized.offset),
    scalarKey(normalized.period),
  ].join('|');
}

function scalarKey(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return `${normalized.numerator}/${normalized.denominator}`;
}

function positiveScalar(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator < 0
    ? { numerator: -normalized.numerator, denominator: normalized.denominator }
    : normalized;
}

function compareScalars(left: ExactScalar, right: ExactScalar) {
  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  return normalizedLeft.numerator * normalizedRight.denominator
    - normalizedRight.numerator * normalizedLeft.denominator;
}

function normalizeOffset(offset: ExactScalar, period: ExactScalar) {
  let normalized = normalizeExactScalar(offset);
  const positivePeriod = positiveScalar(period);
  for (let count = 0; count < 64 && compareScalars(normalized, ZERO) < 0; count += 1) {
    normalized = addExactScalars(normalized, positivePeriod);
  }
  for (let count = 0; count < 64 && compareScalars(normalized, positivePeriod) >= 0; count += 1) {
    normalized = subtractExactScalars(normalized, positivePeriod);
  }
  return normalized;
}

function compressEvenlySpacedFamilies(families: readonly PeriodicFamily[]) {
  const groups = new Map<string, PeriodicFamily[]>();
  for (const family of families) {
    const normalized = createPeriodicFamily(family);
    const key = [
      normalized.targetLatex,
      normalized.domain,
      normalized.parameter,
      scalarKey(normalized.period),
    ].join('|');
    const group = groups.get(key) ?? [];
    group.push({ ...normalized, offset: normalizeOffset(normalized.offset, normalized.period) });
    groups.set(key, group);
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length < 2) return group;
    const ordered = [...group].sort((left, right) => compareScalars(left.offset, right.offset));
    const period = ordered[0].period;
    const gaps = ordered.map((family, index) => {
      const next = ordered[(index + 1) % ordered.length];
      return index === ordered.length - 1
        ? addExactScalars(subtractExactScalars(next.offset, family.offset), period)
        : subtractExactScalars(next.offset, family.offset);
    });
    if (!gaps.every((gap) => exactScalarEquals(gap, gaps[0]))) return ordered;
    return [createPeriodicFamily({
      ...ordered[0],
      offset: ordered[0].offset,
      period: gaps[0],
    })];
  });
}

function formatPiScalar(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (exactScalarIsZero(normalized)) {
    return '0';
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  const numerator = Math.abs(normalized.numerator);
  if (normalized.denominator === 1) {
    return `${sign}${numerator === 1 ? '\\pi' : `${numerator}\\pi`}`;
  }
  return numerator === 1
    ? `${sign}\\frac{\\pi}{${normalized.denominator}}`
    : `${sign}\\frac{${numerator}\\pi}{${normalized.denominator}}`;
}

function formatPiParameterTerm(value: ExactScalar, parameter: string) {
  const normalized = positiveScalar(value);
  if (exactScalarEquals(normalized, ONE)) {
    return `\\pi ${parameter}`;
  }
  const numerator = Math.abs(normalized.numerator);
  if (normalized.denominator === 1) {
    return `${numerator}\\pi ${parameter}`;
  }
  return numerator === 1
    ? `\\frac{\\pi ${parameter}}{${normalized.denominator}}`
    : `\\frac{${numerator}\\pi ${parameter}}{${normalized.denominator}}`;
}

function formatAngleScalar(value: ExactScalar, angleUnit: AngleUnit) {
  if (angleUnit === 'rad') return formatPiScalar(value);
  const scale = angleUnit === 'deg' ? 180 : 200;
  const normalized = normalizeExactScalar(value);
  const numerator = normalized.numerator * scale;
  const denominator = normalized.denominator;
  const reduced = rational(numerator, denominator);
  return exactScalarIsZero(reduced) ? '0' : exactScalarToIntegerOrFraction(reduced);
}

function formatAngleParameterTerm(value: ExactScalar, parameter: string, angleUnit: AngleUnit) {
  if (angleUnit === 'rad') return formatPiParameterTerm(value, parameter);
  const scale = angleUnit === 'deg' ? 180 : 200;
  const normalized = rational(value.numerator * scale, value.denominator);
  if (exactScalarEquals(normalized, ONE)) return parameter;
  return `${exactScalarToIntegerOrFraction(normalized)}${parameter}`;
}

function exactScalarToIntegerOrFraction(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}
