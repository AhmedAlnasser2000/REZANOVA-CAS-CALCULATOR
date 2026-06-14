import type {
  StatisticsScreen,
  StatisticsWorkingSource,
} from '../../types/calculator';
import { buildOoeInputRevisionId } from '../ooe/job-launch/job-contract';

const STATISTICS_EVALUATE_CAPABILITY_ID = 'statistics.evaluate';

export type RunStatisticsRuntimeRequest = {
  inputLatex: string;
  screenHint: StatisticsScreen;
  workingSourceHint: StatisticsWorkingSource;
};

export function buildStatisticsOoeSnapshot(request: RunStatisticsRuntimeRequest) {
  return {
    capabilityId: STATISTICS_EVALUATE_CAPABILITY_ID,
    request,
  };
}

export function buildStatisticsOoeInputRevisionId(request: RunStatisticsRuntimeRequest) {
  return buildOoeInputRevisionId(
    STATISTICS_EVALUATE_CAPABILITY_ID,
    buildStatisticsOoeSnapshot(request),
  );
}
