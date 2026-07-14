import type {
  ResultProducerDraft,
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  DisplayAnswerRowsReadback,
  DisplayDetailSection,
  CanonicalMathValueV1,
  PlannerBadge,
  ResultOrigin,
  RuntimeAdvisories,
} from '../../types/calculator';

type PlannerBadgeMode = 'merge' | 'replace';

type BuildRuntimeOutcomeOptions = {
  title: string;
  exactLatex?: string;
  primaryMath?: CanonicalMathValueV1;
  answerRows?: DisplayAnswerRowsReadback;
  exactSupplementLatex?: string[];
  approxText?: string;
  warnings?: string[];
  error?: string;
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  calculusDerivativeStrategies?: CalculusDerivativeStrategy[];
  detailSections?: DisplayDetailSection[];
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
  outcome: ResultProducerDraft,
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
  primaryMath,
  answerRows,
  exactSupplementLatex,
  approxText,
  warnings = [],
  error,
  resultOrigin,
  calculusStrategy,
  calculusDerivativeStrategies,
  detailSections,
  runtimeAdvisories,
}: BuildRuntimeOutcomeOptions): Exclude<ResultProducerDraft, { kind: 'prompt' }> {
  if (error) {
    return {
      kind: 'error',
      title,
      error,
      warnings,
      exactLatex,
      exactSupplementLatex,
      approxText,
      detailSections,
      runtimeAdvisories,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex,
    ...(primaryMath ? { primaryMath } : {}),
    answerRows,
    exactSupplementLatex,
    approxText,
    warnings,
    resultOrigin,
    calculusStrategy,
    calculusDerivativeStrategies,
    detailSections,
    runtimeAdvisories,
  };
}

export function attachRuntimeEnvelope(
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>,
  options: AttachRuntimeEnvelopeOptions,
): Exclude<ResultProducerDraft, { kind: 'prompt' }>;
export function attachRuntimeEnvelope(
  outcome: ResultProducerDraft,
  options: AttachRuntimeEnvelopeOptions,
): ResultProducerDraft;
export function attachRuntimeEnvelope(
  outcome: ResultProducerDraft,
  {
    originalLatex,
    resolvedLatex,
    plannerBadges,
    plannerBadgeMode,
    runtimeAdvisories,
  }: AttachRuntimeEnvelopeOptions,
): ResultProducerDraft {
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
