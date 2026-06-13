import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber, formatNumber } from '../../display/format';
import { proveRealRange } from '../range-impossibility';
import { dedupeNumericRoots } from '../candidate-validation';
import { checkCandidateAgainstConstraints, readNumericNode } from '../domain-guards';
import { dedupe } from '../guarded/merge';
import { evaluateRealNumericExpression } from '../../numeric/real-numeric-eval';
import { createPeriodicFamily } from './periodic-family';
import { convertAngle, evaluateSpecialTrig } from '../../trigonometry/angles';
import { dependsOnVariable, isNodeArray } from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { matchAffineVariableArgument } from '../../trigonometry/normalize';
import { readExactScalarNode, type ExactScalar } from '../../algebra/polynomial-core';
import {
  dedupeSymbolicFamilyBranches,
  numericAffineCarrier,
  transformAffineBranches,
  type SymbolicFamilyBranch,
} from './carriers';
import type {
  AngleUnit,
  DisplayDetailSection,
  PeriodicFamilyInfo,
  PeriodicFamilyRepresentative,
  PeriodicIntervalSuggestion,
  SolveDomainConstraint,
} from '../../../types/calculator';
import type { TrigPeriodicBranch } from '../../trigonometry/equations';

const ce = new ComputeEngine();
const EPSILON = 1e-9;
const MAX_TRIG_BRANCHES = 12;

