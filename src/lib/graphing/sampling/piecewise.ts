import type {
  GraphItemPresentationV1,
  GraphPiecewiseSpecV1,
  GraphSamplingBudgetsV1,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import type { GraphPointBatchSceneInput, GraphSampledPathSceneInput } from '../scene';
import { compileExplicitGraphRelation } from './compile';
import { compileGraphCondition, type CompiledGraphCondition } from './condition';
import { sampleExplicitGraphRelation } from './explicit';
import type { GraphSamplerControl } from './types';

type PiecewiseSample = {
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  paths: GraphSampledPathSceneInput[];
  endpointBatches: GraphPointBatchSceneInput[];
  stopReasons: GraphStopReason[];
  stats: { evaluatedSamples: number; emittedVertices: number; elapsedMs: number };
};

function conditionIsStrict(condition: GraphPiecewiseSpecV1['branches'][number]['condition']): boolean {
  if (condition.kind === 'comparison') return condition.operator === '<' || condition.operator === '>';
  if (condition.kind === 'chain') return condition.operators.some((operator) => operator === '<' || operator === '>');
  if (condition.kind === 'interval-membership') {
    return !condition.minimumInclusive || !condition.maximumInclusive;
  }
  return condition.kind === 'and' && condition.clauses.some(conditionIsStrict);
}

function filteredSample(input: {
  sampled: ReturnType<typeof sampleExplicitGraphRelation>;
  condition: (x: number, y: number) => boolean;
  independentMinimum: number;
  independentMaximum: number;
  viewport: GraphViewportV1;
}) {
  const coordinates: number[] = [];
  const independentValues: number[] = [];
  const segmentOffsets: number[] = [];
  const endpoints: number[] = [];
  const source = input.sampled;
  const vertexCount = source.coordinates.length / 2;
  for (let segmentIndex = 0; segmentIndex < source.segmentOffsets.length; segmentIndex += 1) {
    const start = source.segmentOffsets[segmentIndex];
    const end = source.segmentOffsets[segmentIndex + 1] ?? vertexCount;
    let runStart = -1;
    let previousIncluded = false;
    for (let index = start; index < end; index += 1) {
      const x = source.coordinates[index * 2];
      const y = source.coordinates[index * 2 + 1];
      const included = input.condition(x, y);
      if (included) {
        if (!previousIncluded) {
          runStart = coordinates.length / 2;
          if (index > start) {
            const previousX = source.coordinates[(index - 1) * 2];
            const previousY = source.coordinates[(index - 1) * 2 + 1];
            endpoints.push((previousX + x) / 2, (previousY + y) / 2);
          } else {
            const independent = source.independentValues[index];
            const epsilon = (input.independentMaximum - input.independentMinimum) * 1e-7;
            if (independent > input.independentMinimum + epsilon
              && independent < input.independentMaximum - epsilon
              && x >= input.viewport.xMin && x <= input.viewport.xMax
              && y >= input.viewport.yMin && y <= input.viewport.yMax) {
              endpoints.push(x, y);
            }
          }
        }
        coordinates.push(x, y);
        independentValues.push(source.independentValues?.[index] ?? x);
      } else if (previousIncluded) {
        const previousX = source.coordinates[(index - 1) * 2];
        const previousY = source.coordinates[(index - 1) * 2 + 1];
        endpoints.push((previousX + x) / 2, (previousY + y) / 2);
        if (coordinates.length / 2 - runStart >= 2) segmentOffsets.push(runStart);
        else {
          coordinates.splice(runStart * 2);
          independentValues.splice(runStart);
        }
        runStart = -1;
      }
      previousIncluded = included;
    }
    if (previousIncluded && runStart >= 0) {
      if (coordinates.length / 2 - runStart >= 2) segmentOffsets.push(runStart);
      else {
        coordinates.splice(runStart * 2);
        independentValues.splice(runStart);
      }
    }
  }
  const uniqueEndpoints: number[] = [];
  const endpointKeys = new Set<string>();
  const scale = Math.max(1e-9, input.independentMaximum - input.independentMinimum);
  for (let index = 0; index < endpoints.length; index += 2) {
    const key = `${Math.round(endpoints[index] / scale * 1e6)}:${Math.round(endpoints[index + 1] / scale * 1e6)}`;
    if (endpointKeys.has(key)) continue;
    endpointKeys.add(key);
    uniqueEndpoints.push(endpoints[index], endpoints[index + 1]);
  }
  return {
    coordinates: new Float64Array(coordinates),
    independentValues: new Float64Array(independentValues),
    segmentOffsets: new Uint32Array(segmentOffsets),
    endpoints: new Float64Array(uniqueEndpoints),
  };
}

export function sampleGraphPiecewise(input: {
  itemId: string;
  sourceRevision: number;
  piecewise: GraphPiecewiseSpecV1;
  presentation: GraphItemPresentationV1;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  parameterEnvironment: Record<string, number>;
  quality: 'preview' | 'settled';
  budgets: GraphSamplingBudgetsV1;
  cache: GraphExpressionPlanCache;
  control: GraphSamplerControl;
}): PiecewiseSample {
  const startedAt = input.control.now?.() ?? performance.now();
  const stopReasons: GraphStopReason[] = [];
  const paths: GraphSampledPathSceneInput[] = [];
  const endpointBatches: GraphPointBatchSceneInput[] = [];
  const compiledConditions: Array<{ branchId: string; condition: CompiledGraphCondition; strict: boolean }> = [];
  for (const branch of input.piecewise.branches) {
    const compiled = compileGraphCondition({
      condition: branch.condition,
      itemId: input.itemId,
      branchId: branch.branchId,
      sourceRevision: input.sourceRevision,
      cache: input.cache,
    });
    if (!compiled.ok) {
      stopReasons.push(compiled.stopReason);
      continue;
    }
    compiledConditions.push({
      branchId: branch.branchId,
      condition: compiled.condition,
      strict: conditionIsStrict(branch.condition),
    });
  }
  const pieces = input.piecewise.branches.length + (input.piecewise.otherwise ? 1 : 0);
  const perBranchBudgets: GraphSamplingBudgetsV1 = {
    ...input.budgets,
    maximumSamples: Math.max(16, Math.floor(input.budgets.maximumSamples / Math.max(1, pieces))),
    maximumTimeMs: Math.max(2, Math.floor(input.budgets.maximumTimeMs / Math.max(1, pieces))),
    maximumVertices: Math.max(16, Math.floor(input.budgets.maximumVertices / Math.max(1, pieces))),
  };
  let status: PiecewiseSample['status'] = 'complete';
  let evaluatedSamples = 0;
  let emittedVertices = 0;
  const branches = [
    ...input.piecewise.branches.map((branch) => ({ ...branch, otherwise: false })),
    ...(input.piecewise.otherwise ? [{
      branchId: 'otherwise',
      relation: input.piecewise.otherwise,
      condition: { kind: 'constant', value: true } as const,
      otherwise: true,
    }] : []),
  ];
  const possible = new Map(compiledConditions.map((condition) => [condition.branchId, false]));
  let overlap = false;
  const independentKind = branches[0]?.relation.kind === 'explicit-x' ? 'y' : 'x';
  const minimum = independentKind === 'x' ? input.viewport.xMin : input.viewport.yMin;
  const maximum = independentKind === 'x' ? input.viewport.xMax : input.viewport.yMax;
  for (let index = 0; index <= 128; index += 1) {
    const independent = minimum + (maximum - minimum) * index / 128;
    const environment = { ...input.parameterEnvironment, [independentKind]: independent };
    let active = 0;
    for (const entry of compiledConditions) {
      if (entry.condition.test(environment) === true) {
        possible.set(entry.branchId, true);
        active += 1;
      }
    }
    if (active > 1) overlap = true;
  }
  if (overlap) stopReasons.push({ code: 'invalid-condition', detailCode: 'piecewise-overlap' });
  for (const [branchId, hasValues] of possible) {
    if (!hasValues) stopReasons.push({ code: 'invalid-condition', detailCode: `piecewise-impossible:${branchId}` });
  }
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
    if (!compiled.ok) {
      stopReasons.push(compiled.stopReason);
      continue;
    }
    const sampled = sampleExplicitGraphRelation({
      plan: compiled.plan,
      viewport: input.viewport,
      cssSize: input.cssSize,
      parameterEnvironment: input.parameterEnvironment,
      quality: input.quality,
      budgets: perBranchBudgets,
      control: input.control,
    });
    evaluatedSamples += sampled.stats.evaluatedSamples;
    if (sampled.status === 'cancelled') status = 'cancelled';
    else if (sampled.status === 'budget-exhausted' && status === 'complete') status = 'budget-exhausted';
    if (sampled.stopReason) stopReasons.push(sampled.stopReason);
    const condition = compiledConditions.find((entry) => entry.branchId === branch.branchId);
    const keep = branch.otherwise
      ? (x: number, y: number) => compiledConditions.every((entry) => (
          entry.condition.test({ ...input.parameterEnvironment, x, y }) !== true
        ))
      : (x: number, y: number) => condition?.condition.test({ ...input.parameterEnvironment, x, y }) === true;
    const filtered = filteredSample({
      sampled,
      condition: keep,
      independentMinimum: branch.relation.kind === 'explicit-x'
        ? input.viewport.yMin
        : input.viewport.xMin,
      independentMaximum: branch.relation.kind === 'explicit-x'
        ? input.viewport.yMax
        : input.viewport.xMax,
      viewport: input.viewport,
    });
    emittedVertices += filtered.coordinates.length / 2;
    if (filtered.coordinates.length >= 4 && filtered.segmentOffsets.length > 0) {
      paths.push({
        pathId: `${input.itemId}:branch:${branch.branchId}`,
        sample: {
          ...sampled,
          itemId: input.itemId,
          coordinates: filtered.coordinates,
          independentValues: filtered.independentValues,
          segmentOffsets: filtered.segmentOffsets,
          stats: { ...sampled.stats, emittedVertices: filtered.coordinates.length / 2 },
        },
        style: input.presentation,
      });
    }
    if (filtered.endpoints.length > 0) {
      endpointBatches.push({
        pointBatchId: `${input.itemId}:endpoint:${branch.branchId}`,
        itemId: input.itemId,
        coordinates: filtered.endpoints,
        marker: condition?.strict ? 'open' : 'filled',
        style: input.presentation,
      });
    }
  }
  return {
    status,
    paths,
    endpointBatches,
    stopReasons,
    stats: {
      evaluatedSamples,
      emittedVertices,
      elapsedMs: Math.max(0, (input.control.now?.() ?? performance.now()) - startedAt),
    },
  };
}
