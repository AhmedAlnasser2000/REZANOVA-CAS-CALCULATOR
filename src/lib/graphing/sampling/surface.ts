import type {
  GraphRelationIR,
  GraphSamplingQualityV3,
  GraphStopReason,
  GraphSurfaceMeshRuntimeV1,
  GraphViewportV1,
} from '../contracts';
import { createGraphExpressionEvaluator, type GraphExpressionPlanCache } from '../evaluator';

type SurfaceRelation = Extract<GraphRelationIR, { kind: 'real-surface' }>;
type Corner = { x: number; y: number; z: number };
type Leaf = { corners: [Corner, Corner, Corner, Corner] };

export type GraphSurfaceSampleResult = {
  mesh?: GraphSurfaceMeshRuntimeV1;
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  sampleCount: number;
  vertexCount: number;
  domainBreakCells: number;
  stopReason?: GraphStopReason;
};

const QUALITY = {
  preview: { base: 8, minimumDepth: 0, depth: 2, error: 0.24, vertices: 18_000 },
  settled: { base: 10, minimumDepth: 1, depth: 3, error: 0.09, vertices: 42_000 },
  polish: { base: 12, minimumDepth: 1, depth: 3, error: 0.045, vertices: 72_000 },
} satisfies Record<GraphSamplingQualityV3, unknown>;

function contourLevels(minimum: number, maximum: number) {
  if (!(maximum > minimum)) return [minimum];
  const span = maximum - minimum;
  const raw = span / 6;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, Number.EPSILON)));
  const normalized = raw / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const levels: number[] = [];
  for (let value = Math.ceil(minimum / step) * step; value <= maximum && levels.length < 11; value += step) {
    levels.push(Math.abs(value) < step * 1e-9 ? 0 : value);
  }
  if (minimum <= 0 && maximum >= 0 && !levels.includes(0)) levels.push(0);
  return levels.sort((left, right) => left - right);
}

function contourSegment(corners: Leaf['corners'], level: number) {
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]] as const;
  const points: Corner[] = [];
  for (const [fromIndex, toIndex] of edges) {
    const from = corners[fromIndex];
    const to = corners[toIndex];
    const fromDelta = from.z - level;
    const toDelta = to.z - level;
    if (fromDelta === 0 && toDelta === 0) continue;
    if ((fromDelta < 0) === (toDelta < 0) && fromDelta !== 0 && toDelta !== 0) continue;
    const denominator = to.z - from.z;
    const ratio = denominator === 0 ? 0 : (level - from.z) / denominator;
    points.push({
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      z: level,
    });
  }
  return points;
}

