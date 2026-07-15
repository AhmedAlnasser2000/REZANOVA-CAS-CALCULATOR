import {
  buildStatisticsOoeInputRevisionId,
  type RunStatisticsRuntimeRequest,
} from '../../lib/statistics/runtime-request';
import type { StatisticsScreen, StatisticsWorkingSource } from '../../types/calculator';

export function statisticsRuntimeRequestWithPrecision(
  inputLatex: string,
  screenHint: StatisticsScreen,
  workingSourceHint: StatisticsWorkingSource,
  approxDigits: number,
): RunStatisticsRuntimeRequest {
  return { inputLatex, screenHint, workingSourceHint, approxDigits };
}

export function statisticsInputRevisionWithPrecision(
  inputLatex: string,
  screenHint: StatisticsScreen,
  workingSourceHint: StatisticsWorkingSource,
  approxDigits: number,
) {
  return buildStatisticsOoeInputRevisionId(
    statisticsRuntimeRequestWithPrecision(
      inputLatex,
      screenHint,
      workingSourceHint,
      approxDigits,
    ),
  );
}

export function addStatisticsRequestPrecision(
  request: RunStatisticsRuntimeRequest | null,
  approxDigits: number,
) {
  return request ? { ...request, approxDigits } : null;
}
