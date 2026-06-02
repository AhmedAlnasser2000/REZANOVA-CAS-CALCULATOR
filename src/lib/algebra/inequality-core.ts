import type { AssumptionFact } from './assumptions-core';
import {
  buildInequalityConstraintFact,
  buildValueDomainMetadata,
  type ValueDomainMetadata,
} from './value-domain-core';

const EPSILON = 1e-12;

export type InequalityInterval = {
  lower?: number;
  lowerInclusive: boolean;
  upper?: number;
  upperInclusive: boolean;
};

export type InequalitySet = {
  variable: string;
  intervals: readonly InequalityInterval[];
};

export type InequalityFactOptions = {
  expressionLatex?: string;
  details?: readonly string[];
};

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

function normalizeBound(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return Math.abs(value) < EPSILON ? 0 : value;
}

function formatNumber(value: number) {
  const normalized = normalizeBound(value) ?? value;
  const rounded = Math.round(normalized);
  return Math.abs(normalized - rounded) < EPSILON ? `${rounded}` : `${normalized}`;
}

function assertValidRawInterval(interval: InequalityInterval) {
  assertFiniteBound(interval.lower, 'lower');
  assertFiniteBound(interval.upper, 'upper');
  if (interval.lower !== undefined && interval.upper !== undefined && interval.lower > interval.upper + EPSILON) {
    throw new RangeError('Inequality lower bound must not exceed upper bound.');
  }
}

function normalizeInterval(interval: InequalityInterval): InequalityInterval | null {
  assertValidRawInterval(interval);
  const lower = normalizeBound(interval.lower);
  const upper = normalizeBound(interval.upper);

  if (lower !== undefined && upper !== undefined && Math.abs(lower - upper) < EPSILON) {
    return interval.lowerInclusive && interval.upperInclusive
      ? {
          lower,
          lowerInclusive: true,
          upper,
          upperInclusive: true,
        }
      : null;
  }

  return {
    lower,
    lowerInclusive: lower === undefined ? false : interval.lowerInclusive,
    upper,
    upperInclusive: upper === undefined ? false : interval.upperInclusive,
  };
}

function lowerSortValue(interval: InequalityInterval) {
  return interval.lower ?? Number.NEGATIVE_INFINITY;
}

function upperSortValue(interval: InequalityInterval) {
  return interval.upper ?? Number.POSITIVE_INFINITY;
}

