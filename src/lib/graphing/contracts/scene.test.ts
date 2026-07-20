import { describe, expect, it } from 'vitest';
import type { SampledSceneRuntime } from './types';
import {
  hashGraphSceneSnapshot,
  hashSampledSceneRuntime,
  normalizeGraphSceneSnapshot,
  snapshotSampledSceneRuntime,
  validateGraphSampleResult,
  validateTransferredGraphSampleResult,
  validateSampledSceneRuntime,
  validateSampledSceneSnapshot,
} from './scene';

const style = { version: 1 as const, colorToken: 'graph-blue', stroke: 'solid' as const, strokeWidth: 'normal' as const, fillOpacity: 0.2, label: 'auto' as const };

function runtimeScene(): SampledSceneRuntime {
  return {
    sceneRevision: 4,
    documentRevision: 1,
    viewportRevision: 2,
    parameterRevision: 3,
    paths: [
      { pathId: 'path-b', itemId: 'curve-b', coordinates: new Float64Array([0, 0, 1, 1]), segmentOffsets: new Uint32Array([0]), closed: false, style },
      { pathId: 'path-a', itemId: 'curve-a', coordinates: new Float64Array([-1, 1, 0, 0]), segmentOffsets: new Uint32Array([0]), parameterValues: new Float64Array([-1, 0]), closed: false, style },
    ],
    regions: [{ regionId: 'region-a', itemId: 'disk', vertices: new Float64Array([0, 0, 1, 0, 0, 1]), triangleIndices: new Uint32Array([0, 1, 2]), boundaryPathIds: ['path-a'], style }],
    pointBatches: [{ pointBatchId: 'points-a', itemId: 'points', coordinates: new Float64Array([2, 3]), style }],
    labels: [{ labelId: 'label-b', itemId: 'curve-b', role: 'relation', anchor: { x: 1, y: 1 }, priority: 2, mathJson: ['Equal', 'y', 'x'] }],
  };
}

describe('Graph scene contracts', () => {
  it('snapshots transferable arrays into deterministic stable-ID order', () => {
    const runtime = runtimeScene();
    expect(validateSampledSceneRuntime(runtime).ok).toBe(true);
    const snapshot = snapshotSampledSceneRuntime(runtime, { coordinateSystem: 'cartesian', xMin: -2, xMax: 2, yMin: -2, yMax: 2 });
    const reversed = { ...snapshot, paths: [...snapshot.paths].reverse() };
    const reorderedKeys = {
      labels: snapshot.labels,
      pointBatches: snapshot.pointBatches,
      regions: snapshot.regions,
      paths: snapshot.paths,
      viewport: snapshot.viewport,
      revisions: snapshot.revisions,
      version: snapshot.version,
    };

    expect(normalizeGraphSceneSnapshot(reversed).paths.map((path) => path.pathId)).toEqual(['path-a', 'path-b']);
    expect(hashGraphSceneSnapshot(reversed)).toBe(hashGraphSceneSnapshot(snapshot));
    expect(hashGraphSceneSnapshot(reorderedKeys)).toBe(hashGraphSceneSnapshot(snapshot));
    expect(hashGraphSceneSnapshot(snapshot)).toMatch(/^graph64:[0-9a-f]{16}$/u);
    expect(hashSampledSceneRuntime(runtime, snapshot.viewport)).toBe(hashGraphSceneSnapshot(snapshot));
    expect(validateSampledSceneSnapshot(reversed)).toMatchObject({ ok: true, hash: hashGraphSceneSnapshot(snapshot) });
    expect(JSON.stringify(snapshot)).not.toContain('Float64Array');
  });

  it('rejects non-finite coordinates, bad indices, and missing region boundaries', () => {
    const nonFinite = runtimeScene();
    nonFinite.paths[0]!.coordinates[1] = Number.NaN;
    expect(validateSampledSceneRuntime(nonFinite)).toMatchObject({ ok: false, failure: { reason: 'non-finite-number' } });

    const badRegion = runtimeScene();
    badRegion.regions[0]!.boundaryPathIds = ['missing'];
    expect(validateSampledSceneRuntime(badRegion)).toMatchObject({ ok: false, failure: { reason: 'invalid-index' } });

    const badTriangle = runtimeScene();
    badTriangle.regions[0]!.triangleIndices[2] = 9;
    expect(validateSampledSceneRuntime(badTriangle)).toMatchObject({ ok: false, failure: { reason: 'invalid-index' } });

    const singletonSegment = runtimeScene();
    singletonSegment.paths[0]!.segmentOffsets = new Uint32Array([0, 1]);
    expect(validateSampledSceneRuntime(singletonSegment)).toMatchObject({ ok: false, failure: { reason: 'invalid-index' } });

    const missingZero = runtimeScene();
    missingZero.paths[0]!.segmentOffsets = new Uint32Array([1]);
    expect(validateSampledSceneRuntime(missingZero)).toMatchObject({ ok: false, failure: { reason: 'invalid-index' } });
  });

  it('validates the revision-carrying sample result without accepting plain arrays', () => {
    const scene = runtimeScene();
    const viewport = { coordinateSystem: 'cartesian' as const, xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
    const result = {
      version: 3,
      requestId: 'request-1',
      workspaceInstanceId: 'graph-tab-1',
      documentId: 'graph-document-1',
      revisions: { scene: 4, document: 1, viewport: 2, parameter: 3 },
      viewport,
      quality: 'preview',
      status: 'complete',
      scene,
      snapshotHash: hashGraphSceneSnapshot(snapshotSampledSceneRuntime(scene, viewport)),
      stopReasons: [],
      itemEvidence: [],
      evidence: { sampleCount: 4, vertexCount: 4, elapsedMs: 12, cacheBytes: 0, schedulerPasses: 1 },
    };
    expect(validateGraphSampleResult(result).ok).toBe(true);
    expect(validateGraphSampleResult({ ...result, snapshotHash: 'graph64:0000000000000000' }).ok).toBe(false);
    expect(validateTransferredGraphSampleResult(result).ok).toBe(true);
    expect(validateSampledSceneRuntime({ ...scene, paths: [{ ...scene.paths[0], coordinates: [0, 0] }] }).ok).toBe(false);
    expect(validateSampledSceneRuntime({ ...scene, renderer: { kind: 'svg' } }).ok).toBe(false);
    expect(validateGraphSampleResult({ ...result, rendererHandle: {} }).ok).toBe(false);
    expect(() => structuredClone(result)).not.toThrow();
  });
});
