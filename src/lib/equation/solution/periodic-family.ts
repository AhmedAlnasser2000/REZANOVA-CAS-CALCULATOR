import type { DisplayBranchReadback } from '../../../types/calculator';
import {
  divideExactScalars,
  exactScalarEquals,
  exactScalarIsZero,
  normalizeExactScalar,
  subtractExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
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
  parameterLatex: string;
  exactSupplementLatex?: string[];
};

type RenderPeriodicFamiliesOptions = {
  source: string;
  parameterPlacement?: 'supplement' | 'inline';
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

export function renderPeriodicFamilyExpression(family: PeriodicFamily) {
  const offset = formatPiScalar(family.offset);
  const period = formatPiParameterTerm(family.period, family.parameter);
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
  const unique = uniquePeriodicFamilies(families);
  const branchesLatex = unique.map(renderPeriodicFamilyExpression);
  const targetLatex = unique[0]?.targetLatex ?? '';
  const baseExactLatex = `${targetLatex}\\in\\left\\{${branchesLatex.join(',\\ ')}\\right\\}`;
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
