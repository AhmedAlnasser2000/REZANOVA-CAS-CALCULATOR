import { describe, expect, it } from 'vitest';
import {
  validateGraphSampleResult,
  type GraphSampleRequestV1,
} from '../contracts';
import {
  releaseGraphSampleResultBuffers,
  runGraphSampleRequest,
} from './request';

function request(): GraphSampleRequestV1 {
  return {
    version: 1,
    requestId: 'graph-request-1',
    workspaceInstanceId: 'graph-tab-1',
    documentId: 'graph-document-1',
    revisions: { scene: 4, document: 1, viewport: 2, parameter: 3 },
    items: [{
      version: 1,
      kind: 'relation',
      itemId: 'curve-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: '\\sin(x)',
        sourceRevision: 1,
      },
      relation: {
        kind: 'explicit-y',
        origin: 'bare-expression',
        rhs: { mathJson: ['Sin', 'x'], freeSymbols: ['x'] },
      },
      visible: true,
      presentation: {
        version: 1,
        colorToken: 'graph-blue',
        stroke: 'solid',
        strokeWidth: 'normal',
        fillOpacity: 0.2,
        label: 'auto',
      },
    }],
    parameterEnvironment: {},
    viewport: {
      coordinateSystem: 'cartesian',
      xMin: -10,
      xMax: 10,
      yMin: -5,
      yMax: 5,
    },
    cssSize: { width: 1_000, height: 500 },
    grid: {
      kind: 'cartesian',
      major: true,
      minor: true,
      axisNumbers: true,
      angleLabels: false,
      unitCircle: false,
    },
    quality: 'preview',
    budgets: {
      maximumRecursionDepth: 16,
      maximumSamples: 8_192,
      maximumTimeMs: 150,
      maximumVertices: 16_384,
    },
  };
}

