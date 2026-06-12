import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  appendDiscoveredBranchFamilies,
  createBranchFamilyMetadata,
  mergeBranchFamilyExtras,
  toPeriodicFamilyInfo,
} from '../../algebra/branch-core';
import { formatNumber } from '../../display/format';
import { convertAngle, formatDegreesAsUnitLatex } from '../../trigonometry/angles';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';
import { dedupe } from '../guarded/merge';
import { numericAffineCarrier } from './carriers';
import type {
  AngleUnit,
  PeriodicFamilyInfo,
  PeriodicFamilyRepresentative,
  PeriodicIntervalSuggestion,
  PeriodicPiecewiseBranch,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../types/calculator';

const EPSILON = 1e-9;

export type PeriodicFamilySolveResult =
  | {
      kind: 'solved';
      family: PeriodicFamilyInfo;
      domainConstraints?: SolveDomainConstraint[];
      supplementLatex?: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'guided';
      family: PeriodicFamilyInfo;
      error: string;
      domainConstraints?: SolveDomainConstraint[];
      supplementLatex?: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    };

export function periodicFamilyToExactLatex(family: PeriodicFamilyInfo) {
  return family.branchesLatex.length === 1
    ? `${family.carrierLatex}=${family.branchesLatex[0]}`
    : `${family.carrierLatex}\\in\\left\\{${family.branchesLatex.join(', ')}\\right\\}`;
}

export function periodicFamilyParameterSupplement(family: PeriodicFamilyInfo) {
  return `\\text{Parameter: } ${family.parameterLatex}`;
}

export function createPeriodicFamily(
  metadata: {
    carrierLatex: string;
    parameterLatex?: string;
    branchesLatex: string[];
    parameterConstraintLatex?: string[];
    discoveredFamilies?: string[];
    representatives?: PeriodicFamilyRepresentative[];
    suggestedIntervals?: PeriodicIntervalSuggestion[];
    piecewiseBranches?: PeriodicPiecewiseBranch[];
    principalRangeLatex?: string;
    reducedCarrierLatex?: string;
    structuredStopReason?: PeriodicFamilyInfo['structuredStopReason'];
  },
) {
  return toPeriodicFamilyInfo(createBranchFamilyMetadata({
    carrierLatex: metadata.carrierLatex,
    parameterLatex: metadata.parameterLatex ?? 'k\\in\\mathbb{Z}',
    branchesLatex: metadata.branchesLatex,
    parameterConstraintLatex: metadata.parameterConstraintLatex,
    discoveredFamilies: metadata.discoveredFamilies,
    representatives: metadata.representatives,
    suggestedIntervals: metadata.suggestedIntervals,
    piecewiseBranches: metadata.piecewiseBranches,
    principalRangeLatex: metadata.principalRangeLatex,
    reducedCarrierLatex: metadata.reducedCarrierLatex,
    structuredStopReason: metadata.structuredStopReason,
  }));
}

export function periodicFamilyConstraintSupplements(family: PeriodicFamilyInfo) {
  if (!family.parameterConstraintLatex || family.parameterConstraintLatex.length === 0) {
    return [] as string[];
  }

  return [`\\text{Parameter constraints: } ${family.parameterConstraintLatex.join(',\\;')}`];
}

export function buildPeriodicBranchConditionSupplement(branchLatex: string[]) {
  if (branchLatex.length === 0) {
    return [] as string[];
  }

  return [`\\text{Branch conditions: } ${branchLatex.join(',\\;')}`];
}

export function formatBranchConstant(value: number, angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return formatDegreesAsUnitLatex(convertAngle(value, 'rad', 'deg'), 'rad');
  }

  return formatNumber(value, 12);
}

function formatAngleUnitValueText(value: number, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return `${formatNumber(value)} deg`;
  }
  if (angleUnit === 'grad') {
    return `${formatNumber(value)} grad`;
  }
  return `${formatNumber(value)} rad`;
}

export function inverseTrigPrincipalRange(kind: 'asin' | 'acos' | 'atan', angleUnit: AngleUnit) {
  if (kind === 'acos') {
    return {
      min: 0,
      max: convertAngle(180, 'deg', angleUnit),
      minInclusive: true,
      maxInclusive: true,
    };
  }

  return {
    min: convertAngle(-90, 'deg', angleUnit),
    max: convertAngle(90, 'deg', angleUnit),
    minInclusive: kind === 'asin',
    maxInclusive: kind === 'asin',
  };
}

export function isWithinPrincipalRange(
  value: number,
  range: { min: number; max: number; minInclusive: boolean; maxInclusive: boolean },
) {
  const minCheck = range.minInclusive ? value >= range.min - EPSILON : value > range.min + EPSILON;
  const maxCheck = range.maxInclusive ? value <= range.max + EPSILON : value < range.max - EPSILON;
  return minCheck && maxCheck;
}

export function buildInverseTrigPrincipalRangeMessage(
  kind: 'asin' | 'acos' | 'atan',
  angleUnit: AngleUnit,
) {
  const range = inverseTrigPrincipalRange(kind, angleUnit);
  const opener = range.minInclusive ? '[' : '(';
  const closer = range.maxInclusive ? ']' : ')';
  return `${opener}${formatAngleUnitValueText(range.min, angleUnit)}, ${formatAngleUnitValueText(range.max, angleUnit)}${closer}`;
}

