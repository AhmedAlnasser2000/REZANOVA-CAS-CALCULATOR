import type { OoeJobContextOptions } from '../ooe/job-launch/job-contract';
import {
  runTrigonometryWithOoePilot,
  type TrigonometryHostExecution,
} from '../ooe/pilots/trigonometry-pilot';
import {
  buildTrigonometryOoeInputRevisionId,
  buildTrigonometryOoeSnapshot,
  type RunTrigonometryRuntimeRequest,
} from '../trigonometry/runtime-input';
import {
  buildTrigonometryModeRunPayload,
  type TrigonometryModeRunPayload,
} from '../trigonometry/runtime-run';
import {
  runTrigonometryModeViaIsolatedWorker,
  type CreateTrigonometryWorker,
} from './worker-clients/trigonometry-worker-client';

export {
  buildTrigonometryOoeInputRevisionId,
  type RunTrigonometryRuntimeRequest,
  type TrigonometryModeRunPayload,
};

type RunTrigonometryModeWithOoePilotOptions = OoeJobContextOptions & {
  createWorker?: CreateTrigonometryWorker;
};

export async function runTrigonometryModeWithOoePilot(
  request: RunTrigonometryRuntimeRequest,
  options: RunTrigonometryModeWithOoePilotOptions = {},
) {
  let hostExecution: TrigonometryHostExecution | undefined;
  const routeSnapshot = buildTrigonometryOoeSnapshot(request);
  return runTrigonometryWithOoePilot(
    async (context) => {
      const result = await runTrigonometryModeViaIsolatedWorker(request, context, {
        createWorker: options.createWorker,
        fallback: () => buildTrigonometryModeRunPayload(request),
      });
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
  );
}
