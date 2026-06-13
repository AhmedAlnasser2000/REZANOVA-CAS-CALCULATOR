import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatRangeInterval, proveRealRange } from '../range-impossibility';
import { dedupeNumericRoots } from '../candidate-validation';
import { buildSharedCompositionBranchSet } from './core';
import { formatBranchConstant } from './periodic-family';
import { convertAngle } from '../../trigonometry/angles';
import { dependsOnVariable, isNodeArray } from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isDirectAffineInner } from './targets';
import type {
  AngleUnit,
  PeriodicFamilyInfo,
  SolveBadge,
} from '../../../types/calculator';
import {
  evaluateFamilyBranchAt,
  type NumericTarget,
} from './targets';
import type { SymbolicFamilyBranch } from './carriers';

type TrigBranchResult =
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'branches';
      equations: string[];
      summaryText: string;
      solveBadges?: SolveBadge[];
    }
  | {
      kind: 'unresolved';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
    };

const ce = new ComputeEngine();
const EPSILON = 1e-9;
const MAX_TRIG_BRANCHES = 12;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function buildCompositionBranchSet(equations: string[]) {
  return buildSharedCompositionBranchSet(equations);
}

type NormalizedTrigComposite =
  | {
      kind: 'normalized';
      trigKind: 'sin' | 'cos' | 'tan';
      target: NumericTarget;
      inner: unknown;
      innerLatex: string;
      outerLatex: string;
      reducedCarrierLatex?: string;
      solveBadges?: SolveBadge[];
      summaryPrefix?: string;
    }
  | {
      kind: 'impossible';
      error: string;
      summaryText: string;
      solveBadges?: SolveBadge[];
      reducedCarrierLatex?: string;
      structuredStopReason?: PeriodicFamilyInfo['structuredStopReason'];
    };

function buildReciprocalTarget(target: NumericTarget): NumericTarget {
  const node = normalizeAst(['Divide', 1, target.node]);
  return {
    node,
    latex: boxLatex(node),
    value: 1 / target.value,
  };
}

function normalizeTrigComposite(
  node: unknown,
  target: NumericTarget,
): NormalizedTrigComposite | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length !== 2 || typeof normalized[0] !== 'string') {
    return null;
  }

  const operator = normalized[0];
  const inner = normalized[1];
  if (!dependsOnVariable(inner, 'x')) {
    return null;
  }

  const innerLatex = boxLatex(inner);
  const outerLatex = boxLatex(normalized);

  if (operator === 'Sin' || operator === 'Cos' || operator === 'Tan') {
    return {
      kind: 'normalized',
      trigKind: operator === 'Sin' ? 'sin' : operator === 'Cos' ? 'cos' : 'tan',
      target,
      inner,
      innerLatex,
      outerLatex,
    };
  }

  if (operator === 'Sec' || operator === 'Csc') {
    if (Math.abs(target.value) <= EPSILON || Math.abs(target.value) < 1 - EPSILON) {
      return {
        kind: 'impossible',
        error: `No real solutions because ${operator === 'Sec' ? '\\sec' : '\\csc'} only takes values with |y|\\ge1 and never 0.`,
        summaryText: `Reciprocal rewrite: ${outerLatex}=${target.latex} would require ${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)=${boxLatex(['Divide', 1, target.node])}, but reciprocal trig targets must satisfy |${target.latex}|\\ge1 and ${target.latex}\\ne0.`,
        solveBadges: ['Reciprocal Rewrite'],
        reducedCarrierLatex: `${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)`,
      };
    }

    const reciprocalTarget = buildReciprocalTarget(target);
    const reducedCarrierLatex = `${operator === 'Sec' ? '\\cos' : '\\sin'}\\left(${innerLatex}\\right)`;
    return {
      kind: 'normalized',
      trigKind: operator === 'Sec' ? 'cos' : 'sin',
      target: reciprocalTarget,
      inner,
      innerLatex,
      outerLatex,
      reducedCarrierLatex,
      solveBadges: ['Reciprocal Rewrite'],
      summaryPrefix: `Reciprocal rewrite: ${outerLatex}=${target.latex} reduces to ${reducedCarrierLatex}=${reciprocalTarget.latex}.`,
    };
  }

  if (operator === 'Cot') {
    const cotTarget = Math.abs(target.value) <= EPSILON
      ? {
          node: 0 as unknown,
          latex: '0',
          value: 0,
        } satisfies NumericTarget
      : buildReciprocalTarget(target);
    const reducedCarrierLatex = `${Math.abs(target.value) <= EPSILON ? '\\cos' : '\\tan'}\\left(${innerLatex}\\right)`;
    return {
      kind: 'normalized',
      trigKind: Math.abs(target.value) <= EPSILON ? 'cos' : 'tan',
      target: cotTarget,
      inner,
      innerLatex,
      outerLatex,
      reducedCarrierLatex,
      solveBadges: ['Reciprocal Rewrite'],
      summaryPrefix: `Reciprocal rewrite: ${outerLatex}=${target.latex} reduces to ${reducedCarrierLatex}=${cotTarget.latex}.`,
    };
  }

  return null;
}

