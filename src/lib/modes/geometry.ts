import {
  buildCanonicalGeometryModeRunPayload,
  type GeometryModeRunPayload,
} from '../geometry/runtime-run';
import {
  buildGeometryOoeInputRevisionId,
  buildGeometryOoeSnapshot,
  type RunGeometryRuntimeRequest,
} from '../geometry/runtime-input';
import type { OoeJobContextOptions } from '../ooe/job-launch/job-contract';
import {
  runGeometryWithOoePilot,
  type GeometryHostExecution,
} from '../ooe/pilots/geometry-pilot';
import {
  runGeometryModeViaIsolatedWorker,
  type CreateGeometryWorker,
} from './worker-clients/geometry-worker-client';

export {
  buildGeometryOoeInputRevisionId,
  type RunGeometryRuntimeRequest,
  type GeometryModeRunPayload,
};

type RunGeometryModeWithOoePilotOptions = OoeJobContextOptions & {
  createWorker?: CreateGeometryWorker;
};

export async function runGeometryModeWithOoePilot(
  request: RunGeometryRuntimeRequest,
  options: RunGeometryModeWithOoePilotOptions = {},
) {
  let hostExecution: GeometryHostExecution | undefined;
  const routeSnapshot = buildGeometryOoeSnapshot(request);
  const envelope = await runGeometryWithOoePilot(
    async (context) => {
      const result = await runGeometryModeViaIsolatedWorker(request, context, {
        createWorker: options.createWorker,
        fallback: () => buildCanonicalGeometryModeRunPayload(request),
      });
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
    (payload) => payload.outcome,
  );
  return {
    payload: envelope.payload,
    ooe: envelope.ooe,
  };
}
