import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber } from '../format';
import { flattenAdd, flattenMultiply, isFiniteNumber, isNodeArray } from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';
import { matchTrigCall, matchTrigSquare } from '../trigonometry/normalize';
import { parseSupportedRatio } from '../trigonometry/angles';
import type { RangeImpossibilityResult, RangeProofReason, RealRangeInterval } from '../../types/calculator';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

type ExactRangeProof = {
  kind: 'exact';
  interval: RealRangeInterval;
  reason: RangeProofReason;
  expressionLatex: string;
};

type PositiveExpProof = {
  kind: 'positive-exponential';
  expressionLatex: string;
};

type RangeProof = ExactRangeProof | PositiveExpProof | { kind: 'unknown' };
export type RealRangeProof = RangeProof;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function interval(min: number, max: number, minInclusive = true, maxInclusive = true): RealRangeInterval {
  return { min, max, minInclusive, maxInclusive };
}

function formatNumber(value: number) {
  if (Number.isFinite(value)) {
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < EPSILON) {
      return `${rounded}`;
    }

    return formatApproxNumber(value);
  }

  if (value === Number.POSITIVE_INFINITY) {
    return '\\infty';
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return '-\\infty';
  }

  return `${value}`;
}

function formatInterval(value: RealRangeInterval) {
  return `${value.minInclusive ? '[' : '('}${formatNumber(value.min)}, ${formatNumber(value.max)}${value.maxInclusive ? ']' : ')'}`;
}

export function formatRangeInterval(value: RealRangeInterval) {
  return formatInterval(value);
}

function intervalsDisjoint(left: RealRangeInterval, right: RealRangeInterval) {
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

function reflectInterval(value: RealRangeInterval): RealRangeInterval {
  return {
    min: -value.max,
    max: -value.min,
    minInclusive: value.maxInclusive,
    maxInclusive: value.minInclusive,
  };
}

function addIntervals(left: RealRangeInterval, right: RealRangeInterval): RealRangeInterval {
  return {
    min: left.min + right.min,
    max: left.max + right.max,
    minInclusive: left.minInclusive && right.minInclusive,
    maxInclusive: left.maxInclusive && right.maxInclusive,
  };
}

function scaleInterval(value: RealRangeInterval, scalar: number): RealRangeInterval {
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

function multiplyIntervals(left: RealRangeInterval, right: RealRangeInterval): RealRangeInterval {
  const products = [
    left.min * right.min,
    left.min * right.max,
    left.max * right.min,
    left.max * right.max,
  ];

  return interval(Math.min(...products), Math.max(...products));
}

function constantValue(node: unknown): number | null {
  const value = parseSupportedRatio(boxLatex(node));
  return value === null ? null : value;
}

function isPositiveExponential(node: unknown) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return false;
  }

  const [, base] = normalized;
  if (base === 'ExponentialE') {
    return true;
  }

  const baseValue = constantValue(base);
  return baseValue !== null && baseValue > 0 && Math.abs(baseValue - 1) > EPSILON;
}

function exactProof(
  proofInterval: RealRangeInterval,
  reason: RangeProofReason,
  expressionLatex: string,
): ExactRangeProof {
  return {
    kind: 'exact',
    interval: proofInterval,
    reason,
    expressionLatex,
  };
}

