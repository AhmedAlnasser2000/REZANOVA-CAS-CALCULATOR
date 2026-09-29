import { executeIntegration } from './service';
import type { IntegrationJob } from './types';
self.onmessage = (event: MessageEvent<IntegrationJob>) => {
  self.postMessage(executeIntegration(event.data));
};
