import type {
  GraphPiecewiseConditionEvidenceV1,
  GraphPiecewiseSpecV1,
  GraphRelationIR,
  GraphSamplingLimitsV2,
  GraphSamplingQualityV3,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import { createGraphExpressionEvaluator, GraphExpressionPlanCache } from '../evaluator';
import type { GraphPointBatchSceneInput, GraphSampledPathSceneInput } from '../scene';
import type { GraphAdaptiveQualityPolicyV1 } from './adaptive-policy';
import { compileExplicitGraphRelation } from './compile';
import type { GraphConditionInterval } from './condition-intervals';
import { sampleExplicitGraphRelation } from './explicit';
import { sampleParametricGraphRelation } from './parametric';
import { buildGraphPiecewiseConditionPartition } from './piecewise-condition-evidence';
import type { GraphSamplerControl } from './types';

// Piecewise curves: the condition partition (solved, first match wins) says
// where each branch is drawn; each branch is sampled over its own intervals,
// its path starts and ends on points evaluated exactly at the boundaries, and
// each boundary gets a filled circle when the branch includes it and has a
// value there, an open circle at the one-sided limit otherwise.

type PiecewiseSample = {
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  paths: GraphSampledPathSceneInput[];
  endpointBatches: GraphPointBatchSceneInput[];
  stopReasons: GraphStopReason[];
  conditionEvidence: GraphPiecewiseConditionEvidenceV1;
  stats: { evaluatedSamples: number; emittedVertices: number; elapsedMs: number };
};

type Point = { x: number; y: number };
type Form = 'explicit-y' | 'explicit-x' | 'polar';

/** One piecewise item's form: every branch (and `otherwise`) must share it. */
export function graphPiecewiseForm(piecewise: GraphPiecewiseSpecV1): Form | null {
  const kinds = new Set([...piecewise.branches.map((branch) => branch.relation.kind), ...(piecewise.otherwise ? [piecewise.otherwise.kind] : [])]);
  if (kinds.size !== 1) return null;
  const [kind] = kinds;
  return kind === 'explicit-y' || kind === 'explicit-x' ? kind : kind === 'polar-radius' ? 'polar' : null;
}

/** The value at `at`, or the one-sided limit from `inside` when the branch is undefined exactly there. */
function valueOrLimit(evaluate: (value: number) => number | undefined, at: number, inside: number) {
  const exact = evaluate(at);
  if (exact !== undefined) return { value: exact, defined: true };
  const direction = Math.sign(inside - at) || 1;
  const span = Math.max(Math.abs(inside - at), 1e-9);
  let previous: number | undefined;
  for (let power = 3; power <= 12; power += 1) {
    const value = evaluate(at + direction * span * 10 ** -power);
    if (value === undefined) return null;
    if (previous !== undefined && Math.abs(value - previous) <= 1e-9 * Math.max(1, Math.abs(value))) return { value, defined: false };
    previous = value;
  }
  return null;
}

function markerKey(point: Point) {
  return `${point.x.toPrecision(12)}:${point.y.toPrecision(12)}`;
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
  const now = () => input.control.now?.() ?? performance.now();
  const startedAt = now();
  const stopReasons: GraphStopReason[] = [];
  const paths: GraphSampledPathSceneInput[] = [];
  const filled = new Map<string, Point>(); const open = new Map<string, Point>();
  let status: PiecewiseSample['status'] = 'complete';
  let evaluatedSamples = 0; let emittedVertices = 0;
  const form = graphPiecewiseForm(input.piecewise) ?? 'explicit-y';
  const symbol = form === 'explicit-y' ? 'x' : form === 'explicit-x' ? 'y' : 'theta';
  const minimum = form === 'explicit-y' ? input.viewport.xMin : form === 'explicit-x' ? input.viewport.yMin : 0;
  const maximum = form === 'explicit-y' ? input.viewport.xMax : form === 'explicit-x' ? input.viewport.yMax : Math.PI * 2;
  const pixelSpan = form === 'explicit-y' ? input.cssSize.width : form === 'explicit-x' ? input.cssSize.height : Math.max(input.cssSize.width, input.cssSize.height);
  const partition = buildGraphPiecewiseConditionPartition({
    itemId: input.itemId, sourceRevision: input.sourceRevision, piecewise: input.piecewise, independentSymbol: symbol,
    minimum, maximum, pixelSpan, tolerancePixels: input.quality === 'preview' ? 1.5 : input.quality === 'settled' ? 0.35 : 0.2,
    parameterEnvironment: input.parameterEnvironment, cache: input.cache,
  });
  if (!graphPiecewiseForm(input.piecewise)) stopReasons.push({ code: 'unsupported-relation', detailCode: 'piecewise-mixed-forms' });
  for (const pair of partition.evidence.overlapBranchPairs) {
    stopReasons.push({ code: 'invalid-condition', detailCode: `piecewise-shadowed:${pair.scope}:${pair.branchIds.join(',')}` });
  }
  for (const branch of partition.evidence.branchApplicability) {
    if (branch.status === 'impossible-global' || branch.status === 'impossible-current-viewport') {
      stopReasons.push({ code: 'invalid-condition', detailCode: `piecewise-impossible:${branch.status}:${branch.branchId}` });
    } else if (branch.status === 'unresolved') {
      stopReasons.push({ code: 'invalid-condition', detailCode: `piecewise-unresolved:${branch.branchId}` });
    }
  }
  if (partition.evidence.unresolvedBoundaryCount > 0) stopReasons.push({ code: 'invalid-condition', detailCode: 'piecewise-boundary-unresolved' });

  const branches: Array<{ branchId: string; relation: GraphRelationIR; intervals: GraphConditionInterval[] }> = [
    ...input.piecewise.branches.map((branch) => ({ branchId: branch.branchId, relation: branch.relation, intervals: partition.branchIntervals.get(branch.branchId) ?? [] })),
    ...(input.piecewise.otherwise ? [{ branchId: 'otherwise', relation: input.piecewise.otherwise, intervals: partition.otherwiseIntervals }] : []),
  ];
  const addMarker = (point: Point | null, included: boolean) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    (included ? filled : open).set(markerKey(point), point);
  };

  for (const branch of branches) {
    if (!graphPiecewiseForm(input.piecewise)) break;
    const expression = branch.relation.kind === 'polar-radius' ? branch.relation.radius
      : branch.relation.kind === 'explicit-y' || branch.relation.kind === 'explicit-x' ? branch.relation.rhs : null;
    if (!expression) continue;
    const plan = input.cache.getOrCompile({ planId: `${input.itemId}:${branch.branchId}:exact`, sourceRevision: input.sourceRevision, expression });
    if (!plan.ok) { stopReasons.push(plan.stopReason); continue; }
    const evaluator = createGraphExpressionEvaluator(plan.plan);
    const evaluate = (value: number) => {
      const result = evaluator.evaluate({ ...input.parameterEnvironment, [symbol]: value });
      return result.status === 'finite' ? result.value : undefined;
    };
    const pointAt = (independent: number, dependent: number): Point => form === 'explicit-y' ? { x: independent, y: dependent }
      : form === 'explicit-x' ? { x: dependent, y: independent } : { x: dependent * Math.cos(independent), y: dependent * Math.sin(independent) };

    const coordinates: number[] = []; const independentValues: number[] = []; const segmentOffsets: number[] = [];
    let sampleStopReason: GraphStopReason | undefined;
    for (const interval of branch.intervals) {
      if (interval.maximum > interval.minimum) {
        const run = form === 'polar'
          ? samplePolarRun(input, branch, interval)
          : sampleExplicitRun(input, branch.relation, branch.branchId, interval, form, evaluate, pointAt);
        evaluatedSamples += run.evaluated;
        if (run.status === 'cancelled') status = 'cancelled';
        else if (run.status === 'budget-exhausted' && status === 'complete') status = 'budget-exhausted';
        sampleStopReason ??= run.stopReason;
        for (const segment of run.segments) {
          if (segment.coordinates.length < 4) continue;
          segmentOffsets.push(coordinates.length / 2);
          coordinates.push(...segment.coordinates); independentValues.push(...segment.independent);
        }
      }
      // Boundary circles (not at the window's own edges): exact value, else the one-sided limit.
      for (const [at, inside, included] of [
        [interval.minimum, interval.maximum > interval.minimum ? interval.maximum : interval.minimum + 1e-6, interval.minimumInclusive],
        [interval.maximum, interval.maximum > interval.minimum ? interval.minimum : interval.maximum - 1e-6, interval.maximumInclusive],
      ] as const) {
        if (at <= minimum || at >= maximum) continue;
        const value = valueOrLimit(evaluate, at, inside);
        if (value) addMarker(pointAt(at, value.value), included && value.defined);
      }
    }
    if (sampleStopReason) stopReasons.push(sampleStopReason);
    emittedVertices += coordinates.length / 2;
    if (coordinates.length >= 4) {
      paths.push({
        pathId: `${input.itemId}:branch:${branch.branchId}`,
        sample: {
          itemId: input.itemId, status: 'complete',
          coordinates: new Float64Array(coordinates), independentValues: new Float64Array(independentValues),
          segmentOffsets: new Uint32Array(segmentOffsets),
          stats: { evaluatedSamples, emittedVertices: coordinates.length / 2, elapsedMs: 0 },
        },
      });
    }
  }
  // A boundary one branch includes and another excludes at the same point is drawn filled.
  for (const key of filled.keys()) open.delete(key);
  const endpointBatches: GraphPointBatchSceneInput[] = [];
  for (const [marker, points] of [['open', open], ['filled', filled]] as const) {
    if (points.size === 0) continue;
    endpointBatches.push({
      pointBatchId: `${input.itemId}:endpoint:${marker}`, itemId: input.itemId, marker,
      coordinates: new Float64Array([...points.values()].flatMap((point) => [point.x, point.y])),
    });
  }
  return {
    status, paths, endpointBatches, stopReasons, conditionEvidence: partition.evidence,
    stats: { evaluatedSamples, emittedVertices, elapsedMs: Math.max(0, now() - startedAt) },
  };
}

