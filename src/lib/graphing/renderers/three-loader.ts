import type {
  GraphRendererLifecycleCallbacksV1,
  InteractiveGraph3dRenderer,
  InteractiveGraphFieldRenderer,
} from '../contracts';

export async function createGraphThreeRenderer(
  callbacks: GraphRendererLifecycleCallbacksV1,
): Promise<InteractiveGraph3dRenderer & InteractiveGraphFieldRenderer> {
  const adapter = await import('./three');
  return adapter.createGraphThreeRenderer(callbacks);
}
