import { MAX_RESULT_MAGNITUDE, getResultGuardError } from '../../engine/result-guard';
import {
  checkOneSidedRealDomain,
  collectRealDomainConstraints,
} from '../../algebra/domain-range-core';
import { resolveFiniteLimitRule } from '../../symbolic-engine/limits';
import type {
  LimitDirection,
  LimitTargetKind,
} from '../../../types/calculator';
import {
  domainCheckDetails,
  evaluateBodyAt,
  limitValueToApproxText,
  limitValueToLatex,
  numericFallbackDetail,
  type CalculusCoreEvaluation,
  type LimitValue,
} from './shared';
import {
  numericLimitAtInfinity,
  resolveInfiniteLimitHeuristic,
} from './limit-heuristics';

const LIMIT_TOLERANCE = 1e-4;
const LIMIT_STEPS = [1e-1, 5e-2, 1e-2, 5e-3, 1e-3, 5e-4, 1e-4];
const LIMIT_UNBOUNDED_THRESHOLD = 1e4;

type OneSidedLimitResult =
  | { kind: 'success'; value: number }
  | { kind: 'unbounded'; sign: 1 | -1 }
  | { kind: 'domain-error' }
  | { kind: 'unstable' };

type FiniteLimitMessages = {
  mismatchError: string;
  unstableError: string;
  numericFallbackWarning: (direction: LimitDirection) => string;
  oneSidedUnboundedError: (direction: Exclude<LimitDirection, 'two-sided'>) => string;
  oneSidedDomainError?: (direction: Exclude<LimitDirection, 'two-sided'>) => string;
};

type InfiniteLimitMessages = {
  targetLabel: (targetKind: Exclude<LimitTargetKind, 'finite'>) => string;
  unstableError: string;
  numericFallbackWarning: string;
};

function signToInfiniteLimit(sign: 1 | -1): LimitValue {
  return sign > 0 ? 'posInfinity' : 'negInfinity';
}

function stabilizeSamples(samples: number[]) {
  if (samples.length < 2) {
    return undefined;
  }

  for (let index = samples.length - 1; index > 0; index -= 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    const scale = Math.max(1, Math.abs(current), Math.abs(previous));

    if (Math.abs(current - previous) <= LIMIT_TOLERANCE * scale) {
      return current;
    }
  }

  return undefined;
}

function isUnboundedTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last >= LIMIT_UNBOUNDED_THRESHOLD
    && previous > 0
    && older > 0
    && last > previous * 1.5
    && previous > older * 1.5;
}

function isZeroTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last <= 5e-2 && last < previous && previous < older;
}

function containsFiniteDomainBoundary(node: unknown): boolean {
  return collectRealDomainConstraints(node).length > 0;
}

function numericOneSidedLimit(
  body: unknown,
  variable: string,
  target: number,
  direction: 'left' | 'right',
): OneSidedLimitResult {
  const samples: number[] = [];
  let skippedSamples = 0;

  for (const step of LIMIT_STEPS) {
    const samplePoint = direction === 'left' ? target - step : target + step;
    const value = evaluateBodyAt(body, variable, samplePoint);

    if (value === undefined) {
      skippedSamples += 1;
      continue;
    }

    if (!Number.isFinite(value) || Math.abs(value) > MAX_RESULT_MAGNITUDE) {
      return { kind: 'unbounded', sign: value < 0 ? -1 : 1 };
    }

    samples.push(value);
  }

  if (samples.length === 0 && skippedSamples > 0 && containsFiniteDomainBoundary(body)) {
    return { kind: 'domain-error' };
  }

  const stabilized = stabilizeSamples(samples);
  if (stabilized !== undefined) {
    return { kind: 'success', value: stabilized };
  }

  if (isZeroTrend(samples)) {
    return { kind: 'success', value: 0 };
  }

  if (isUnboundedTrend(samples)) {
    return { kind: 'unbounded', sign: (samples.at(-1) ?? 1) < 0 ? -1 : 1 };
  }

  return { kind: 'unstable' };
}

