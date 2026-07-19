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
