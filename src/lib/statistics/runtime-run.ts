import type {
  CanonicalRuntimeOutcome,
  StatisticsParseResult,
  StatisticsReplaySeed,
  StatisticsScreen,
  StatisticsVisualizationPayloadV1,
  VersionedResultProducerDraft,
} from '../../types/calculator';
import { runStatisticsCoreDraft } from './core';
import {
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import { statisticsRequestToScreen } from './parser';
import { createStatisticsResultOutcome } from './result-document';
import { statisticsRequestToWorkingSource } from './shared';
import type { RunStatisticsRuntimeRequest } from './runtime-input';
import {
  statisticsMathJsonRouteForRequest,
  statisticsV2MathResolverFromOwnedLeaves,
} from './math-values';
import { buildStatisticsVisualizationPayloadV1 } from './visualization-payload';

export type StatisticsModeRunPayload = {
  outcome: VersionedResultProducerDraft;
  parsed: StatisticsParseResult;
  replayScreen: StatisticsScreen;
  replaySeed?: StatisticsReplaySeed;
  visualization?: StatisticsVisualizationPayloadV1;
};

export type CanonicalStatisticsModeRunPayload = Omit<StatisticsModeRunPayload, 'outcome'> & {
  outcome: CanonicalRuntimeOutcome;
};

export function buildStatisticsModeRunPayload(
  request: RunStatisticsRuntimeRequest,
): StatisticsModeRunPayload {
  const { outcome, parsed, mathJsonLeaves } = runStatisticsCoreDraft(request.inputLatex, {
    screenHint: request.screenHint,
    workingSourceHint: request.workingSourceHint,
  });
  const replayScreen = parsed.ok
    ? statisticsRequestToScreen(parsed.request, request.screenHint)
    : request.screenHint;
  const replayWorkingSource = parsed.ok
    ? statisticsRequestToWorkingSource(parsed.request, request.workingSourceHint)
      ?? request.workingSourceHint
    : request.workingSourceHint;

  const ownedOutcome = requireCanonicalResultAuthority(outcome.kind === 'prompt'
    ? outcome
    : createStatisticsResultOutcome(outcome, parsed.ok
      ? statisticsV2MathResolverFromOwnedLeaves({
          routeId: statisticsMathJsonRouteForRequest(parsed.request),
          leaves: mathJsonLeaves,
        })
      : undefined), 'Statistics');
  const visualization = parsed.ok && ownedOutcome.kind === 'success'
    ? buildStatisticsVisualizationPayloadV1(parsed.request)
    : undefined;

  return {
    outcome: ownedOutcome,
    parsed,
    replayScreen,
    ...(visualization ? { visualization } : {}),
    ...(parsed.ok
      ? {
          replaySeed: {
            screen: replayScreen,
            request: parsed.request,
            workingSource: replayWorkingSource,
          },
        }
      : {}),
  };
}

export function buildCanonicalStatisticsModeRunPayload(
  request: RunStatisticsRuntimeRequest,
): CanonicalStatisticsModeRunPayload {
  const payload = buildStatisticsModeRunPayload(request);
  return {
    ...payload,
    outcome: finalizeCanonicalRuntimeOutcomeFromProducer(payload.outcome, 'Statistics'),
  };
}
