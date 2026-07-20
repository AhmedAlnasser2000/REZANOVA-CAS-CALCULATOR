import {
  snapshotSampledSceneRuntime,
  validateSampledSceneRuntimeStructure,
  validateSampledSceneSnapshot,
} from '../contracts';
import { graphSceneTypedArrayBuffers } from '../scene';
import type {
  GraphHeadlessSceneInput,
  GraphHeadlessSceneResult,
} from './types';

function invalid(message: string, path?: string): GraphHeadlessSceneResult {
  return {
    ok: false,
    failure: { reason: 'invalid-scene', message, ...(path ? { path } : {}) },
  };
}

function isStableOrder(values: string[]) {
  return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value) < 0);
}

export function inspectHeadlessGraphScene(
  input: GraphHeadlessSceneInput,
): GraphHeadlessSceneResult {
  const runtimeValidation = validateSampledSceneRuntimeStructure(input.scene);
  if (!runtimeValidation.ok) return { ok: false, failure: runtimeValidation.failure };
  if (!isStableOrder(input.scene.paths.map((path) => path.pathId))) {
    return invalid('Runtime scene paths are not in stable identity order.', '$.scene.paths');
  }
  if (!isStableOrder(input.scene.regions.map((region) => region.regionId))) {
    return invalid('Runtime scene regions are not in stable identity order.', '$.scene.regions');
  }
  if (!isStableOrder(input.scene.pointBatches.map((batch) => batch.pointBatchId))) {
    return invalid('Runtime scene point batches are not in stable identity order.', '$.scene.pointBatches');
  }
  if (!isStableOrder(input.scene.labels.map((label) => label.labelId))) {
    return invalid('Runtime scene labels are not in stable identity order.', '$.scene.labels');
  }
  const ownedBuffers = graphSceneTypedArrayBuffers(input.scene);
  if (new Set(ownedBuffers).size !== ownedBuffers.length) {
    return invalid('Runtime scene typed arrays do not have unique buffer ownership.');
  }
  if (new Set(input.transferList).size !== input.transferList.length) {
    return invalid('Runtime scene transfer list contains duplicate buffers.', '$.transferList');
  }
  const expectedBuffers = new Set(ownedBuffers);
  if (input.transferList.length !== expectedBuffers.size
    || input.transferList.some((buffer) => !expectedBuffers.has(buffer))) {
    return invalid('Runtime scene transfer list does not exactly cover scene ownership.', '$.transferList');
  }
  const snapshot = snapshotSampledSceneRuntime(input.scene, input.viewport);
  const snapshotValidation = validateSampledSceneSnapshot(snapshot);
  if (!snapshotValidation.ok) return { ok: false, failure: snapshotValidation.failure };
  return {
    ok: true,
    evidence: {
      snapshot: snapshotValidation.value,
      snapshotHash: snapshotValidation.hash,
      pathCount: input.scene.paths.length,
      segmentCount: input.scene.paths.reduce(
        (count, path) => count + path.segmentOffsets.length,
        0,
      ),
      vertexCount: input.scene.paths.reduce(
        (count, path) => count + path.coordinates.length / 2,
        0,
      ),
      regionCount: input.scene.regions.length,
      triangleCount: input.scene.regions.reduce(
        (count, region) => count + region.triangleIndices.length / 3,
        0,
      ),
      pointCount: input.scene.pointBatches.reduce(
        (count, batch) => count + batch.coordinates.length / 2,
        0,
      ),
      labelCount: input.scene.labels.length,
      transferableByteLength: input.transferList.reduce(
        (count, buffer) => count + buffer.byteLength,
        0,
      ),
    },
  };
}
