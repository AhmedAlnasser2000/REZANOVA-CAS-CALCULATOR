import type { RealRangeInterval } from '../../../types/calculator';
import { formatApproxNumber } from '../../display/format';
import { EPSILON } from './constants';

export function interval(min: number, max: number, minInclusive = true, maxInclusive = true): RealRangeInterval {
  return { min, max, minInclusive, maxInclusive };
}

function cleanNumber(value: number) {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < EPSILON ? rounded : value;
}

function formatNumber(value: number) {
  if (Number.isFinite(value)) {
    return `${cleanNumber(value) === value ? formatApproxNumber(value) : cleanNumber(value)}`;
  }

  if (value === Number.POSITIVE_INFINITY) {
    return '\\infty';
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return '-\\infty';
  }

  return `${value}`;
}

export function formatRangeInterval(value: RealRangeInterval) {
  return `${value.minInclusive ? '[' : '('}${formatNumber(value.min)}, ${formatNumber(value.max)}${value.maxInclusive ? ']' : ')'}`;
}

export function intervalsDisjoint(left: RealRangeInterval, right: RealRangeInterval) {
  if (left.max < right.min - EPSILON) {
    return true;
  }
  if (right.max < left.min - EPSILON) {
    return true;
  }
  if (Math.abs(left.max - right.min) < EPSILON && (!left.maxInclusive || !right.minInclusive)) {
    return true;
  }
  if (Math.abs(right.max - left.min) < EPSILON && (!right.maxInclusive || !left.minInclusive)) {
    return true;
  }
  return false;
}

export function reflectInterval(value: RealRangeInterval): RealRangeInterval {
  return {
    min: -value.max,
    max: -value.min,
    minInclusive: value.maxInclusive,
    maxInclusive: value.minInclusive,
  };
}

export function addIntervals(left: RealRangeInterval, right: RealRangeInterval): RealRangeInterval {
  return {
    min: left.min + right.min,
    max: left.max + right.max,
    minInclusive: left.minInclusive && right.minInclusive,
    maxInclusive: left.maxInclusive && right.maxInclusive,
  };
}

export function scaleInterval(value: RealRangeInterval, scalar: number): RealRangeInterval {
  if (scalar >= 0) {
    return {
      min: value.min * scalar,
      max: value.max * scalar,
      minInclusive: value.minInclusive,
      maxInclusive: value.maxInclusive,
    };
  }

  return {
    min: value.max * scalar,
    max: value.min * scalar,
    minInclusive: value.maxInclusive,
    maxInclusive: value.minInclusive,
  };
}

function safeProduct(left: number, right: number) {
  const product = left * right;
  if (!Number.isNaN(product)) {
    return product;
  }

  return undefined;
}

export function multiplyIntervals(left: RealRangeInterval, right: RealRangeInterval): RealRangeInterval {
  const products = [
    safeProduct(left.min, right.min),
    safeProduct(left.min, right.max),
    safeProduct(left.max, right.min),
    safeProduct(left.max, right.max),
  ].filter((value): value is number => value !== undefined);

  return products.length > 0
    ? interval(Math.min(...products), Math.max(...products))
    : interval(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}
