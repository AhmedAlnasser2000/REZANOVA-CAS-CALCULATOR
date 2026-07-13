import type { CanonicalRuntimeOutcome } from '../../../types/calculator';

export type LinearAlgebraWorkerInboundMessage<TRequest> = {
  kind: 'run';
  requestId: string;
  request: TRequest;
};

export type LinearAlgebraWorkerOutboundMessage =
  | {
      kind: 'started';
      requestId: string;
    }
  | {
      kind: 'completed';
      requestId: string;
      payload: CanonicalRuntimeOutcome;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };
