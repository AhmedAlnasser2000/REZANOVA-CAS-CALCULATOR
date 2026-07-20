import type {
  GraphInequalityComparator,
  GraphRelationIR,
  GraphSamplingLimitsV2,
  GraphSamplingQualityV3,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import {
  createGraphExpressionEvaluator,
  GraphExpressionPlanCache,
  type GraphExpressionEvaluator,
} from '../evaluator';
import type { GraphSamplerControl } from './types';
import { sampleDirectedInequality } from './directed';
import type { GraphAdaptiveQualityPolicyV1 } from './adaptive-policy';

type ImplicitRelation = Extract<GraphRelationIR, {
  kind: 'implicit-equality' | 'inequality' | 'chained-inequality';
}>;

type CompiledClause = {
  left: GraphExpressionEvaluator;
  right: GraphExpressionEvaluator;
  operator: GraphInequalityComparator | '=';
};

type SampleVertex = {
  x: number;
  y: number;
  values: number[];
};

type AdaptiveCell = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  corners: [SampleVertex, SampleVertex, SampleVertex, SampleVertex];
  center: SampleVertex;
  edgeMidpoints: [SampleVertex, SampleVertex, SampleVertex, SampleVertex];
};

type ContourSegment = {
  first: SampleVertex;
  second: SampleVertex;
};

export type GraphImplicitBoundarySample = {
  pathIdSuffix: string;
  strict: boolean;
  coordinates: Float64Array;
  segmentOffsets: Uint32Array;
};

export type GraphSampledImplicitRelation = {
  itemId: string;
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  boundaries: GraphImplicitBoundarySample[];
  region?: {
    vertices: Float64Array;
    triangleIndices: Uint32Array;
  };
  stopReasons: GraphStopReason[];
  stats: {
    evaluatedSamples: number;
    emittedVertices: number;
    elapsedMs: number;
  };
};

export type GraphImplicitSamplingInput = {
  itemId: string;
  sourceRevision: number;
  relation: ImplicitRelation;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  parameterEnvironment: Readonly<Record<string, number>>;
  quality: GraphSamplingQualityV3;
  limits: GraphSamplingLimitsV2;
  policy?: GraphAdaptiveQualityPolicyV1;
  cache?: GraphExpressionPlanCache;
  control?: GraphSamplerControl;
};

type CompileResult =
  | { ok: true; clauses: CompiledClause[]; fillsRegion: boolean }
  | { ok: false; stopReason: GraphStopReason };

function relationClauses(relation: ImplicitRelation) {
  if (relation.kind === 'implicit-equality') {
    return [{ left: relation.left, operator: '=' as const, right: relation.right }];
  }
  if (relation.kind === 'inequality') {
    return [{ left: relation.left, operator: relation.operator, right: relation.right }];
  }
  return relation.operators.map((operator, index) => ({
    left: relation.operands[index]!,
    operator,
    right: relation.operands[index + 1]!,
  }));
}

function compileImplicitRelation(input: GraphImplicitSamplingInput): CompileResult {
  const cache = input.cache ?? new GraphExpressionPlanCache(16);
  const clauses: CompiledClause[] = [];
  for (const [index, clause] of relationClauses(input.relation).entries()) {
    const left = cache.getOrCompile({
      planId: `${input.itemId}.${input.relation.kind}.${index}.left`,
      sourceRevision: input.sourceRevision,
      expression: clause.left,
    });
    const right = cache.getOrCompile({
      planId: `${input.itemId}.${input.relation.kind}.${index}.right`,
      sourceRevision: input.sourceRevision,
      expression: clause.right,
    });
    if (!left.ok) return left;
    if (!right.ok) return right;
    clauses.push({
      left: createGraphExpressionEvaluator(left.plan),
      right: createGraphExpressionEvaluator(right.plan),
      operator: clause.operator,
    });
  }
  return { ok: true, clauses, fillsRegion: input.relation.kind !== 'implicit-equality' };
}

function normalizedDifference(operator: CompiledClause['operator'], left: number, right: number) {
  return operator === '>' || operator === '>=' ? right - left : left - right;
}

function strictComparator(operator: CompiledClause['operator']) {
  return operator === '<' || operator === '>';
}

