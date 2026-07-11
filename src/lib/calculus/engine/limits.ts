import { MAX_RESULT_MAGNITUDE, getResultGuardError } from '../../engine/result-guard';
import {
  checkOneSidedRealDomain,
  collectRealDomainConstraints,
} from '../../algebra/domain-range-core';
import {
  attemptInfiniteLHospital,
  resolveFiniteComplexDomainLimit,
  resolveFiniteAbsSideBehaviorLimit,
  resolveFiniteLimitRule,
  resolveFiniteSqueezeOscillationLimit,
  resolveInfiniteRewriteCancellationLimit,
  resolveInfiniteScaleLimit,
  resolveMrvLiteLimit,
  resolveSymbolicInfinityCaseLimit,
  buildGruntzFiniteTargetBridgeContract,
  buildGruntzRecursiveEvaluatorContract,
  unsupportedComplexDomainLimit,
} from '../../symbolic-engine/limits';
import type {
  DisplayDetailSection,
  EquationDomainIntent,
  LimitDirection,
  LimitTargetKind,
} from '../../../types/calculator';
import {
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
import { limitDomainCheckDetails } from './limit-domain-proofs';
import {
  gruntzFiniteBridgeEvaluation,
  gruntzRecursiveEvaluation,
} from './limits-gruntz-evaluation';
import {
  signedFiniteLimitBehaviorDetails,
  twoSidedMismatchDetails,
} from './limit-side-details';
import {
  limitDetailSection,
  limitTextRows,
} from '../../symbolic-engine/limits/detail-readback';
import { profileCalculusResult } from '../../display/printer';

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
      : { kind: 'mismatch' as const, left, right };
  }

  if (left.kind === 'unbounded') {
    return { kind: 'left-unbounded' as const, sign: left.sign };
  }

  if (right.kind === 'unbounded') {
    return { kind: 'right-unbounded' as const, sign: right.sign };
  }

  const scale = Math.max(1, Math.abs(left.value), Math.abs(right.value));
  if (Math.abs(left.value - right.value) > LIMIT_TOLERANCE * scale) {
    return { kind: 'mismatch' as const, left, right };
  }

  return {
    kind: 'success' as const,
    value: (left.value + right.value) / 2,
  };
}