describe('Graph sample request runtime', () => {
  it('assembles a bounded transferable scene directly from relation authority', async () => {
    const execution = await runGraphSampleRequest(request());

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.paths).toHaveLength(1);
    expect(execution.transferList.length).toBeGreaterThan(0);
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
    expect(() => structuredClone(execution.result)).not.toThrow();
  });

  it('returns a valid empty cancelled scene when stopped before sampling', async () => {
    const execution = await runGraphSampleRequest(request(), undefined, {
      isCancelled: () => true,
    });

    expect(execution.result).toMatchObject({
      status: 'cancelled',
      stopReasons: [{
        code: 'sampling-cancelled',
        detailCode: 'cooperative-request-cancellation',
      }],
    });
    expect(execution.result.scene.paths).toEqual([]);
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
  });

  it('evaluates structured point sets into transferable scene batches', async () => {
    const pointRequest = request();
    pointRequest.items = [{
      version: 1,
      kind: 'point-set',
      itemId: 'points-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: '\\{(a,2),(3,4)\\}',
        sourceRevision: 1,
      },
      points: [{ x: 'a', y: 2 }, { x: 3, y: 4 }],
      visible: true,
      presentation: pointRequest.items[0]!.presentation,
    }];
    pointRequest.parameterEnvironment = { a: 5 };
    const execution = await runGraphSampleRequest(pointRequest);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.paths).toEqual([]);
    expect([...execution.result.scene.pointBatches[0]!.coordinates]).toEqual([5, 2, 3, 4]);
    expect(execution.result.evidence).toMatchObject({ sampleCount: 4, vertexCount: 2 });
    expect(execution.transferList).toHaveLength(1);
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
  });

  it('assembles implicit boundaries and inequality regions as separate scene geometry', async () => {
    const implicitRequest = request();
    implicitRequest.quality = 'settled';
    implicitRequest.items = [{
      version: 1,
      kind: 'relation',
      itemId: 'disk-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: 'x^2+y^2\\le 9',
        sourceRevision: 1,
      },
      relation: {
        kind: 'inequality',
        left: {
          mathJson: ['Add', ['Power', 'x', 2], ['Power', 'y', 2]],
          freeSymbols: ['x', 'y'],
        },
        operator: '<=',
        right: { mathJson: 9, freeSymbols: [] },
      },
      visible: true,
      presentation: implicitRequest.items[0]!.presentation,
    }];
    implicitRequest.budgets.maximumSamples = 20_000;
    implicitRequest.budgets.maximumVertices = 20_000;
    implicitRequest.budgets.maximumTimeMs = 500;
    const execution = await runGraphSampleRequest(implicitRequest);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.paths).toHaveLength(1);
    expect(execution.result.scene.paths[0]?.style.stroke).toBe('solid');
    expect(execution.result.scene.regions).toHaveLength(1);
    expect(execution.result.scene.regions[0]?.boundaryPathIds).toEqual([
      execution.result.scene.paths[0]?.pathId,
    ]);
    expect(execution.result.scene.regions[0]?.triangleIndices.length).toBeGreaterThan(3);
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
  });

  it('preserves strictness per chained boundary while clipping their intersection', async () => {
    const chainRequest = request();
    chainRequest.items = [{
      version: 1,
      kind: 'relation',
      itemId: 'strip-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: '-1<x\\le 1',
        sourceRevision: 1,
      },
      relation: {
        kind: 'chained-inequality',
        operands: [
          { mathJson: -1, freeSymbols: [] },
          { mathJson: 'x', freeSymbols: ['x'] },
          { mathJson: 1, freeSymbols: [] },
        ],
        operators: ['<', '<='],
      },
      visible: true,
      presentation: chainRequest.items[0]!.presentation,
    }];
    const execution = await runGraphSampleRequest(chainRequest);

    expect(execution.result.scene.paths.map((path) => path.style.stroke)).toEqual([
      'dashed',
      'solid',
    ]);
    expect(execution.result.scene.regions).toHaveLength(1);
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
  });

  it('samples every matching piecewise branch and emits semantic endpoints', async () => {
    const piecewiseRequest = request();
    piecewiseRequest.quality = 'settled';
    piecewiseRequest.items = [{
      version: 1,
      kind: 'piecewise',
      itemId: 'piecewise-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: 'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}',
        sourceRevision: 1,
      },
      piecewise: {
        version: 1,
        branches: [{
          branchId: 'negative',
          relation: {
            kind: 'explicit-y',
            origin: 'authored-relation',
            rhs: { mathJson: ['Power', 'x', 2], freeSymbols: ['x'] },
          },
          condition: {
            kind: 'comparison',
            left: { mathJson: 'x', freeSymbols: ['x'] },
            operator: '<',
            right: { mathJson: 0, freeSymbols: [] },
          },
        }, {
          branchId: 'nonnegative',
          relation: {
            kind: 'explicit-y',
            origin: 'authored-relation',
            rhs: { mathJson: ['Sqrt', 'x'], freeSymbols: ['x'] },
          },
          condition: {
            kind: 'comparison',
            left: { mathJson: 'x', freeSymbols: ['x'] },
            operator: '>=',
            right: { mathJson: 0, freeSymbols: [] },
          },
        }],
      },
      visible: true,
      presentation: piecewiseRequest.items[0]!.presentation,
    }];
    const execution = await runGraphSampleRequest(piecewiseRequest);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.paths.map((path) => path.pathId)).toEqual([
      'piecewise-1:branch:negative',
      'piecewise-1:branch:nonnegative',
    ]);
    expect(execution.result.scene.pointBatches.map((batch) => batch.marker).sort()).toEqual([
      'filled',
      'open',
    ]);
    expect(execution.result.stopReasons).not.toContainEqual(expect.objectContaining({
      detailCode: 'piecewise-overlap',
    }));
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
  });

  it('attributes bounded sampling stops to the affected Graph item', async () => {
    const bounded = request();
    bounded.budgets.maximumSamples = 20;
    bounded.budgets.maximumVertices = 8;
    const execution = await runGraphSampleRequest(bounded);

    expect(execution.result.status).toBe('budget-exhausted');
    expect(execution.result.stopReasons).toContainEqual(expect.objectContaining({
      code: 'sampling-budget-exceeded',
      path: 'curve-1',
    }));
  });

  it('detaches every owned scene buffer when a result is dropped', async () => {
    const execution = await runGraphSampleRequest(request());
    const coordinates = execution.result.scene.paths[0]!.coordinates;
    const releasedBytes = releaseGraphSampleResultBuffers(execution.result);

    expect(releasedBytes).toBeGreaterThan(0);
    expect(coordinates.byteLength).toBe(0);
    expect(execution.transferList.every((buffer) => buffer.byteLength === 0)).toBe(true);
  });
});
