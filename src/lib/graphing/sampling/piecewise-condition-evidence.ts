import type {
  GraphConditionIR,
  GraphExpressionIR,
  GraphPiecewiseConditionEvidenceV1,
  GraphPiecewiseSpecV1,
} from '../contracts';
import {
  createGraphExpressionEvaluator,
  type GraphExpressionPlanCache,
} from '../evaluator';
import { compileGraphCondition, type CompiledGraphCondition } from './condition';

export type GraphConditionInterval = {
  minimum: number;
  maximum: number;
  minimumInclusive: boolean;
  maximumInclusive: boolean;
};

export type GraphPiecewiseConditionPartitionV1 = {
  branchIntervals: Map<string, GraphConditionInterval[]>;
  otherwiseIntervals: GraphConditionInterval[];
  evidence: GraphPiecewiseConditionEvidenceV1;
};

const EMPTY: GraphConditionInterval[] = [];
const ALL: GraphConditionInterval[] = [{
  minimum: Number.NEGATIVE_INFINITY,
  maximum: Number.POSITIVE_INFINITY,
  minimumInclusive: false,
  maximumInclusive: false,
}];

function validInterval(interval: GraphConditionInterval) {
  return interval.minimum < interval.maximum
    || (interval.minimum === interval.maximum
      && interval.minimumInclusive && interval.maximumInclusive);
}

function intersectOne(left: GraphConditionInterval, right: GraphConditionInterval) {
  const minimum = Math.max(left.minimum, right.minimum);
  const maximum = Math.min(left.maximum, right.maximum);
  const minimumInclusive = (minimum !== left.minimum || left.minimumInclusive)
    && (minimum !== right.minimum || right.minimumInclusive);
  const maximumInclusive = (maximum !== left.maximum || left.maximumInclusive)
    && (maximum !== right.maximum || right.maximumInclusive);
  const result = { minimum, maximum, minimumInclusive, maximumInclusive };
  return validInterval(result) ? result : null;
}

function intersectSets(left: GraphConditionInterval[], right: GraphConditionInterval[]) {
  return left.flatMap((a) => right.flatMap((b) => {
    const intersection = intersectOne(a, b);
    return intersection ? [intersection] : [];
  }));
}

function clipIntervals(intervals: GraphConditionInterval[], minimum: number, maximum: number) {
  const view = { minimum, maximum, minimumInclusive: true, maximumInclusive: true };
  return intervals.flatMap((interval) => {
    const clipped = intersectOne(interval, view);
    return clipped ? [clipped] : [];
  });
}

function compare(left: number, operator: string, right: number) {
  if (operator === '<') return left < right;
  if (operator === '<=') return left <= right;
  if (operator === '=') return left === right;
  if (operator === '>=') return left >= right;
  return left > right;
}

function reverse(operator: string) {
  if (operator === '<') return '>';
  if (operator === '<=') return '>=';
  if (operator === '>') return '<';
  if (operator === '>=') return '<=';
  return '=';
}

function coordinateExpression(expression: GraphExpressionIR, symbol: 'x' | 'y') {
  return expression.mathJson === symbol
    && expression.freeSymbols.length === 1
    && expression.freeSymbols[0] === symbol;
}

function finiteConstant(input: {
  expression: GraphExpressionIR;
  symbol: 'x' | 'y';
  environment: Record<string, number>;
  cache: GraphExpressionPlanCache;
  planId: string;
  sourceRevision: number;
}) {
  if (input.expression.freeSymbols.includes(input.symbol)) return null;
  const compiled = input.cache.getOrCompile({
    planId: input.planId,
    sourceRevision: input.sourceRevision,
    expression: input.expression,
  });
  if (!compiled.ok) return null;
  const evaluated = createGraphExpressionEvaluator(compiled.plan).evaluate(input.environment);
  return evaluated.status === 'finite' ? evaluated.value : null;
}

function intervalForComparison(operator: string, value: number): GraphConditionInterval[] {
  if (operator === '<') return [{ minimum: -Infinity, maximum: value, minimumInclusive: false, maximumInclusive: false }];
  if (operator === '<=') return [{ minimum: -Infinity, maximum: value, minimumInclusive: false, maximumInclusive: true }];
  if (operator === '=') return [{ minimum: value, maximum: value, minimumInclusive: true, maximumInclusive: true }];
  if (operator === '>=') return [{ minimum: value, maximum: Infinity, minimumInclusive: true, maximumInclusive: false }];
  return [{ minimum: value, maximum: Infinity, minimumInclusive: false, maximumInclusive: false }];
}

