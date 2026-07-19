import { describe, expect, it } from 'vitest';
import type { SampledSceneRuntime } from '../../lib/graphing';
import {
  firstGraphTraceTarget,
  hitTestGraphScene,
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
  grid: { kind: 'none', majorLines: [], minorLines: [], labels: [], hysteresisKey: 'none' },
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

  it('traces explicit-y by x and explicit-x by y without sampling work', () => {
    expect(traceGraphPathAtPointer({
      scene, viewport, size, itemId: 'explicit-y', relationKind: 'explicit-y',
      screen: { x: 750, y: 20 },
    })).toMatchObject({ world: { x: 2.5, y: 2.5 }, parameterValue: 2.5 });
    expect(traceGraphPathAtPointer({
      scene, viewport, size, itemId: 'explicit-x', relationKind: 'explicit-x',
      screen: { x: 20, y: 250 },
    })).toMatchObject({ world: { x: 2, y: 2.5 }, parameterValue: 2.5 });
  });

  it('offers deterministic keyboard entry and stepping by point identity', () => {
    const first = firstGraphTraceTarget(scene, viewport, size);
    expect(first).toMatchObject({ kind: 'point', pointIndex: 0 });
    if (!first) throw new Error('Expected a trace target.');
    expect(stepGraphTraceTarget({ scene, viewport, size, current: first, delta: 1 })).toMatchObject({
      kind: 'point', pointIndex: 1, world: { x: -2, y: -3 },
    });
  });
});