type NumericTarget = {
  node: unknown;
  latex: string;
  value: number;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function parseNumericTarget(node: unknown): NumericTarget | null {
  const normalized = normalizeAst(node);
  try {
    const numeric = ce.box(normalized as Parameters<typeof ce.box>[0]).N?.().json;
    const value = readNumericNode(numeric);
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    return {
      node: normalized,
      latex: boxLatex(normalized),
      value,
    };
  } catch {
    return null;
  }
}

function readExactScalar(node: unknown): ExactScalar | null {
  return readExactScalarNode(normalizeAst(node));
}

function buildScalarNode(numerator: number, denominator = 1): unknown {
  if (denominator === 1) {
    return numerator;
  }

  return ['Rational', numerator, denominator];
}

function buildEquationLatex(left: unknown, right: unknown) {
  return `${boxLatex(left)}=${boxLatex(right)}`
    .replace(/\\exponentialE/g, 'e');
}

function mergeDetailSections(
  left: DisplayDetailSection[] = [],
  right: DisplayDetailSection[] = [],
) {
  const encoded = dedupe([...left, ...right].map((section) => JSON.stringify(section)));
  return encoded.map((entry) => JSON.parse(entry));
}

function buildNumericTargetFromNode(node: unknown, fallbackValue?: number): NumericTarget | null {
  const normalized = normalizeAst(node);
  const parsed = parseNumericTarget(normalized);
  if (parsed) {
    return parsed;
  }

  if (fallbackValue === undefined || !Number.isFinite(fallbackValue)) {
    return null;
  }

  return {
    node: normalized,
    latex: boxLatex(normalized),
    value: fallbackValue,
  };
}

function buildInverseTrigValueTarget(
  kind: 'sin' | 'cos' | 'tan',
  target: NumericTarget,
  angleUnit: AngleUnit,
) {
  const degrees = convertAngle(target.value, angleUnit, 'deg');
  const exactLatex = evaluateSpecialTrig(kind, degrees);
  if (exactLatex && exactLatex !== '\\text{undefined}') {
    return buildNumericTargetFromNode(ce.parse(exactLatex).json);
  }

  const radians = convertAngle(target.value, angleUnit, 'rad');
  const value =
    kind === 'sin'
      ? Math.sin(radians)
      : kind === 'cos'
        ? Math.cos(radians)
        : Math.tan(radians);

  return {
    node: value,
    latex: formatNumber(value, 12),
    value,
  } satisfies NumericTarget;
}

function buildSymbolicFamilyBranch(branch: TrigPeriodicBranch): SymbolicFamilyBranch {
  const node = normalizeAst(ce.parse(branch.latex).json);
  return {
    node,
    latex: boxLatex(node),
    representativeValue: branch.representativeValue,
  };
}

function substituteFamilyBranchLatex(latex: string, kValue: number) {
  const expression = ce.parse(latex).subs({ k: kValue });
  if (/\\arc(?:sin|cos|tan)/.test(latex)) {
    return expression.latex;
  }
  const simplified = expression.simplify();
  if (simplified.latex.includes('NaN')) {
    return expression.latex;
  }
  return simplified.latex;
}

function evaluateFamilyBranchAt(branch: SymbolicFamilyBranch, kValue: number) {
  try {
    const substituted = ce.box(branch.node as Parameters<typeof ce.box>[0]).subs({ k: kValue });
    const numeric = evaluateRealNumericExpression(substituted.json, substituted.latex);
    if (numeric.kind === 'success') {
      return numeric.value;
    }
    const fallback = substituted.N?.() ?? substituted;
    return readNumericNode(fallback.json);
  } catch {
    return null;
  }
}

function branchDependsOnParameter(branch: SymbolicFamilyBranch) {
  return dependsOnVariable(branch.node, 'k');
}

function enumerateParameterizedBranchValuesOnInterval(
  branch: SymbolicFamilyBranch,
  intervalMin: number,
  intervalMax: number,
) {
  const atZero = evaluateFamilyBranchAt(branch, 0);
  const atOne = evaluateFamilyBranchAt(branch, 1);
  if (atZero === null || atOne === null || !Number.isFinite(atZero) || !Number.isFinite(atOne)) {
    return null;
  }

  const step = atOne - atZero;
  if (Math.abs(step) <= EPSILON) {
    return atZero >= intervalMin - EPSILON && atZero <= intervalMax + EPSILON
      ? [0]
      : [];
  }

  const rawStart = (intervalMin - atZero) / step;
  const rawEnd = (intervalMax - atZero) / step;
  const startK = Math.ceil(Math.min(rawStart, rawEnd) - EPSILON);
  const endK = Math.floor(Math.max(rawStart, rawEnd) + EPSILON);
  if (endK < startK) {
    return [];
  }

  if (endK - startK + 1 > MAX_TRIG_BRANCHES) {
    return null;
  }

  const values: number[] = [];
  for (let k = startK; k <= endK; k += 1) {
    values.push(k);
  }
  return values;
}

function expandBranchesWithinInterval(
  branches: SymbolicFamilyBranch[],
  intervalMin: number,
  intervalMax: number,
) {
  const expanded: SymbolicFamilyBranch[] = [];

  for (const branch of branches) {
    if (!branchDependsOnParameter(branch)) {
      const target = buildNumericTargetFromNode(branch.node, branch.representativeValue);
      if (!target || target.value < intervalMin - EPSILON || target.value > intervalMax + EPSILON) {
        continue;
      }
      expanded.push({
        node: target.node,
        latex: target.latex,
        representativeValue: target.value,
      });
      continue;
    }

    const parameterValues = enumerateParameterizedBranchValuesOnInterval(branch, intervalMin, intervalMax);
    if (parameterValues === null) {
      return null;
    }

    for (const kValue of parameterValues) {
      const latex = substituteFamilyBranchLatex(branch.latex, kValue);
      const node = ce.parse(latex).json;
      const target = buildNumericTargetFromNode(node, evaluateFamilyBranchAt(branch, kValue) ?? undefined);
      if (!target || target.value < intervalMin - EPSILON || target.value > intervalMax + EPSILON) {
        continue;
      }
      expanded.push({
        node: target.node,
        latex: target.latex,
        representativeValue: target.value,
      });
    }
  }

  return dedupeSymbolicFamilyBranches(expanded);
}

function matchParameterizedRationalPowerCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  let baseNode: unknown;
  let numerator: number;
  let denominator: number;

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2) {
    baseNode = normalized[1];
    numerator = 1;
    denominator = 2;
  } else if (isNodeArray(normalized) && normalized[0] === 'Root' && normalized.length === 3) {
    const indexTarget = parseNumericTarget(normalized[2]);
    if (!indexTarget || !Number.isInteger(indexTarget.value) || indexTarget.value < 2) {
      return null;
    }
    baseNode = normalized[1];
    numerator = 1;
    denominator = indexTarget.value;
  } else if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const exponent = readExactScalar(normalized[2]);
    if (!exponent || exponent.numerator <= 0 || exponent.denominator <= 1) {
      return null;
    }
    baseNode = normalized[1];
    numerator = exponent.numerator;
    denominator = exponent.denominator;
  } else {
    return null;
  }

  if (!dependsOnVariable(baseNode, 'x')) {
    return null;
  }

  const affineBase = numericAffineCarrier(baseNode);
  if (!affineBase) {
    return null;
  }

  return {
    baseNode,
    affineBase,
    numerator,
    denominator,
  };
}

