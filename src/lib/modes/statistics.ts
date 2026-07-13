import type { OoeJobContextOptions } from '../ooe/job-launch/job-contract';
import {
  runStatisticsWithOoePilot,
  type StatisticsHostExecution,
} from '../ooe/pilots/statistics-pilot';
import {
  buildCanonicalStatisticsModeRunPayload,
  projectCanonicalStatisticsModeRunPayload,
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
} from './worker-clients/statistics-worker-client';

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
  const envelope = await runStatisticsWithOoePilot(
    async (context) => {
      const result = await runStatisticsModeViaIsolatedWorker(request, context, {
        createWorker: options.createWorker,
        fallback: () => buildCanonicalStatisticsModeRunPayload(request),
      });
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
    (payload) => projectCanonicalStatisticsModeRunPayload(payload).outcome,
  );
  return {
    payload: projectCanonicalStatisticsModeRunPayload(envelope.payload),
    ooe: envelope.ooe,
  };
}