function numericFiniteLimit(
  body: unknown,
  variable: string,
  target: number,
  direction: LimitDirection,
) {
  if (direction === 'left') {
    return numericOneSidedLimit(body, variable, target, 'left');
  }

  if (direction === 'right') {
    return numericOneSidedLimit(body, variable, target, 'right');
  }

  const left = numericOneSidedLimit(body, variable, target, 'left');
  if (left.kind === 'domain-error') {
    return { kind: 'left-domain-error' as const };
  }
  if (left.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const right = numericOneSidedLimit(body, variable, target, 'right');
  if (right.kind === 'domain-error') {
    return { kind: 'right-domain-error' as const };
  }
  if (right.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  if (left.kind === 'unbounded' && right.kind === 'unbounded') {
    return left.sign === right.sign
      ? { kind: 'infinite' as const, sign: left.sign }
      : { kind: 'mismatch' as const };
  }

  if (left.kind === 'unbounded') {
    return { kind: 'left-unbounded' as const, sign: left.sign };
  }

  if (right.kind === 'unbounded') {
    return { kind: 'right-unbounded' as const, sign: right.sign };
  }

  const scale = Math.max(1, Math.abs(left.value), Math.abs(right.value));
  if (Math.abs(left.value - right.value) > LIMIT_TOLERANCE * scale) {
    return { kind: 'mismatch' as const };
  }

  return {
    kind: 'success' as const,
    value: (left.value + right.value) / 2,
  };
}

export function basicFiniteLimitWarning(direction: LimitDirection) {
  if (direction === 'two-sided') {
    return 'Symbolic limit unavailable; showing a numeric limit approximation.';
  }

  return `Symbolic limit unavailable; showing a numeric ${direction}-hand limit approximation.`;
}

export function evaluateFiniteLimitFromAst(input: {
  body: unknown;
  variable: string;
  target: number;
  direction: LimitDirection;
  messages: FiniteLimitMessages;
}): CalculusCoreEvaluation {
  if (containsFiniteDomainBoundary(input.body)) {
    const domainProbe =
      input.direction === 'left'
        ? { side: 'left' as const, result: checkOneSidedRealDomain({ node: input.body, variable: input.variable, target: input.target, direction: 'left' }) }
        : input.direction === 'right'
          ? { side: 'right' as const, result: checkOneSidedRealDomain({ node: input.body, variable: input.variable, target: input.target, direction: 'right' }) }
          : undefined;

    if (domainProbe?.result.kind === 'outside-domain') {
      return {
        warnings: [],
        error: input.messages.oneSidedDomainError?.(domainProbe.side) ?? input.messages.unstableError,
        detailSections: domainCheckDetails(undefined, domainProbe.result),
      };
    }

    if (input.direction === 'two-sided') {
      const left = checkOneSidedRealDomain({ node: input.body, variable: input.variable, target: input.target, direction: 'left' });
      if (left.kind === 'outside-domain') {
        return {
          warnings: [],
          error: input.messages.oneSidedDomainError?.('left') ?? input.messages.unstableError,
          detailSections: domainCheckDetails(undefined, left),
        };
      }
      const right = checkOneSidedRealDomain({ node: input.body, variable: input.variable, target: input.target, direction: 'right' });
      if (right.kind === 'outside-domain') {
        return {
          warnings: [],
          error: input.messages.oneSidedDomainError?.('right') ?? input.messages.unstableError,
          detailSections: domainCheckDetails(undefined, right),
        };
      }
    }
  }

  const symbolic = resolveFiniteLimitRule(input.body, input.target, input.variable, input.direction);
  if (symbolic.kind === 'success') {
    const exactLatex = limitValueToLatex(symbolic.value);
    const approxText = limitValueToApproxText(symbolic.value);
    return {
      exactLatex,
      approxText,
      warnings:
        symbolic.origin === 'heuristic-symbolic'
          ? ["Rule-based limit resolution used capped L'Hopital on a supported ratio form."]
          : [],
      resultOrigin: symbolic.origin,
      detailSections: symbolic.detailSections,
    };
  }

  const numeric = numericFiniteLimit(input.body, input.variable, input.target, input.direction);
  if (numeric.kind === 'left-unbounded') {
    return { warnings: [], error: input.messages.oneSidedUnboundedError('left') };
  }
  if (numeric.kind === 'right-unbounded') {
    return { warnings: [], error: input.messages.oneSidedUnboundedError('right') };
  }
  if (numeric.kind === 'infinite') {
    const exactLatex = limitValueToLatex(signToInfiniteLimit(numeric.sign));
    const approxText = limitValueToApproxText(signToInfiniteLimit(numeric.sign));
    return {
      exactLatex,
      approxText,
      warnings: [input.messages.numericFallbackWarning(input.direction)],
      resultOrigin: 'numeric-fallback',
      detailSections: numericFallbackDetail(
        'Symbolic rules did not resolve the limit, so controlled numeric sampling was used.',
        'Samples indicated same-signed divergence for the requested limit direction.',
      ),
    };
  }
  if (numeric.kind === 'left-domain-error') {
    return {
      warnings: [],
      error: input.messages.oneSidedDomainError?.('left') ?? input.messages.unstableError,
    };
  }
  if (numeric.kind === 'right-domain-error') {
    return {
      warnings: [],
      error: input.messages.oneSidedDomainError?.('right') ?? input.messages.unstableError,
    };
  }
  if (numeric.kind === 'unbounded') {
    const exactLatex = limitValueToLatex(signToInfiniteLimit(numeric.sign));
    const approxText = limitValueToApproxText(signToInfiniteLimit(numeric.sign));
    return {
      exactLatex,
      approxText,
      warnings: [input.messages.numericFallbackWarning(input.direction)],
      resultOrigin: 'numeric-fallback',
      detailSections: numericFallbackDetail(
        'Symbolic rules did not resolve the one-sided limit, so controlled numeric sampling was used.',
        'Samples indicated signed divergence on the requested side.',
      ),
    };
  }
  if (numeric.kind === 'domain-error') {
    return {
      warnings: [],
      error: input.messages.oneSidedDomainError?.(
        input.direction === 'right' ? 'right' : 'left',
      ) ?? input.messages.unstableError,
    };
  }
  if (numeric.kind === 'mismatch') {
    return { warnings: [], error: input.messages.mismatchError };
  }
  if (numeric.kind !== 'success') {
    return { warnings: [], error: input.messages.unstableError };
  }

  const exactLatex = limitValueToLatex(numeric.value);
  const approxText = limitValueToApproxText(numeric.value);
  const guardError = getResultGuardError(exactLatex, approxText);
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex,
    approxText,
    warnings: [input.messages.numericFallbackWarning(input.direction)],
    resultOrigin: 'numeric-fallback',
    detailSections: numericFallbackDetail(
      'Symbolic rules did not resolve the limit, so controlled numeric sampling was used.',
      'The sample sequence stabilized within the configured numeric tolerance.',
    ),
  };
}

export function evaluateInfiniteLimitFromAst(input: {
  body: unknown;
  variable: string;
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  messages: InfiniteLimitMessages;
}): CalculusCoreEvaluation {
  const heuristic = resolveInfiniteLimitHeuristic(input.body, input.variable, input.targetKind);
  if (heuristic.kind === 'success') {
    return {
      exactLatex: limitValueToLatex(heuristic.value),
      approxText: limitValueToApproxText(heuristic.value),
      warnings: [],
      resultOrigin: 'rule-based-symbolic',
      detailSections: heuristic.detailSections,
    };
  }

  const targetLabel = input.messages.targetLabel(input.targetKind);
  if (heuristic.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${targetLabel}.`,
    };
  }

  const numeric = numericLimitAtInfinity(
    (value) => evaluateBodyAt(input.body, input.variable, value),
    input.targetKind,
  );

  if (numeric.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${targetLabel}.`,
    };
  }

  if (numeric.kind !== 'success') {
    return {
      warnings: [],
      error: input.messages.unstableError,
    };
  }

  const exactLatex = limitValueToLatex(numeric.value);
  const approxText = limitValueToApproxText(numeric.value);
  const guardError = getResultGuardError(exactLatex, approxText);
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex,
    approxText,
    warnings: [input.messages.numericFallbackWarning],
    resultOrigin: 'numeric-fallback',
    detailSections: numericFallbackDetail(
      'Symbolic infinity rules did not resolve the limit, so controlled numeric sampling was used.',
      'The sample sequence stabilized within the configured numeric tolerance.',
    ),
  };
}
