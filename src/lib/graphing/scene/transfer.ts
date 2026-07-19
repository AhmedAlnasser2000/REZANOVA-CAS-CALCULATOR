import type { SampledSceneRuntime } from '../contracts';

export type GraphSceneTransferCollection =
  | { ok: true; transferList: ArrayBuffer[] }
  | { ok: false; message: string };

function sceneViews(scene: SampledSceneRuntime): ArrayBufferView[] {
  return [
    ...scene.paths.flatMap((path) => [
      path.coordinates,
      path.segmentOffsets,
      ...(path.parameterValues ? [path.parameterValues] : []),
    ]),
    ...scene.regions.flatMap((region) => [region.vertices, region.triangleIndices]),
    ...scene.pointBatches.map((batch) => batch.coordinates),
  ];
}

export function collectGraphSceneTransferables(
  scene: SampledSceneRuntime,
): GraphSceneTransferCollection {
  const transferList: ArrayBuffer[] = [];
  const ownership = new Set<ArrayBuffer>();
  for (const view of sceneViews(scene)) {
    if (!(view.buffer instanceof ArrayBuffer)) {
      return { ok: false, message: 'Graph scene buffers must use transferable ArrayBuffer ownership.' };
    }
    if (ownership.has(view.buffer)) {
      return { ok: false, message: 'Graph scene typed arrays must not share mutable buffer ownership.' };
    }
    ownership.add(view.buffer);
    transferList.push(view.buffer);
  }
  return { ok: true, transferList };
}

export function graphSceneTypedArrayBuffers(scene: SampledSceneRuntime) {
  return sceneViews(scene).map((view) => view.buffer);
}
