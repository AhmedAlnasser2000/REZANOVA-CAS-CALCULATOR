import type {
  CanonicalRuntimeOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';

export type EquationDirectSymbolicWorkerInboundMessage = {
  kind: 'run';
  requestId: string;
  request: GuardedSolveRequest;
};

export type EquationDirectSymbolicWorkerOutboundMessage =
  | {
      kind: 'completed';
      requestId: string;
      outcome: CanonicalRuntimeOutcome;
    }
  | {
      kind: 'failed';
      requestId: string;
      message: string;
    };

export type EquationDirectSymbolicWorkerGlobalScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<EquationDirectSymbolicWorkerInboundMessage>) => void,
  ) => void;
  postMessage: (message: EquationDirectSymbolicWorkerOutboundMessage) => void;
};
