import type { DisplayOutcome } from '../../../types/calculator';
import {
  OOE_VECTOR_FALLBACK_HOST_ID,
  OOE_VECTOR_WORKER_HOST_ID,
} from '../../ooe/pilots/linear-algebra-pilot';
import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import {
  runLinearAlgebraWorkspaceViaIsolatedWorker,
  type CreateLinearAlgebraWorkspaceWorker,
  type LinearAlgebraWorkerLike,
} from './linear-algebra-worker-client-core';
import type { RunVectorModeRequest } from '../vector';

export type CreateVectorWorker = CreateLinearAlgebraWorkspaceWorker<RunVectorModeRequest>;

function createDefaultVectorWorker(): LinearAlgebraWorkerLike<RunVectorModeRequest> {
  return new Worker(new URL('../worker-entrypoints/vector.worker.ts', import.meta.url), {
    type: 'module',
    name: OOE_VECTOR_WORKER_HOST_ID,
  }) as LinearAlgebraWorkerLike<RunVectorModeRequest>;
}

export function runVectorModeViaIsolatedWorker(
  request: RunVectorModeRequest,
  context: OoeRuntimeControlContext,
  options: {
    createWorker?: CreateVectorWorker;
    fallback: () => Promise<DisplayOutcome> | DisplayOutcome;
  },
) {
  return runLinearAlgebraWorkspaceViaIsolatedWorker(
    request,
    context,
    {
      label: 'Vector',
      requestIdPrefix: 'vector-worker',
      primaryHostId: OOE_VECTOR_WORKER_HOST_ID,
      fallbackHostId: OOE_VECTOR_FALLBACK_HOST_ID,
      createDefaultWorker: createDefaultVectorWorker,
    },
    options,
  );
}