function appendLimitDetails(
  existing: readonly DisplayDetailSection[] | undefined,
  ...sections: DisplayDetailSection[]
) {
  return sections.length > 0
    ? [...(existing ?? []), ...sections]
    : existing
      ? [...existing]
      : undefined;
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
  routeKind?: string;
  allowNumericFallback?: boolean;
  equationDomainIntent?: EquationDomainIntent;
  messages: FiniteLimitMessages;
}): CalculusCoreEvaluation {
  if (containsFiniteDomainBoundary(input.body)) {
    if (input.equationDomainIntent === 'complex') {
      const complexLimit = resolveFiniteComplexDomainLimit({
        node: input.body,
        variable: input.variable,
        target: input.target,
        direction: input.direction,
      }) ?? unsupportedComplexDomainLimit(
        'Complex proof is not supported yet for this finite-domain-boundary limit.',
      );

      if (complexLimit.kind === 'success') {
        const exactLatex = complexLimit.exactLatex ?? (
          complexLimit.value === undefined ? undefined : limitValueToLatex(complexLimit.value)
        );
        const approxText = complexLimit.approxText ?? (
          complexLimit.value === undefined ? undefined : limitValueToApproxText(complexLimit.value)
        );
        return {
          exactLatex,
          approxText,
          warnings: [],
          resultOrigin: complexLimit.origin,
          detailSections: complexLimit.detailSections,
        };
      }

      return {
        warnings: [],
        error: complexLimit.reason,
        detailSections: complexLimit.detailSections,
      };
    }

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
        detailSections: limitDomainCheckDetails({
          check: domainProbe.result,
          variable: input.variable,
          target: input.target,
          side: domainProbe.side,
        }),
      };
    }

    if (input.direction === 'two-sided') {
      const left = checkOneSidedRealDomain({ node: input.body, variable: input.variable, target: input.target, direction: 'left' });
      if (left.kind === 'outside-domain') {
        return {
          warnings: [],
          error: input.messages.oneSidedDomainError?.('left') ?? input.messages.unstableError,
          detailSections: limitDomainCheckDetails({
            check: left,
            variable: input.variable,
            target: input.target,
            side: 'left',
          }),
        };
      }
      const right = checkOneSidedRealDomain({ node: input.body, variable: input.variable, target: input.target, direction: 'right' });
      if (right.kind === 'outside-domain') {
        return {
          warnings: [],
          error: input.messages.oneSidedDomainError?.('right') ?? input.messages.unstableError,
          detailSections: limitDomainCheckDetails({
            check: right,
            variable: input.variable,
            target: input.target,
            side: 'right',
          }),
        };
      }
    }
  }

  const absSideBehavior = resolveFiniteAbsSideBehaviorLimit(
    input.body,
    input.target,
    input.variable,
    input.direction,
  );
  if (absSideBehavior?.kind === 'success') {
    return {
      exactLatex: absSideBehavior.exactLatex,
      approxText: absSideBehavior.approxText,
      warnings: [],
      resultOrigin: absSideBehavior.origin,
      detailSections: absSideBehavior.detailSections,
    };
  }
  if (absSideBehavior?.kind === 'failure') {
    return {
      warnings: [],
      error: absSideBehavior.error,
      detailSections: absSideBehavior.detailSections,
    };
  }

  const squeezeOscillation = resolveFiniteSqueezeOscillationLimit(
    input.body,
    input.target,
    input.variable,
    input.direction,
  );
  if (squeezeOscillation?.kind === 'success') {
    const exactLatex = squeezeOscillation.exactLatex ?? (
      squeezeOscillation.value === undefined ? undefined : limitValueToLatex(squeezeOscillation.value)
    );
    const approxText = squeezeOscillation.approxText ?? (
      squeezeOscillation.value === undefined ? undefined : limitValueToApproxText(squeezeOscillation.value)
    );
    return {
      exactLatex,
      approxText,
      warnings: [],
      resultOrigin: squeezeOscillation.origin,
      detailSections: squeezeOscillation.detailSections,
    };
  }
  if (squeezeOscillation?.kind === 'failure') {
    return {
      warnings: [],
      error: squeezeOscillation.error,
      detailSections: squeezeOscillation.detailSections,
    };
  }

  if (input.routeKind === 'gruntz') {
    const finiteGruntz = buildGruntzFiniteTargetBridgeContract(
      input.body,
      input.variable,
      input.target,
      input.direction,
      { domain: input.equationDomainIntent === 'complex' ? 'complex-principal' : 'real' },
    );
    const finiteGruntzEvaluation = gruntzFiniteBridgeEvaluation(finiteGruntz);
    if (finiteGruntzEvaluation) {
      return finiteGruntzEvaluation;
    }
    return {
      warnings: [],
      error: finiteGruntz.stopReason ?? 'The Gruntz bridge did not resolve this finite-target limit.',
      detailSections: finiteGruntz.detailSections ?? [limitDetailSection(
        'Limit Diagnostic',
        limitTextRows([
          'Route classification: gruntz.',
          finiteGruntz.stopReason ?? 'The finite-target Gruntz bridge stopped before a supported comparison.',
        ]),
      )],
    };
  }

  const symbolic = resolveFiniteLimitRule(input.body, input.target, input.variable, input.direction);
  if (symbolic.kind === 'success') {
    const exactLatex = symbolic.exactLatex ?? (
      symbolic.value === undefined ? undefined : limitValueToLatex(symbolic.value)
    );
    const approxText = symbolic.approxText ?? (
      symbolic.value === undefined ? undefined : limitValueToApproxText(symbolic.value)
    );
    return {
      exactLatex,
      approxText,
      warnings:
        symbolic.origin === 'heuristic-symbolic'
          ? ["Rule-based limit resolution used capped L'Hopital on a supported ratio form."]
          : [],
      resultOrigin: symbolic.origin,
      detailSections: appendLimitDetails(
        symbolic.detailSections,
        ...(symbolic.value === undefined
          ? []
          : signedFiniteLimitBehaviorDetails({
              direction: input.direction,
              target: input.target,
              variable: input.variable,
              value: symbolic.value,
            })),
      ),
    };
  }

  if (input.allowNumericFallback === false) {
    return {
      warnings: [],
      error: `The ${input.routeKind ?? 'selected'} limit route did not resolve this expression within the current symbolic rules.`,
      detailSections: [limitDetailSection(
        'Limit Diagnostic',
        limitTextRows([
          `Route classification: ${input.routeKind ?? 'unknown'}.`,
          'Numeric fallback was skipped because this route needs an exact symbolic decision.',
        ]),
      )],
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
      detailSections: appendLimitDetails(
        numericFallbackDetail(
          'Symbolic rules did not resolve the limit, so controlled numeric sampling was used.',
          'Samples indicated same-signed divergence for the requested limit direction.',
        ),
        ...signedFiniteLimitBehaviorDetails({
          direction: input.direction,
          target: input.target,
          variable: input.variable,
          value: signToInfiniteLimit(numeric.sign),
        }),
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
      detailSections: appendLimitDetails(
        numericFallbackDetail(
          'Symbolic rules did not resolve the one-sided limit, so controlled numeric sampling was used.',
          'Samples indicated signed divergence on the requested side.',
        ),
        ...signedFiniteLimitBehaviorDetails({
          direction: input.direction,
          target: input.target,
          variable: input.variable,
          value: signToInfiniteLimit(numeric.sign),
        }),
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
    return {
      warnings: [],
      error: input.messages.mismatchError,
      detailSections: twoSidedMismatchDetails({
        evidence: numeric,
        target: input.target,
        variable: input.variable,
      }),
    };
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
  routeKind?: string;
  allowNumericFallback?: boolean;
  equationDomainIntent?: EquationDomainIntent;
  messages: InfiniteLimitMessages;
}): CalculusCoreEvaluation {
  const rewriteCancellation = resolveInfiniteRewriteCancellationLimit(
    input.body,
    input.targetKind,
    input.variable,
  );
  if (rewriteCancellation) {
    const exactLatex = rewriteCancellation.exactLatex ?? (
      rewriteCancellation.value === undefined ? undefined : limitValueToLatex(rewriteCancellation.value)
    );
    const approxText = rewriteCancellation.approxText ?? (
      rewriteCancellation.value === undefined ? undefined : limitValueToApproxText(rewriteCancellation.value)
    );
    return {
      exactLatex,
      approxText,
      warnings: [],
      resultOrigin: rewriteCancellation.origin,
      detailSections: rewriteCancellation.detailSections,
    };
  }

  const infinityScale = resolveInfiniteScaleLimit(input.body, input.targetKind, input.variable);
  if (infinityScale) {
    const exactLatex = infinityScale.exactLatex ?? (
      infinityScale.value === undefined ? undefined : limitValueToLatex(infinityScale.value)
    );
    const approxText = infinityScale.approxText ?? (
      infinityScale.value === undefined ? undefined : limitValueToApproxText(infinityScale.value)
    );
    return {
      exactLatex,
      approxText,
      warnings: [],
      resultOrigin: infinityScale.origin,
      detailSections: infinityScale.detailSections,
    };
  }

  const symbolicInfinityCases = resolveSymbolicInfinityCaseLimit(
    input.body,
    input.targetKind,
    input.variable,
  );
  if (symbolicInfinityCases) {
    return {
      exactLatex: symbolicInfinityCases.exactLatex,
      approxText: symbolicInfinityCases.approxText,
      warnings: [],
      resultOrigin: symbolicInfinityCases.origin,
      detailSections: symbolicInfinityCases.detailSections,
    };
  }

  const mrvLite = resolveMrvLiteLimit(input.body, input.targetKind, input.variable);
  if (mrvLite) {
    const exactLatex = mrvLite.exactLatex ?? (
      mrvLite.value === undefined ? undefined : limitValueToLatex(mrvLite.value)
    );
    const approxText = mrvLite.approxText ?? (
      mrvLite.value === undefined ? undefined : limitValueToApproxText(mrvLite.value)
    );
    return {
      exactLatex,
      approxText,
      warnings: [],
      resultOrigin: mrvLite.origin,
      detailSections: mrvLite.detailSections,
    };
  }

  const heuristic = resolveInfiniteLimitHeuristic(input.body, input.variable, input.targetKind);
  if (heuristic.kind === 'success') {
    return profileCalculusResult({
      exactLatex: heuristic.exactLatex ?? limitValueToLatex(heuristic.value),
      approxText: limitValueToApproxText(heuristic.value),
      warnings: [],
      resultOrigin: 'rule-based-symbolic',
      detailSections: heuristic.detailSections,
    });
  }

  if (input.routeKind === 'lhospital-candidate') {
    const lHospital = attemptInfiniteLHospital(input.body, input.targetKind, input.variable);
    if (lHospital.kind === 'success') {
      return profileCalculusResult({
        exactLatex: lHospital.exactLatex ?? limitValueToLatex(lHospital.value),
        approxText: limitValueToApproxText(lHospital.value),
        warnings: ["Rule-based limit resolution used capped L'Hopital on a supported quotient at infinity."],
        resultOrigin: 'heuristic-symbolic',
        detailSections: lHospital.detailSections,
      });
    }

    return {
      warnings: [],
      error: lHospital.reason,
      detailSections: lHospital.detailSections,
    };
  }

  const recursiveGruntz = buildGruntzRecursiveEvaluatorContract(
    input.body,
    input.variable,
    input.targetKind,
    { domain: input.equationDomainIntent === 'complex' ? 'complex-principal' : 'real' },
  );
  const recursiveGruntzEvaluation = gruntzRecursiveEvaluation(recursiveGruntz);
  if (recursiveGruntzEvaluation) {
    return recursiveGruntzEvaluation;
  }
  if (input.routeKind === 'gruntz') {
    return {
      warnings: [],
      error: recursiveGruntz.stopReason ?? 'The Gruntz route did not resolve this infinite-target limit.',
      detailSections: recursiveGruntz.detailSections ?? [limitDetailSection(
        'Limit Diagnostic',
        limitTextRows([
          'Route classification: gruntz.',
          recursiveGruntz.stopReason ?? 'The recursive Gruntz route stopped before a supported comparison.',
        ]),
      )],
    };
  }

  const targetLabel = input.messages.targetLabel(input.targetKind);
  if (heuristic.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${targetLabel}.`,
    };
  }

  if (input.allowNumericFallback === false) {
    return {
      warnings: [],
      error: `The ${input.routeKind ?? 'selected'} limit route did not resolve this expression within the current symbolic rules.`,
      detailSections: [limitDetailSection(
        'Limit Diagnostic',
        limitTextRows([
          `Route classification: ${input.routeKind ?? 'unknown'}.`,
          'Numeric fallback was skipped because this route needs an exact symbolic decision.',
        ]),
      )],
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
