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
    if (!left.ok) return left;
    const right = cache.getOrCompile({
      planId: `${input.itemId}.${input.relation.kind}.${index}.right`,
      sourceRevision: input.sourceRevision,
      expression: clause.right,
    });
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

function chooseGrid(input: GraphImplicitSamplingInput, clauseCount: number) {
  const spacing = input.policy?.implicitCellPixels ?? (input.quality === 'preview' ? 32 : input.quality === 'settled' ? 12 : 6);
  let columns = Math.max(8, Math.ceil(input.cssSize.width / spacing));
  let rows = Math.max(8, Math.ceil(input.cssSize.height / spacing));
  const evaluationsPerPoint = Math.max(2, clauseCount * 2);
  const estimated = ((columns + 1) * (rows + 1) + columns * rows) * evaluationsPerPoint;
  const available = Math.max(1, Math.floor(input.limits.maximumSamples * 0.94));
  if (estimated > available) {
    const scale = Math.sqrt(available / estimated);
    columns = Math.max(2, Math.floor(columns * scale));
    rows = Math.max(2, Math.floor(rows * scale));
  }
  const maximumCellsFromVertices = Math.max(4, Math.floor(input.limits.maximumVertices / 28));
  if (columns * rows > maximumCellsFromVertices) {
    const scale = Math.sqrt(maximumCellsFromVertices / (columns * rows));
    columns = Math.max(2, Math.floor(columns * scale));
    rows = Math.max(2, Math.floor(rows * scale));
  }
  return { columns, rows };
}