function solveTrigOnInterval(
  kind: 'sin' | 'cos' | 'tan',
  target: number,
  intervalMin: number,
  intervalMax: number,
  angleUnit: AngleUnit,
): number[] | null {
  if (!Number.isFinite(intervalMin) || !Number.isFinite(intervalMax)) {
    return null;
  }

  if ((kind === 'sin' || kind === 'cos') && (target < -1 - EPSILON || target > 1 + EPSILON)) {
    return [];
  }

  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const period = kind === 'tan' ? Math.PI : Math.PI * 2;
  const bases =
    kind === 'sin'
      ? [Math.asin(target), Math.PI - Math.asin(target)]
      : kind === 'cos'
        ? [Math.acos(target), -Math.acos(target)]
        : [Math.atan(target)];

  const solutions = new Set<number>();
  for (const base of bases) {
    if (!Number.isFinite(base)) {
      continue;
    }

    const startK = Math.ceil((lower - base) / period - EPSILON);
    const endK = Math.floor((upper - base) / period + EPSILON);
    for (let k = startK; k <= endK; k += 1) {
      const valueRad = base + k * period;
      if (valueRad < lower - EPSILON || valueRad > upper + EPSILON) {
        continue;
      }
      solutions.add(convertAngle(valueRad, 'rad', angleUnit));
      if (solutions.size > MAX_TRIG_BRANCHES) {
        return null;
      }
    }
  }

  return dedupeNumericRoots([...solutions]);
}

function criticalAngles(kind: 'sin' | 'cos', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const base = kind === 'sin' ? Math.PI / 2 : 0;
  const period = Math.PI;
  const points: number[] = [];
  const startK = Math.ceil((lower - base) / period - EPSILON);
  const endK = Math.floor((upper - base) / period + EPSILON);
  for (let k = startK; k <= endK; k += 1) {
    const point = base + k * period;
    if (point >= lower - EPSILON && point <= upper + EPSILON) {
      points.push(point);
    }
  }
  return points;
}

function trigValue(kind: 'sin' | 'cos' | 'tan', valueRad: number) {
  if (kind === 'sin') {
    return Math.sin(valueRad);
  }
  if (kind === 'cos') {
    return Math.cos(valueRad);
  }
  return Math.tan(valueRad);
}

function composeTrigImage(kind: 'sin' | 'cos' | 'tan', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const samplePoints = [lower, upper];

  if (kind === 'sin' || kind === 'cos') {
    samplePoints.push(...criticalAngles(kind, intervalMin, intervalMax, angleUnit));
  } else {
    const asymptoteBase = Math.PI / 2;
    const period = Math.PI;
    const startK = Math.ceil((lower - asymptoteBase) / period - EPSILON);
    const endK = Math.floor((upper - asymptoteBase) / period + EPSILON);
    if (startK <= endK) {
      return null;
    }
  }

  const values = samplePoints.map((point) => trigValue(kind, point));
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    minInclusive: true,
    maxInclusive: true,
  };
}

