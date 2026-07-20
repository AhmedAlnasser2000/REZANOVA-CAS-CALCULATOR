import { describe, expect, it } from 'vitest';
import type { SampledSceneRuntime } from '../../lib/graphing';
import {
  buildGraphTraceIndex,
  firstGraphTraceTarget,
  hitTestGraphScene,
  hitTestGraphTraceIndex,
  stepGraphTraceTarget,
  traceGraphPathAtPointer,
} from './graph-hit-testing';

const style = {
  version: 1 as const,
  colorToken: 'graph-blue',
  stroke: 'solid' as const,
  strokeWidth: 'normal' as const,
  fillOpacity: 0.18,
  label: 'auto' as const,
};
const viewport = { coordinateSystem: 'cartesian' as const, xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const size = { width: 1_000, height: 1_000 };
const scene: SampledSceneRuntime = {
  sceneRevision: 7,
  documentRevision: 1,
  viewportRevision: 1,
  parameterRevision: 0,
  paths: [
    {
      pathId: 'explicit-y.path', itemId: 'explicit-y',
      coordinates: new Float64Array([-5, -5, 0, 0, 5, 5]),
      parameterValues: new Float64Array([-5, 0, 5]),
      segmentOffsets: new Uint32Array([0]), closed: false, style,
    },
    {
      pathId: 'explicit-x.path', itemId: 'explicit-x',
      coordinates: new Float64Array([4, -5, 0, 0, 4, 5]),
      parameterValues: new Float64Array([-5, 0, 5]),
      segmentOffsets: new Uint32Array([0]), closed: false, style,
    },
  ],
  pointBatches: [{
    pointBatchId: 'points.batch', itemId: 'points',
    coordinates: new Float64Array([2, 3, -2, -3]), style,
  }],
  regions: [], labels: [],
};

describe('Graph scene hit testing and tracing', () => {
  it('prioritizes a close point identity and hits path segments geometrically', () => {
    expect(hitTestGraphScene({ scene, viewport, size, screen: { x: 700, y: 200 } })).toMatchObject({
      kind: 'point', itemId: 'points', pointIndex: 0, world: { x: 2, y: 3 },
    });
    expect(hitTestGraphScene({ scene, viewport, size, screen: { x: 250, y: 750 } })).toMatchObject({
      kind: 'path', itemId: 'explicit-y', world: { x: -2.5, y: -2.5 },
    });
  });

  it('indexes a point across neighboring cells for the full touch corridor', () => {
    const index = buildGraphTraceIndex(scene, viewport, size);
    expect(hitTestGraphTraceIndex({
      index,
      scene,
      screen: { x: 725, y: 200 },
      maximumDistancePixels: 28,
      itemId: 'points',
    })).toMatchObject({ kind: 'point', itemId: 'points', pointIndex: 0 });
  });

  it('projects to the closest segment point and keeps a selected path authoritative', () => {
    const overlapping: SampledSceneRuntime = {
      ...scene,
      paths: [
        scene.paths[0]!,
        {
          ...scene.paths[0]!,
          pathId: 'crossing.path',
          itemId: 'crossing',
          coordinates: new Float64Array([-5, 5, 0, 0, 5, -5]),
        },
      ],
      pointBatches: [],
    };
    const index = buildGraphTraceIndex(overlapping, viewport, size);
    expect(hitTestGraphTraceIndex({
      index,
      scene: overlapping,
      screen: { x: 625, y: 390 },
      maximumDistancePixels: 30,
      pathId: 'explicit-y.path',
    })).toMatchObject({
      itemId: 'explicit-y',
      pathId: 'explicit-y.path',
      world: { x: expect.closeTo(1.175, 10), y: expect.closeTo(1.175, 10) },
      screen: { x: 617.5, y: 382.5 },
    });
  });

  it('traces explicit-y by x and explicit-x by y without sampling work', () => {
    expect(traceGraphPathAtPointer({
      scene, viewport, size, itemId: 'explicit-y', relationKind: 'explicit-y',
      screen: { x: 750, y: 20 },
    })).toMatchObject({ world: { x: 2.5, y: 2.5 }, parameterValue: 2.5 });
    expect(traceGraphPathAtPointer({
      scene, viewport, size, itemId: 'explicit-x', relationKind: 'explicit-x',
      screen: { x: 20, y: 250 },
    })).toMatchObject({ world: { x: 2, y: 2.5 }, parameterValue: 2.5 });
    expect(traceGraphPathAtPointer({
      scene, viewport, size, itemId: 'explicit-y', relationKind: 'explicit-y',
      screen: { x: 750, y: 400 }, maximumDistancePixels: 30,
    })).toBeNull();
  });

  it('offers deterministic keyboard entry and stepping by point identity', () => {
    const first = firstGraphTraceTarget(scene, viewport, size);
    expect(first).toMatchObject({ kind: 'point', pointIndex: 0 });
    if (!first) throw new Error('Expected a trace target.');
    expect(stepGraphTraceTarget({ scene, viewport, size, current: first, delta: 1 })).toMatchObject({
      kind: 'point', pointIndex: 1, world: { x: -2, y: -3 },
    });
  });

  it('keeps teaching overlays outside pointer and keyboard trace authority', () => {
    const overlay = {
      ...scene.paths[0],
      pathId: 'graph-overlay.unit-circle:path',
      itemId: 'graph-overlay.unit-circle',
    };
    const withoutPoints = { ...scene, paths: [overlay, ...scene.paths], pointBatches: [] };
    expect(firstGraphTraceTarget(withoutPoints, viewport, size)).toMatchObject({
      itemId: 'explicit-y',
      parameterValue: -5,
    });
    expect(hitTestGraphScene({
      scene: withoutPoints,
      viewport,
      size,
      screen: { x: 250, y: 750 },
    })).toMatchObject({ itemId: 'explicit-y' });
  });
});
