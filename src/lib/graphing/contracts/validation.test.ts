import { describe, expect, it } from 'vitest';
import {
  GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1,
  validateGraphCondition,
  validateGraphDocument,
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

describe('Graph v1 contract validators', () => {
  it('accepts the bounded baseline document and independent contract planes', () => {
    expect(validateGraphDocument(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1).ok).toBe(true);
    expect(validateGraphSource({ sourceKind: 'mathlive-latex', sourceLatex: '\\sin(x)', sourceRevision: 2 }).ok).toBe(true);
    expect(validateGraphRelation({ kind: 'explicit-y', rhs: expression, origin: 'bare-expression' }).ok).toBe(true);
    expect(validateGraphCondition({ kind: 'comparison', left: expression, operator: '<=', right: { mathJson: 1, freeSymbols: [] } }).ok).toBe(true);
    expect(validateGraphParameter({ version: 1, parameterId: 'a', symbol: 'a', origin: 'slider-created', value: 1, minimum: -2, maximum: 2, step: 0.1 }).ok).toBe(true);
    expect(validateGraphStopReason({ code: 'sampling-budget-exceeded', detailCode: 'maximum-samples' }).ok).toBe(true);
    expect(validateGraphViewport({ coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -5, yMax: 5 }).ok).toBe(true);
    expect(validateGraphRevisionSet({ document: 1, viewport: 2, parameter: 3 }).ok).toBe(true);
    expect(validateGraphRendererCapabilities({ rendererId: 'svg', interactive: true, hitTesting: true, regionFill: true, polarGrid: true, contextRecovery: false, maximumVertices: 100_000 }).ok).toBe(true);
    expect(validateGraphRenderPolicy({ quality: 'settled', reducedMotion: false, maximumVertices: 100_000, maximumLabels: 250, pixelRatioCap: 2 }).ok).toBe(true);
  });

  it('keeps authored source separate from downstream mathematical authority', () => {
    const document = structuredClone(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1) as unknown as Record<string, unknown>;
    document.exactLatex = 'forbidden-authority';
    const validation = validateGraphDocument(document);

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.failure.reason).toBe('structure');
  });

  it('rejects cyclic, non-finite, oversized, duplicate, and invalid-bound documents', () => {
    const cyclic = structuredClone(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1) as GraphDocumentV1 & { self?: unknown };
    cyclic.self = cyclic;
    expect(validateGraphDocument(cyclic)).toMatchObject({ ok: false, failure: { reason: 'cyclic-value' } });

    const nonFinite = structuredClone(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1);
    const parameter = nonFinite.items.find((item) => item.kind === 'parameter');
    if (parameter?.kind === 'parameter') parameter.parameter.value = Number.NaN;
    expect(validateGraphDocument(nonFinite)).toMatchObject({ ok: false, failure: { reason: 'non-finite-number' } });

    const oversized = structuredClone(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1);
    oversized.items = Array.from({ length: 101 }, (_, index) => ({ ...oversized.items[0]!, itemId: `row-${index}` }));
    expect(validateGraphDocument(oversized).ok).toBe(false);

    const duplicate = structuredClone(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1);
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
    const items = GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1.items.filter((item) => item.kind === 'relation').slice(0, 3);
    const request = {
      version: 1,
      requestId: 'request-1',
      workspaceInstanceId: 'graph-tab-1',
      documentId: 'document-1',
      revisions: { scene: 4, document: 1, viewport: 2, parameter: 3 },
      items,
      parameterEnvironment: { a: 1.2 },
      viewport: { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -5, yMax: 5 },
      cssSize: { width: 1440, height: 940 },
      grid: { kind: 'cartesian', major: true, minor: true, axisNumbers: true, angleLabels: false, unitCircle: false },
      quality: 'preview',
      budgets: { maximumRecursionDepth: 16, maximumSamples: 80_000, maximumTimeMs: 150, maximumVertices: 160_000 },
    };
    expect(validateGraphSampleRequest(request).ok).toBe(true);
    expect(validateGraphSampleRequest({ ...request, renderer: { kind: 'svg' } }).ok).toBe(false);
  });

  it('keeps surface state clone-safe and independent from document truth', () => {
    const surface = {
      version: 1,
      viewport: { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -5, yMax: 5 },
      viewportRevision: 2,
      parameterRevision: 3,
      viewPolicy: { mode: 'real' },
      grid: { kind: 'cartesian', major: true, minor: true, axisNumbers: true, angleLabels: false, unitCircle: false },
      expressionRailCollapsed: false,
      analyzeOpen: false,
      selectedItemId: null,
      presentationMode: false,
    };
    expect(validateGraphSurfaceState(surface).ok).toBe(true);
    expect(validateGraphSurfaceState({ ...surface, workerHandle: {} }).ok).toBe(false);
  });
});

type GraphDocumentV1 = typeof GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1;
