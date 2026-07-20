import { describe, expect, it } from 'vitest';
import {
  validateGraphSampleResult,
  type GraphExpressionIR,
  type GraphSampleRequestV6,
} from '../contracts';
import {
  releaseGraphSampleResultBuffers,
  runGraphSampleRequest,
} from './request';
import { GraphSamplingRuntimeCache } from './runtime-cache';

function request(): GraphSampleRequestV6 {
  return {
    version: 6,
    requestId: 'graph-request-1',
    workspaceInstanceId: 'graph-tab-1',
    documentId: 'graph-document-1',
    revisions: { scene: 4, mathematics: 1, viewport: 2, parameter: 3 },
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
    overlays: { unitCircle: false },
    quality: 'preview',
    priority: { dependentItemIds: [] },
    movement: { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 },
  };
}

const surfaceCases = [
  ['plane', ['Add', 'x', 'y'], false],
  ['paraboloid', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]], false],
  ['bounded radical', ['Sqrt', ['Add', 4, ['Negate', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]]]]], true],
  ['discontinuous reciprocal', ['Divide', 1, ['Add', 'x', ['Negate', 'y']]], true],
] satisfies Array<[string, GraphExpressionIR['mathJson'], boolean]>;

describe('Graph sample request runtime', () => {
  it('samples continuous complex mappings, component values, cuts, and real-axis slices', async () => {
    const complexRequest = request();
    complexRequest.items = [{
      version: 1, kind: 'relation', itemId: 'complex-log', visible: true,
      source: { sourceKind: 'mathlive-latex', sourceLatex: 'f(z)=\\ln(z)', sourceRevision: 1 },
      relation: { kind: 'complex-mapping', inputSymbol: 'z', outputSymbol: 'f', authoredForm: 'function',
        expression: { mathJson: ['Ln', 'z'], freeSymbols: ['z'] } },
    }];
    const execution = await runGraphSampleRequest(complexRequest);
    const tile = execution.result.scene.complexTiles[0];
    expect(tile).toMatchObject({ itemId: 'complex-log', analyticity: 'holomorphic', truncated: false });
    expect(tile?.values.length).toBe((tile?.width ?? 0) * (tile?.height ?? 0) * 4);
    expect(tile?.branchCuts).toHaveLength(1);
    expect(tile?.branchPoints).toEqual(expect.arrayContaining([expect.objectContaining({ z: { re: 0, im: 0 } })]));
    expect(execution.result.scene.planarScene.paths.map((path) => path.pathId)).toEqual(expect.arrayContaining([
      'complex-log:real-axis-real', 'complex-log:real-axis-imaginary',
    ]));
  });

  it('samples a real-parameterized complex trajectory as an Argand path', async () => {
    const trajectory = request();
    trajectory.items = [{
      version: 1, kind: 'relation', itemId: 'unit-trajectory', visible: true,
      source: { sourceKind: 'mathlive-latex', sourceLatex: 'f(t)=e^{it}', sourceRevision: 1 },
      relation: { kind: 'complex-trajectory', parameterSymbol: 't',
        value: { mathJson: ['Exp', ['Multiply', 'ImaginaryUnit', 't']], freeSymbols: ['t'] } },
    }];
    const execution = await runGraphSampleRequest(trajectory);
    expect(execution.result.scene.planarScene.paths[0]).toMatchObject({ pathId: 'unit-trajectory:argand-trajectory' });
    expect(execution.result.scene.planarScene.paths[0]?.coordinates.length).toBeGreaterThan(100);
  });

  it.each([
    ['ln(-x)', ['Ln', ['Negate', 'x']]],
    ['sqrt(-x)', ['Sqrt', ['Negate', 'x']]],
  ] as const)('preserves the valid real domain of %s', async (_label, mathJson) => {
    const realRequest = request();
    const first = realRequest.items[0];
    if (!first || first.kind !== 'relation') throw new Error('Expected relation fixture.');
    first.relation = { kind: 'explicit-y', origin: 'bare-expression', rhs: { mathJson, freeSymbols: ['x'] } };
    const execution = await runGraphSampleRequest(realRequest);
    const xs = Array.from(execution.result.scene.planarScene.paths[0]?.coordinates ?? [])
      .filter((_, index) => index % 2 === 0);
    expect(xs.length).toBeGreaterThan(2);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1e-9);
    expect(Math.min(...xs)).toBeLessThan(-1);
  });
  it.each(surfaceCases)('samples a bounded adaptive %s surface with normals and contours', async (_label, mathJson, hasBreaks) => {
    const surface = request();
    surface.items = [{
      version: 1, kind: 'relation', itemId: 'surface-1', visible: true,
      source: { sourceKind: 'mathlive-latex', sourceLatex: 'surface', sourceRevision: 1 },
      relation: { kind: 'real-surface', z: { mathJson, freeSymbols: ['x', 'y'] } },
    }];
    surface.viewport = { coordinateSystem: 'cartesian', xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    surface.quality = 'settled';
    const execution = await runGraphSampleRequest(surface);
    const mesh = execution.result.scene.surfaceMeshes[0];
    expect(mesh?.positions.length).toBeGreaterThan(0);
    expect(mesh?.normals.length).toBe(mesh?.positions.length);
    expect(mesh?.triangleIndices.length).toBeGreaterThan(0);
    expect(mesh?.contourCoordinates.length).toBeGreaterThan(0);
    expect(execution.result.itemEvidence[0]).toMatchObject({ route: 'real-surface' });
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
    if (hasBreaks) expect(execution.result.stopReasons.some((reason) => reason.detailCode?.startsWith('surface-domain-breaks:'))).toBe(true);
  });

  it('assembles a bounded transferable scene directly from relation authority', async () => {
    const execution = await runGraphSampleRequest(request());

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.planarScene.paths).toHaveLength(1);
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
    expect(execution.result.scene.planarScene.paths).toEqual([]);
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
    }];
    pointRequest.parameterEnvironment = { a: 5 };
    const execution = await runGraphSampleRequest(pointRequest);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.planarScene.paths).toEqual([]);
    expect([...execution.result.scene.planarScene.pointBatches[0]!.coordinates]).toEqual([5, 2, 3, 4]);
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
    }];
    const execution = await runGraphSampleRequest(implicitRequest);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.planarScene.paths).toHaveLength(1);
    expect(execution.result.scene.planarScene.paths[0]?.strokeRole).toBeUndefined();
    expect(execution.result.scene.planarScene.regions).toHaveLength(1);
    expect(execution.result.scene.planarScene.regions[0]?.boundaryPathIds).toEqual([
      execution.result.scene.planarScene.paths[0]?.pathId,
    ]);
    expect(execution.result.scene.planarScene.regions[0]?.triangleIndices.length).toBeGreaterThan(3);
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
    }];
    const execution = await runGraphSampleRequest(chainRequest);

    expect(execution.result.scene.planarScene.paths.map((path) => path.strokeRole)).toEqual([
      'strict-boundary',
      undefined,
    ]);
    expect(execution.result.scene.planarScene.regions).toHaveLength(1);
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
    }];
    const execution = await runGraphSampleRequest(piecewiseRequest);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.planarScene.paths.map((path) => path.pathId)).toEqual([
      'piecewise-1:branch:negative',
      'piecewise-1:branch:nonnegative',
    ]);
    expect(execution.result.scene.planarScene.pointBatches.map((batch) => batch.marker).sort()).toEqual([
      'filled',
      'open',
    ]);
    expect(execution.result.scene.planarScene.pointBatches.flatMap((batch) => [...batch.coordinates]))
      .toEqual(expect.arrayContaining([0, 0]));
    expect(execution.result.itemEvidence[0]?.piecewiseCondition).toMatchObject({
      basis: 'exact-global',
      branchApplicability: [
        { branchId: 'negative', status: 'applicable-global' },
        { branchId: 'nonnegative', status: 'applicable-global' },
      ],
      overlapBranchPairs: [],
      uncoveredGaps: [],
    });
    expect(execution.result.stopReasons).not.toContainEqual(expect.objectContaining({
      detailCode: 'piecewise-overlap',
    }));
    expect(validateGraphSampleResult(execution.result).ok).toBe(true);
  });

  it('samples polar and parametric relations with relation parameters retained for tracing', async () => {
    const routed = request();
    routed.items = [{
      version: 1,
      kind: 'relation',
      itemId: 'polar-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: 'r=2\\cos(2\\theta)',
        sourceRevision: 1,
      },
      relation: {
        kind: 'polar-radius',
        angleSymbol: 'theta',
        radius: {
          mathJson: ['Multiply', 2, ['Cos', ['Multiply', 2, 'theta']]],
          freeSymbols: ['theta'],
        },
      },
      visible: true,
    }, {
      version: 1,
      kind: 'relation',
      itemId: 'parametric-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: '(\\cos(t),\\sin(t))',
        sourceRevision: 1,
      },
      relation: {
        kind: 'parametric-curve',
        parameterSymbol: 't',
        x: { mathJson: ['Cos', 't'], freeSymbols: ['t'] },
        y: { mathJson: ['Sin', 't'], freeSymbols: ['t'] },
      },
      visible: true,
    }];
    const execution = await runGraphSampleRequest(routed);

    expect(execution.result.status).toBe('complete');
    expect(execution.result.scene.planarScene.paths).toHaveLength(2);
    expect(execution.result.scene.planarScene.paths.every((path) => (
      path.parameterValues?.length === path.coordinates.length / 2
    ))).toBe(true);
    expect(execution.result.scene.planarScene.paths.find((path) => path.itemId === 'polar-1')
      ?.parameterValues?.[0]).toBeCloseTo(0);
  });

  it('keeps Unit Circle independent while excluding viewport grid data from worker output', async () => {
    const teaching = request();
    teaching.items = [];
    teaching.overlays = { unitCircle: true };
    const execution = await runGraphSampleRequest(teaching);

    expect('grid' in execution.result.scene).toBe(false);
    expect(execution.result.scene.planarScene.paths).toHaveLength(1);
    expect(execution.result.scene.planarScene.paths[0]).toMatchObject({
      itemId: 'graph-overlay.unit-circle',
      closed: true,
    });
  });

  it('attributes display-resolution stops to only the affected Graph item', async () => {
    const bounded = request();
    const relation = bounded.items[0]!;
    if (relation.kind !== 'relation') throw new Error('Expected relation fixture.');
    relation.relation = {
      kind: 'explicit-y',
      origin: 'bare-expression',
      rhs: { mathJson: ['Sin', ['Multiply', 1_000_000, 'x']], freeSymbols: ['x'] },
    };
    const execution = await runGraphSampleRequest(bounded);

    expect(execution.result.status).toBe('partial');
    expect(execution.result.itemEvidence).toContainEqual(expect.objectContaining({
      itemId: 'curve-1',
      achievedQuality: 'reduced-detail',
    }));
  });

  it('keeps ordinary high-degree preview geometry complete without quota warnings', async () => {
    const ordinary = request();
    const relation = ordinary.items[0]!;
    if (relation.kind !== 'relation') throw new Error('Expected relation fixture.');
    relation.relation = {
      kind: 'explicit-y',
      origin: 'bare-expression',
      rhs: { mathJson: ['Power', 'x', 6], freeSymbols: ['x'] },
    };
    const execution = await runGraphSampleRequest(ordinary);

    expect(execution.result.scene.planarScene.paths.length).toBeGreaterThan(0);
    expect(execution.result.status).toBe('complete');
    expect(execution.result.stopReasons).not.toContainEqual(expect.objectContaining({
      code: 'sampling-budget-exceeded',
    }));
  });

  it('finishes the all-item coarse stage before prioritizing active settled refinement', async () => {
    const staged = request();
    const baseItem = staged.items[0]!;
    if (baseItem.kind !== 'relation') throw new Error('Expected relation fixture.');
    staged.items = [baseItem, {
      ...structuredClone(baseItem),
      itemId: 'curve-2',
      source: { ...baseItem.source, sourceLatex: 'x^2', sourceRevision: 2 },
      relation: {
        kind: 'explicit-y',
        origin: 'bare-expression',
        rhs: { mathJson: ['Power', 'x', 2], freeSymbols: ['x'] },
      },
    }];
    staged.priority = { activeItemId: 'curve-2', dependentItemIds: [] };

    const coarse = await runGraphSampleRequest(staged);
    expect(coarse.result.itemEvidence).toHaveLength(2);
    expect(coarse.result.itemEvidence.every((item) => item.achievedQuality === 'coarse')).toBe(true);

    staged.requestId = 'graph-request-settled';
    staged.quality = 'settled';
    const settled = await runGraphSampleRequest(staged);
    expect(settled.result.itemEvidence.map((item) => item.itemId)).toEqual(['curve-2', 'curve-1']);
    expect(settled.result.itemEvidence.every((item) => item.achievedQuality === 'settled')).toBe(true);
  });

  it('detaches every owned scene buffer when a result is dropped', async () => {
    const execution = await runGraphSampleRequest(request());
    const coordinates = execution.result.scene.planarScene.paths[0]!.coordinates;
    const releasedBytes = releaseGraphSampleResultBuffers(execution.result);

    expect(releasedBytes).toBeGreaterThan(0);
    expect(coordinates.byteLength).toBe(0);
    expect(execution.transferList.every((buffer) => buffer.byteLength === 0)).toBe(true);
  });

  it('reuses active-tab geometry for a small pan and invalidates it for parameter changes', async () => {
    const cache = new GraphSamplingRuntimeCache();
    const first = request();
    const firstExecution = await runGraphSampleRequest(first, undefined, {}, cache);
    expect(firstExecution.result.evidence.cacheBytes).toBeGreaterThan(0);

    const panned = request();
    panned.requestId = 'graph-request-pan';
    panned.revisions = { ...panned.revisions, scene: 5, viewport: 3 };
    panned.viewport = { ...panned.viewport, xMin: -9, xMax: 11 };
    const pannedExecution = await runGraphSampleRequest(panned, undefined, {}, cache);
    expect(pannedExecution.result.itemEvidence[0]?.cache).toBe('reused');
    expect(pannedExecution.result.evidence.sampleCount).toBe(0);

    const moderateZoom = request();
    moderateZoom.requestId = 'graph-request-moderate-zoom';
    moderateZoom.revisions = { ...moderateZoom.revisions, scene: 6, viewport: 4 };
    moderateZoom.viewport = { ...moderateZoom.viewport, xMin: -7, xMax: 7 };
    const moderateZoomExecution = await runGraphSampleRequest(moderateZoom, undefined, {}, cache);
    expect(moderateZoomExecution.result.itemEvidence[0]?.cache).toBe('reused');

    const largeZoom = request();
    largeZoom.requestId = 'graph-request-large-zoom';
    largeZoom.revisions = { ...largeZoom.revisions, scene: 7, viewport: 5 };
    largeZoom.viewport = { ...largeZoom.viewport, xMin: -2, xMax: 2 };
    const largeZoomExecution = await runGraphSampleRequest(largeZoom, undefined, {}, cache);
    expect(largeZoomExecution.result.itemEvidence[0]?.cache).toBe('miss');

    const changedParameter = request();
    changedParameter.requestId = 'graph-request-parameter';
    changedParameter.parameterEnvironment = { a: 2 };
    const changedExecution = await runGraphSampleRequest(changedParameter, undefined, {}, cache);
    expect(changedExecution.result.itemEvidence[0]?.cache).toBe('miss');

    cache.clearWorkspace(first.workspaceInstanceId);
    expect(cache.bytes).toBe(0);
  });

  it('rejects cache entries larger than the configured active-tab ceiling', async () => {
    const cache = new GraphSamplingRuntimeCache(64);
    const execution = await runGraphSampleRequest(request(), undefined, {}, cache);
    expect(execution.result.evidence.cacheBytes).toBeLessThanOrEqual(64);
    expect(cache.bytes).toBe(0);
  });
});