function nthRootRepresentativeValue(value: number, degree: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (degree % 2 === 0) {
    if (value < 0) {
      return Number.NaN;
    }
    return Math.pow(value, 1 / degree);
  }

  return Math.sign(value) * Math.pow(Math.abs(value), 1 / degree);
}

function rationalPowerRequiresNonnegativeTarget(numerator: number, denominator: number) {
  return denominator % 2 === 0 || numerator % 2 === 0;
}

function realRationalPowerValue(value: number, numerator: number, denominator: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (denominator % 2 === 0 && value < 0) {
    return Number.NaN;
  }

  const rootValue = denominator === 1
    ? value
    : nthRootRepresentativeValue(value, denominator);
  if (!Number.isFinite(rootValue)) {
    return Number.NaN;
  }

  return Math.sign(rootValue) * Math.pow(Math.abs(rootValue), numerator);
}

function buildParameterizedRationalPowerBranches(
  carrier: NonNullable<ReturnType<typeof matchParameterizedRationalPowerCarrier>>,
  branches: SymbolicFamilyBranch[],
) {
  const transformedBranches: SymbolicFamilyBranch[] = [];
  const parameterConstraints: string[] = [];
  const domainConstraints: SolveDomainConstraint[] = [];
  const requiresNonnegativeTarget = rationalPowerRequiresNonnegativeTarget(
    carrier.numerator,
    carrier.denominator,
  );

  if (carrier.denominator % 2 === 0) {
    domainConstraints.push({
      kind: 'nonnegative',
      expressionLatex: boxLatex(carrier.baseNode),
    });
  }

  for (const branch of branches) {
    const constantTarget = parseNumericTarget(branch.node);
    if (requiresNonnegativeTarget && constantTarget && constantTarget.value < -EPSILON) {
      continue;
    }

    const poweredNode = normalizeAst([
      'Power',
      branch.node,
      buildScalarNode(carrier.denominator, carrier.numerator),
    ]);
    const poweredRepresentative = realRationalPowerValue(
      branch.representativeValue,
      carrier.denominator,
      carrier.numerator,
    );
    const positiveBranch: SymbolicFamilyBranch = {
      node: poweredNode,
      latex: boxLatex(poweredNode),
      representativeValue: poweredRepresentative,
    };
    transformedBranches.push(...transformAffineBranches(carrier.affineBase, [positiveBranch]));

    if (carrier.denominator % 2 !== 0 && carrier.numerator % 2 === 0) {
      const negativePoweredNode = normalizeAst(['Negate', poweredNode]);
      const negativeBranch: SymbolicFamilyBranch = {
        node: negativePoweredNode,
        latex: boxLatex(negativePoweredNode),
        representativeValue: Number.isFinite(poweredRepresentative) ? -poweredRepresentative : Number.NaN,
      };
      transformedBranches.push(...transformAffineBranches(carrier.affineBase, [negativeBranch]));
    }

    if (requiresNonnegativeTarget && (!constantTarget || Math.abs(constantTarget.value) > EPSILON)) {
      parameterConstraints.push(`${branch.latex}\\ge0`);
    }
  }

  return {
    branches: dedupeSymbolicFamilyBranches(transformedBranches),
    parameterConstraintLatex: dedupe(parameterConstraints),
    domainConstraints,
  };
}

