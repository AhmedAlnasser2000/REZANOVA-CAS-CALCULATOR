import type {
  StatisticsScreen,
  StatisticsWorkingSource,
} from '../../types/calculator';

export type RunStatisticsRuntimeRequest = {
  inputLatex: string;
  screenHint: StatisticsScreen;
  workingSourceHint: StatisticsWorkingSource;
};

export function buildStatisticsOoeInputRevisionId(request: RunStatisticsRuntimeRequest) {
  return JSON.stringify({
    inputLatex: request.inputLatex,
    screenHint: request.screenHint,
    workingSourceHint: request.workingSourceHint,
  });
}
