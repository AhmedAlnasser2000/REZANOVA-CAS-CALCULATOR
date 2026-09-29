import { describe, expect, it } from 'vitest';
import type { SampledSceneRuntimeV2 } from '../../lib/graphing';
import {
  buildGraphTraceIndex,
  firstGraphTraceTarget,
  graphComplexValuePart,
  hitTestGraphScene,
  hitTestGraphTraceIndex,
  stepGraphTraceTarget,
  traceGraphPathAtPointer,
} from './graph-hit-testing';

const viewport = { coordinateSystem: 'cartesian' as const, xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const size = { width: 1_000, height: 1_000 };
const scene: SampledSceneRuntimeV2 = {
  sceneRevision: 7,
  mathematicsRevision: 1,
  viewportRevision: 1,
  parameterRevision: 0,
  paths: [
    {
      pathId: 'explicit-y.path', itemId: 'explicit-y',
      coordinates: new Float64Array([-5, -5, 0, 0, 5, 5]),
      parameterValues: new Float64Array([-5, 0, 5]),
      segmentOffsets: new Uint32Array([0]), closed: false,
    },
    {
      pathId: 'explicit-x.path', itemId: 'explicit-x',
      coordinates: new Float64Array([4, -5, 0, 0, 4, 5]),
      parameterValues: new Float64Array([-5, 0, 5]),
      segmentOffsets: new Uint32Array([0]), closed: false,
    },
  ],
  pointBatches: [{
    pointBatchId: 'points.batch', itemId: 'points',
    coordinates: new Float64Array([2, 3, -2, -3]),
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
    const overlapping: SampledSceneRuntimeV2 = {
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

  it('traces a curve\'s Re/Im paths when chosen but keeps the real curve first', () => {
    const imaginary = {
      pathId: 'explicit-y:complex-values-imaginary', itemId: 'explicit-y', strokeRole: 'complex-imaginary' as const,
      coordinates: new Float64Array([1, 4, 3, 4]), parameterValues: new Float64Array([1, 3]),
      segmentOffsets: new Uint32Array([0]), closed: false,
    };
    const slice = { ...imaginary, pathId: 'z-map:real-axis-imaginary', itemId: 'z-map' };
    const withComplex = { ...scene, paths: [imaginary, slice, ...scene.paths], pointBatches: [] };
    expect(graphComplexValuePart(imaginary.pathId)).toBe('imaginary');
    expect(graphComplexValuePart('explicit-y:complex-values-real')).toBe('real');
    expect(graphComplexValuePart(slice.pathId)).toBeNull();
    // Keyboard entry and the default sweep start on the real curve, not the Re/Im path listed before it.
    expect(firstGraphTraceTarget(withComplex, viewport, size)).toMatchObject({ pathId: 'explicit-y.path' });
    expect(traceGraphPathAtPointer({ scene: withComplex, viewport, size, itemId: 'explicit-y',
      relationKind: 'explicit-y', screen: { x: 750, y: 20 } })).toMatchObject({ pathId: 'explicit-y.path' });
    // A click near the Im path traces it; the z-map slice never is.
    expect(hitTestGraphScene({ scene: withComplex, viewport, size, screen: { x: 700, y: 100 } }))
      .toMatchObject({ pathId: imaginary.pathId });
    expect(traceGraphPathAtPointer({ scene: withComplex, viewport, size, itemId: 'explicit-y',
      relationKind: 'explicit-y', pathId: imaginary.pathId, screen: { x: 700, y: 100 } }))
      .toMatchObject({ pathId: imaginary.pathId, world: { x: 2, y: 4 } });
    expect(buildGraphTraceIndex(withComplex, viewport, size).segments.some((segment) => segment.pathIndex === 1)).toBe(false);
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
