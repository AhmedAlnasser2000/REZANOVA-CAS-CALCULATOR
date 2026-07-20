import { describe, expect, it } from 'vitest';
import type {
  GraphExpressionIR,
  GraphRelationIR,
} from '../contracts';
import {
  compileExplicitGraphRelation,
  minimumSamplingLimits,
  sampleExplicitGraphRelation,
} from '../sampling';
import { assembleSampledScene } from './assemble';

const viewport = {
  coordinateSystem: 'cartesian' as const,
  xMin: -5,
  xMax: 5,
  yMin: -5,
  yMax: 5,
};

function expression(mathJson: GraphExpressionIR['mathJson']): GraphExpressionIR {
  return { mathJson, freeSymbols: ['x'] };
}

function sampled(itemId: string, mathJson: GraphExpressionIR['mathJson']) {
  const relation: GraphRelationIR = {
    kind: 'explicit-y',
    origin: 'bare-expression',
    rhs: expression(mathJson),
  };
  const compiled = compileExplicitGraphRelation({ itemId, sourceRevision: 1, relation });
  if (!compiled.ok) throw new Error('Expected compiled explicit relation.');
  return sampleExplicitGraphRelation({
    plan: compiled.plan,
    viewport,
    cssSize: { width: 800, height: 600 },
    parameterEnvironment: {},
    quality: 'settled',
    limits: minimumSamplingLimits(),
  });
}

const revisions = { scene: 4, mathematics: 1, viewport: 2, parameter: 3 };

describe('Graph sampled-scene assembly', () => {
  it('adopts sampled arrays without copies and emits stable scene identity order', () => {
    const sine = sampled('item.sine', ['Sin', 'x']);
    const parabola = sampled('item.parabola', ['Power', 'x', 2]);
    const result = assembleSampledScene({
      revisions,
      viewport,
      paths: [
        { pathId: 'path.sine', sample: sine },
        { pathId: 'path.parabola', sample: parabola },
      ],
      labels: [
        { labelId: 'label.z', itemId: 'item.sine', role: 'relation', anchor: { x: 0, y: 0 }, priority: 1, plainText: 'sin(x)' },
        { labelId: 'label.a', itemId: 'item.parabola', role: 'relation', anchor: { x: 1, y: 1 }, priority: 2, mathJson: ['Power', 'x', 2] },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.scene.paths.map((path) => path.pathId)).toEqual([
      'path.parabola',
      'path.sine',
    ]);
    expect(result.bundle.scene.labels.map((label) => label.labelId)).toEqual([
      'label.a',
      'label.z',
    ]);
    const sinePath = result.bundle.scene.paths[1];
    expect(sinePath.coordinates).toBe(sine.coordinates);
    expect(sinePath.segmentOffsets).toBe(sine.segmentOffsets);
    expect(sinePath.parameterValues).toBe(sine.independentValues);
    expect(result.bundle.transferList).toHaveLength(6);
    expect(result.bundle.evidence.vertexCount).toBe(
      sine.stats.emittedVertices + parabola.stats.emittedVertices,
    );
    expect(result.bundle).not.toHaveProperty('snapshot');
    expect(result.bundle).not.toHaveProperty('snapshotHash');
  });

  it('retains truthful bounded geometry and its stop reason', () => {
    const oscillatory = sampled('item.oscillatory', ['Sin', ['Multiply', 80, 'x']]);
    const bounded = {
      ...oscillatory,
      status: 'budget-exhausted' as const,
      stopReason: {
        code: 'sampling-budget-exceeded' as const,
        detailCode: 'semantic-fixture-budget',
      },
    };
    const result = assembleSampledScene({
      revisions,
      viewport,
      paths: [{ pathId: 'path.oscillatory', sample: bounded }],
    });
    expect(result).toMatchObject({
      ok: true,
      bundle: {
        stopReasons: [{ code: 'sampling-budget-exceeded' }],
      },
    });
  });

  it('adopts stable point-batch arrays with independent transfer ownership', () => {
    const coordinates = new Float64Array([3, 4, -1, 2]);
    const result = assembleSampledScene({
      revisions,
      viewport,
      paths: [],
      pointBatches: [{
        pointBatchId: 'points.b',
        itemId: 'item.points',
        coordinates,
      }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.scene.pointBatches[0]?.coordinates).toBe(coordinates);
    expect(result.bundle.transferList).toEqual([coordinates.buffer]);
    expect(result.bundle.evidence.vertexCount).toBe(2);
  });

  it('adopts region triangles separately from their boundary path', () => {
    const boundary = {
      itemId: 'item.disk',
      status: 'complete' as const,
      coordinates: new Float64Array([-1, 0, 0, 1, 1, 0, 0, -1, -1, 0]),
      segmentOffsets: new Uint32Array([0]),
      stats: {
        evaluatedSamples: 25,
        emittedVertices: 5,
        elapsedMs: 2,
      },
    };
    const vertices = new Float64Array([-1, 0, 0, 1, 1, 0, 0, -1]);
    const triangleIndices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    const result = assembleSampledScene({
      revisions,
      viewport,
      paths: [{ pathId: 'path.disk', sample: boundary, closed: true }],
      regions: [{
        regionId: 'region.disk',
        itemId: 'item.disk',
        vertices,
        triangleIndices,
        boundaryPathIds: ['path.disk'],
      }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.scene.regions[0]?.vertices).toBe(vertices);
    expect(result.bundle.scene.regions[0]?.triangleIndices).toBe(triangleIndices);
    expect(result.bundle.scene.regions[0]?.boundaryPathIds).toEqual(['path.disk']);
    expect(result.bundle.transferList).toEqual([
      boundary.coordinates.buffer,
      boundary.segmentOffsets.buffer,
      vertices.buffer,
      triangleIndices.buffer,
    ]);
    expect(result.bundle.evidence.vertexCount).toBe(9);
  });

  it('rejects duplicate IDs, malformed alignment, and incomplete status without evidence', () => {
    const sine = sampled('item.sine', ['Sin', 'x']);
    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [
        { pathId: 'same', sample: sine },
        { pathId: 'same', sample: sine },
      ],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [{
        pathId: 'misaligned',
        sample: { ...sine, independentValues: new Float64Array(1) },
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [{
        pathId: 'missing-stop',
        sample: { ...sine, status: 'cancelled', stopReason: undefined },
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [],
      pointBatches: [{
        pointBatchId: 'bad-points',
        itemId: 'item.points',
        coordinates: new Float64Array([1, Number.NaN]),
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    const boundary = {
      itemId: 'item.region',
      status: 'complete' as const,
      coordinates: new Float64Array([0, 0, 1, 0]),
      segmentOffsets: new Uint32Array([0]),
      stats: { evaluatedSamples: 2, emittedVertices: 2, elapsedMs: 1 },
    };
    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [{ pathId: 'path.region', sample: boundary }],
      regions: [{
        regionId: 'region.bad-index',
        itemId: 'item.region',
        vertices: new Float64Array([0, 0, 1, 0, 0, 1]),
        triangleIndices: new Uint32Array([0, 1, 3]),
        boundaryPathIds: ['path.region'],
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [{ pathId: 'path.region', sample: boundary }],
      regions: [{
        regionId: 'region.missing-boundary',
        itemId: 'item.region',
        vertices: new Float64Array([0, 0, 1, 0, 0, 1]),
        triangleIndices: new Uint32Array([0, 1, 2]),
        boundaryPathIds: ['path.unknown'],
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });
  });
});