function proveRange(node: unknown): RangeProof {
  const normalized = normalizeAst(node);
  const expressionLatex = boxLatex(normalized);

  const numeric = constantValue(normalized);
  if (numeric !== null) {
    return exactProof(interval(numeric, numeric), 'affine-bounded', expressionLatex);
  }

  if (isPositiveExponential(normalized)) {
    return {
      kind: 'positive-exponential',
      expressionLatex,
    };
  }

  const trig = matchTrigCall(normalized);
  if (trig?.kind === 'sin' || trig?.kind === 'cos') {
    return exactProof(interval(-1, 1), 'trig-carrier', expressionLatex);
  }

  const trigSquare = matchTrigSquare(normalized);
  if (trigSquare?.kind === 'sin' || trigSquare?.kind === 'cos') {
    return exactProof(interval(0, 1), 'trig-square', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const inner = proveRange(normalized[1]);
    return inner.kind === 'exact'
      ? exactProof(reflectInterval(inner.interval), inner.reason, expressionLatex)
      : { kind: 'unknown' };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    const terms = flattenAdd(normalized);
    let current: RealRangeInterval | null = interval(0, 0);
    for (const term of terms) {
      const termProof = proveRange(term);
      if (termProof.kind !== 'exact' || !current) {
        return { kind: 'unknown' };
      }
      current = addIntervals(current, termProof.interval);
    }

    return exactProof(current, 'bounded-sum', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    const factors = flattenMultiply(normalized);
    let scalar = 1;
    const rangedFactors: RealRangeInterval[] = [];

    for (const factor of factors) {
      if (isFiniteNumber(factor)) {
        scalar *= factor;
        continue;
      }

      const factorNumeric = constantValue(factor);
      if (factorNumeric !== null) {
        scalar *= factorNumeric;
        continue;
      }

      const proof = proveRange(factor);
      if (proof.kind !== 'exact') {
        return { kind: 'unknown' };
      }
      rangedFactors.push(proof.interval);
    }

    let current = interval(1, 1);
    for (const factorRange of rangedFactors) {
      current = multiplyIntervals(current, factorRange);
    }

    current = scaleInterval(current, scalar);

    return exactProof(current, rangedFactors.length > 1 ? 'bounded-product' : 'affine-bounded', expressionLatex);
  }

  return { kind: 'unknown' };
}

export function proveRealRange(node: unknown): RealRangeProof {
  return proveRange(node);
}

function compareAgainstConstant(
  bounded: ExactRangeProof,
  constant: number,
  constantLatex: string,
): RangeImpossibilityResult | null {
  const target = interval(constant, constant);
  if (!intervalsDisjoint(bounded.interval, target)) {
    return null;
  }

  let error = 'No real solutions because this bounded expression can never equal the requested value.';
  if (bounded.reason === 'trig-carrier') {
    error = 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.';
  } else if (bounded.reason === 'trig-square') {
    error = 'No real solutions because sin^2(theta) and cos^2(theta) stay between 0 and 1.';
  }

  return {
    kind: 'impossible',
    error,
    summaryText: `Range guard: ${bounded.expressionLatex} stays in ${formatInterval(bounded.interval)}, so it cannot equal ${constantLatex}.`,
    badge: 'Range Guard',
    reason: bounded.reason,
    derivedRange: bounded.interval,
    comparedTarget: constantLatex,
  };
}

function positiveExponentialAgainstConstant(
  expressionLatex: string,
  constant: number,
  constantLatex: string,
): RangeImpossibilityResult | null {
  if (constant > 0) {
    return null;
  }

  return {
    kind: 'impossible',
    error: 'No real solutions because exponential expressions are always positive.',
    summaryText: `Range guard: ${expressionLatex} is always positive, so it cannot equal ${constantLatex}.`,
    badge: 'Range Guard',
    reason: 'positive-exponential',
    derivedRange: interval(0, Number.POSITIVE_INFINITY, false, false),
    comparedTarget: constantLatex,
  };
}

export function detectRealRangeImpossibility(
  equationLatex: string,
): RangeImpossibilityResult {
  let parsed: unknown;
  try {
    parsed = normalizeAst(ce.parse(equationLatex).json);
  } catch {
    return { kind: 'none' };
  }

  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return { kind: 'none' };
  }

  const [, left, right] = parsed;
  const leftProof = proveRange(left);
  const rightProof = proveRange(right);
  const leftConstant = constantValue(left);
  const rightConstant = constantValue(right);

  if (leftProof.kind === 'exact' && rightConstant !== null) {
    const impossible = compareAgainstConstant(leftProof, rightConstant, boxLatex(right));
    if (impossible) {
      return impossible;
    }
  }

  if (rightProof.kind === 'exact' && leftConstant !== null) {
    const impossible = compareAgainstConstant(rightProof, leftConstant, boxLatex(left));
    if (impossible) {
      return impossible;
    }
  }

  if (leftProof.kind === 'positive-exponential' && rightConstant !== null) {
    const impossible = positiveExponentialAgainstConstant(leftProof.expressionLatex, rightConstant, boxLatex(right));
    if (impossible) {
      return impossible;
    }
  }

  if (rightProof.kind === 'positive-exponential' && leftConstant !== null) {
    const impossible = positiveExponentialAgainstConstant(rightProof.expressionLatex, leftConstant, boxLatex(left));
    if (impossible) {
      return impossible;
    }
  }

  if (leftProof.kind === 'exact' && rightProof.kind === 'exact' && intervalsDisjoint(leftProof.interval, rightProof.interval)) {
    return {
      kind: 'impossible',
      error: 'No real solutions because the two sides have disjoint real ranges.',
      summaryText: `Range guard: the left side stays in ${formatInterval(leftProof.interval)} while the right side stays in ${formatInterval(rightProof.interval)}.`,
      badge: 'Range Guard',
      reason: leftProof.reason === 'bounded-sum' || rightProof.reason === 'bounded-sum'
        ? 'bounded-sum'
        : leftProof.reason === 'bounded-product' || rightProof.reason === 'bounded-product'
          ? 'bounded-product'
          : leftProof.reason,
      derivedRange: leftProof.interval,
    };
  }

  return { kind: 'none' };
}
