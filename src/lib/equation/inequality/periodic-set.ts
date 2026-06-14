import { formatAngleLatex, convertAngle } from '../../trigonometry/angles';
import {
  TRIG_EPSILON,
  type AngleUnit,
  type InequalityRelation,
  type NumericPeriodicInterval,
  type NumericPeriodicSet,
  type TrigFunctionKind,
  type TrigThresholdResult,
} from './type-imports';
import type { PeriodicInequalitySet } from '../../algebra/inequality-core';
import { normalizePeriodicNumber } from './periodic-math';
import {
  formatPeriodicBound,
  periodicShiftLatex,
} from './periodic-format';

function trigThresholdDegrees(
  kind: 'sin' | 'cos' | 'tan',
  relation: InequalityRelation,
  value: number,
): TrigThresholdResult {
  if ((kind === 'sin' || kind === 'cos') && (value < -1 - TRIG_EPSILON || value > 1 + TRIG_EPSILON)) {
    const always = kind === 'sin' || kind === 'cos'
      ? value < -1
        ? relation === 'Greater' || relation === 'GreaterEqual'
        : relation === 'Less' || relation === 'LessEqual'
      : false;
    return { kind: always ? 'all' as const : 'empty' as const };
  }

  if (kind === 'sin') {
    const alpha = Math.asin(Math.max(-1, Math.min(1, value))) * 180 / Math.PI;
    if (relation === 'Greater' || relation === 'GreaterEqual') {
      return { kind: 'intervals' as const, intervals: [[alpha, 180 - alpha]] as const, period: 360 };
    }
    return { kind: 'intervals' as const, intervals: [[180 - alpha, 360 + alpha]] as const, period: 360 };
  }

  if (kind === 'cos') {
    const alpha = Math.acos(Math.max(-1, Math.min(1, value))) * 180 / Math.PI;
    if (relation === 'Greater' || relation === 'GreaterEqual') {
      return { kind: 'intervals' as const, intervals: [[-alpha, alpha]] as const, period: 360 };
    }
    return { kind: 'intervals' as const, intervals: [[alpha, 360 - alpha]] as const, period: 360 };
  }

  const alpha = Math.atan(value) * 180 / Math.PI;
  if (relation === 'Greater' || relation === 'GreaterEqual') {
    return { kind: 'intervals' as const, intervals: [[alpha, 90]] as const, period: 180 };
  }
  return { kind: 'intervals' as const, intervals: [[-90, alpha]] as const, period: 180 };
}

function normalizeNumericPeriodicSet(period: number, intervals: readonly NumericPeriodicInterval[]): NumericPeriodicSet {
  const pieces: NumericPeriodicInterval[] = [];
  for (const interval of intervals) {
    const width = interval.upper - interval.lower;
    if (width < -TRIG_EPSILON) {
      continue;
    }
    if (width >= period - TRIG_EPSILON) {
      pieces.push({
        lower: 0,
        lowerInclusive: true,
        upper: period,
        upperInclusive: true,
      });
      continue;
    }

    const lower = normalizePeriodicNumber(interval.lower, period);
    const upper = lower + Math.max(0, width);
    if (upper <= period + TRIG_EPSILON) {
      pieces.push({
        lower,
        lowerInclusive: interval.lowerInclusive,
        upper: Math.min(period, upper),
        upperInclusive: interval.upperInclusive,
      });
      continue;
    }
    pieces.push({
      lower,
      lowerInclusive: interval.lowerInclusive,
      upper: period,
      upperInclusive: false,
    });
    pieces.push({
      lower: 0,
      lowerInclusive: false,
      upper: upper - period,
      upperInclusive: interval.upperInclusive,
    });
  }

  const sorted = pieces
    .filter((interval) => interval.upper > interval.lower + TRIG_EPSILON
      || (Math.abs(interval.upper - interval.lower) <= TRIG_EPSILON
        && interval.lowerInclusive
        && interval.upperInclusive))
    .sort((left, right) => left.lower - right.lower);

  const merged: NumericPeriodicInterval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || previous.upper < interval.lower - TRIG_EPSILON) {
      merged.push(interval);
      continue;
    }
    if (Math.abs(previous.upper - interval.lower) <= TRIG_EPSILON
      && !previous.upperInclusive
      && !interval.lowerInclusive) {
      merged.push(interval);
      continue;
    }
    previous.upper = Math.max(previous.upper, interval.upper);
    previous.upperInclusive = previous.upperInclusive || interval.upperInclusive;
  }

  return { period, intervals: merged };
}