function compareIntervals(left: InequalityInterval, right: InequalityInterval) {
  const lowerDifference = lowerSortValue(left) - lowerSortValue(right);
  if (Math.abs(lowerDifference) > EPSILON) {
    return lowerDifference;
  }
  if (left.lowerInclusive !== right.lowerInclusive) {
    return left.lowerInclusive ? -1 : 1;
  }

  const upperDifference = upperSortValue(left) - upperSortValue(right);
  if (Math.abs(upperDifference) > EPSILON) {
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
  if (left.upper > right.lower + EPSILON) {
    return true;
  }
  if (Math.abs(left.upper - right.lower) < EPSILON) {
    return left.upperInclusive || right.lowerInclusive;
  }
  return false;
}

function mergeIntervalPair(left: InequalityInterval, right: InequalityInterval): InequalityInterval {
  if (left.upper === undefined || right.upper === undefined) {
    return {
      lower: left.lower,
      lowerInclusive: left.lowerInclusive,
      upper: undefined,
      upperInclusive: false,
    };
  }

  if (left.upper > right.upper + EPSILON) {
    return left;
  }
  if (Math.abs(left.upper - right.upper) < EPSILON) {
    return {
      lower: left.lower,
      lowerInclusive: left.lowerInclusive,
      upper: left.upper,
      upperInclusive: left.upperInclusive || right.upperInclusive,
    };
  }
  return {
    lower: left.lower,
    lowerInclusive: left.lowerInclusive,
    upper: right.upper,
    upperInclusive: right.upperInclusive,
  };
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
  if (leftValue > rightValue + EPSILON) {
    return { value: left.lower, inclusive: left.lowerInclusive };
  }
  if (rightValue > leftValue + EPSILON) {
    return { value: right.lower, inclusive: right.lowerInclusive };
  }
  return {
    value: left.lower ?? right.lower,
    inclusive: left.lowerInclusive && right.lowerInclusive,
  };
}

function minUpper(left: InequalityInterval, right: InequalityInterval) {
  const leftValue = left.upper ?? Number.POSITIVE_INFINITY;
  const rightValue = right.upper ?? Number.POSITIVE_INFINITY;
  if (leftValue < rightValue - EPSILON) {
    return { value: left.upper, inclusive: left.upperInclusive };
  }
  if (rightValue < leftValue - EPSILON) {
    return { value: right.upper, inclusive: right.upperInclusive };
  }
  return {
    value: left.upper ?? right.upper,
    inclusive: left.upperInclusive && right.upperInclusive,
  };
}

function intersectIntervals(left: InequalityInterval, right: InequalityInterval): InequalityInterval | null {
  const lower = maxLower(left, right);
  const upper = minUpper(left, right);
  if (lower.value !== undefined && upper.value !== undefined && lower.value > upper.value + EPSILON) {
    return null;
  }
  return normalizeInterval({
    lower: lower.value,
    lowerInclusive: lower.inclusive,
    upper: upper.value,
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

export function isEmptyInequalitySet(set: InequalitySet) {
  return set.intervals.length === 0;
}

export function containsInequalityValue(set: InequalitySet, value: number) {
  if (!Number.isFinite(value)) {
    return false;
  }
  return set.intervals.some((interval) => {
    const aboveLower = interval.lower === undefined
      || value > interval.lower + EPSILON
      || (Math.abs(value - interval.lower) < EPSILON && interval.lowerInclusive);
    const belowUpper = interval.upper === undefined
      || value < interval.upper - EPSILON
      || (Math.abs(value - interval.upper) < EPSILON && interval.upperInclusive);
    return aboveLower && belowUpper;
  });
}

export function areInequalitySetsEqual(left: InequalitySet, right: InequalitySet) {
  if (left.variable !== right.variable || left.intervals.length !== right.intervals.length) {
    return false;
  }
  return left.intervals.every((interval, index) => intervalKey(interval) === intervalKey(right.intervals[index]));
}

function intervalToText(variable: string, interval: InequalityInterval) {
  if (interval.lower === undefined && interval.upper === undefined) {
    return `${variable} is any real number`;
  }
  if (
    interval.lower !== undefined
    && interval.upper !== undefined
    && Math.abs(interval.lower - interval.upper) < EPSILON
    && interval.lowerInclusive
    && interval.upperInclusive
  ) {
    return `${variable} = ${formatNumber(interval.lower)}`;
  }
  if (interval.lower === undefined && interval.upper !== undefined) {
    return `${variable} ${interval.upperInclusive ? '<=' : '<'} ${formatNumber(interval.upper)}`;
  }
  if (interval.lower !== undefined && interval.upper === undefined) {
    return `${variable} ${interval.lowerInclusive ? '>=' : '>'} ${formatNumber(interval.lower)}`;
  }

  return `${formatNumber(interval.lower as number)} ${interval.lowerInclusive ? '<=' : '<'} ${variable} ${interval.upperInclusive ? '<=' : '<'} ${formatNumber(interval.upper as number)}`;
}

function intervalToLatex(variable: string, interval: InequalityInterval) {
  if (interval.lower === undefined && interval.upper === undefined) {
    return `${variable}\\in\\mathbb{R}`;
  }
  if (
    interval.lower !== undefined
    && interval.upper !== undefined
    && Math.abs(interval.lower - interval.upper) < EPSILON
    && interval.lowerInclusive
    && interval.upperInclusive
  ) {
    return `${variable}=${formatNumber(interval.lower)}`;
  }
  if (interval.lower === undefined && interval.upper !== undefined) {
    return `${variable}${interval.upperInclusive ? '\\le' : '<'}${formatNumber(interval.upper)}`;
  }
  if (interval.lower !== undefined && interval.upper === undefined) {
    return `${variable}${interval.lowerInclusive ? '\\ge' : '>'}${formatNumber(interval.lower)}`;
  }

  return `${formatNumber(interval.lower as number)}${interval.lowerInclusive ? '\\le ' : '<'}${variable}${interval.upperInclusive ? '\\le ' : '<'}${formatNumber(interval.upper as number)}`;
}

export function inequalitySetToText(set: InequalitySet) {
  if (isEmptyInequalitySet(set)) {
    return `${set.variable} has no real values`;
  }
  return set.intervals.map((interval) => intervalToText(set.variable, interval)).join(' or ');
}

export function inequalitySetToLatex(set: InequalitySet) {
  if (isEmptyInequalitySet(set)) {
    return `${set.variable}\\in\\varnothing`;
  }
  return set.intervals.map((interval) => intervalToLatex(set.variable, interval)).join('\\;\\cup\\;');
}

export function inequalitySetToAssumptionFacts(
  set: InequalitySet,
  options: InequalityFactOptions = {},
): AssumptionFact[] {
  return [buildInequalityConstraintFact({
    source: 'inequality-core',
    trust: 'proved',
    scope: 'result',
    expressionLatex: options.expressionLatex ?? inequalitySetToLatex(set),
    variable: set.variable,
    message: inequalitySetToText(set),
    details: options.details,
  })];
}

export function valueDomainMetadataFromInequalitySet(
  set: InequalitySet,
  options: InequalityFactOptions = {},
): ValueDomainMetadata {
  return buildValueDomainMetadata({
    answerDomain: 'conditional-real',
    solutionKind: 'inequality-solution-set',
    facts: inequalitySetToAssumptionFacts(set, options),
  });
}
