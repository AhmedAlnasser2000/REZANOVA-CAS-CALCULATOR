import type {
  GraphPiecewiseConditionEvidenceV1,
  GraphPiecewiseSpecV1,
  GraphSamplingLimitsV2,
  GraphSamplingQualityV3,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import type { GraphPointBatchSceneInput, GraphSampledPathSceneInput } from '../scene';
import type { GraphAdaptiveQualityPolicyV1 } from './adaptive-policy';
import { compileExplicitGraphRelation } from './compile';
import { sampleExplicitGraphRelation } from './explicit';
import {
  buildGraphPiecewiseConditionPartition,
  type GraphConditionInterval,
} from './piecewise-condition-evidence';
import type { GraphSamplerControl } from './types';

type PiecewiseSample = {
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  paths: GraphSampledPathSceneInput[];
  endpointBatches: GraphPointBatchSceneInput[];
  stopReasons: GraphStopReason[];
  conditionEvidence: GraphPiecewiseConditionEvidenceV1;
  stats: { evaluatedSamples: number; emittedVertices: number; elapsedMs: number };
};

type ExplicitSample = ReturnType<typeof sampleExplicitGraphRelation>;

function interpolatedPoint(sample: ExplicitSample, leftIndex: number, rightIndex: number, independent: number) {
  const leftIndependent = sample.independentValues[leftIndex];
  const rightIndependent = sample.independentValues[rightIndex];
  const denominator = rightIndependent - leftIndependent;
  const ratio = denominator === 0 ? 0 : (independent - leftIndependent) / denominator;
  return {
    x: sample.coordinates[leftIndex * 2]
      + (sample.coordinates[rightIndex * 2] - sample.coordinates[leftIndex * 2]) * ratio,
    y: sample.coordinates[leftIndex * 2 + 1]
      + (sample.coordinates[rightIndex * 2 + 1] - sample.coordinates[leftIndex * 2 + 1]) * ratio,
  };
}

function pointAtIndependent(sample: ExplicitSample, independent: number) {
  const vertexCount = sample.coordinates.length / 2;
  for (let segmentIndex = 0; segmentIndex < sample.segmentOffsets.length; segmentIndex += 1) {
    const start = sample.segmentOffsets[segmentIndex];
    const end = sample.segmentOffsets[segmentIndex + 1] ?? vertexCount;
    for (let index = start; index + 1 < end; index += 1) {
      const left = sample.independentValues[index];
      const right = sample.independentValues[index + 1];
      if (independent >= Math.min(left, right) && independent <= Math.max(left, right)) {
        return interpolatedPoint(sample, index, index + 1, independent);
      }
    }
  }
  return null;
}

function clipSampleToIntervals(
  sample: ExplicitSample,
  intervals: GraphConditionInterval[],
  viewportMinimum: number,
  viewportMaximum: number,
) {
  const coordinates: number[] = [];
  const independentValues: number[] = [];
  const segmentOffsets: number[] = [];
  const vertexCount = sample.coordinates.length / 2;
  const append = (x: number, y: number, independent: number) => {
    const last = coordinates.length / 2 - 1;
    if (last >= 0 && coordinates[last * 2] === x && coordinates[last * 2 + 1] === y) return;
    coordinates.push(x, y);
    independentValues.push(independent);
  };
  for (let segmentIndex = 0; segmentIndex < sample.segmentOffsets.length; segmentIndex += 1) {
    const start = sample.segmentOffsets[segmentIndex];
    const end = sample.segmentOffsets[segmentIndex + 1] ?? vertexCount;
    for (const interval of intervals) {
      const runStart = coordinates.length / 2;
      for (let index = start; index + 1 < end; index += 1) {
        const leftIndependent = sample.independentValues[index];
        const rightIndependent = sample.independentValues[index + 1];
        const edgeMinimum = Math.min(leftIndependent, rightIndependent);
        const edgeMaximum = Math.max(leftIndependent, rightIndependent);
        const overlapMinimum = Math.max(edgeMinimum, interval.minimum);
        const overlapMaximum = Math.min(edgeMaximum, interval.maximum);
        if (overlapMinimum > overlapMaximum) continue;
        if (overlapMinimum === overlapMaximum
          && !(interval.minimumInclusive || interval.maximumInclusive)) continue;
        const forward = rightIndependent >= leftIndependent;
        const firstIndependent = forward ? overlapMinimum : overlapMaximum;
        const secondIndependent = forward ? overlapMaximum : overlapMinimum;
        const first = interpolatedPoint(sample, index, index + 1, firstIndependent);
        const second = interpolatedPoint(sample, index, index + 1, secondIndependent);
        append(first.x, first.y, firstIndependent);
        append(second.x, second.y, secondIndependent);
      }
      const runLength = coordinates.length / 2 - runStart;
      if (runLength >= 2) segmentOffsets.push(runStart);
      else if (runLength > 0) {
        coordinates.splice(runStart * 2);
        independentValues.splice(runStart);
      }
    }
  }
  const open: number[] = [];
  const filled: number[] = [];
  const seen = new Set<string>();
  for (const interval of intervals) {
    for (const [value, included] of [
      [interval.minimum, interval.minimumInclusive],
      [interval.maximum, interval.maximumInclusive],
    ] as const) {
      if (!Number.isFinite(value) || value === viewportMinimum || value === viewportMaximum) continue;
      const point = pointAtIndependent(sample, value);
      if (!point) continue;
      const key = `${included ? 'filled' : 'open'}:${value.toPrecision(14)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (included ? filled : open).push(point.x, point.y);
    }
  }
  return {
    coordinates: new Float64Array(coordinates),
    independentValues: new Float64Array(independentValues),
    segmentOffsets: new Uint32Array(segmentOffsets),
    open: new Float64Array(open),
    filled: new Float64Array(filled),
  };
}

export function sampleGraphPiecewise(input: {
  itemId: string;
  sourceRevision: number;
  piecewise: GraphPiecewiseSpecV1;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  parameterEnvironment: Record<string, number>;
  quality: GraphSamplingQualityV3;
  limits: GraphSamplingLimitsV2;
  policy?: GraphAdaptiveQualityPolicyV1;
  cache: GraphExpressionPlanCache;
  control: GraphSamplerControl;
}): PiecewiseSample {
  const startedAt = input.control.now?.() ?? performance.now();
  const stopReasons: GraphStopReason[] = [];
  const paths: GraphSampledPathSceneInput[] = [];
  const endpointBatches: GraphPointBatchSceneInput[] = [];
  let status: PiecewiseSample['status'] = 'complete';
  let evaluatedSamples = 0;
  let emittedVertices = 0;
  const firstRoute = input.piecewise.branches[0]?.relation.kind;
  const independentSymbol = firstRoute === 'explicit-x' ? 'y' : 'x';
  const minimum = independentSymbol === 'x' ? input.viewport.xMin : input.viewport.yMin;
  const maximum = independentSymbol === 'x' ? input.viewport.xMax : input.viewport.yMax;
  const pixelSpan = independentSymbol === 'x' ? input.cssSize.width : input.cssSize.height;
  const tolerancePixels = input.quality === 'preview' ? 1.5 : input.quality === 'settled' ? 0.35 : 0.2;
  const partition = buildGraphPiecewiseConditionPartition({
    itemId: input.itemId,
    sourceRevision: input.sourceRevision,
    piecewise: input.piecewise,
    independentSymbol,
    minimum,
    maximum,
    pixelSpan,
    tolerancePixels,
    parameterEnvironment: input.parameterEnvironment,
    cache: input.cache,
  });
  for (const pair of partition.evidence.overlapBranchPairs) {
    stopReasons.push({
      code: 'invalid-condition',
      detailCode: `piecewise-overlap:${pair.scope}:${pair.branchIds.join(',')}`,
    });
  }
  for (const branch of partition.evidence.branchApplicability) {
    if (branch.status === 'impossible-global' || branch.status === 'impossible-current-viewport') {
      stopReasons.push({
        code: 'invalid-condition',
        detailCode: `piecewise-impossible:${branch.status}:${branch.branchId}`,
      });
    } else if (branch.status === 'unresolved') {
      stopReasons.push({ code: 'invalid-condition', detailCode: `piecewise-unresolved:${branch.branchId}` });
    }
  }
  if (partition.evidence.unresolvedBoundaryCount > 0) {
    stopReasons.push({ code: 'invalid-condition', detailCode: 'piecewise-boundary-unresolved' });
  }
  const branches = [
    ...input.piecewise.branches.map((branch) => ({ ...branch, otherwise: false })),
    ...(input.piecewise.otherwise ? [{
      branchId: 'otherwise',
      relation: input.piecewise.otherwise,
      otherwise: true,
    }] : []),
  ];
  for (const branch of branches) {
    if (branch.relation.kind !== 'explicit-y' && branch.relation.kind !== 'explicit-x') {
      stopReasons.push({ code: 'unsupported-relation', detailCode: `piecewise-${branch.relation.kind}` });
      continue;
    }
    const compiled = compileExplicitGraphRelation({
      itemId: `${input.itemId}:${branch.branchId}`,
      sourceRevision: input.sourceRevision,
      relation: branch.relation,
      cache: input.cache,
    });
    if (!compiled.ok) { stopReasons.push(compiled.stopReason); continue; }
    const sampled = sampleExplicitGraphRelation({
      plan: compiled.plan,
      viewport: input.viewport,
      cssSize: input.cssSize,
      parameterEnvironment: input.parameterEnvironment,
      quality: input.quality,
      limits: input.limits,
      policy: input.policy,
      control: input.control,
    });
    evaluatedSamples += sampled.stats.evaluatedSamples;
    if (sampled.status === 'cancelled') status = 'cancelled';
    else if (sampled.status === 'budget-exhausted' && status === 'complete') status = 'budget-exhausted';
    if (sampled.stopReason) stopReasons.push(sampled.stopReason);
    const intervals = branch.otherwise
      ? partition.otherwiseIntervals
      : partition.branchIntervals.get(branch.branchId) ?? [];
    const clipped = clipSampleToIntervals(sampled, intervals, minimum, maximum);
    emittedVertices += clipped.coordinates.length / 2;
    if (clipped.coordinates.length >= 4 && clipped.segmentOffsets.length > 0) {
      paths.push({
        pathId: `${input.itemId}:branch:${branch.branchId}`,
        sample: {
          ...sampled,
          itemId: input.itemId,
          coordinates: clipped.coordinates,
          independentValues: clipped.independentValues,
          segmentOffsets: clipped.segmentOffsets,
          stats: { ...sampled.stats, emittedVertices: clipped.coordinates.length / 2 },
        },
      });
    }
    for (const [marker, coordinates] of [
      ['open', clipped.open],
      ['filled', clipped.filled],
    ] as const) {
      if (coordinates.length === 0) continue;
      endpointBatches.push({
        pointBatchId: `${input.itemId}:endpoint:${branch.branchId}:${marker}`,
        itemId: input.itemId,
        coordinates,
        marker,
      });
    }
  }
  return {
    status,
    paths,
    endpointBatches,
    stopReasons,
    conditionEvidence: partition.evidence,
    stats: {
      evaluatedSamples,
      emittedVertices,
      elapsedMs: Math.max(0, (input.control.now?.() ?? performance.now()) - startedAt),
    },
  };
}
