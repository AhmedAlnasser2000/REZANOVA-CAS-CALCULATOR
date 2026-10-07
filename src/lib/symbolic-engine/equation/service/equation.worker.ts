import { executeEquation } from './service';
import type { EquationRequest, EquationWorkerMessage } from '../../../new-equation/types';

// The decided answer goes out first (not checked yet), then the verified response.
self.onmessage = (event: MessageEvent<EquationRequest>) => {
  const post = (message: EquationWorkerMessage) => self.postMessage(message);
  post({ phase: 'final', response: executeEquation(event.data, preview => post({ phase: 'preview', preview })) });
};