function chooseGrid(input: GraphImplicitSamplingInput) {
  const qualitySpacing = input.quality === 'preview' ? 32 : input.quality === 'settled' ? 24 : 12;
  const spacing = input.policy
    ? input.policy.implicitCellPixels * (input.quality === 'preview' ? 1 : 2)
    : qualitySpacing;
  let columns = Math.max(8, Math.ceil(input.cssSize.width / spacing));
  let rows = Math.max(8, Math.ceil(input.cssSize.height / spacing));
  const estimated = (columns * 2 + 1) * (rows * 2 + 1);
  const available = Math.max(1, Math.floor(input.limits.maximumSamples * 0.58));
  if (estimated > available) {
    const scale = Math.sqrt(available / estimated);
    columns = Math.max(2, Math.floor(columns * scale));
    rows = Math.max(2, Math.floor(rows * scale));
  }
  return { columns, rows };
}

function coordinateKey(x: number, y: number) {
  return `${x.toPrecision(14)}:${y.toPrecision(14)}`;
}

function edgeKey(first: SampleVertex, second: SampleVertex, clauseIndex: number) {
  const firstKey = coordinateKey(first.x, first.y);
  const secondKey = coordinateKey(second.x, second.y);
  return firstKey < secondKey
    ? `${clauseIndex}:${firstKey}|${secondKey}`
    : `${clauseIndex}:${secondKey}|${firstKey}`;
}

function screenCellSize(input: GraphImplicitSamplingInput, cell: Pick<AdaptiveCell, 'x0' | 'x1' | 'y0' | 'y1'>) {
  return {
    width: Math.abs(cell.x1 - cell.x0) / (input.viewport.xMax - input.viewport.xMin) * input.cssSize.width,
    height: Math.abs(cell.y1 - cell.y0) / (input.viewport.yMax - input.viewport.yMin) * input.cssSize.height,
  };
}

function targetBoundaryPixels(quality: GraphSamplingQualityV3) {
  return quality === 'preview' ? 8 : quality === 'settled' ? 3 : 2;
}

function targetRootPixels(quality: GraphSamplingQualityV3) {
  return quality === 'preview' ? 0.5 : quality === 'settled' ? 0.15 : 0.08;
}

function cellMayContainBoundary(cell: AdaptiveCell, clauseIndex: number) {
  const values = [
    ...cell.corners.map((corner) => corner.values[clauseIndex]!),
    ...cell.edgeMidpoints.map((point) => point.values[clauseIndex]!),
    cell.center.values[clauseIndex]!,
  ];
  const finite = values.filter(Number.isFinite);
  if (finite.length !== values.length) return finite.length > 0;
  const minimum = Math.min(...finite);
  const maximum = Math.max(...finite);
  if (minimum <= 0 && maximum >= 0) return true;
  const range = Math.max(1e-14, maximum - minimum);
  const minimumMagnitude = Math.min(...finite.map(Math.abs));
  const cornerAverage = cell.corners.reduce(
    (sum, corner) => sum + corner.values[clauseIndex]!,
    0,
  ) / 4;
  const centerDeparture = Math.abs(cell.center.values[clauseIndex]! - cornerAverage);
  return minimumMagnitude <= range * 0.18 || centerDeparture >= minimumMagnitude * 0.8;
}

function cellClauseIsAffine(cell: AdaptiveCell, clauseIndex: number) {
  const corners = cell.corners.map((corner) => corner.values[clauseIndex]!);
  const expected = [
    (corners[0]! + corners[1]!) / 2,
    (corners[1]! + corners[2]!) / 2,
    (corners[3]! + corners[2]!) / 2,
    (corners[0]! + corners[3]!) / 2,
    corners.reduce((sum, value) => sum + value, 0) / 4,
  ];
  const observed = [
    ...cell.edgeMidpoints.map((point) => point.values[clauseIndex]!),
    cell.center.values[clauseIndex]!,
  ];
  const scale = Math.max(1, ...corners.map(Math.abs), ...observed.map(Math.abs));
  const interpolationError = Math.max(...observed.map((value, index) => (
    Math.abs(value - expected[index]!)
  )));
  const mixedDifference = Math.abs(corners[0]! - corners[1]! + corners[2]! - corners[3]!);
  return interpolationError <= scale * 1e-11 && mixedDifference <= scale * 1e-11;
}

