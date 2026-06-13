import { INEQUALITY_EPSILON, type InequalityInterval, type InequalitySet } from './types';

function cleanVariable(variable: string) {
  const normalized = variable.trim();
  if (!normalized) {
    throw new RangeError('Inequality variable must be non-empty.');
  }
  return normalized;
}

function assertFiniteBound(value: number | undefined, label: string) {
  if (value !== undefined && !Number.isFinite(value)) {
    throw new RangeError(`Inequality ${label} bound must be finite when provided.`);
  }
}

export function normalizeBound(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return Math.abs(value) < INEQUALITY_EPSILON ? 0 : value;
}

function formatNumber(value: number) {
  const normalized = normalizeBound(value) ?? value;
  const rounded = Math.round(normalized);
  return Math.abs(normalized - rounded) < INEQUALITY_EPSILON ? `${rounded}` : `${normalized}`;
}

export function boundLabel(value: number | undefined, label: string | undefined) {
  return label ?? (value === undefined ? undefined : formatNumber(value));
}

function buildInterval(interval: InequalityInterval): InequalityInterval {
  return {
    lower: interval.lower,
    ...(interval.lowerLatex !== undefined ? { lowerLatex: interval.lowerLatex } : {}),
    lowerInclusive: interval.lowerInclusive,
    upper: interval.upper,
    ...(interval.upperLatex !== undefined ? { upperLatex: interval.upperLatex } : {}),
    upperInclusive: interval.upperInclusive,
  };
}

function assertValidRawInterval(interval: InequalityInterval) {
  assertFiniteBound(interval.lower, 'lower');
  assertFiniteBound(interval.upper, 'upper');
  if (
    interval.lower !== undefined
    && interval.upper !== undefined
    && interval.lower > interval.upper + INEQUALITY_EPSILON
  ) {
    throw new RangeError('Inequality lower bound must not exceed upper bound.');
  }
}

function normalizeInterval(interval: InequalityInterval): InequalityInterval | null {
  assertValidRawInterval(interval);
  const lower = normalizeBound(interval.lower);
  const upper = normalizeBound(interval.upper);

  if (lower !== undefined && upper !== undefined && Math.abs(lower - upper) < INEQUALITY_EPSILON) {
    return interval.lowerInclusive && interval.upperInclusive
      ? buildInterval({
          lower,
          lowerLatex: interval.lowerLatex,
          lowerInclusive: true,
          upper,
          upperLatex: interval.upperLatex,
          upperInclusive: true,
        })
      : null;
  }

  return buildInterval({
    lower,
    lowerLatex: interval.lowerLatex,
    lowerInclusive: lower === undefined ? false : interval.lowerInclusive,
    upper,
    upperLatex: interval.upperLatex,
    upperInclusive: upper === undefined ? false : interval.upperInclusive,
  });
}

function lowerSortValue(interval: InequalityInterval) {
  return interval.lower ?? Number.NEGATIVE_INFINITY;
}

function upperSortValue(interval: InequalityInterval) {
  return interval.upper ?? Number.POSITIVE_INFINITY;
}

function compareIntervals(left: InequalityInterval, right: InequalityInterval) {
  const lowerDifference = lowerSortValue(left) - lowerSortValue(right);
  if (Math.abs(lowerDifference) > INEQUALITY_EPSILON) {
    return lowerDifference;
  }
  if (left.lowerInclusive !== right.lowerInclusive) {
    return left.lowerInclusive ? -1 : 1;
  }

  const upperDifference = upperSortValue(left) - upperSortValue(right);
  if (Math.abs(upperDifference) > INEQUALITY_EPSILON) {
    return upperDifference;
  }
  if (left.upperInclusive !== right.upperInclusive) {
    return left.upperInclusive ? -1 : 1;
  }
  return 0;
}

function canMerge(left: InequalityInterval, right: InequalityInterval) {
  if (left.upper === undefined || right.lower === undefined) {
    return true;
  }
  if (left.upper > right.lower + INEQUALITY_EPSILON) {
    return true;
  }
  if (Math.abs(left.upper - right.lower) < INEQUALITY_EPSILON) {
    return left.upperInclusive || right.lowerInclusive;
  }
  return false;
}

