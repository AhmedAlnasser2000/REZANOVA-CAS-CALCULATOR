import { startIntegration, type PendingIntegration } from './service';
import type { IntegrationWorkerRequest, IntegrationWorkerMessage } from './types';
let pending: {id: string; computation: PendingIntegration} | undefined;
const post = (message: IntegrationWorkerMessage) => self.postMessage(message);
self.onmessage = (event: MessageEvent<IntegrationWorkerRequest>) => {
  const request = event.data;
  if (!request || typeof request.id !== 'string' || request.id.length > 512) return;
  if (request.phase === 'solve') {
    pending = undefined;
    const computation = startIntegration(request.job, preview => post({phase: 'candidate', id: request.id, preview}));
    if (computation.response.document.outcomeKind === 'error') post({phase: 'failure', id: request.id, response: computation.response});
    else {
      pending = {id: request.id, computation};
      post({phase: 'verified', id: request.id, response: computation.response, exportPending: !!computation.exportArtifact});
    }
  } else if (request.phase === 'export' && pending?.id === request.id) {
    const computation = pending.computation; pending = undefined;
    const exported = computation.exportArtifact?.();
    post({phase: 'export', id: request.id, ...exported, elapsedMs: exported?.timings?.export ?? 0, usage: exported?.usage ?? computation.response.usage});
  }
};