export function sampleRealSurface(input: {
  itemId: string;
  sourceRevision: number;
  relation: SurfaceRelation;
  viewport: GraphViewportV1;
  parameterEnvironment: Record<string, number>;
  quality: GraphSamplingQualityV3;
  cache: GraphExpressionPlanCache;
  control: { isCancelled: () => boolean };
}): GraphSurfaceSampleResult {
  const compiled = input.cache.getOrCompile({
    planId: `${input.itemId}.real-surface`,
    sourceRevision: input.sourceRevision,
    expression: input.relation.z,
  });
  if (!compiled.ok) return {
    status: 'budget-exhausted', sampleCount: 0, vertexCount: 0, domainBreakCells: 0,
    stopReason: compiled.stopReason,
  };
  const evaluator = createGraphExpressionEvaluator(compiled.plan);
  const bounds = input.relation.bounds ?? input.viewport;
  const policy = QUALITY[input.quality];
  const leaves: Leaf[] = [];
  let sampleCount = 0;
  let domainBreakCells = 0;
  let minimumZ = Infinity;
  let maximumZ = -Infinity;
  let budgetExhausted = false;
  const evaluate = (x: number, y: number): Corner | null => {
    sampleCount += 1;
    const result = evaluator.evaluate({ ...input.parameterEnvironment, x, y });
    if (result.status !== 'finite' || Math.abs(result.value) > 1e8) return null;
    minimumZ = Math.min(minimumZ, result.value);
    maximumZ = Math.max(maximumZ, result.value);
    return { x, y, z: result.value };
  };
  const visit = (x0: number, x1: number, y0: number, y1: number, depth: number) => {
    if (input.control.isCancelled() || budgetExhausted) return;
    if ((leaves.length + 1) * 4 > policy.vertices) { budgetExhausted = true; return; }
    const corners = [evaluate(x0, y0), evaluate(x1, y0), evaluate(x1, y1), evaluate(x0, y1)] as const;
    const center = evaluate((x0 + x1) / 2, (y0 + y1) / 2);
    if (corners.some((corner) => corner === null) || !center) {
      if (depth < policy.depth) {
        const xm = (x0 + x1) / 2; const ym = (y0 + y1) / 2;
        visit(x0, xm, y0, ym, depth + 1); visit(xm, x1, y0, ym, depth + 1);
        visit(xm, x1, ym, y1, depth + 1); visit(x0, xm, ym, y1, depth + 1);
      } else domainBreakCells += 1;
      return;
    }
    const bilinear = corners.reduce((sum, corner) => sum + corner!.z, 0) / 4;
    const scale = Math.max(1, Math.abs(center.z), ...corners.map((corner) => Math.abs(corner!.z)));
    if (depth < policy.minimumDepth
      || (depth < policy.depth && Math.abs(center.z - bilinear) / scale > policy.error)) {
      const xm = center.x; const ym = center.y;
      visit(x0, xm, y0, ym, depth + 1); visit(xm, x1, y0, ym, depth + 1);
      visit(xm, x1, ym, y1, depth + 1); visit(x0, xm, ym, y1, depth + 1);
      return;
    }
    leaves.push({ corners: corners as Leaf['corners'] });
  };
  for (let row = 0; row < policy.base; row += 1) {
    for (let column = 0; column < policy.base; column += 1) {
      const x0 = bounds.xMin + (bounds.xMax - bounds.xMin) * column / policy.base;
      const x1 = bounds.xMin + (bounds.xMax - bounds.xMin) * (column + 1) / policy.base;
      const y0 = bounds.yMin + (bounds.yMax - bounds.yMin) * row / policy.base;
      const y1 = bounds.yMin + (bounds.yMax - bounds.yMin) * (row + 1) / policy.base;
      visit(x0, x1, y0, y1, 0);
    }
  }
  if (input.control.isCancelled()) return {
    status: 'cancelled', sampleCount, vertexCount: 0, domainBreakCells,
    stopReason: { code: 'sampling-cancelled', detailCode: 'surface-cooperative-cancellation' },
  };
  const positions: number[] = [];
  const normals: number[] = [];
  const triangleIndices: number[] = [];
  const normalStepX = Math.max((bounds.xMax - bounds.xMin) / 10_000, 1e-7);
  const normalStepY = Math.max((bounds.yMax - bounds.yMin) / 10_000, 1e-7);
  const normalAt = (corner: Corner) => {
    const left = evaluate(corner.x - normalStepX, corner.y)?.z;
    const right = evaluate(corner.x + normalStepX, corner.y)?.z;
    const down = evaluate(corner.x, corner.y - normalStepY)?.z;
    const up = evaluate(corner.x, corner.y + normalStepY)?.z;
    const dx = left === undefined || right === undefined ? 0 : (right - left) / (2 * normalStepX);
    const dy = down === undefined || up === undefined ? 0 : (up - down) / (2 * normalStepY);
    const length = Math.hypot(dx, dy, 1) || 1;
    return [-dx / length, -dy / length, 1 / length] as const;
  };
  for (const leaf of leaves) {
    const base = positions.length / 3;
    for (const corner of leaf.corners) {
      positions.push(corner.x, corner.y, corner.z);
      normals.push(...normalAt(corner));
    }
    triangleIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const contourCoordinates: number[] = [];
  const contourOffsets: number[] = [];
  if (Number.isFinite(minimumZ) && Number.isFinite(maximumZ)) {
    for (const level of contourLevels(minimumZ, maximumZ)) {
      for (const leaf of leaves) {
        const points = contourSegment(leaf.corners, level);
        for (let index = 0; index + 1 < points.length; index += 2) {
          contourOffsets.push(contourCoordinates.length / 3);
          contourCoordinates.push(
            points[index]!.x, points[index]!.y, points[index]!.z,
            points[index + 1]!.x, points[index + 1]!.y, points[index + 1]!.z,
          );
        }
      }
    }
  }
  const truncated = budgetExhausted;
  return {
    mesh: {
      meshId: `${input.itemId}:surface:0`, itemId: input.itemId,
      positions: new Float64Array(positions),
      triangleIndices: new Uint32Array(triangleIndices),
      normals: new Float32Array(normals),
      contourCoordinates: new Float64Array(contourCoordinates),
      contourOffsets: new Uint32Array(contourOffsets),
      truncated,
    },
    status: truncated ? 'budget-exhausted' : 'complete',
    sampleCount,
    vertexCount: positions.length / 3 + contourCoordinates.length / 3,
    domainBreakCells,
    ...(truncated ? { stopReason: { code: 'sampling-budget-exceeded', detailCode: 'surface-vertex-budget' } } : {}),
  };
}
