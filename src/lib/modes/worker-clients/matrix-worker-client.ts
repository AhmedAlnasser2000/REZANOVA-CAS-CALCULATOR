import type { DisplayOutcome } from '../../../types/calculator';
import {
  OOE_MATRIX_FALLBACK_HOST_ID,
  OOE_MATRIX_WORKER_HOST_ID,
} from '../../ooe/pilots/linear-algebra-pilot';
import type { OoeRuntimeControlContext } from '../../ooe/runtime-control/runtime-coordinator';
import {
  runLinearAlgebraWorkspaceViaIsolatedWorker,
  type CreateLinearAlgebraWorkspaceWorker,
  type LinearAlgebraWorkerLike,
} from './linear-algebra-worker-client-core';
import type { RunMatrixModeRequest } from '../matrix';

export type CreateMatrixWorker = CreateLinearAlgebraWorkspaceWorker<RunMatrixModeRequest>;

function createDefaultMatrixWorker(): LinearAlgebraWorkerLike<RunMatrixModeRequest> {
  return new Worker(new URL('../worker-entrypoints/matrix.worker.ts', import.meta.url), {
    type: 'module',
    name: OOE_MATRIX_WORKER_HOST_ID,
  }) as LinearAlgebraWorkerLike<RunMatrixModeRequest>;
}

export function runMatrixModeViaIsolatedWorker(
  request: RunMatrixModeRequest,
  context: OoeRuntimeControlContext,
  options: {
    createWorker?: CreateMatrixWorker;
    fallback: () => Promise<DisplayOutcome> | DisplayOutcome;
  },
) {
  return runLinearAlgebraWorkspaceViaIsolatedWorker(
    request,
    context,
    {
      label: 'Matrix',
      requestIdPrefix: 'matrix-worker',
      primaryHostId: OOE_MATRIX_WORKER_HOST_ID,
      fallbackHostId: OOE_MATRIX_FALLBACK_HOST_ID,
      createDefaultWorker: createDefaultMatrixWorker,
    },
    options,
  );
}