function numericPeriodicIntervalForTrig(
  lowerDegrees: number,
  upperDegrees: number,
  inclusive: boolean,
  affine: { a: number; b: number },
  unit: AngleUnit,
): NumericPeriodicInterval {
  const lowerUnit = convertAngle(lowerDegrees, 'deg', unit);
  const upperUnit = convertAngle(upperDegrees, 'deg', unit);
  const lower = (lowerUnit - affine.b) / affine.a;
  const upper = (upperUnit - affine.b) / affine.a;
  if (lower <= upper) {
    return {
      lower,
      lowerInclusive: inclusive,
      upper,
      upperInclusive: inclusive,
    };
  }
  return {
    lower: upper,
    lowerInclusive: inclusive,
    upper: lower,
    upperInclusive: inclusive,
  };
}

function numericPeriodicSetForTrigConstraint(input: {
  kind: TrigFunctionKind;
  relation: InequalityRelation;
  threshold: number;
  affine: { a: number; b: number };
  angleUnit: AngleUnit;
}): { kind: 'all' } | { kind: 'empty' } | { kind: 'periodic'; set: NumericPeriodicSet } {
  const intervals = trigThresholdDegrees(input.kind, input.relation, input.threshold);
  if (intervals.kind === 'all' || intervals.kind === 'empty') {
    return intervals;
  }
  const inclusive = input.relation === 'GreaterEqual' || input.relation === 'LessEqual';
  const period = convertAngle(intervals.period, 'deg', input.angleUnit) / Math.abs(input.affine.a);
  return {
    kind: 'periodic',
    set: normalizeNumericPeriodicSet(
      period,
      intervals.intervals.map(([lower, upper]) => {
        const interval = numericPeriodicIntervalForTrig(lower, upper, inclusive, input.affine, input.angleUnit);
        if (input.kind === 'tan') {
          if (input.relation === 'Greater' || input.relation === 'GreaterEqual') {
            interval.upperInclusive = false;
          } else {
            interval.lowerInclusive = false;
          }
        }
        return interval;
      }),
    ),
  };
}

function intersectNumericPeriodicSets(left: NumericPeriodicSet, right: NumericPeriodicSet): NumericPeriodicSet | null {
  if (Math.abs(left.period - right.period) > TRIG_EPSILON) {
    return null;
  }
  const intervals: NumericPeriodicInterval[] = [];
  for (const leftInterval of left.intervals) {
    for (const rightInterval of right.intervals) {
      const lower = Math.max(leftInterval.lower, rightInterval.lower);
      const upper = Math.min(leftInterval.upper, rightInterval.upper);
      if (lower > upper + TRIG_EPSILON) {
        continue;
      }
      intervals.push({
        lower,
        lowerInclusive: leftInterval.lower === lower ? leftInterval.lowerInclusive : rightInterval.lowerInclusive,
        upper,
        upperInclusive: leftInterval.upper === upper ? leftInterval.upperInclusive : rightInterval.upperInclusive,
      });
    }
  }
  return normalizeNumericPeriodicSet(left.period, intervals);
}

function periodicSetFromNumeric(
  variable: string,
  set: NumericPeriodicSet,
  unit: AngleUnit,
  options: { formatBoundLatex?: (value: number) => string } = {},
): PeriodicInequalitySet {
  return {
    variable,
    periodLatex: formatAngleLatex(set.period, unit),
    intervals: set.intervals.map((interval) => ({
      lowerLatex: options.formatBoundLatex?.(interval.lower) ?? formatAngleLatex(interval.lower, unit),
      lowerInclusive: interval.lowerInclusive,
      upperLatex: options.formatBoundLatex?.(interval.upper) ?? formatAngleLatex(interval.upper, unit),
      upperInclusive: interval.upperInclusive,
    })),
  };
}

