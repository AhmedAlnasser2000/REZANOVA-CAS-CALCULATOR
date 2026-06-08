import type { OoeJobContextOptions } from '../ooe/job-contract';
import {
  runStatisticsWithOoePilot,
  type StatisticsHostExecution,
} from '../ooe/statistics-pilot';
import {
  buildStatisticsModeRunPayload,
  type StatisticsModeRunPayload,
} from '../statistics/runtime-run';
import {
  buildStatisticsOoeSnapshot,
  buildStatisticsOoeInputRevisionId,
  type RunStatisticsRuntimeRequest,
} from '../statistics/runtime-input';
import {
  runStatisticsModeViaIsolatedWorker,
  type CreateStatisticsWorker,
} from './statistics-worker-client';

export {
  buildStatisticsOoeInputRevisionId,
  type RunStatisticsRuntimeRequest,
  type StatisticsModeRunPayload,
};

type RunStatisticsModeWithOoePilotOptions = OoeJobContextOptions & {
  createWorker?: CreateStatisticsWorker;
};

export async function runStatisticsModeWithOoePilot(
  request: RunStatisticsRuntimeRequest,
  options: RunStatisticsModeWithOoePilotOptions = {},
) {
  let hostExecution: StatisticsHostExecution | undefined;
  const routeSnapshot = buildStatisticsOoeSnapshot(request);
  return runStatisticsWithOoePilot(
    async (context) => {
      const result = await runStatisticsModeViaIsolatedWorker(request, context, {
        createWorker: options.createWorker,
        fallback: () => buildStatisticsModeRunPayload(request),
      });
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
  );
}
