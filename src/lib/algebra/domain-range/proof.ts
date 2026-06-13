import type {
  RangeProofReason,
  RealRangeInterval,
} from '../../../types/calculator';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
} from '../../symbolic-engine/patterns';
import { parseSupportedRatio } from '../../trigonometry/angles';
import { matchTrigCall, matchTrigSquare } from '../../trigonometry/normalize';
import { EPSILON } from './constants';
import {
  addIntervals,
  interval,
  multiplyIntervals,
  reflectInterval,
  scaleInterval,
} from './intervals';
import type { RealRangeProof } from './types';

function constantValue(node: unknown): number | null {
  const value = parseSupportedRatio(boxLatex(node));
  return value === null ? null : value;
}

function exactProof(
  proofInterval: RealRangeInterval,
  reason: RangeProofReason,
  expressionLatex: string,
): RealRangeProof {
  return {
    kind: 'exact',
    interval: proofInterval,
    reason,
    expressionLatex,
  };
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

export function proveRealRange(node: unknown): RealRangeProof {
  const normalized = normalizeAst(node);
  const expressionLatex = boxLatex(normalized);

  const numeric = constantValue(normalized);
  if (numeric !== null) {
    return exactProof(interval(numeric, numeric), 'affine-bounded', expressionLatex);
  }

  if (isPositiveExponential(normalized)) {
    return exactProof(interval(0, Number.POSITIVE_INFINITY, false, false), 'positive-exponential', expressionLatex);
  }

  const trig = matchTrigCall(normalized);
  if (trig?.kind === 'sin' || trig?.kind === 'cos') {
    return exactProof(interval(-1, 1), 'trig-carrier', expressionLatex);
  }

  const trigSquare = matchTrigSquare(normalized);
  if (trigSquare?.kind === 'sin' || trigSquare?.kind === 'cos') {
    return exactProof(interval(0, 1), 'trig-square', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2) {
    return exactProof(interval(0, Number.POSITIVE_INFINITY), 'principal-root', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Abs' && normalized.length === 2) {
    return exactProof(interval(0, Number.POSITIVE_INFINITY), 'absolute-value', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const inner = proveRealRange(normalized[1]);
    return inner.kind === 'exact'
      ? exactProof(reflectInterval(inner.interval), inner.reason, expressionLatex)
      : { kind: 'unknown' };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    let current: RealRangeInterval | null = interval(0, 0);
    for (const term of flattenAdd(normalized)) {
      const termProof = proveRealRange(term);
      if (termProof.kind !== 'exact' || !current) {
        return { kind: 'unknown' };
      }
      current = addIntervals(current, termProof.interval);
    }

    return exactProof(current, 'bounded-sum', expressionLatex);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    let scalar = 1;
    const rangedFactors: RealRangeInterval[] = [];

    for (const factor of flattenMultiply(normalized)) {
      if (isFiniteNumber(factor)) {
        scalar *= factor;
        continue;
      }

      const factorNumeric = constantValue(factor);
      if (factorNumeric !== null) {
        scalar *= factorNumeric;
        continue;
      }

      const proof = proveRealRange(factor);
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