function mergeIntervalPair(left: InequalityInterval, right: InequalityInterval): InequalityInterval {
  if (left.upper === undefined || right.upper === undefined) {
    return buildInterval({
      lower: left.lower,
      lowerLatex: left.lowerLatex,
      lowerInclusive: left.lowerInclusive,
      upper: undefined,
      upperInclusive: false,
    });
  }

  if (left.upper > right.upper + INEQUALITY_EPSILON) {
    return left;
  }
  if (Math.abs(left.upper - right.upper) < INEQUALITY_EPSILON) {
    return buildInterval({
      lower: left.lower,
      lowerLatex: left.lowerLatex,
      lowerInclusive: left.lowerInclusive,
      upper: left.upper,
      upperLatex: left.upperLatex,
      upperInclusive: left.upperInclusive || right.upperInclusive,
    });
  }
  return buildInterval({
    lower: left.lower,
    lowerLatex: left.lowerLatex,
    lowerInclusive: left.lowerInclusive,
    upper: right.upper,
    upperLatex: right.upperLatex,
    upperInclusive: right.upperInclusive,
  });
}

function intervalKey(interval: InequalityInterval) {
  return JSON.stringify(interval);
}

export function normalizeInequalitySet(variable: string, intervals: readonly InequalityInterval[]): InequalitySet {
  const normalizedVariable = cleanVariable(variable);
  const normalizedIntervals = intervals
    .map(normalizeInterval)
    .filter((interval): interval is InequalityInterval => interval !== null)
    .sort(compareIntervals);

  const merged: InequalityInterval[] = [];
  for (const interval of normalizedIntervals) {
    const previous = merged.at(-1);
    if (!previous) {
      merged.push(interval);
      continue;
    }
    if (canMerge(previous, interval)) {
      merged[merged.length - 1] = mergeIntervalPair(previous, interval);
      continue;
    }
    merged.push(interval);
  }

  const deduped = new Map<string, InequalityInterval>();
  for (const interval of merged) {
    deduped.set(intervalKey(interval), interval);
  }

  return {
    variable: normalizedVariable,
    intervals: [...deduped.values()],
  };
}

export function emptyInequalitySet(variable: string): InequalitySet {
  return normalizeInequalitySet(variable, []);
}

export function allRealInequalitySet(variable: string): InequalitySet {
  return normalizeInequalitySet(variable, [{
    lowerInclusive: false,
    upperInclusive: false,
  }]);
}

export function intervalInequalitySet(variable: string, interval: InequalityInterval): InequalitySet {
  return normalizeInequalitySet(variable, [interval]);
}

export function openIntervalInequalitySet(variable: string, lower: number, upper: number): InequalitySet {
  return intervalInequalitySet(variable, {
    lower,
    lowerInclusive: false,
    upper,
    upperInclusive: false,
  });
}

export function closedIntervalInequalitySet(variable: string, lower: number, upper: number): InequalitySet {
  return intervalInequalitySet(variable, {
    lower,
    lowerInclusive: true,
    upper,
    upperInclusive: true,
  });
}

export function pointInequalitySet(variable: string, value: number): InequalitySet {
  return closedIntervalInequalitySet(variable, value, value);
}

export function lessThanInequalitySet(variable: string, upper: number): InequalitySet {
  return intervalInequalitySet(variable, {
    lowerInclusive: false,
    upper,
    upperInclusive: false,
  });
}

export function lessThanOrEqualInequalitySet(variable: string, upper: number): InequalitySet {
  return intervalInequalitySet(variable, {
    lowerInclusive: false,
    upper,
    upperInclusive: true,
  });
}

export function greaterThanInequalitySet(variable: string, lower: number): InequalitySet {
  return intervalInequalitySet(variable, {
    lower,
    lowerInclusive: false,
    upperInclusive: false,
  });
}

export function greaterThanOrEqualInequalitySet(variable: string, lower: number): InequalitySet {
  return intervalInequalitySet(variable, {
    lower,
    lowerInclusive: true,
    upperInclusive: false,
  });
}

