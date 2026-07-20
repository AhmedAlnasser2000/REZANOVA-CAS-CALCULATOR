import { describe, expect, it } from 'vitest';
import {
  GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2,
  validateGraphCondition,
  validateGraphDocument,
  validateGraphDocumentV2,
  validateGraphParameter,
  validateGraphRelation,
  validateGraphRenderPolicy,
  validateGraphRendererCapabilities,
  validateGraphRevisionSet,
  validateGraphSampleRequest,
  validateGraphSource,
  validateGraphStopReason,
  validateGraphSurfaceState,
  validateGraphViewport,
} from './index';

const expression = { mathJson: ['Sin', 'x'], freeSymbols: ['x'] };
const currentDocument = { ...GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2, version: 4 as const, assumptions: [] };

describe('Graph v1 contract validators', () => {
  it('accepts the bounded baseline document and independent contract planes', () => {
    expect(validateGraphDocument(currentDocument).ok).toBe(true);
    expect(validateGraphDocumentV2(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2).ok).toBe(true);
    expect(validateGraphSource({ sourceKind: 'mathlive-latex', sourceLatex: '\\sin(x)', sourceRevision: 2 }).ok).toBe(true);
    expect(validateGraphRelation({ kind: 'explicit-y', rhs: expression, origin: 'bare-expression' }).ok).toBe(true);
    expect(validateGraphCondition({ kind: 'comparison', left: expression, operator: '<=', right: { mathJson: 1, freeSymbols: [] } }).ok).toBe(true);
    expect(validateGraphParameter({ version: 1, parameterId: 'a', symbol: 'a', origin: 'slider-created', value: 1, minimum: -2, maximum: 2, step: 0.1 }).ok).toBe(true);
    expect(validateGraphStopReason({ code: 'sampling-budget-exceeded', detailCode: 'maximum-samples' }).ok).toBe(true);
    expect(validateGraphViewport({ coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -5, yMax: 5 }).ok).toBe(true);
    expect(validateGraphRevisionSet({ mathematics: 1, viewport: 2, parameter: 3 }).ok).toBe(true);
    expect(validateGraphRendererCapabilities({ rendererId: 'svg', interactive: true, hitTesting: true, regionFill: true, polarGrid: true, contextRecovery: false, maximumVertices: 100_000 }).ok).toBe(true);
    expect(validateGraphRenderPolicy({ quality: 'settled', reducedMotion: false, maximumVertices: 100_000, maximumLabels: 250, pixelRatioCap: 2 }).ok).toBe(true);
  });

  it('keeps authored source separate from downstream mathematical authority', () => {
    const document = structuredClone(currentDocument) as unknown as Record<string, unknown>;
    document.exactLatex = 'forbidden-authority';
    const validation = validateGraphDocument(document);

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.failure.reason).toBe('structure');
  });

  it('rejects cyclic, non-finite, oversized, duplicate, and invalid-bound documents', () => {
    const cyclic = structuredClone(currentDocument) as unknown as GraphDocumentV1 & { self?: unknown };
    cyclic.self = cyclic;
    expect(validateGraphDocument(cyclic)).toMatchObject({ ok: false, failure: { reason: 'cyclic-value' } });

    const nonFinite = structuredClone(currentDocument);
    const parameter = nonFinite.items.find((item) => item.kind === 'parameter');
    if (parameter?.kind === 'parameter') parameter.parameter.value = Number.NaN;
    expect(validateGraphDocument(nonFinite)).toMatchObject({ ok: false, failure: { reason: 'non-finite-number' } });

    const oversized = structuredClone(currentDocument);
    oversized.items = Array.from({ length: 101 }, (_, index) => ({ ...oversized.items[0]!, itemId: `row-${index}` }));
    expect(validateGraphDocument(oversized).ok).toBe(false);

    const duplicate = structuredClone(currentDocument);
    duplicate.items[1]!.itemId = duplicate.items[0]!.itemId;
    expect(validateGraphDocument(duplicate).ok).toBe(false);

    expect(validateGraphViewport({ coordinateSystem: 'cartesian', xMin: 1, xMax: 1, yMin: -1, yMax: 1 }).ok).toBe(false);
  });

  it('enforces chain cardinality and bounded condition depth', () => {
    expect(validateGraphCondition({ kind: 'chain', operands: [expression, expression], operators: [] }).ok).toBe(false);
    let nested: unknown = { kind: 'constant', value: true };
    for (let depth = 0; depth < 17; depth += 1) nested = { kind: 'and', clauses: [nested] };
    expect(validateGraphCondition(nested)).toMatchObject({ ok: false, failure: { reason: 'condition-depth' } });
  });

  it('validates clone-safe bounded sampling requests without renderer state', () => {
    const items = GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2.items
      .filter((item) => item.kind === 'relation').slice(0, 3)
      .map(({ presentation, ...item }) => {
        void presentation;
        return item;
      });
    const request = {
      version: 6,
      requestId: 'request-1',
      workspaceInstanceId: 'graph-tab-1',
      documentId: 'document-1',
      revisions: { scene: 4, mathematics: 1, viewport: 2, parameter: 3 },
      items,
      parameterEnvironment: { a: 1.2 },
      viewport: { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -5, yMax: 5 },
      cssSize: { width: 1440, height: 940 },
      overlays: { unitCircle: false },
      quality: 'preview',
      priority: { dependentItemIds: [] },
      movement: { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 },
    };
    expect(validateGraphSampleRequest(request).ok).toBe(true);
    expect(validateGraphSampleRequest({ ...request, renderer: { kind: 'svg' } }).ok).toBe(false);
  });

  it('keeps surface state clone-safe and independent from document truth', () => {
    const surface = {
      version: 6,
      viewport: { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -5, yMax: 5 },
      viewportRevision: 2,
      parameterRevision: 3,
      viewPolicy: { mode: 'real' },
      grid: { kind: 'cartesian', major: true, minor: true, axisNumbers: true, angleLabels: false, unitCircle: false },
      expressionRailCollapsed: false,
      analyzeOpen: false,
      selectedItemId: null,
      presentationMode: false,
      appearance: { theme: 'technical', colorVisionMode: 'standard' },
      panes: {
        real: {
          version: 1, dimension: '2d', verticalExaggeration: 1, wireframe: false,
          flythroughEnabled: false,
          camera3d: {
            version: 1, projection: 'perspective', orientation: 'isometric',
            position: { x: 8, y: -10, z: 8 }, target: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 0, z: 1 }, perspectiveFovDegrees: 45, orthographicScale: 12,
          },
        },
        complex: {
          version: 1, dimension: '2d', verticalExaggeration: 1, wireframe: false,
          flythroughEnabled: false,
          camera3d: {
            version: 1, projection: 'perspective', orientation: 'isometric',
            position: { x: 8, y: -10, z: 8 }, target: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 0, z: 1 }, perspectiveFovDegrees: 45, orthographicScale: 12,
          },
        },
      },
      analyze: { width: 380, activeTab: 'features', pinnedAnnotations: [] },
      complex: { displayMode: 'domain-coloring', searchRegion: null },
    };
    expect(validateGraphSurfaceState(surface).ok).toBe(true);
    expect(validateGraphSurfaceState({ ...surface, workerHandle: {} }).ok).toBe(false);
  });
});

type GraphDocumentV1 = typeof GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2;
