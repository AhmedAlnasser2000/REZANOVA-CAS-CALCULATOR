import type { GraphSpatialSceneRuntimeV2, SampledSceneRuntimeV2 } from '../contracts';

export type GraphSceneTransferCollection =
  | { ok: true; transferList: ArrayBuffer[] }
  | { ok: false; message: string };

function sceneViews(scene: SampledSceneRuntimeV2): ArrayBufferView[] {
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
  scene: SampledSceneRuntimeV2,
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

export function graphSceneTypedArrayBuffers(scene: SampledSceneRuntimeV2) {
  return sceneViews(scene).map((view) => view.buffer);
}

export function collectGraphSpatialSceneTransferables(
  scene: GraphSpatialSceneRuntimeV2,
): GraphSceneTransferCollection {
  const planar = collectGraphSceneTransferables(scene.planarScene);
  if (!planar.ok) return planar;
  const transferList = [...planar.transferList];
  const ownership = new Set(transferList);
  for (const mesh of scene.surfaceMeshes) {
    for (const view of [
      mesh.positions, mesh.triangleIndices, mesh.normals,
      mesh.contourCoordinates, mesh.contourOffsets,
    ]) {
      if (!(view.buffer instanceof ArrayBuffer)) {
        return { ok: false, message: 'Graph surface buffers must use transferable ArrayBuffer ownership.' };
      }
      if (ownership.has(view.buffer)) {
        return { ok: false, message: 'Graph spatial typed arrays must not share mutable buffer ownership.' };
      }
      ownership.add(view.buffer);
      transferList.push(view.buffer);
    }
  }
  for (const tile of scene.complexTiles) {
    for (const view of [tile.rgba, tile.values]) {
      if (!(view.buffer instanceof ArrayBuffer)) {
        return { ok: false, message: 'Graph complex buffers must use transferable ArrayBuffer ownership.' };
      }
      if (ownership.has(view.buffer)) {
        return { ok: false, message: 'Graph complex typed arrays must not share mutable buffer ownership.' };
      }
      ownership.add(view.buffer); transferList.push(view.buffer);
    }
  }
  return { ok: true, transferList };
}
