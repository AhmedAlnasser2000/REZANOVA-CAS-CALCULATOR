import type { GraphRendererLifecycleCallbacksV1 } from '../../contracts';
import { GraphThreeRenderer } from './renderer';

export function createGraphThreeRenderer(callbacks: GraphRendererLifecycleCallbacksV1) {
  return new GraphThreeRenderer(callbacks);
}