type Run = {
  segments: Array<{ coordinates: number[]; independent: number[] }>;
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  stopReason?: GraphStopReason;
  evaluated: number;
};

/** A y = f(x) (or x = f(y)) branch over one interval, sampled densely there and cut exactly at its ends. */
function sampleExplicitRun(input: Parameters<typeof sampleGraphPiecewise>[0], relation: GraphRelationIR, branchId: string,
  interval: GraphConditionInterval, form: 'explicit-y' | 'explicit-x', evaluate: (value: number) => number | undefined,
  pointAt: (independent: number, dependent: number) => Point): Run {
  const compiled = compileExplicitGraphRelation({ itemId: `${input.itemId}:${branchId}`, sourceRevision: input.sourceRevision, relation, cache: input.cache });
  if (!compiled.ok) return { segments: [], status: 'complete', stopReason: compiled.stopReason, evaluated: 0 };
  const alongX = form === 'explicit-y';
  const viewMinimum = alongX ? input.viewport.xMin : input.viewport.yMin;
  const viewMaximum = alongX ? input.viewport.xMax : input.viewport.yMax;
  const fraction = Math.max(0.02, (interval.maximum - interval.minimum) / Math.max(1e-300, viewMaximum - viewMinimum));
  const pixels = Math.max(16, Math.round((alongX ? input.cssSize.width : input.cssSize.height) * Math.min(1, fraction)));
  const viewport = alongX
    ? { ...input.viewport, xMin: interval.minimum, xMax: interval.maximum }
    : { ...input.viewport, yMin: interval.minimum, yMax: interval.maximum };
  const sampled = sampleExplicitGraphRelation({
    plan: compiled.plan, viewport,
    cssSize: alongX ? { width: pixels, height: input.cssSize.height } : { width: input.cssSize.width, height: pixels },
    parameterEnvironment: input.parameterEnvironment, quality: input.quality, limits: input.limits, policy: input.policy, control: input.control,
  });
  const vertexCount = sampled.coordinates.length / 2;
  const segments: Run['segments'] = [];
  for (let segmentIndex = 0; segmentIndex < sampled.segmentOffsets.length; segmentIndex += 1) {
    const start = sampled.segmentOffsets[segmentIndex]!; const end = sampled.segmentOffsets[segmentIndex + 1] ?? vertexCount;
    let current: Run['segments'][number] | null = null;
    const flush = () => { if (current && current.coordinates.length >= 4) segments.push(current); current = null; };
    for (let index = start; index < end; index += 1) {
      const independent = sampled.independentValues[index]!;
      const inside = independent >= interval.minimum && independent <= interval.maximum;
      const previous = index > start ? sampled.independentValues[index - 1]! : null;
      // Where the sample crosses an interval end, the path gets a vertex exactly on the branch there.
      if (previous !== null) {
        // Both ends can fall inside one sample step (a narrow interval): add them in traversal order.
        const bounds = previous <= independent ? [interval.minimum, interval.maximum] : [interval.maximum, interval.minimum];
        for (const bound of bounds) {
          const crosses = (previous < bound && independent > bound) || (previous > bound && independent < bound);
          if (!crosses) continue;
          const value = evaluate(bound);
          if (value === undefined) continue;
          current ??= { coordinates: [], independent: [] };
          const point = pointAt(bound, value);
          current.coordinates.push(point.x, point.y); current.independent.push(bound);
        }
      }
      if (!inside) { flush(); continue; }
      current ??= { coordinates: [], independent: [] };
      current.coordinates.push(sampled.coordinates[index * 2]!, sampled.coordinates[index * 2 + 1]!);
      current.independent.push(independent);
    }
    flush();
  }
  return { segments, status: sampled.status, stopReason: sampled.stopReason, evaluated: sampled.stats.evaluatedSamples };
}