function assertSameVariable(left: InequalitySet, right: InequalitySet) {
  if (left.variable !== right.variable) {
    throw new RangeError('Cannot combine inequality sets for different variables.');
  }
}

function maxLower(left: InequalityInterval, right: InequalityInterval) {
  const leftValue = left.lower ?? Number.NEGATIVE_INFINITY;
  const rightValue = right.lower ?? Number.NEGATIVE_INFINITY;
  if (leftValue > rightValue + INEQUALITY_EPSILON) {
    return { value: left.lower, latex: left.lowerLatex, inclusive: left.lowerInclusive };
  }
  if (rightValue > leftValue + INEQUALITY_EPSILON) {
    return { value: right.lower, latex: right.lowerLatex, inclusive: right.lowerInclusive };
  }
  return {
    value: left.lower ?? right.lower,
    latex: left.lowerLatex ?? right.lowerLatex,
    inclusive: left.lowerInclusive && right.lowerInclusive,
  };
}

function minUpper(left: InequalityInterval, right: InequalityInterval) {
  const leftValue = left.upper ?? Number.POSITIVE_INFINITY;
  const rightValue = right.upper ?? Number.POSITIVE_INFINITY;
  if (leftValue < rightValue - INEQUALITY_EPSILON) {
    return { value: left.upper, latex: left.upperLatex, inclusive: left.upperInclusive };
  }
  if (rightValue < leftValue - INEQUALITY_EPSILON) {
    return { value: right.upper, latex: right.upperLatex, inclusive: right.upperInclusive };
  }
  return {
    value: left.upper ?? right.upper,
    latex: left.upperLatex ?? right.upperLatex,
    inclusive: left.upperInclusive && right.upperInclusive,
  };
}

function intersectIntervals(left: InequalityInterval, right: InequalityInterval): InequalityInterval | null {
  const lower = maxLower(left, right);
  const upper = minUpper(left, right);
  if (lower.value !== undefined && upper.value !== undefined && lower.value > upper.value + INEQUALITY_EPSILON) {
    return null;
  }
  return normalizeInterval({
    lower: lower.value,
    lowerLatex: lower.latex,
    lowerInclusive: lower.inclusive,
    upper: upper.value,
    upperLatex: upper.latex,
    upperInclusive: upper.inclusive,
  });
}

export function intersectInequalitySets(left: InequalitySet, right: InequalitySet): InequalitySet {
  assertSameVariable(left, right);
  const intervals: InequalityInterval[] = [];
  for (const leftInterval of left.intervals) {
    for (const rightInterval of right.intervals) {
      const intersection = intersectIntervals(leftInterval, rightInterval);
      if (intersection) {
        intervals.push(intersection);
      }
    }
  }
  return normalizeInequalitySet(left.variable, intervals);
}

export function unionInequalitySets(...sets: readonly InequalitySet[]): InequalitySet {
  if (sets.length === 0) {
    throw new RangeError('Cannot union an empty list of inequality sets.');
  }
  const [first, ...rest] = sets;
  for (const set of rest) {
    assertSameVariable(first, set);
  }
  return normalizeInequalitySet(first.variable, sets.flatMap((set) => set.intervals));
}

export function isEmptyInequalitySet(set: InequalitySet) {
  return set.intervals.length === 0;
}

export function containsInequalityValue(set: InequalitySet, value: number) {
  if (!Number.isFinite(value)) {
    return false;
  }
  return set.intervals.some((interval) => {
    const aboveLower = interval.lower === undefined
      || value > interval.lower + INEQUALITY_EPSILON
      || (Math.abs(value - interval.lower) < INEQUALITY_EPSILON && interval.lowerInclusive);
    const belowUpper = interval.upper === undefined
      || value < interval.upper - INEQUALITY_EPSILON
      || (Math.abs(value - interval.upper) < INEQUALITY_EPSILON && interval.upperInclusive);
    return aboveLower && belowUpper;
  });
}

export function areInequalitySetsEqual(left: InequalitySet, right: InequalitySet) {
  if (left.variable !== right.variable || left.intervals.length !== right.intervals.length) {
    return false;
  }
  return left.intervals.every((interval, index) => intervalKey(interval) === intervalKey(right.intervals[index]));
}