function exactConditionIntervals(input: {
  condition: GraphConditionIR;
  symbol: 'x' | 'y';
  environment: Record<string, number>;
  cache: GraphExpressionPlanCache;
  sourceRevision: number;
  planPrefix: string;
}): GraphConditionInterval[] | null {
  let expressionIndex = 0;
  const constant = (expression: GraphExpressionIR) => finiteConstant({
    expression,
    symbol: input.symbol,
    environment: input.environment,
    cache: input.cache,
    planId: `${input.planPrefix}:exact:${expressionIndex++}`,
    sourceRevision: input.sourceRevision,
  });
  const comparison = (left: GraphExpressionIR, operator: string, right: GraphExpressionIR) => {
    const leftCoordinate = coordinateExpression(left, input.symbol);
    const rightCoordinate = coordinateExpression(right, input.symbol);
    if (leftCoordinate && rightCoordinate) return compare(0, operator, 0) ? ALL : EMPTY;
    if (leftCoordinate) {
      const bound = constant(right);
      return bound === null ? null : intervalForComparison(operator, bound);
    }
    if (rightCoordinate) {
      const bound = constant(left);
      return bound === null ? null : intervalForComparison(reverse(operator), bound);
    }
    const leftValue = constant(left);
    const rightValue = constant(right);
    if (leftValue === null || rightValue === null) return null;
    return compare(leftValue, operator, rightValue) ? ALL : EMPTY;
  };
  const visit = (condition: GraphConditionIR): GraphConditionInterval[] | null => {
    if (condition.kind === 'constant') return condition.value ? ALL : EMPTY;
    if (condition.kind === 'comparison') {
      return comparison(condition.left, condition.operator, condition.right);
    }
    if (condition.kind === 'chain') {
      let result = ALL;
      for (let index = 0; index < condition.operators.length; index += 1) {
        const adjacent = comparison(
          condition.operands[index], condition.operators[index], condition.operands[index + 1],
        );
        if (adjacent === null) return null;
        result = intersectSets(result, adjacent);
      }
      return result;
    }
    if (condition.kind === 'and') {
      let result = ALL;
      for (const clause of condition.clauses) {
        const next = visit(clause);
        if (next === null) return null;
        result = intersectSets(result, next);
      }
      return result;
    }
    if (!coordinateExpression(condition.value, input.symbol)) return null;
    let result = ALL;
    if (condition.minimum) {
      const minimum = constant(condition.minimum);
      if (minimum === null) return null;
      result = intersectSets(result, intervalForComparison(condition.minimumInclusive ? '>=' : '>', minimum));
    }
    if (condition.maximum) {
      const maximum = constant(condition.maximum);
      if (maximum === null) return null;
      result = intersectSets(result, intervalForComparison(condition.maximumInclusive ? '<=' : '<', maximum));
    }
    return result;
  };
  return visit(input.condition);
}

function refineTransition(input: {
  condition: CompiledGraphCondition;
  symbol: 'x' | 'y';
  environment: Record<string, number>;
  left: number;
  right: number;
  leftValue: boolean;
  toleranceWorld: number;
}) {
  let { left, right, leftValue } = input;
  let unresolved = false;
  for (let iteration = 0; iteration < 40 && right - left > input.toleranceWorld; iteration += 1) {
    const middle = (left + right) / 2;
    const value = input.condition.test({ ...input.environment, [input.symbol]: middle });
    if (value === null) { unresolved = true; break; }
    if (value === leftValue) left = middle;
    else right = middle;
  }
  const boundary = (left + right) / 2;
  const included = input.condition.test({ ...input.environment, [input.symbol]: boundary }) === true;
  return { boundary, included, unresolved };
}

