import type {
  DisplayOutcome,
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  PlannerBadge,
  ResultOrigin,
  RuntimeAdvisories,
} from '../../types/calculator';

type PlannerBadgeMode = 'merge' | 'replace';

type BuildRuntimeOutcomeOptions = {
  title: string;
  exactLatex?: string;
  exactSupplementLatex?: string[];
  approxText?: string;
  warnings?: string[];
  error?: string;
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  calculusDerivativeStrategies?: CalculusDerivativeStrategy[];
  runtimeAdvisories?: RuntimeAdvisories;
};

type AttachRuntimeEnvelopeOptions = {
  originalLatex: string;
  resolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  plannerBadgeMode: PlannerBadgeMode;
  runtimeAdvisories?: RuntimeAdvisories;
};

function dedupe<T>(entries: T[]) {
  return [...new Set(entries)];
}

function attachPlannerBadges(
  outcome: DisplayOutcome,
  plannerBadges: PlannerBadge[] | undefined,
  plannerBadgeMode: PlannerBadgeMode,
) {
  if (plannerBadgeMode === 'replace') {
    return plannerBadges;
  }

  const merged = dedupe([
    ...(plannerBadges ?? []),
    ...((outcome.kind === 'prompt' ? [] : outcome.plannerBadges) ?? []),
  ]);

  return merged.length > 0 ? merged : undefined;
}

export function buildRuntimeOutcome({
  title,
  exactLatex,
  exactSupplementLatex,
  approxText,
  warnings = [],
  error,
  resultOrigin,
  calculusStrategy,
  calculusDerivativeStrategies,
  runtimeAdvisories,
}: BuildRuntimeOutcomeOptions): DisplayOutcome {
  if (error) {
    return {
      kind: 'error',
      title,
      error,
      warnings,
      exactLatex,
      exactSupplementLatex,
      approxText,
      runtimeAdvisories,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex,
    exactSupplementLatex,
    approxText,
    warnings,
    resultOrigin,
    calculusStrategy,
    calculusDerivativeStrategies,
    runtimeAdvisories,
  };
}

export function attachRuntimeEnvelope(
  outcome: DisplayOutcome,
  {
    originalLatex,
    resolvedLatex,
    plannerBadges,
    plannerBadgeMode,
    runtimeAdvisories,
  }: AttachRuntimeEnvelopeOptions,
): DisplayOutcome {
  const effectiveRuntimeAdvisories = runtimeAdvisories ?? outcome.runtimeAdvisories;
  const effectivePlannerBadges = attachPlannerBadges(outcome, plannerBadges, plannerBadgeMode);

  if (outcome.kind === 'prompt') {
    return {
      ...outcome,
      runtimeAdvisories: effectiveRuntimeAdvisories,
    };
  }

  return {
    ...outcome,
    resolvedInputLatex:
      outcome.resolvedInputLatex
      ?? (resolvedLatex !== originalLatex.trim() ? resolvedLatex : undefined),
    plannerBadges: effectivePlannerBadges,
    runtimeAdvisories: effectiveRuntimeAdvisories,
  };
}