function mapNumericPeriodicIntervalThroughAffine(
  interval: NumericPeriodicInterval,
  affine: { a: number; b: number },
): NumericPeriodicInterval {
  const lower = (interval.lower - affine.b) / affine.a;
  const upper = (interval.upper - affine.b) / affine.a;
  if (lower <= upper) {
    return {
      lower,
      lowerInclusive: interval.lowerInclusive,
      upper,
      upperInclusive: interval.upperInclusive,
    };
  }
  return {
    lower: upper,
    lowerInclusive: interval.upperInclusive,
    upper: lower,
    upperInclusive: interval.lowerInclusive,
  };
}

function absAffinePreimageNumericPeriodicSet(
  set: NumericPeriodicSet,
  affine: { a: number; b: number },
): NumericPeriodicSet {
  const argumentIntervals: NumericPeriodicInterval[] = [];
  for (const interval of set.intervals) {
    argumentIntervals.push(interval);
    argumentIntervals.push({
      lower: -interval.upper,
      lowerInclusive: interval.upperInclusive,
      upper: -interval.lower,
      upperInclusive: interval.lowerInclusive,
    });
  }

  const argumentSet = normalizeNumericPeriodicSet(set.period, argumentIntervals);
  const mapped = argumentSet.intervals
    .map((interval) => mapNumericPeriodicIntervalThroughAffine(interval, affine))
    .sort((left, right) => left.lower - right.lower);
  return {
    period: set.period / Math.abs(affine.a),
    intervals: mapped,
  };
}

function tangentSingularityLatex(target: string, affine: { a: number; b: number }, unit: AngleUnit) {
  const first = formatPeriodicBound(90, affine, unit);
  const period = formatAngleLatex(convertAngle(180, 'deg', unit) / Math.abs(affine.a), unit);
  return `${target}\\ne${first}+${periodicShiftLatex(period)}`;
}

function solveInnerTrigValueRanges(input: {
  kind: Exclude<TrigFunctionKind, 'tan'>;
  affine: { a: number; b: number };
  ranges: readonly NumericPeriodicInterval[];
  target: string;
  angleUnit: AngleUnit;
}): NumericPeriodicSet | null {
  const pieces: NumericPeriodicInterval[] = [];
  for (const range of input.ranges) {
    let current: NumericPeriodicSet | null = null;
    if (range.lower > -1 + TRIG_EPSILON) {
      const lower = numericPeriodicSetForTrigConstraint({
        kind: input.kind,
        relation: range.lowerInclusive ? 'GreaterEqual' : 'Greater',
        threshold: range.lower,
        affine: input.affine,
        angleUnit: input.angleUnit,
      });
      if (lower.kind !== 'periodic') {
        if (lower.kind === 'empty') {
          continue;
        }
      } else {
        current = lower.set;
      }
    }

    if (range.upper < 1 - TRIG_EPSILON) {
      const upper = numericPeriodicSetForTrigConstraint({
        kind: input.kind,
        relation: range.upperInclusive ? 'LessEqual' : 'Less',
        threshold: range.upper,
        affine: input.affine,
        angleUnit: input.angleUnit,
      });
      if (upper.kind === 'empty') {
        continue;
      }
      if (upper.kind === 'periodic') {
        current = current ? intersectNumericPeriodicSets(current, upper.set) : upper.set;
        if (!current) {
          return null;
        }
      }
    }

    if (!current) {
      const period = convertAngle(360, 'deg', input.angleUnit) / Math.abs(input.affine.a);
      current = normalizeNumericPeriodicSet(period, [{
        lower: 0,
        lowerInclusive: true,
        upper: period,
        upperInclusive: true,
      }]);
    }
    pieces.push(...current.intervals);
  }

  if (pieces.length === 0) {
    const period = convertAngle(360, 'deg', input.angleUnit) / Math.abs(input.affine.a);
    return normalizeNumericPeriodicSet(period, []);
  }
  return normalizeNumericPeriodicSet(
    convertAngle(360, 'deg', input.angleUnit) / Math.abs(input.affine.a),
    pieces,
  );
}


export {
  absAffinePreimageNumericPeriodicSet,
  intersectNumericPeriodicSets,
  normalizeNumericPeriodicSet,
  normalizePeriodicNumber,
  numericPeriodicSetForTrigConstraint,
  periodicSetFromNumeric,
  solveInnerTrigValueRanges,
  tangentSingularityLatex,
  trigThresholdDegrees,
};