function interpolateEdge(first: SampleVertex, second: SampleVertex, clauseIndex: number) {
  const firstValue = first.values[clauseIndex]!;
  const secondValue = second.values[clauseIndex]!;
  const denominator = firstValue - secondValue;
  const ratio = Math.abs(denominator) < 1e-14
    ? 0.5
    : Math.max(0, Math.min(1, firstValue / denominator));
  return {
    x: first.x + (second.x - first.x) * ratio,
    y: first.y + (second.y - first.y) * ratio,
  };
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

function edgePoint(corners: SampleVertex[], edge: number, clauseIndex: number) {
  switch (edge) {
    case 0: return interpolateEdge(corners[0]!, corners[1]!, clauseIndex);
    case 1: return interpolateEdge(corners[1]!, corners[2]!, clauseIndex);
    case 2: return interpolateEdge(corners[3]!, corners[2]!, clauseIndex);
    default: return interpolateEdge(corners[0]!, corners[3]!, clauseIndex);
  }
}

function otherClausesInside(
  point: { x: number; y: number },
  corners: SampleVertex[],
  clauseIndex: number,
) {
  if (corners[0]!.values.length === 1) return true;
  const xSpan = corners[1]!.x - corners[0]!.x;
  const ySpan = corners[3]!.y - corners[0]!.y;
  const u = xSpan === 0 ? 0.5 : (point.x - corners[0]!.x) / xSpan;
  const v = ySpan === 0 ? 0.5 : (point.y - corners[0]!.y) / ySpan;
  for (let index = 0; index < corners[0]!.values.length; index += 1) {
    if (index === clauseIndex) continue;
    const top = corners[0]!.values[index]! * (1 - u) + corners[1]!.values[index]! * u;
    const bottom = corners[3]!.values[index]! * (1 - u) + corners[2]!.values[index]! * u;
    if (top * (1 - v) + bottom * v > 1e-10) return false;
  }
  return true;
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

function strictComparator(operator: CompiledClause['operator']) {
  return operator === '<' || operator === '>';
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
  const { columns, rows } = chooseGrid(input, compiled.clauses.length);
  const nodeValues = new Float64Array((columns + 1) * (rows + 1) * compiled.clauses.length);
  nodeValues.fill(Number.NaN);
  const centerValues = new Float64Array(columns * rows * compiled.clauses.length);
  centerValues.fill(Number.NaN);
  const stopReasons: GraphStopReason[] = [];
  let evaluatedSamples = 0;
  let emittedVertices = 0;
  let status: GraphSampledImplicitRelation['status'] = 'complete';
  let topologyInconclusive = false;
  const environment: Record<string, number> = {
    ...input.parameterEnvironment,
    x: 0,
    y: 0,
  };

  const shouldStop = () => {
    if (isCancelled()) {
      status = 'cancelled';
      stopReasons.push({ code: 'sampling-cancelled', detailCode: 'cooperative-implicit-cancellation' });
      return true;
    }
    if (evaluatedSamples + 2 > input.limits.maximumSamples
      || now() - startedAt >= input.limits.maximumTimeMs) {
      status = 'budget-exhausted';
      stopReasons.push({ code: 'sampling-budget-exceeded', detailCode: 'implicit-grid-budget' });
      return true;
    }
    return false;
  };
  const evaluatePoint = (x: number, y: number) => {
    const values: number[] = [];
    environment.x = x;
    environment.y = y;
    for (const clause of compiled.clauses) {
      if (shouldStop()) return null;
      const left = clause.left.evaluate(environment);
      evaluatedSamples += 1;
      const right = clause.right.evaluate(environment);
      evaluatedSamples += 1;
      if (left.status !== 'finite' || right.status !== 'finite') return null;
      values.push(normalizedDifference(clause.operator, left.value, right.value));
    }
    return values;
  };
  const xAt = (column: number) => input.viewport.xMin
    + column / columns * (input.viewport.xMax - input.viewport.xMin);
  const yAt = (row: number) => input.viewport.yMax
    - row / rows * (input.viewport.yMax - input.viewport.yMin);
  const xCoordinates = Float64Array.from({ length: columns + 1 }, (_, column) => xAt(column));
  const yCoordinates = Float64Array.from({ length: rows + 1 }, (_, row) => yAt(row));
  const nodeOffset = (row: number, column: number, clause: number) => (
    ((row * (columns + 1) + column) * compiled.clauses.length) + clause
  );
  const centerOffset = (row: number, column: number, clause: number) => (
    ((row * columns + column) * compiled.clauses.length) + clause
  );

  grid: for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const values = evaluatePoint(xCoordinates[column]!, yCoordinates[row]!);
      if (!values) {
        if (status !== 'complete') break grid;
        continue;
      }
      values.forEach((value, clause) => { nodeValues[nodeOffset(row, column, clause)] = value; });
    }
  }
  if (status === 'complete') {
    centers: for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const values = evaluatePoint(
          (xCoordinates[column]! + xCoordinates[column + 1]!) / 2,
          (yCoordinates[row]! + yCoordinates[row + 1]!) / 2,
        );
        if (!values) {
          if (status !== 'complete') break centers;
          continue;
        }
        values.forEach((value, clause) => { centerValues[centerOffset(row, column, clause)] = value; });
      }
    }
  }

  if (status !== 'complete') {
    return {
      itemId: input.itemId,
      status,
      boundaries: [],
      stopReasons,
      stats: {
        evaluatedSamples,
        emittedVertices: 0,
        elapsedMs: Math.max(0, now() - startedAt),
      },
    };
  }

  const boundaryCoordinates = compiled.clauses.map(() => [] as number[]);
  const boundaryOffsets = compiled.clauses.map(() => [] as number[]);
  const regionVertices: number[] = [];
  const regionIndices: number[] = [];
  const canEmit = (count: number) => {
    if (emittedVertices + count <= input.limits.maximumVertices) return true;
    if (status === 'complete') {
      status = 'budget-exhausted';
      stopReasons.push({ code: 'sampling-budget-exceeded', detailCode: 'implicit-geometry-budget' });
    }
    return false;
  };

  cells: for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const corners: SampleVertex[] = [
        { x: xCoordinates[column]!, y: yCoordinates[row]!, values: [] },
        { x: xCoordinates[column + 1]!, y: yCoordinates[row]!, values: [] },
        { x: xCoordinates[column + 1]!, y: yCoordinates[row + 1]!, values: [] },
        { x: xCoordinates[column]!, y: yCoordinates[row + 1]!, values: [] },
      ];
      const center: SampleVertex = {
        x: (corners[0]!.x + corners[2]!.x) / 2,
        y: (corners[0]!.y + corners[2]!.y) / 2,
        values: [],
      };
      let finite = true;
      for (let clause = 0; clause < compiled.clauses.length; clause += 1) {
        corners[0]!.values.push(nodeValues[nodeOffset(row, column, clause)]!);
        corners[1]!.values.push(nodeValues[nodeOffset(row, column + 1, clause)]!);
        corners[2]!.values.push(nodeValues[nodeOffset(row + 1, column + 1, clause)]!);
        corners[3]!.values.push(nodeValues[nodeOffset(row + 1, column, clause)]!);
        center.values.push(centerValues[centerOffset(row, column, clause)]!);
        finite = finite && corners.every((corner) => Number.isFinite(corner.values[clause]))
          && Number.isFinite(center.values[clause]);
      }
      if (!finite) {
        topologyInconclusive = true;
        continue;
      }

      for (let clause = 0; clause < compiled.clauses.length; clause += 1) {
        const code = corners.reduce((value, corner, index) => (
          value | (corner.values[clause]! <= 0 ? 1 << index : 0)
        ), 0);
        for (const [firstEdge, secondEdge] of caseSegments(code, center.values[clause]! <= 0)) {
          const first = edgePoint(corners, firstEdge, clause);
          const second = edgePoint(corners, secondEdge, clause);
          const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
          if (!otherClausesInside(midpoint, corners, clause)) continue;
          if (!canEmit(2)) break cells;
          boundaryOffsets[clause]!.push(boundaryCoordinates[clause]!.length / 2);
          boundaryCoordinates[clause]!.push(first.x, first.y, second.x, second.y);
          emittedVertices += 2;
        }
      }

      if (!compiled.fillsRegion) continue;
      const triangles = [
        [corners[0]!, corners[1]!, center],
        [corners[1]!, corners[2]!, center],
        [corners[2]!, corners[3]!, center],
        [corners[3]!, corners[0]!, center],
      ];
      for (const triangle of triangles) {
        let polygon = triangle;
        for (let clause = 0; clause < compiled.clauses.length; clause += 1) {
          polygon = clipPolygon(polygon, clause);
          if (polygon.length < 3) break;
        }
        if (polygon.length < 3) continue;
        if (!canEmit(polygon.length)) break cells;
        const base = regionVertices.length / 2;
        polygon.forEach((vertex) => regionVertices.push(vertex.x, vertex.y));
        for (let index = 1; index + 1 < polygon.length; index += 1) {
          regionIndices.push(base, base + index, base + index + 1);
        }
        emittedVertices += polygon.length;
      }
    }
  }

  if (topologyInconclusive) {
    stopReasons.push({ code: 'region-topology-inconclusive', detailCode: 'non-finite-implicit-cell' });
  }
  const boundaries = compiled.clauses.flatMap((clause, index) => (
    boundaryCoordinates[index]!.length >= 4
      ? [{
          pathIdSuffix: `boundary:${index}`,
          strict: strictComparator(clause.operator),
          coordinates: new Float64Array(boundaryCoordinates[index]),
          segmentOffsets: new Uint32Array(boundaryOffsets[index]),
        }]
      : []
  ));
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
