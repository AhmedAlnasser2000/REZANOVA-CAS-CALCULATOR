import { runGuardedDirectSymbolicFallback } from '../guarded-solve';
import { finalizeEquationCanonicalRuntimeOutcome } from '../equation-solve-result';
import type {
  EquationDirectSymbolicWorkerGlobalScope,
  EquationDirectSymbolicWorkerInboundMessage,
  EquationDirectSymbolicWorkerOutboundMessage,
} from './messages';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const workerSelf = self as unknown as EquationDirectSymbolicWorkerGlobalScope;

workerSelf.addEventListener('message', (event: MessageEvent<EquationDirectSymbolicWorkerInboundMessage>) => {
  if (event.data.kind !== 'run') {
    return;
  }

  try {
    workerSelf.postMessage({
      kind: 'completed',
      requestId: event.data.requestId,
      outcome: finalizeEquationCanonicalRuntimeOutcome(
        runGuardedDirectSymbolicFallback(event.data.request),
        'Equation direct-symbolic worker',
      ),
    } satisfies EquationDirectSymbolicWorkerOutboundMessage);
  } catch (error) {
    workerSelf.postMessage({
      kind: 'failed',
      requestId: event.data.requestId,
      message: errorMessage(error),
    } satisfies EquationDirectSymbolicWorkerOutboundMessage);
  }
});

export {};