function caseSegments(code: number, centerInside: boolean): Array<[number, number]> {
  switch (code) {
    case 1: return [[3, 0]];
    case 2: return [[0, 1]];
    case 3: return [[3, 1]];
    case 4: return [[1, 2]];
    case 5: return centerInside ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
    case 6: return [[0, 2]];
    case 7: return [[3, 2]];
    case 8: return [[2, 3]];
    case 9: return [[0, 2]];
    case 10: return centerInside ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
    case 11: return [[1, 2]];
    case 12: return [[3, 1]];
    case 13: return [[0, 1]];
    case 14: return [[3, 0]];
    default: return [];
  }
}

function asymptoticCenterInside(cell: AdaptiveCell, clauseIndex: number) {
  const [topLeft, topRight, bottomRight, bottomLeft] = cell.corners.map(
    (corner) => corner.values[clauseIndex]!,
  );
  const determinant = topLeft * bottomRight - topRight * bottomLeft;
  const scale = Math.max(Math.abs(topLeft), Math.abs(topRight), Math.abs(bottomRight), Math.abs(bottomLeft), 1);
  if (Math.abs(determinant) <= scale * scale * 1e-12) {
    return cell.center.values[clauseIndex]! <= 0;
  }
  return determinant < 0;
}

function edgeVertices(cell: AdaptiveCell, edge: number): [SampleVertex, SampleVertex] {
  switch (edge) {
    case 0: return [cell.corners[0], cell.corners[1]];
    case 1: return [cell.corners[1], cell.corners[2]];
    case 2: return [cell.corners[3], cell.corners[2]];
    default: return [cell.corners[0], cell.corners[3]];
  }
}

function clipPolygon(polygon: SampleVertex[], clauseIndex: number) {
  if (polygon.length === 0) return polygon;
  const output: SampleVertex[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const currentInside = current.values[clauseIndex]! <= 0;
    const nextInside = next.values[clauseIndex]! <= 0;
    if (currentInside) output.push(current);
    if (currentInside === nextInside) continue;
    const firstValue = current.values[clauseIndex]!;
    const secondValue = next.values[clauseIndex]!;
    const denominator = firstValue - secondValue;
    const ratio = Math.abs(denominator) < 1e-14 ? 0.5 : firstValue / denominator;
    output.push({
      x: current.x + (next.x - current.x) * ratio,
      y: current.y + (next.y - current.y) * ratio,
      values: current.values.map((value, valueIndex) => (
        value + (next.values[valueIndex]! - value) * ratio
      )),
    });
  }
  return output;
}

function stitchSegments(segments: ContourSegment[]) {
  const points = new Map<string, SampleVertex>();
  const edges: Array<{ first: string; second: string }> = [];
  const adjacency = new Map<string, number[]>();
  const connect = (key: string, edgeIndex: number) => {
    const entries = adjacency.get(key) ?? [];
    entries.push(edgeIndex);
    adjacency.set(key, entries);
  };
  for (const segment of segments) {
    const first = coordinateKey(segment.first.x, segment.first.y);
    const second = coordinateKey(segment.second.x, segment.second.y);
    if (first === second) continue;
    points.set(first, segment.first);
    points.set(second, segment.second);
    const edgeIndex = edges.length;
    edges.push({ first, second });
    connect(first, edgeIndex);
    connect(second, edgeIndex);
  }

  const visited = new Set<number>();
  const paths: string[][] = [];
  const trace = (start: string, firstEdge: number) => {
    const path = [start];
    let current = start;
    let edgeIndex: number | undefined = firstEdge;
    while (edgeIndex !== undefined && !visited.has(edgeIndex)) {
      visited.add(edgeIndex);
      const edge = edges[edgeIndex]!;
      current = edge.first === current ? edge.second : edge.first;
      path.push(current);
      edgeIndex = adjacency.get(current)?.find((candidate) => !visited.has(candidate));
    }
    if (path.length > 1) paths.push(path);
  };

  for (const [key, connected] of adjacency) {
    if (connected.length === 2) continue;
    for (const edgeIndex of connected) {
      if (!visited.has(edgeIndex)) trace(key, edgeIndex);
    }
  }
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    if (!visited.has(edgeIndex)) trace(edges[edgeIndex]!.first, edgeIndex);
  }

  const coordinates: number[] = [];
  const offsets: number[] = [];
  for (const path of paths) {
    offsets.push(coordinates.length / 2);
    for (const key of path) {
      const point = points.get(key)!;
      coordinates.push(point.x, point.y);
    }
  }
  return {
    coordinates: new Float64Array(coordinates),
    segmentOffsets: new Uint32Array(offsets),
  };
}

