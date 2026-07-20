import type {
  GraphRendererLifecycleCallbacksV1,
  InteractiveGraph3dRenderer,
} from '../contracts';

export async function createGraphThreeRenderer(
  callbacks: GraphRendererLifecycleCallbacksV1,
): Promise<InteractiveGraph3dRenderer> {
  const adapter = await import('./three');
  return adapter.createGraphThreeRenderer(callbacks);
}
