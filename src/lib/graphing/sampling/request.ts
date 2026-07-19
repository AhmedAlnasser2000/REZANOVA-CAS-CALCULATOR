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
  type GraphSampledPathSceneInput,
} from '../scene';
import { compileExplicitGraphRelation } from './compile';
import { sampleExplicitGraphRelation } from './explicit';

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
  const stopReasons: GraphStopReason[] = [];
  let sampleCount = 0;
  let vertexCount = 0;
  let cancelled = false;
  let budgetExhausted = false;

  for (const item of request.items) {
    if (!item.visible) continue;
    if (isCancelled()) {
      cancelled = true;
      stopReasons.push(cancelledStop('cooperative-request-cancellation'));
      break;
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
    const remainingSamples = request.budgets.maximumSamples - sampleCount;
    const remainingVertices = request.budgets.maximumVertices - vertexCount;
    const remainingTimeMs = request.budgets.maximumTimeMs - (now() - startedAt);
    if (remainingSamples <= 0 || remainingVertices <= 0 || remainingTimeMs <= 0) {
      budgetExhausted = true;
      stopReasons.push(budgetStop('request-budget-exhausted'));
      break;
    }
    const sampled = sampleExplicitGraphRelation({
      plan: compiled.plan,
      viewport: request.viewport,
      cssSize: request.cssSize,
      parameterEnvironment: request.parameterEnvironment,
      quality: request.quality,
      budgets: {
        maximumRecursionDepth: request.budgets.maximumRecursionDepth,
        maximumSamples: remainingSamples,
        maximumTimeMs: Math.max(1, Math.floor(Math.min(
          remainingTimeMs,
          control.maximumItemTimeMs ?? remainingTimeMs,
        ))),
        maximumVertices: remainingVertices,
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