function adaptiveIntervals(input: {
  condition: CompiledGraphCondition;
  symbol: 'x' | 'y';
  environment: Record<string, number>;
  minimum: number;
  maximum: number;
  pixelSpan: number;
  tolerancePixels: number;
}) {
  const probePixels = Math.max(4, Math.min(16, input.tolerancePixels * 16));
  const count = Math.max(8, Math.ceil(input.pixelSpan / probePixels));
  const step = (input.maximum - input.minimum) / count;
  const toleranceWorld = (input.maximum - input.minimum) * input.tolerancePixels / input.pixelSpan;
  const probes: Array<{ x: number; value: boolean | null }> = [];
  for (let index = 0; index <= count; index += 1) {
    const x = index === count ? input.maximum : input.minimum + index * step;
    probes.push({ x, value: input.condition.test({ ...input.environment, [input.symbol]: x }) });
  }
  const intervals: GraphConditionInterval[] = [];
  let start: { value: number; inclusive: boolean } | null = probes[0]?.value === true
    ? { value: input.minimum, inclusive: true }
    : null;
  let unresolvedBoundaryCount = probes.filter((probe) => probe.value === null).length;
  for (let index = 1; index < probes.length; index += 1) {
    const previous = probes[index - 1];
    const current = probes[index];
    if (previous.value === null || current.value === null) {
      if (start) {
        intervals.push({
          minimum: start.value, maximum: previous.x,
          minimumInclusive: start.inclusive, maximumInclusive: previous.value === true,
        });
        start = null;
      }
      continue;
    }
    if (previous.value === current.value) continue;
    const transition = refineTransition({
      condition: input.condition,
      symbol: input.symbol,
      environment: input.environment,
      left: previous.x,
      right: current.x,
      leftValue: previous.value,
      toleranceWorld,
    });
    if (transition.unresolved) unresolvedBoundaryCount += 1;
    if (previous.value) {
      if (start) intervals.push({
        minimum: start.value, maximum: transition.boundary,
        minimumInclusive: start.inclusive, maximumInclusive: transition.included,
      });
      start = null;
    } else {
      start = { value: transition.boundary, inclusive: transition.included };
    }
  }
  if (start) intervals.push({
    minimum: start.value, maximum: input.maximum,
    minimumInclusive: start.inclusive, maximumInclusive: true,
  });
  return { intervals: intervals.filter(validInterval), unresolvedBoundaryCount };
}

function complementWithinView(intervals: GraphConditionInterval[], minimum: number, maximum: number) {
  const events = [...new Set([
    minimum,
    maximum,
    ...intervals.flatMap((interval) => [interval.minimum, interval.maximum]),
  ].filter((value) => Number.isFinite(value) && value >= minimum && value <= maximum))].sort((a, b) => a - b);
  const gaps: GraphConditionInterval[] = [];
  const contains = (interval: GraphConditionInterval, value: number) => (
    (value > interval.minimum || (value === interval.minimum && interval.minimumInclusive))
    && (value < interval.maximum || (value === interval.maximum && interval.maximumInclusive))
  );
  const covered = (value: number) => intervals.some((interval) => contains(interval, value));
  for (let index = 0; index < events.length - 1; index += 1) {
    const left = events[index];
    const right = events[index + 1];
    const middle = (left + right) / 2;
    if (!intervals.some((interval) => middle > interval.minimum && middle < interval.maximum)) {
      gaps.push({
        minimum: left,
        maximum: right,
        minimumInclusive: !covered(left),
        maximumInclusive: !covered(right),
      });
    }
  }
  for (const value of events) {
    if (!covered(value) && !gaps.some((gap) => contains(gap, value))) {
      gaps.push({ minimum: value, maximum: value, minimumInclusive: true, maximumInclusive: true });
    }
  }
  return gaps;
}

function intervalsOverlap(left: GraphConditionInterval[], right: GraphConditionInterval[]) {
  return intersectSets(left, right).length > 0;
}

