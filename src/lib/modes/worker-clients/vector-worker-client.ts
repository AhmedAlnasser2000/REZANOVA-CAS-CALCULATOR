import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
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
import { proseSolveSummary } from '../../display/result-detail-lines';
import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../../result-contract';
import { createVectorResultOutcomeV2 } from '../vector-result-document';

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
    fallback: () => Promise<CanonicalRuntimeOutcome> | CanonicalRuntimeOutcome;
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
      buildCancelledPayload: () => finalizeCanonicalRuntimeOutcomeFromProducer(
        createVectorResultOutcomeV2({
          kind: 'error',
          title: 'Vector',
          error: 'Vector operation stopped before it finished.',
          warnings: [],
          ...proseSolveSummary('Vector operation stopped after the worker runtime was hard-stopped.'),
        }, {
          routeId: 'vector.orthogonalization',
          evidence: {},
          mathValue: (_canonicalLatex, path) => {
            throw new Error(`Vector cancellation unexpectedly requested math at ${path}.`);
          },
        }),
        'Vector cancellation',
      ),
    },
    options,
  );
}
