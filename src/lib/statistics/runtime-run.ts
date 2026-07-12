import type {
  StatisticsParseResult,
  StatisticsReplaySeed,
  StatisticsScreen,
} from '../../types/calculator';
import { runStatisticsCoreDraft } from './core';
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

  const ownedOutcome = outcome.kind === 'prompt'
    ? outcome
    : createStatisticsResultOutcome(outcome);

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
