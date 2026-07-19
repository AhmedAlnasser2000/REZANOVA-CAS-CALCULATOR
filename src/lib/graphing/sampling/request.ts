import {
  hashSampledSceneRuntime,
  validateGraphSampleRequest,
  type GraphSampleRequestV1,
  type GraphSampleResultV1,
  type GraphStopReason,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import {
  assembleSampledScene,
  collectGraphSceneTransferables,
  type GraphPointBatchSceneInput,
  type GraphRegionSceneInput,
  type GraphSampledPathSceneInput,
} from '../scene';
import { adaptGraphExpressionMathJson } from '../parser';
import { createGraphExpressionEvaluator } from '../evaluator';
import { compileExplicitGraphRelation } from './compile';
import { sampleExplicitGraphRelation } from './explicit';
import { sampleImplicitGraphRelation } from './implicit';

export type GraphSampleRequestControl = {
  now?: () => number;
  isCancelled?: () => boolean;
  maximumItemTimeMs?: number;
  yieldBetweenItems?: () => Promise<void>;
};

export type GraphSampleExecution = {
  result: GraphSampleResultV1;
  transferList: ArrayBuffer[];
};

const defaultNow = () => performance.now();

function runtimeError(message: string): never {
  throw new Error(`Graph sampling runtime failed: ${message}`);
}

function cancelledStop(detailCode: string): GraphStopReason {
  return { code: 'sampling-cancelled', detailCode };
}

function budgetStop(detailCode: string): GraphStopReason {
  return { code: 'sampling-budget-exceeded', detailCode };
}

function graphResult(
  request: GraphSampleRequestV1,
  input: {
    scene: GraphSampleResultV1['scene'];
    status: GraphSampleResultV1['status'];
    stopReasons: GraphStopReason[];
    sampleCount: number;
    vertexCount: number;
    elapsedMs: number;
  },
): GraphSampleResultV1 {
  return {
    version: 1,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: request.revisions,
    viewport: request.viewport,
    quality: request.quality,
    status: input.status,
    scene: input.scene,
    snapshotHash: hashSampledSceneRuntime(input.scene, request.viewport),
    stopReasons: input.stopReasons,
    evidence: {
      sampleCount: input.sampleCount,
      vertexCount: input.vertexCount,
      elapsedMs: input.elapsedMs,
    },
  };
}

function assembleEmptyScene(request: GraphSampleRequestV1) {
  const assembled = assembleSampledScene({
    revisions: request.revisions,
    viewport: request.viewport,
    paths: [],
  });
  if (!assembled.ok) runtimeError(assembled.failure.message);
  return assembled.bundle.scene;
}

export function buildCancelledGraphSampleExecution(
  request: GraphSampleRequestV1,
  detailCode = 'host-cancellation',
): GraphSampleExecution {
  const scene = assembleEmptyScene(request);
  return {
    result: graphResult(request, {
      scene,
      status: 'cancelled',
      stopReasons: [cancelledStop(detailCode)],
      sampleCount: 0,
      vertexCount: 0,
      elapsedMs: 0,
    }),
    transferList: [],
  };
}

export async function runGraphSampleRequest(
  input: GraphSampleRequestV1,
  planCache = new GraphExpressionPlanCache(100),
  control: GraphSampleRequestControl = {},
): Promise<GraphSampleExecution> {
  const validation = validateGraphSampleRequest(input);
  if (!validation.ok) runtimeError(validation.failure.message);
  const request = validation.validated.value;
  const now = control.now ?? defaultNow;
  const isCancelled = control.isCancelled ?? (() => false);
  const startedAt = now();
  const paths: GraphSampledPathSceneInput[] = [];
  const regions: GraphRegionSceneInput[] = [];
  const pointBatches: GraphPointBatchSceneInput[] = [];
  const stopReasons: GraphStopReason[] = [];
  let sampleCount = 0;
  let vertexCount = 0;
  let cancelled = false;
  let budgetExhausted = false;
  const visibleItemCount = Math.max(1, request.items.filter((item) => item.visible).length);
  const fairBudgets = {
    maximumRecursionDepth: request.budgets.maximumRecursionDepth,
    maximumSamples: Math.max(16, Math.floor(request.budgets.maximumSamples / visibleItemCount)),
    maximumTimeMs: Math.max(4, Math.floor(request.budgets.maximumTimeMs / visibleItemCount)),
    maximumVertices: Math.max(16, Math.floor(request.budgets.maximumVertices / visibleItemCount)),
  };

  for (const item of request.items) {
    if (!item.visible) continue;
    if (isCancelled()) {
      cancelled = true;
      stopReasons.push(cancelledStop('cooperative-request-cancellation'));
      break;
    }
    if (item.kind === 'point-set') {
      const coordinates: number[] = [];
      for (let pointIndex = 0; pointIndex < item.points.length; pointIndex += 1) {
        if (isCancelled()) {
          cancelled = true;
          stopReasons.push(cancelledStop('cooperative-point-cancellation'));
          break;
        }
        if (sampleCount + 2 > request.budgets.maximumSamples
          || vertexCount + 1 > request.budgets.maximumVertices
          || now() - startedAt >= request.budgets.maximumTimeMs) {
          budgetExhausted = true;
          stopReasons.push({ ...budgetStop('point-set-budget-exhausted'), path: item.itemId });
          break;
        }
        const point = item.points[pointIndex];
        const values: number[] = [];
        for (const [coordinate, mathJson] of [['x', point.x], ['y', point.y]] as const) {
          sampleCount += 1;
          const adapted = adaptGraphExpressionMathJson(
            mathJson,
            `$.items.${item.itemId}.points[${pointIndex}].${coordinate}`,
          );
          if (!adapted.ok) {
            stopReasons.push({ ...adapted.stopReason, path: item.itemId });
            values.length = 0;
            break;
          }
          const compiled = planCache.getOrCompile({
            planId: `${item.itemId}:point:${pointIndex}:${coordinate}`,
            sourceRevision: item.source.sourceRevision,
            expression: adapted.expression,
          });
          if (!compiled.ok) {
            stopReasons.push({ ...compiled.stopReason, path: item.itemId });
            values.length = 0;
            break;
          }
          const evaluated = createGraphExpressionEvaluator(compiled.plan)
            .evaluate(request.parameterEnvironment);
          if (evaluated.status !== 'finite') {
            stopReasons.push({
              code: evaluated.reason === 'missing-symbol' ? 'invalid-parameter' : 'unsafe-expression',
              detailCode: `point-${coordinate}-${evaluated.reason}`,
              path: item.itemId,
            });
            values.length = 0;
            break;
          }
          values.push(evaluated.value);
        }
        if (values.length === 2) {
          coordinates.push(values[0], values[1]);
          vertexCount += 1;
        }
      }
      if (coordinates.length > 0) {
        pointBatches.push({
          pointBatchId: `${item.itemId}:points:0`,
          itemId: item.itemId,
          coordinates: new Float64Array(coordinates),
          style: item.presentation,
        });
      }
      await control.yieldBetweenItems?.();
      if (cancelled || budgetExhausted) break;
      continue;
    }
    if (item.kind !== 'relation') {
      stopReasons.push({
        code: 'unsupported-relation',
        path: item.itemId,
        detailCode: `sample-item-${item.kind}`,
      });
      await control.yieldBetweenItems?.();
      continue;
    }
    if (item.relation.kind === 'implicit-equality'
      || item.relation.kind === 'inequality'
      || item.relation.kind === 'chained-inequality') {
      const sampled = sampleImplicitGraphRelation({
        itemId: item.itemId,
        sourceRevision: item.source.sourceRevision,
        relation: item.relation,
        viewport: request.viewport,
        cssSize: request.cssSize,
        parameterEnvironment: request.parameterEnvironment,
        quality: request.quality,
        budgets: {
          maximumRecursionDepth: fairBudgets.maximumRecursionDepth,
          maximumSamples: fairBudgets.maximumSamples,
          maximumTimeMs: Math.max(1, Math.floor(Math.min(
            fairBudgets.maximumTimeMs,
            control.maximumItemTimeMs ?? fairBudgets.maximumTimeMs,
          ))),
          maximumVertices: fairBudgets.maximumVertices,
        },
        cache: planCache,
        control: { now, isCancelled },
      });
      sampleCount += sampled.stats.evaluatedSamples;
      vertexCount += sampled.stats.emittedVertices;
      sampled.stopReasons.forEach((reason) => {
        stopReasons.push({ ...reason, path: item.itemId });
      });
      if (sampled.status === 'cancelled') cancelled = true;
      if (sampled.status === 'budget-exhausted') budgetExhausted = true;
      const boundaryPathIds: string[] = [];
      for (const boundary of sampled.boundaries) {
        const pathId = `${item.itemId}:${boundary.pathIdSuffix}`;
        boundaryPathIds.push(pathId);
        paths.push({
          pathId,
          sample: {
            itemId: item.itemId,
            status: sampled.status,
            coordinates: boundary.coordinates,
            segmentOffsets: boundary.segmentOffsets,
            ...(sampled.status === 'cancelled'
              ? { stopReason: cancelledStop('cooperative-implicit-cancellation') }
              : sampled.status === 'budget-exhausted'
                ? { stopReason: budgetStop('implicit-sampling-budget') }
                : {}),
            stats: {
              evaluatedSamples: 0,
              emittedVertices: boundary.coordinates.length / 2,
              maximumDepthReached: 0,
              elapsedMs: sampled.stats.elapsedMs,
            },
          },
          style: {
            ...item.presentation,
            stroke: boundary.strict ? 'dashed' : 'solid',
          },
        });
      }
      if (sampled.region) {
        regions.push({
          regionId: `${item.itemId}:region:0`,
          itemId: item.itemId,
          vertices: sampled.region.vertices,
          triangleIndices: sampled.region.triangleIndices,
          boundaryPathIds,
          style: item.presentation,
        });
      }
      await control.yieldBetweenItems?.();
      if (cancelled) break;
      continue;
    }
    const compiled = compileExplicitGraphRelation({
      itemId: item.itemId,
      sourceRevision: item.source.sourceRevision,
      relation: item.relation,
      cache: planCache,
    });
    if (!compiled.ok) {
      stopReasons.push({ ...compiled.stopReason, path: item.itemId });
      await control.yieldBetweenItems?.();
      continue;
    }
    const sampled = sampleExplicitGraphRelation({
      plan: compiled.plan,
      viewport: request.viewport,
      cssSize: request.cssSize,
      parameterEnvironment: request.parameterEnvironment,
      quality: request.quality,
      budgets: {
        maximumRecursionDepth: fairBudgets.maximumRecursionDepth,
        maximumSamples: fairBudgets.maximumSamples,
        maximumTimeMs: Math.max(1, Math.floor(Math.min(
          fairBudgets.maximumTimeMs,
          control.maximumItemTimeMs ?? fairBudgets.maximumTimeMs,
        ))),
        maximumVertices: fairBudgets.maximumVertices,
      },
      control: { now, isCancelled },
    });
    sampleCount += sampled.stats.evaluatedSamples;
    vertexCount += sampled.stats.emittedVertices;
    if (sampled.stopReason) {
      stopReasons.push({ ...sampled.stopReason, path: item.itemId });
    }
    if (sampled.status === 'cancelled') cancelled = true;
    if (sampled.status === 'budget-exhausted') budgetExhausted = true;
    if (sampled.coordinates.length >= 4 && sampled.segmentOffsets.length >= 1) {
      paths.push({
        pathId: `${item.itemId}:path:0`,
        sample: sampled,
        style: item.presentation,
      });
    }
    await control.yieldBetweenItems?.();
    if (cancelled) break;
  }

  const assembled = assembleSampledScene({
    revisions: request.revisions,
    viewport: request.viewport,
    paths,
    regions,
    pointBatches,
  });
  if (!assembled.ok) runtimeError(assembled.failure.message);
  const status = cancelled
    ? 'cancelled'
    : budgetExhausted
      ? 'budget-exhausted'
      : 'complete';
  const result = graphResult(request, {
    scene: assembled.bundle.scene,
    status,
    stopReasons,
    sampleCount,
    vertexCount,
    elapsedMs: Math.max(0, now() - startedAt),
  });
  return { result, transferList: assembled.bundle.transferList };
}

export function releaseGraphSampleResultBuffers(result: GraphSampleResultV1) {
  const transfers = collectGraphSceneTransferables(result.scene);
  if (!transfers.ok || transfers.transferList.length === 0) return 0;
  const releasedBytes = transfers.transferList.reduce(
    (count, buffer) => count + buffer.byteLength,
    0,
  );
  structuredClone(null, { transfer: transfers.transferList });
  return releasedBytes;
}