function buildRepresentativeBranches(
  carrierLatex: string,
  branches: SymbolicFamilyBranch[],
  carrierNode?: unknown,
): PeriodicFamilyRepresentative[] {
  const entries: Array<{ value: number; label: string; exactLatex: string; approxText: string }> = [];
  const carrierRange = carrierNode ? proveRealRange(carrierNode) : null;

  for (const kValue of [0, -1, 1, 2, -2]) {
    for (const branch of branches) {
      const value = evaluateFamilyBranchAt(branch, kValue);
      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      if (
        !isCarrierRepresentativeFeasible(carrierNode, carrierRange, value)
      ) {
        continue;
      }

      if (entries.some((entry) => Math.abs(entry.value - value) <= 1e-6)) {
        continue;
      }

      const exactLatex = `${carrierLatex}=${substituteFamilyBranchLatex(branch.latex, kValue)}`;
      entries.push({
        value,
        label: `k=${kValue}`,
        exactLatex,
        approxText: `${carrierLatex} ~= ${formatApproxNumber(value)}`,
      });
    }
  }

  return entries
    .sort((left, right) => Math.abs(left.value) - Math.abs(right.value) || left.value - right.value)
    .slice(0, 3)
    .map((entry) => ({
      label: entry.label,
      exactLatex: entry.exactLatex,
      approxText: entry.approxText,
    }));
}

function isCarrierRepresentativeFeasible(
  carrierNode: unknown,
  carrierRange: ReturnType<typeof proveRealRange> | null,
  value: number,
) {
  if (!Number.isFinite(value)) {
    return false;
  }

  if (
    carrierRange?.kind === 'exact'
    && (value < carrierRange.interval.min - EPSILON || value > carrierRange.interval.max + EPSILON)
  ) {
    return false;
  }

  const normalized = carrierNode ? normalizeAst(carrierNode) : null;
  if (
    normalized
    && isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
  ) {
    if (normalized[1] === 'ExponentialE') {
      return value > 0;
    }

    if (isBareVariable(normalized[1])) {
      const exponent = readExactScalar(normalized[2]);
      if (exponent?.denominator === 1 && exponent.numerator > 0 && exponent.numerator % 2 === 0) {
        return value >= -EPSILON;
      }
    }
  }

  return true;
}

function inferSimpleDomainBounds(constraints: SolveDomainConstraint[]) {
  let min = Number.NEGATIVE_INFINITY;
  let max = Number.POSITIVE_INFINITY;

  for (const constraint of constraints) {
    if (constraint.kind === 'interval') {
      if (constraint.min !== undefined) {
        min = Math.max(min, constraint.min);
      }
      if (constraint.max !== undefined) {
        max = Math.min(max, constraint.max);
      }
      continue;
    }

    if ((constraint.kind === 'positive' || constraint.kind === 'nonnegative') && constraint.expressionLatex) {
      const normalized = normalizeAst(ce.parse(constraint.expressionLatex).json);
      const affine = numericAffineCarrier(normalized);
      if (!affine) {
        continue;
      }

      const bound = -affine.offsetValue / affine.coefficient;
      if (affine.coefficient > 0) {
        min = Math.max(min, bound);
      } else {
        max = Math.min(max, bound);
      }
    }
  }

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
  };
}

