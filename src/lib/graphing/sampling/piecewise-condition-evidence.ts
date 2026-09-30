import type {
  GraphPiecewiseConditionEvidenceV1,
  GraphPiecewiseSpecV1,
} from '../contracts';
import type { GraphExpressionPlanCache } from '../evaluator';
import {
  complementGraphConditionIntervals,
  intersectGraphConditionIntervals,
  solveGraphConditionIntervals,
  subtractGraphConditionIntervals,
  unionGraphConditionIntervals,
  type GraphConditionInterval,
} from './condition-intervals';

export type { GraphConditionInterval } from './condition-intervals';

export type GraphPiecewiseConditionPartitionV1 = {
  /** Where each branch is drawn: its condition minus every earlier branch (first match wins). */
  branchIntervals: Map<string, GraphConditionInterval[]>;
  otherwiseIntervals: GraphConditionInterval[];
  evidence: GraphPiecewiseConditionEvidenceV1;
};

/**
 * Splits the visible range of the independent variable between the branches.
 * Conditions are solved (see condition-intervals.ts); at each x the first
 * branch whose condition holds is the one drawn, as in Desmos and Compute
 * Engine's Which, and `otherwise` takes what no branch covers.
 */
export function buildGraphPiecewiseConditionPartition(input: {
  itemId: string;
  sourceRevision: number;
  piecewise: GraphPiecewiseSpecV1;
  independentSymbol: 'x' | 'y' | 'theta';
  minimum: number;
  maximum: number;
  pixelSpan: number;
  tolerancePixels: number;
  parameterEnvironment: Record<string, number>;
  cache?: GraphExpressionPlanCache;
}): GraphPiecewiseConditionPartitionV1 {
  const steps = Math.max(400, Math.ceil(input.pixelSpan));
  const solved = input.piecewise.branches.map((branch) => ({
    branchId: branch.branchId,
    ...solveGraphConditionIntervals({
      condition: branch.condition, symbol: input.independentSymbol, environment: input.parameterEnvironment,
      minimum: input.minimum, maximum: input.maximum, steps,
    }),
  }));
  const branchIntervals = new Map<string, GraphConditionInterval[]>();
  let covered: GraphConditionInterval[] = [];
  for (const branch of solved) {
    branchIntervals.set(branch.branchId, subtractGraphConditionIntervals(branch.intervals, covered, input.minimum, input.maximum));
    covered = unionGraphConditionIntervals(covered, branch.intervals);
  }
  const otherwiseIntervals = complementGraphConditionIntervals(covered, input.minimum, input.maximum);
  const unresolvedBoundaryCount = solved.reduce((sum, branch) => sum + branch.unresolved, 0);
  const overlapBranchPairs: GraphPiecewiseConditionEvidenceV1['overlapBranchPairs'] = [];
  for (let left = 0; left < solved.length; left += 1) {
    for (let right = left + 1; right < solved.length; right += 1) {
      if (intersectGraphConditionIntervals(solved[left]!.intervals, solved[right]!.intervals).length === 0) continue;
      overlapBranchPairs.push({
        branchIds: [solved[left]!.branchId, solved[right]!.branchId],
        scope: solved[left]!.exact && solved[right]!.exact ? 'global' : 'current-viewport',
      });
    }
  }
  const boundariesByValue = new Map<number, { included: Set<string>; excluded: Set<string> }>();
  for (const [branchId, intervals] of branchIntervals) {
    for (const interval of intervals) {
      for (const [value, included] of [[interval.minimum, interval.minimumInclusive], [interval.maximum, interval.maximumInclusive]] as const) {
        if (value <= input.minimum || value >= input.maximum) continue;
        const bucket = boundariesByValue.get(value) ?? { included: new Set(), excluded: new Set() };
        (included ? bucket.included : bucket.excluded).add(branchId);
        boundariesByValue.set(value, bucket);
      }
    }
  }
  // A branch with nothing in view is offscreen if its condition holds further out, impossible otherwise.
  const applicability = (branch: (typeof solved)[number]): GraphPiecewiseConditionEvidenceV1['branchApplicability'][number]['status'] => {
    const visible = branchIntervals.get(branch.branchId) ?? [];
    if (visible.length > 0) return branch.exact ? 'applicable-global' : 'applicable-current-viewport';
    if (branch.unresolved > 0) return 'unresolved';
    if (branch.intervals.length > 0) return 'shadowed';
    const span = Math.max(1, input.maximum - input.minimum);
    const wide = solveGraphConditionIntervals({
      condition: input.piecewise.branches.find((entry) => entry.branchId === branch.branchId)!.condition,
      symbol: input.independentSymbol, environment: input.parameterEnvironment,
      minimum: input.minimum - 1e4 * span, maximum: input.maximum + 1e4 * span, steps: 4000,
    });
    if (wide.intervals.length > 0) return 'offscreen';
    return branch.exact ? 'impossible-global' : 'impossible-current-viewport';
  };
  const exactCount = solved.filter((branch) => branch.exact).length;
  const basis = unresolvedBoundaryCount > 0 ? 'unresolved'
    : exactCount === solved.length ? 'exact-global' : exactCount === 0 ? 'adaptive-current-viewport' : 'mixed';
  return {
    branchIntervals,
    otherwiseIntervals,
    evidence: {
      version: 1,
      independentSymbol: input.independentSymbol,
      basis,
      validatedInterval: { minimum: input.minimum, maximum: input.maximum, tolerancePixels: input.tolerancePixels },
      branchApplicability: solved.map((branch) => ({ branchId: branch.branchId, status: applicability(branch) })),
      overlapBranchPairs,
      uncoveredGaps: otherwiseIntervals.map((interval) => ({ ...interval })),
      boundaries: [...boundariesByValue.entries()].sort(([a], [b]) => a - b).map(([value, bucket]) => ({
        value, includedBranchIds: [...bucket.included].sort(), excludedBranchIds: [...bucket.excluded].sort(),
      })),
      unresolvedBoundaryCount,
    },
  };
}
