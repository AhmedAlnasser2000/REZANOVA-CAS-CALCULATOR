import type {
  StatisticsParseResult,
  StatisticsReplaySeed,
  StatisticsScreen,
} from '../../types/calculator';
import { runStatisticsCoreDraft } from './core';
import { requireNativeSuccessfulResult } from '../result-contract';
import { statisticsRequestToScreen } from './parser';
import { createStatisticsResultOutcome } from './result-document';
import { statisticsRequestToWorkingSource } from './shared';
import type { RunStatisticsRuntimeRequest } from './runtime-input';

export type StatisticsModeRunPayload = {
  outcome: ReturnType<typeof runStatisticsCoreDraft>['outcome'];
  parsed: StatisticsParseResult;
  replayScreen: StatisticsScreen;
  replaySeed?: StatisticsReplaySeed;
};

export function buildStatisticsModeRunPayload(
  request: RunStatisticsRuntimeRequest,
): StatisticsModeRunPayload {
  const { outcome, parsed } = runStatisticsCoreDraft(request.inputLatex, {
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

  const ownedOutcome = requireNativeSuccessfulResult(outcome.kind === 'prompt'
    ? outcome
    : createStatisticsResultOutcome(outcome), 'Statistics');

  return {
    outcome: ownedOutcome,
    parsed,
    replayScreen,
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