function matchTrigBranches(node: unknown, target: NumericTarget, angleUnit: AngleUnit): TrigBranchResult | null {
  const normalizedTrig = normalizeTrigComposite(node, target);
  if (!normalizedTrig) {
    return null;
  }

  if (normalizedTrig.kind === 'impossible') {
    return normalizedTrig;
  }

  if (isDirectAffineInner(normalizedTrig.inner)) {
    return null;
  }

  const { trigKind: kind, target: effectiveTarget, inner, innerLatex, outerLatex, summaryPrefix } = normalizedTrig;
  const innerProof: ReturnType<typeof proveRealRange> = proveRealRange(inner);

  if (innerProof.kind !== 'exact') {
    return {
      kind: 'unresolved',
      error: 'This recognized composition family leaves infinitely many or currently unsupported inverse branches. Use Numeric Solve with a chosen interval.',
      summaryText: summaryPrefix
        ? `${summaryPrefix} Composition branch: ${innerLatex} does not yet have a finite proven image that supports bounded symbolic inversion.`
        : `Composition branch: ${innerLatex} does not yet have a finite proven image that supports bounded symbolic inversion.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const branchValues = solveTrigOnInterval(
    kind,
    effectiveTarget.value,
    innerProof.interval.min,
    innerProof.interval.max,
    angleUnit,
  );

  if (branchValues === null) {
    return {
      kind: 'unresolved',
      error: 'This recognized composition family leaves too many inverse branches for the current bounded symbolic solve set. Use Numeric Solve with a chosen interval.',
      summaryText: summaryPrefix
        ? `${summaryPrefix} Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, but that interval still yields too many admissible ${kind} inverse branches.`
        : `Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, but that interval still yields too many admissible ${kind} inverse branches.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  if (branchValues.length === 0) {
    const outerImage = composeTrigImage(kind, innerProof.interval.min, innerProof.interval.max, angleUnit);
    return {
      kind: 'impossible',
      error: 'No real solutions because the proven inner image makes the outer trig target unreachable.',
      summaryText: outerImage
        ? summaryPrefix
          ? `${summaryPrefix} Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex} stays in ${formatRangeInterval(outerImage)} and cannot equal ${effectiveTarget.latex}.`
          : `Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex} stays in ${formatRangeInterval(outerImage)} and cannot equal ${effectiveTarget.latex}.`
        : summaryPrefix
          ? `${summaryPrefix} Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex} cannot equal ${effectiveTarget.latex}.`
          : `Range guard: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex} cannot equal ${effectiveTarget.latex}.`,
      solveBadges: normalizedTrig.solveBadges,
    };
  }

  const branchSet = buildCompositionBranchSet(
    branchValues.map((value) => `${innerLatex}=${formatBranchConstant(value, angleUnit)}`),
  );
  return {
    kind: 'branches',
    equations: branchSet.equations,
    summaryText: summaryPrefix
      ? `${summaryPrefix} Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${normalizedTrig.reducedCarrierLatex ?? outerLatex}=${effectiveTarget.latex} reduces to ${branchSet.equations.join(',\\;')}.`
      : `Composition branch: ${innerLatex} stays in ${formatRangeInterval(innerProof.interval)}, so ${outerLatex}=${effectiveTarget.latex} reduces to ${branchSet.equations.join(',\\;')}.`,
    solveBadges: normalizedTrig.solveBadges,
  };
}

function transformLogFamilyBranches(
  branches: SymbolicFamilyBranch[],
  baseNode: unknown,
) {
  return branches.map((branch) => {
    const node = normalizeAst(['Power', baseNode, branch.node]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function transformLnFamilyBranches(branches: SymbolicFamilyBranch[]) {
  return branches.map((branch) => {
    const node = normalizeAst(['Power', 'ExponentialE', branch.node]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function trigCarrierRange(kind: 'sin' | 'cos' | 'tan') {
  if (kind === 'tan') {
    return null;
  }

  return {
    min: -1,
    max: 1,
  };
}

export {
  matchTrigBranches,
  normalizeTrigComposite,
  transformLnFamilyBranches,
  transformLogFamilyBranches,
  trigCarrierRange,
};
export type { NormalizedTrigComposite, TrigBranchResult };
