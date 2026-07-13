import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
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
import { proseSolveSummary } from '../../display/result-detail-lines';
import { projectDisplayOutcomeToCanonicalRuntimeOutcome } from '../../result-contract';
import { createMatrixResultOutcome } from '../matrix-result-document';

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
    fallback: () => Promise<CanonicalRuntimeOutcome> | CanonicalRuntimeOutcome;
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
      buildCancelledPayload: () => projectDisplayOutcomeToCanonicalRuntimeOutcome(
        createMatrixResultOutcome({
          kind: 'error',
          title: 'Matrix',
          error: 'Matrix operation stopped before it finished.',
          warnings: [],
          ...proseSolveSummary('Matrix operation stopped after the worker runtime was hard-stopped.'),
        }),
        'Matrix cancellation',
      ),
    },
    options,
  );
}