export function sampleImplicitGraphRelation(
  input: GraphImplicitSamplingInput,
): GraphSampledImplicitRelation {
  const directed = sampleDirectedInequality(input);
  if (directed) return directed;
  const now = input.control?.now ?? (() => performance.now());
  const isCancelled = input.control?.isCancelled ?? (() => false);
  const startedAt = now();
  const compiled = compileImplicitRelation(input);
  if (!compiled.ok) {
    return {
      itemId: input.itemId,
      status: 'complete',
      boundaries: [],
      stopReasons: [compiled.stopReason],
      stats: { evaluatedSamples: 0, emittedVertices: 0, elapsedMs: 0 },
    };
  }

  const stopReasons: GraphStopReason[] = [];
  let evaluatedSamples = 0;
  let status: GraphSampledImplicitRelation['status'] = 'complete';
  let topologyInconclusive = false;
  const environment: Record<string, number> = { ...input.parameterEnvironment, x: 0, y: 0 };
  const pointCache = new Map<string, SampleVertex | null>();
  const edgeRootCache = new Map<string, SampleVertex | null>();

  const stop = (nextEvaluations = 0) => {
    if (isCancelled()) {
      if (status !== 'cancelled') {
        status = 'cancelled';
        stopReasons.push({ code: 'sampling-cancelled', detailCode: 'cooperative-implicit-cancellation' });
      }
      return true;
    }
    if (evaluatedSamples + nextEvaluations > input.limits.maximumSamples
      || now() - startedAt >= input.limits.maximumTimeMs) {
      if (status === 'complete') {
        status = 'budget-exhausted';
        stopReasons.push({ code: 'sampling-budget-exceeded', detailCode: 'implicit-adaptive-budget' });
      }
      return true;
    }
    return false;
  };

  const evaluatePoint = (x: number, y: number): SampleVertex | null => {
    const key = coordinateKey(x, y);
    if (pointCache.has(key)) return pointCache.get(key) ?? null;
    if (stop(1)) return null;
    environment.x = x;
    environment.y = y;
    const values: number[] = [];
    for (const clause of compiled.clauses) {
      const left = clause.left.evaluate(environment);
      const right = clause.right.evaluate(environment);
      if (left.status !== 'finite' || right.status !== 'finite') {
        evaluatedSamples += 1;
        pointCache.set(key, null);
        topologyInconclusive = true;
        return null;
      }
      values.push(normalizedDifference(clause.operator, left.value, right.value));
    }
    evaluatedSamples += 1;
    const vertex = { x, y, values };
    pointCache.set(key, vertex);
    return vertex;
  };

  const makeCell = (x0: number, x1: number, y0: number, y1: number): AdaptiveCell | null => {
    const xMid = (x0 + x1) / 2;
    const yMid = (y0 + y1) / 2;
    const points = [
      evaluatePoint(x0, y1), evaluatePoint(x1, y1),
      evaluatePoint(x1, y0), evaluatePoint(x0, y0),
      evaluatePoint(xMid, yMid),
      evaluatePoint(xMid, y1), evaluatePoint(x1, yMid),
      evaluatePoint(xMid, y0), evaluatePoint(x0, yMid),
    ];
    if (status !== 'complete') return null;
    if (points.some((point) => point === null)) return null;
    return {
      x0, x1, y0, y1,
      corners: [points[0]!, points[1]!, points[2]!, points[3]!],
      center: points[4]!,
      edgeMidpoints: [points[5]!, points[6]!, points[7]!, points[8]!],
    };
  };

  const { columns, rows } = chooseGrid(input);
  const xAt = (column: number) => input.viewport.xMin
    + column / columns * (input.viewport.xMax - input.viewport.xMin);
  const yAt = (row: number) => input.viewport.yMax
    - row / rows * (input.viewport.yMax - input.viewport.yMin);
  const leaves: AdaptiveCell[] = [];
  const boundaryTarget = targetBoundaryPixels(input.quality);

  const refineCell = (cell: AdaptiveCell) => {
    const size = screenCellSize(input, cell);
    const boundaryClauses = compiled.clauses.flatMap((_, clauseIndex) => (
      cellMayContainBoundary(cell, clauseIndex) ? [clauseIndex] : []
    ));
    const needsCurvedRefinement = boundaryClauses.some((clauseIndex) => (
      !cellClauseIsAffine(cell, clauseIndex)
    ));
    if (boundaryClauses.length === 0
      || !needsCurvedRefinement
      || Math.max(size.width, size.height) <= boundaryTarget) {
      leaves.push(cell);
      return;
    }
    const xMid = (cell.x0 + cell.x1) / 2;
    const yMid = (cell.y0 + cell.y1) / 2;
    const children = [
      makeCell(cell.x0, xMid, yMid, cell.y1),
      makeCell(xMid, cell.x1, yMid, cell.y1),
      makeCell(cell.x0, xMid, cell.y0, yMid),
      makeCell(xMid, cell.x1, cell.y0, yMid),
    ];
    if (status !== 'complete') return;
    for (const child of children) {
      if (child) refineCell(child);
      else topologyInconclusive = true;
      if (status !== 'complete') return;
    }
  };

  for (let row = 0; row < rows && status === 'complete'; row += 1) {
    for (let column = 0; column < columns && status === 'complete'; column += 1) {
      const cell = makeCell(xAt(column), xAt(column + 1), yAt(row + 1), yAt(row));
      if (cell) refineCell(cell);
    }
  }

  if (status !== 'complete') {
    return {
      itemId: input.itemId,
      status,
      boundaries: [],
      stopReasons,
      stats: { evaluatedSamples, emittedVertices: 0, elapsedMs: Math.max(0, now() - startedAt) },
    };
  }

  const rootOnEdge = (first: SampleVertex, second: SampleVertex, clauseIndex: number) => {
    const key = edgeKey(first, second, clauseIndex);
    if (edgeRootCache.has(key)) return edgeRootCache.get(key) ?? null;
    let low = first;
    let high = second;
    let lowValue = low.values[clauseIndex]!;
    let highValue = high.values[clauseIndex]!;
    if ((lowValue <= 0) === (highValue <= 0)) {
      edgeRootCache.set(key, null);
      return null;
    }
    const rootPixelTarget = targetRootPixels(input.quality);
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const widthPixels = screenCellSize(input, {
        x0: low.x, x1: high.x, y0: low.y, y1: high.y,
      });
      if (Math.hypot(widthPixels.width, widthPixels.height) <= rootPixelTarget) break;
      const denominator = highValue - lowValue;
      let ratio = Math.abs(denominator) <= 1e-15 ? 0.5 : -lowValue / denominator;
      if (!Number.isFinite(ratio) || ratio <= 0.08 || ratio >= 0.92) ratio = 0.5;
      const candidate = evaluatePoint(
        low.x + (high.x - low.x) * ratio,
        low.y + (high.y - low.y) * ratio,
      );
      if (!candidate || status !== 'complete') {
        edgeRootCache.set(key, null);
        return null;
      }
      const value = candidate.values[clauseIndex]!;
      if ((value <= 0) === (lowValue <= 0)) {
        low = candidate;
        lowValue = value;
      } else {
        high = candidate;
        highValue = value;
      }
    }
    const root = Math.abs(lowValue) <= Math.abs(highValue) ? low : high;
    edgeRootCache.set(key, root);
    return root;
  };

  const segmentsByClause = compiled.clauses.map(() => [] as ContourSegment[]);
  const regionVertices: number[] = [];
  const regionIndices: number[] = [];
  let emittedVertices = 0;
  const canEmit = (count: number) => {
    if (emittedVertices + count <= input.limits.maximumVertices) return true;
    status = 'budget-exhausted';
    stopReasons.push({ code: 'sampling-budget-exceeded', detailCode: 'implicit-geometry-budget' });
    return false;
  };

  for (const cell of leaves) {
    for (let clauseIndex = 0; clauseIndex < compiled.clauses.length; clauseIndex += 1) {
      const code = cell.corners.reduce((value, corner, index) => (
        value | (corner.values[clauseIndex]! <= 0 ? 1 << index : 0)
      ), 0);
      const centerInside = (code === 5 || code === 10)
        ? asymptoticCenterInside(cell, clauseIndex)
        : cell.center.values[clauseIndex]! <= 0;
      for (const [firstEdge, secondEdge] of caseSegments(code, centerInside)) {
        const [firstStart, firstEnd] = edgeVertices(cell, firstEdge);
        const [secondStart, secondEnd] = edgeVertices(cell, secondEdge);
        const first = rootOnEdge(firstStart, firstEnd, clauseIndex);
        const second = rootOnEdge(secondStart, secondEnd, clauseIndex);
        if (!first || !second || status !== 'complete') continue;
        const midpoint = evaluatePoint((first.x + second.x) / 2, (first.y + second.y) / 2);
        if (!midpoint || status !== 'complete') continue;
        const otherClausesInside = midpoint.values.every((value, index) => (
          index === clauseIndex || value <= 1e-10
        ));
        if (otherClausesInside) segmentsByClause[clauseIndex]!.push({ first, second });
      }
    }

    if (!compiled.fillsRegion) continue;
    const triangles = [
      [cell.corners[0], cell.corners[1], cell.center],
      [cell.corners[1], cell.corners[2], cell.center],
      [cell.corners[2], cell.corners[3], cell.center],
      [cell.corners[3], cell.corners[0], cell.center],
    ];
    for (const triangle of triangles) {
      let polygon = triangle;
      for (let clauseIndex = 0; clauseIndex < compiled.clauses.length; clauseIndex += 1) {
        polygon = clipPolygon(polygon, clauseIndex);
        if (polygon.length < 3) break;
      }
      if (polygon.length < 3) continue;
      if (!canEmit(polygon.length)) break;
      const base = regionVertices.length / 2;
      polygon.forEach((vertex) => regionVertices.push(vertex.x, vertex.y));
      for (let index = 1; index + 1 < polygon.length; index += 1) {
        regionIndices.push(base, base + index, base + index + 1);
      }
      emittedVertices += polygon.length;
    }
    if (status !== 'complete') break;
  }

  if (status !== 'complete') {
    return {
      itemId: input.itemId,
      status,
      boundaries: [],
      stopReasons,
      stats: { evaluatedSamples, emittedVertices: 0, elapsedMs: Math.max(0, now() - startedAt) },
    };
  }

  const boundaries = compiled.clauses.flatMap((clause, index) => {
    const stitched = stitchSegments(segmentsByClause[index]!);
    const vertexCount = stitched.coordinates.length / 2;
    if (vertexCount < 2) return [];
    if (!canEmit(vertexCount)) return [];
    emittedVertices += vertexCount;
    return [{
      pathIdSuffix: `boundary:${index}`,
      strict: strictComparator(clause.operator),
      coordinates: stitched.coordinates,
      segmentOffsets: stitched.segmentOffsets,
    }];
  });

  if (status !== 'complete') {
    return {
      itemId: input.itemId,
      status,
      boundaries: [],
      stopReasons,
      stats: { evaluatedSamples, emittedVertices: 0, elapsedMs: Math.max(0, now() - startedAt) },
    };
  }

  if (topologyInconclusive) {
    stopReasons.push({ code: 'region-topology-inconclusive', detailCode: 'non-finite-implicit-cell' });
  }
  return {
    itemId: input.itemId,
    status,
    boundaries,
    ...(regionVertices.length >= 6 && regionIndices.length >= 3
      ? { region: {
          vertices: new Float64Array(regionVertices),
          triangleIndices: new Uint32Array(regionIndices),
        } }
      : {}),
    stopReasons,
    stats: {
      evaluatedSamples,
      emittedVertices,
      elapsedMs: Math.max(0, now() - startedAt),
    },
  };
}