export function buildGraphPiecewiseConditionPartition(input: {
  itemId: string;
  sourceRevision: number;
  piecewise: GraphPiecewiseSpecV1;
  independentSymbol: 'x' | 'y';
  minimum: number;
  maximum: number;
  pixelSpan: number;
  tolerancePixels: number;
  parameterEnvironment: Record<string, number>;
  cache: GraphExpressionPlanCache;
}): GraphPiecewiseConditionPartitionV1 {
  const branchIntervals = new Map<string, GraphConditionInterval[]>();
  const exactByBranch = new Map<string, GraphConditionInterval[] | null>();
  let unresolvedBoundaryCount = 0;
  for (const branch of input.piecewise.branches) {
    const exact = exactConditionIntervals({
      condition: branch.condition,
      symbol: input.independentSymbol,
      environment: input.parameterEnvironment,
      cache: input.cache,
      sourceRevision: input.sourceRevision,
      planPrefix: `${input.itemId}:${branch.branchId}`,
    });
    exactByBranch.set(branch.branchId, exact);
    if (exact !== null) {
      branchIntervals.set(branch.branchId, clipIntervals(exact, input.minimum, input.maximum));
      continue;
    }
    const compiled = compileGraphCondition({
      condition: branch.condition,
      itemId: input.itemId,
      branchId: branch.branchId,
      sourceRevision: input.sourceRevision,
      cache: input.cache,
    });
    if (!compiled.ok) {
      branchIntervals.set(branch.branchId, []);
      unresolvedBoundaryCount += 1;
      continue;
    }
    const adaptive = adaptiveIntervals({
      condition: compiled.condition,
      symbol: input.independentSymbol,
      environment: input.parameterEnvironment,
      minimum: input.minimum,
      maximum: input.maximum,
      pixelSpan: input.pixelSpan,
      tolerancePixels: input.tolerancePixels,
    });
    branchIntervals.set(branch.branchId, adaptive.intervals);
    unresolvedBoundaryCount += adaptive.unresolvedBoundaryCount;
  }
  const allIntervals = [...branchIntervals.values()].flat();
  const otherwiseIntervals = complementWithinView(allIntervals, input.minimum, input.maximum);
  const overlapBranchPairs: GraphPiecewiseConditionEvidenceV1['overlapBranchPairs'] = [];
  for (let leftIndex = 0; leftIndex < input.piecewise.branches.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < input.piecewise.branches.length; rightIndex += 1) {
      const left = input.piecewise.branches[leftIndex];
      const right = input.piecewise.branches[rightIndex];
      const leftExact = exactByBranch.get(left.branchId);
      const rightExact = exactByBranch.get(right.branchId);
      const overlap = leftExact !== null && rightExact !== null
        ? intervalsOverlap(leftExact ?? [], rightExact ?? [])
        : intervalsOverlap(branchIntervals.get(left.branchId) ?? [], branchIntervals.get(right.branchId) ?? []);
      if (overlap) overlapBranchPairs.push({
        branchIds: [left.branchId, right.branchId],
        scope: leftExact !== null && rightExact !== null ? 'global' : 'current-viewport',
      });
    }
  }
  const boundariesByValue = new Map<number, { included: Set<string>; excluded: Set<string> }>();
  for (const [branchId, intervals] of branchIntervals) {
    for (const interval of intervals) {
      for (const [value, included] of [
        [interval.minimum, interval.minimumInclusive],
        [interval.maximum, interval.maximumInclusive],
      ] as const) {
        if (value <= input.minimum || value >= input.maximum) continue;
        const bucket = boundariesByValue.get(value) ?? { included: new Set(), excluded: new Set() };
        (included ? bucket.included : bucket.excluded).add(branchId);
        boundariesByValue.set(value, bucket);
      }
    }
  }
  const exactCount = [...exactByBranch.values()].filter((entry) => entry !== null).length;
  const basis = unresolvedBoundaryCount > 0
    ? 'unresolved'
    : exactCount === input.piecewise.branches.length
      ? 'exact-global'
      : exactCount === 0 ? 'adaptive-current-viewport' : 'mixed';
  return {
    branchIntervals,
    otherwiseIntervals,
    evidence: {
      version: 1,
      independentSymbol: input.independentSymbol,
      basis,
      validatedInterval: {
        minimum: input.minimum,
        maximum: input.maximum,
        tolerancePixels: input.tolerancePixels,
      },
      branchApplicability: input.piecewise.branches.map((branch) => {
        const exact = exactByBranch.get(branch.branchId);
        const visible = branchIntervals.get(branch.branchId) ?? [];
        return {
          branchId: branch.branchId,
          status: exact !== null
            ? exact?.length === 0 ? 'impossible-global' : visible.length > 0 ? 'applicable-global' : 'offscreen'
            : unresolvedBoundaryCount > 0 && visible.length === 0
              ? 'unresolved'
              : visible.length > 0 ? 'applicable-current-viewport' : 'impossible-current-viewport',
        };
      }),
      overlapBranchPairs,
      uncoveredGaps: otherwiseIntervals.map((interval) => ({ ...interval })),
      boundaries: [...boundariesByValue.entries()].sort(([left], [right]) => left - right).map(([value, bucket]) => ({
        value,
        includedBranchIds: [...bucket.included].sort(),
        excludedBranchIds: [...bucket.excluded].sort(),
      })),
      unresolvedBoundaryCount,
    },
  };
}