function formatAngleUnitValueLatex(value: number, angleUnit: AngleUnit) {
  return formatDegreesAsUnitLatex(convertAngle(value, angleUnit, 'deg'), angleUnit);
}

export function buildInverseTrigPrincipalRangeLatex(
  kind: 'asin' | 'acos' | 'atan',
  angleUnit: AngleUnit,
) {
  const range = inverseTrigPrincipalRange(kind, angleUnit);
  const opener = range.minInclusive ? '\\left[' : '\\left(';
  const closer = range.maxInclusive ? '\\right]' : '\\right)';
  return `${opener}${formatAngleUnitValueLatex(range.min, angleUnit)}, ${formatAngleUnitValueLatex(range.max, angleUnit)}${closer}`;
}

export function intervalWithinPrincipalRange(
  interval: { min: number; max: number; minInclusive: boolean; maxInclusive: boolean },
  principalRange: { min: number; max: number; minInclusive: boolean; maxInclusive: boolean },
) {
  const minOkay = principalRange.minInclusive
    ? interval.min >= principalRange.min - EPSILON
    : interval.min > principalRange.min + EPSILON;
  const maxOkay = principalRange.maxInclusive
    ? interval.max <= principalRange.max + EPSILON
    : interval.max < principalRange.max - EPSILON;
  return minOkay && maxOkay;
}

export function mergePeriodicFamilyExtras(
  family: PeriodicFamilyInfo | undefined,
  extras: Partial<PeriodicFamilyInfo> | undefined,
) {
  return mergeBranchFamilyExtras(family, extras);
}

export function appendDiscoveredFamilies(
  family: PeriodicFamilyInfo,
  discoveredFamilies: string[] = [],
) {
  return appendDiscoveredBranchFamilies(family, discoveredFamilies);
}

export function appendDiscoveredFamiliesToResult(
  result: PeriodicFamilySolveResult,
  discoveredFamilies: string[] = [],
): PeriodicFamilySolveResult {
  if (discoveredFamilies.length === 0) {
    return result;
  }

  return {
    ...result,
    family: appendDiscoveredFamilies(result.family, discoveredFamilies),
  };
}

export function appendPeriodicSolveBadges(
  result: PeriodicFamilySolveResult,
  badges: SolveBadge[],
): PeriodicFamilySolveResult {
  return {
    ...result,
    solveBadges: dedupe<SolveBadge>([...(result.solveBadges ?? []), ...badges]),
  };
}

export function isReducedCarrierExactFamily(family: PeriodicFamilyInfo) {
  return Boolean(
    family.reducedCarrierLatex
    && family.reducedCarrierLatex === family.carrierLatex
    && family.carrierLatex !== 'x',
  );
}

export function isSawtoothPeriodicFamily(family: PeriodicFamilyInfo) {
  return Boolean(family.principalRangeLatex || (family.piecewiseBranches?.length ?? 0) > 0);
}

export function buildReducedCarrierSawtoothSummary(equationLatex: string, family: PeriodicFamilyInfo) {
  return `Exact reduced-carrier sawtooth family: ${equationLatex} closes over ${family.carrierLatex}.`;
}

export function periodicFamilyBadges(
  node: unknown,
  nestedContextBadges: SolveBadge[],
  extraBadges: SolveBadge[] = [],
) {
  const normalized = normalizeAst(node);
  const inner = isNodeArray(normalized) && normalized.length === 2 ? normalized[1] : null;
  return dedupe<SolveBadge>([
    'Periodic Family',
    ...extraBadges,
    ...(inner && !numericAffineCarrier(inner) ? ['Composition Branch' as const] : []),
    ...nestedContextBadges,
  ]);
}

export function buildPeriodicOutcomeSupplements(periodic: PeriodicFamilySolveResult) {
  return mergeExactSupplementLatex(
    { latex: [periodicFamilyParameterSupplement(periodic.family)], source: 'periodic-family' },
    { latex: periodicFamilyConstraintSupplements(periodic.family), source: 'periodic-family' },
    { latex: periodic.supplementLatex, source: 'periodic-family' },
    { constraints: periodic.domainConstraints, source: 'periodic-family' },
  );
}

export function buildPeriodicSolveSummary(
  expressionLatex: string,
  targetLatex: string,
  periodic: PeriodicFamilySolveResult,
  verb: 'yields' | 'reduces to',
) {
  if (periodic.kind === 'solved' && isReducedCarrierExactFamily(periodic.family)) {
    const sawtoothReducedCarrier =
      isSawtoothPeriodicFamily(periodic.family)
      || periodic.summaryText.startsWith('Sawtooth closure:');
    const familyKind = sawtoothReducedCarrier ? 'sawtooth' : 'periodic';
    const base = `Exact reduced-carrier ${familyKind} family: ${expressionLatex}=${targetLatex} closes over ${periodic.family.carrierLatex}.`;
    const trailingSummary = periodic.summaryText.startsWith('Sawtooth closure:')
      ? ''
      : periodic.summaryText;
    return periodic.summaryText
      ? trailingSummary
        ? `${base} ${trailingSummary}`
        : base
      : base;
  }

  const base = `Periodic family: ${expressionLatex}=${targetLatex} ${verb} ${periodicFamilyToExactLatex(periodic.family)}.`;
  return periodic.summaryText
    ? `${base} ${periodic.summaryText}`
    : base;
}