function buildIntervalSuggestionsFromRoots(
  values: number[],
  bounds: { min?: number; max?: number },
): PeriodicIntervalSuggestion[] {
  const sorted = dedupeNumericRoots(values)
    .sort((left, right) => Math.abs(left) - Math.abs(right) || left - right);
  if (sorted.length === 0) {
    return [];
  }

  return sorted.slice(0, 3).map((value, index) => {
    const leftGap = index > 0 ? value - sorted[index - 1] : Number.POSITIVE_INFINITY;
    const rightGap = index < sorted.length - 1 ? sorted[index + 1] - value : Number.POSITIVE_INFINITY;
    const nearestGap = Math.min(leftGap, rightGap);
    const relativeWidth = Math.max(0.25, Math.abs(value) * 0.1);
    const halfWidth = Number.isFinite(nearestGap)
      ? Math.max(0.1, Math.min(nearestGap * 0.25, relativeWidth))
      : relativeWidth;

    let start = value - halfWidth;
    let end = value + halfWidth;
    if (bounds.min !== undefined) {
      start = Math.max(start, bounds.min + 1e-6);
    }
    if (bounds.max !== undefined) {
      end = Math.min(end, bounds.max - 1e-6);
    }

    return {
      label: `near x ~= ${formatApproxNumber(value)}`,
      start: formatApproxNumber(start),
      end: formatApproxNumber(end),
    };
  });
}

function approximateCarrierRoots(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
): number[] {
  const normalized = normalizeAst(carrierNode);
  const affine = numericAffineCarrier(normalized);
  if (affine) {
    return branches
      .map((branch) => (branch.representativeValue - affine.offsetValue) / affine.coefficient)
      .filter((value) => Number.isFinite(value));
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && isBareVariable(normalized[1])
  ) {
    const exponent = readExactScalar(normalized[2]);
    if (exponent && exponent.denominator === 1 && exponent.numerator > 1) {
      const degree = exponent.numerator;
      const values: number[] = [];
      for (const branch of branches) {
        const target = branch.representativeValue;
        if (!Number.isFinite(target)) {
          continue;
        }
        if (degree % 2 === 0) {
          if (target < 0) {
            continue;
          }
          const root = Math.pow(target, 1 / degree);
          values.push(-root, root);
        } else {
          values.push(Math.sign(target) * Math.pow(Math.abs(target), 1 / degree));
        }
      }
      return values.filter((value) => Number.isFinite(value));
    }
  }

  return [];
}

function buildPeriodicFamilyInfo(
  carrierLatex: string,
  branches: SymbolicFamilyBranch[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
  carrierNodeForIntervals?: unknown,
  parameterConstraintLatex: string[] = [],
): PeriodicFamilyInfo {
  const representatives = buildRepresentativeBranches(carrierLatex, branches, carrierNodeForIntervals);
  const intervalRoots = carrierNodeForIntervals
    ? approximateCarrierRoots(carrierNodeForIntervals, branches)
    : [];
  const suggestedIntervals = buildIntervalSuggestionsFromRoots(
    intervalRoots.filter((value) => {
      const violation = checkCandidateAgainstConstraints(value, constraints, angleUnit);
      return !violation;
    }),
    inferSimpleDomainBounds(constraints),
  );

  return createPeriodicFamily({
    carrierLatex,
    parameterConstraintLatex,
    branchesLatex: branches.map((branch) => branch.latex),
    representatives,
    suggestedIntervals,
  });
}

function buildPoweredTarget(target: NumericTarget, numerator: number, denominator: number) {
  return ['Power', target.node, buildScalarNode(numerator, denominator)] as const;
}

function isBareVariable(node: unknown) {
  return normalizeAst(node) === 'x';
}

function isDirectAffineInner(node: unknown) {
  return isBareVariable(node) || Boolean(matchAffineVariableArgument(node));
}


export {
  approximateCarrierRoots,
  branchDependsOnParameter,
  buildEquationLatex,
  buildInverseTrigValueTarget,
  buildNumericTargetFromNode,
  buildParameterizedRationalPowerBranches,
  buildPeriodicFamilyInfo,
  buildPoweredTarget,
  buildRepresentativeBranches,
  buildScalarNode,
  buildSymbolicFamilyBranch,
  evaluateFamilyBranchAt,
  expandBranchesWithinInterval,
  inferSimpleDomainBounds,
  isBareVariable,
  isDirectAffineInner,
  matchParameterizedRationalPowerCarrier,
  mergeDetailSections,
  parseNumericTarget,
  readExactScalar,
};
export type { NumericTarget };