/** A polar branch over one θ interval, through the polar sampler's own domain support. */
function samplePolarRun(input: Parameters<typeof sampleGraphPiecewise>[0], branch: { branchId: string; relation: GraphRelationIR },
  interval: GraphConditionInterval): Run {
  if (branch.relation.kind !== 'polar-radius') return { segments: [], status: 'complete', evaluated: 0 };
  const bound = (value: number) => ({ mathJson: value, freeSymbols: [] });
  const sampled = sampleParametricGraphRelation({
    itemId: `${input.itemId}:${branch.branchId}`, sourceRevision: input.sourceRevision,
    relation: { ...branch.relation, domain: { kind: 'interval-membership', value: { mathJson: 'theta', freeSymbols: ['theta'] },
      minimum: bound(interval.minimum), maximum: bound(interval.maximum),
      minimumInclusive: interval.minimumInclusive, maximumInclusive: interval.maximumInclusive } } as GraphRelationIR & { kind: 'polar-radius' },
    viewport: input.viewport, cssSize: input.cssSize, parameterEnvironment: input.parameterEnvironment, quality: input.quality,
    limits: input.limits, cache: input.cache,
    control: { now: () => input.control.now?.() ?? performance.now(), isCancelled: () => input.control.isCancelled?.() ?? false },
  });
  const path = sampled.path?.sample;
  if (!path) return { segments: [], status: sampled.status, stopReason: sampled.stopReason, evaluated: sampled.sampleCount };
  const vertexCount = path.coordinates.length / 2;
  const parameters = path.independentValues ?? new Float64Array(vertexCount);
  const segments: Run['segments'] = [];
  for (let segmentIndex = 0; segmentIndex < path.segmentOffsets.length; segmentIndex += 1) {
    const start = path.segmentOffsets[segmentIndex]!; const end = path.segmentOffsets[segmentIndex + 1] ?? vertexCount;
    segments.push({ coordinates: [...path.coordinates.slice(start * 2, end * 2)], independent: [...parameters.slice(start, end)] });
  }
  return { segments, status: sampled.status, stopReason: sampled.stopReason, evaluated: sampled.sampleCount };
}
