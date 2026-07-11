import type { LimitDirection } from '../../../types/calculator';
import { isNodeArray } from '../patterns';
import { limitTextRow } from './detail-readback';
import {
  evaluateNodeAt,
  isNegativeInteger,
  isZeroish,
  success,
} from './evaluation';
import type { FiniteLimitRuleSuccess } from './types';

function unboundedSampleSign(
  node: unknown,
  target: number,
  variable: string,
  direction: Exclude<LimitDirection, 'two-sided'>,
): 1 | -1 | undefined {
  const steps = [1e-2, 1e-3, 1e-4];
  const values = steps.map((step) =>
    evaluateNodeAt(node, direction === 'left' ? target - step : target + step, variable));

  if (values.some((value) => value === undefined || !Number.isFinite(value))) {
    return undefined;
  }

  const finiteValues = values as number[];
  const magnitudes = finiteValues.map((value) => Math.abs(value));
  const growsTowardTarget =
    magnitudes[2] >= 1e4
    && magnitudes[2] > magnitudes[1] * 1.5
    && magnitudes[1] > magnitudes[0] * 1.5;

  if (!growsTowardTarget) {
    return undefined;
  }

  return finiteValues[2] < 0 ? -1 : 1;
}

function isDividePoleCandidate(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return false;
  }

  const numeratorValue = evaluateNodeAt(node[1], target, variable);
  const denominatorValue = evaluateNodeAt(node[2], target, variable);
  return numeratorValue !== undefined
    && !isZeroish(numeratorValue)
    && isZeroish(denominatorValue);
}

function isNegativePowerPoleCandidate(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || !isNegativeInteger(node[2])) {
    return false;
  }

  return isZeroish(evaluateNodeAt(node[1], target, variable));
}

export function resolveSignedPoleLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  if (
    !isDividePoleCandidate(node, target, variable)
    && !isNegativePowerPoleCandidate(node, target, variable)
  ) {
    return undefined;
  }

  const leftSign = unboundedSampleSign(node, target, variable, 'left');
  const rightSign = unboundedSampleSign(node, target, variable, 'right');

  if (direction === 'left' && leftSign) {
    return success(leftSign > 0 ? 'posInfinity' : 'negInfinity', 'rule-based-symbolic', [
      limitTextRow('Detected a finite pole with a stable left-hand sign pattern.'),
      limitTextRow('The sign of the one-sided samples determines the signed infinity.'),
    ]);
  }

  if (direction === 'right' && rightSign) {
    return success(rightSign > 0 ? 'posInfinity' : 'negInfinity', 'rule-based-symbolic', [
      limitTextRow('Detected a finite pole with a stable right-hand sign pattern.'),
      limitTextRow('The sign of the one-sided samples determines the signed infinity.'),
    ]);
  }

  if (direction === 'two-sided' && leftSign && rightSign && leftSign === rightSign) {
    return success(leftSign > 0 ? 'posInfinity' : 'negInfinity', 'rule-based-symbolic', [
      limitTextRow('Detected a finite pole where left-hand and right-hand signs agree.'),
      limitTextRow('The shared sign determines the two-sided signed infinity.'),
    ]);
  }

  return undefined;
}

export function resolveLogBoundaryLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  if (!isNodeArray(node) || (node[0] !== 'Ln' && node[0] !== 'Log') || node.length !== 2) {
    return undefined;
  }

  if (direction === 'two-sided') {
    return undefined;
  }

  const argumentValue = evaluateNodeAt(node[1], target, variable);
  if (!isZeroish(argumentValue)) {
    return undefined;
  }

  const steps = [1e-2, 1e-3, 1e-4];
  const argumentSamples = steps.map((step) =>
    evaluateNodeAt(node[1], direction === 'left' ? target - step : target + step, variable));
  if (argumentSamples.some((value) => value === undefined || value <= 0)) {
    return undefined;
  }

  const magnitudes = (argumentSamples as number[]).map((value) => Math.abs(value));
  if (!(magnitudes[2] < magnitudes[1] && magnitudes[1] < magnitudes[0])) {
    return undefined;
  }

  return success('negInfinity', 'rule-based-symbolic', [
    limitTextRow('Recognized a one-sided logarithm boundary with the argument approaching 0 through positive real values.'),
    limitTextRow('The real logarithm tends to negative infinity on that side.'),
  ]);
}
