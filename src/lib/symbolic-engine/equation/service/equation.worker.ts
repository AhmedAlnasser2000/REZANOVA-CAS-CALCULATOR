import { executeEquation } from './service';
import type { EquationRequest } from '../../../new-equation/types';

self.onmessage = (event: MessageEvent<EquationRequest>) => {
  self.postMessage(executeEquation(event.data));
};
