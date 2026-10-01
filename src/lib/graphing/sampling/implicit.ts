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
import { createGraphImplicitIntervalTester, type GraphImplicitCellVerdict, type GraphImplicitClausePlans } from './implicit-interval';
import type { GraphSamplerControl } from './types';
import { sampleDirectedInequality } from './directed';
import type { GraphAdaptiveQualityPolicyV1 } from './adaptive-policy';

type ImplicitRelation = Extract<GraphRelationIR, {
  kind: 'implicit-equality' | 'inequality' | 'chained-inequality';
}>;

export type GraphImplicitClause = {
  left: GraphExpressionEvaluator;
  right: GraphExpressionEvaluator;
  operator: GraphInequalityComparator | '=';
  /**
   * Reject sign changes that are jumps, not roots: arg(z) = c flips sign by
   * 2π across the negative real axis without ever crossing zero there.
   */
  rejectJumps?: boolean;
};
type CompiledClause = GraphImplicitClause;

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
  /** Interval topology evidence (PTX-ENGINE1); absent for prebuilt clauses, which have no tape. */
  topology?: { certifiedCells: number; uncertifiedCells: number; singularPoints: number };
};

export type GraphImplicitSamplingInput = {
  itemId: string;
  sourceRevision: number;
  relation: ImplicitRelation;
  /** Ready-made clauses (complex loci, evaluated at z = x + iy); `relation` then only names the shape. */
  prebuilt?: { clauses: GraphImplicitClause[]; fillsRegion: boolean };
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
  | { ok: true; clauses: CompiledClause[]; fillsRegion: boolean; plans?: GraphImplicitClausePlans[] }
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
  if (input.prebuilt) return { ok: true, ...input.prebuilt };
  const cache = input.cache ?? new GraphExpressionPlanCache(16);
  const clauses: CompiledClause[] = [];
  const plans: GraphImplicitClausePlans[] = [];
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
    plans.push({ left: left.plan, right: right.plan, operator: clause.operator });
  }
  return { ok: true, clauses, fillsRegion: input.relation.kind !== 'implicit-equality', plans };
}

/**
 * A root keeps its slope as bisection narrows the bracket; a jump keeps its
 * gap, so its slope grows with every halving. Undecidable brackets pass.
 */
function isJump(first: SampleVertex, second: SampleVertex, low: SampleVertex, high: SampleVertex,
  lowValue: number, highValue: number, clauseIndex: number) {
  const initialLength = Math.hypot(second.x - first.x, second.y - first.y);
  const finalLength = Math.hypot(high.x - low.x, high.y - low.y);
  if (!(finalLength > 0) || finalLength > initialLength / 4) return false;
  const initialSlope = Math.abs(second.values[clauseIndex]! - first.values[clauseIndex]!) / initialLength;
  const finalSlope = Math.abs(highValue - lowValue) / finalLength;
  return finalSlope > 8 * initialSlope;
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

/** Whether the cell's nine samples strictly straddle the clause's zero (some < 0 and some > 0); a lone exact 0 does not. */
function cellHasSignChange(cell: AdaptiveCell, clauseIndex: number) {
  const values = [...cell.corners, ...cell.edgeMidpoints, cell.center].map((point) => point.values[clauseIndex]!);
  return values.some((value) => value < 0) && values.some((value) => value > 0);
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
  const directed = input.prebuilt ? null : sampleDirectedInequality(input);
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
  let cancelled = false;
  let budgetExhausted = false;
  let topologyInconclusive = false;
  const environment: Record<string, number> = { ...input.parameterEnvironment, x: 0, y: 0 };
  const pointCache = new Map<string, SampleVertex | null>();
  const edgeRootCache = new Map<string, SampleVertex | null>();
  // Refinement may use most of the budget; the remainder is reserved so
  // contour extraction can still place crossings for every refined leaf.
  const refinementShare = 0.85;
  let sampleLimit = Math.floor(input.limits.maximumSamples * refinementShare);
  let deadline = startedAt + input.limits.maximumTimeMs * refinementShare;
  const markBudgetExhausted = (detailCode: string) => {
    if (budgetExhausted) return;
    budgetExhausted = true;
    stopReasons.push({ code: 'sampling-budget-exceeded', detailCode });
  };

  const stop = (nextEvaluations = 0) => {
    if (cancelled) return true;
    if (isCancelled()) {
      cancelled = true;
      stopReasons.push({ code: 'sampling-cancelled', detailCode: 'cooperative-implicit-cancellation' });
      return true;
    }
    if (evaluatedSamples + nextEvaluations > sampleLimit || now() >= deadline) {
      markBudgetExhausted('implicit-adaptive-budget');
      return true;
    }
    return false;
  };

  /** A vertex, `null` for a non-finite value, or `undefined` when out of budget. */
  const evaluatePoint = (x: number, y: number): SampleVertex | null | undefined => {
    const key = coordinateKey(x, y);
    if (pointCache.has(key)) return pointCache.get(key) ?? null;
    if (stop(1)) return undefined;
    environment.x = x;
    environment.y = y;
    const values: number[] = [];
    for (const clause of compiled.clauses) {
      const left = clause.left.evaluate(environment);
      const right = clause.right.evaluate(environment);
      if (left.status !== 'finite' || right.status !== 'finite') {
        evaluatedSamples += 1;
        pointCache.set(key, null);
        return null;
      }
      values.push(normalizedDifference(clause.operator, left.value, right.value));
    }
    evaluatedSamples += 1;
    const vertex = { x, y, values };
    pointCache.set(key, vertex);
    return vertex;
  };

  type CellResult =
    | { kind: 'full'; cell: AdaptiveCell }
    | { kind: 'mixed'; bounds: CellBounds }
    | { kind: 'empty' }
    | { kind: 'unavailable' };
  type CellBounds = Pick<AdaptiveCell, 'x0' | 'x1' | 'y0' | 'y1'>;

  const makeCell = (x0: number, x1: number, y0: number, y1: number): CellResult => {
    const xMid = (x0 + x1) / 2;
    const yMid = (y0 + y1) / 2;
    const points = [
      evaluatePoint(x0, y1), evaluatePoint(x1, y1),
      evaluatePoint(x1, y0), evaluatePoint(x0, y0),
      evaluatePoint(xMid, yMid),
      evaluatePoint(xMid, y1), evaluatePoint(x1, yMid),
      evaluatePoint(xMid, y0), evaluatePoint(x0, yMid),
    ];
    if (points.some((point) => point === undefined)) return { kind: 'unavailable' };
    const finiteCount = points.filter((point) => point !== null).length;
    if (finiteCount === 0) return { kind: 'empty' };
    if (finiteCount < points.length) return { kind: 'mixed', bounds: { x0, x1, y0, y1 } };
    return {
      kind: 'full',
      cell: {
        x0, x1, y0, y1,
        corners: [points[0]!, points[1]!, points[2]!, points[3]!],
        center: points[4]!,
        edgeMidpoints: [points[5]!, points[6]!, points[7]!, points[8]!],
      },
    };
  };

  const { columns, rows } = chooseGrid(input);
  const xAt = (column: number) => input.viewport.xMin
    + column / columns * (input.viewport.xMax - input.viewport.xMin);
  const yAt = (row: number) => input.viewport.yMax
    - row / rows * (input.viewport.yMax - input.viewport.yMin);
  const leaves: AdaptiveCell[] = [];
  const boundaryTarget = targetBoundaryPixels(input.quality);

  // Interval tests (PTX-ENGINE1): proved-empty cells are not refined, and cells that may hold a zero the samples
  // missed (a thin feature, a touching curve) or a curve that may branch are refined until they are small.
  // Previews are placeholders drawn while the view moves: only settled and polished samples pay for interval tests.
  const tester = compiled.plans && input.quality !== 'preview' ? createGraphImplicitIntervalTester(compiled.plans, input.parameterEnvironment) : null;
  const verdicts = new WeakMap<AdaptiveCell, GraphImplicitCellVerdict[]>();
  const verdictsOf = (cell: AdaptiveCell) => {
    let known = verdicts.get(cell);
    if (!known && tester) { known = compiled.clauses.map((_, clauseIndex) => tester.verdict(clauseIndex, cell)); verdicts.set(cell, known); }
    return known ?? null;
  };
  const needsRefinement = (cell: AdaptiveCell) => {
    const boundaryClauses = compiled.clauses.flatMap((_, clauseIndex) => (
      cellMayContainBoundary(cell, clauseIndex) ? [clauseIndex] : []
    ));
    const heuristic = boundaryClauses.some((clauseIndex) => !cellClauseIsAffine(cell, clauseIndex));
    if (!tester) return heuristic;
    // Cheap first: a plain enclosure that excludes every clause's zero proves the cell empty of boundary.
    if (compiled.clauses.every((_, clauseIndex) => tester.excludesZero(clauseIndex, cell))) return false;
    if (heuristic) return true;
    // The samples see nothing; the full verdict decides whether a thin, touching or branching curve may hide here.
    const known = verdictsOf(cell)!;
    return known.some((verdict, clauseIndex) => verdict.zeroPossible && (!cellHasSignChange(cell, clauseIndex) || !verdict.simpleArc));
  };
  const atTargetSize = (bounds: CellBounds) => {
    const size = screenCellSize(input, bounds);
    return Math.max(size.width, size.height) <= boundaryTarget;
  };
  const split = (bounds: CellBounds): CellBounds[] => {
    const xMid = (bounds.x0 + bounds.x1) / 2;
    const yMid = (bounds.y0 + bounds.y1) / 2;
    return [
      { x0: bounds.x0, x1: xMid, y0: yMid, y1: bounds.y1 },
      { x0: xMid, x1: bounds.x1, y0: yMid, y1: bounds.y1 },
      { x0: bounds.x0, x1: xMid, y0: bounds.y0, y1: yMid },
      { x0: xMid, x1: bounds.x1, y0: bounds.y0, y1: yMid },
    ];
  };

  // Breadth-first refinement: every base cell is examined before any cell is
  // refined twice, so an exhausted budget leaves coarse coverage of the whole
  // view instead of a finished band and a blank remainder.
  const queue: CellResult[] = [];
  for (let row = 0; row < rows && !stop(); row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = makeCell(xAt(column), xAt(column + 1), yAt(row + 1), yAt(row));
      if (cell.kind === 'unavailable') break;
      queue.push(cell);
    }
  }
  if (budgetExhausted && !cancelled) {
    // Not even the base grid fit; nothing below would be honest geometry.
    queue.length = 0;
  }
  for (let head = 0; head < queue.length; head += 1) {
    const entry = queue[head]!;
    if (entry.kind === 'empty' || entry.kind === 'unavailable') continue;
    if (cancelled) break;
    const exhausted = budgetExhausted;
    if (entry.kind === 'full') {
      if (exhausted || !needsRefinement(entry.cell) || atTargetSize(entry.cell)) {
        leaves.push(entry.cell);
        continue;
      }
    } else if (exhausted || atTargetSize(entry.bounds)) {
      // A domain-edge cell that could not be resolved: its finite part may
      // hold geometry that is omitted rather than guessed.
      if (!exhausted) topologyInconclusive = true;
      continue;
    }
    const bounds = entry.kind === 'full' ? entry.cell : entry.bounds;
    const children = split(bounds).map((child) => makeCell(child.x0, child.x1, child.y0, child.y1));
    if (children.some((child) => child.kind === 'unavailable')) {
      if (entry.kind === 'full') leaves.push(entry.cell);
      continue;
    }
    queue.push(...children);
  }

  if (cancelled) {
    return {
      itemId: input.itemId,
      status: 'cancelled',
      boundaries: [],
      stopReasons,
      stats: { evaluatedSamples, emittedVertices: 0, elapsedMs: Math.max(0, now() - startedAt) },
    };
  }
  sampleLimit = input.limits.maximumSamples;
  deadline = startedAt + input.limits.maximumTimeMs;

  const interpolate = (first: SampleVertex, second: SampleVertex, clauseIndex: number): SampleVertex => {
    const firstValue = first.values[clauseIndex]!;
    const denominator = firstValue - second.values[clauseIndex]!;
    const ratio = Math.abs(denominator) < 1e-15 ? 0.5 : firstValue / denominator;
    return {
      x: first.x + (second.x - first.x) * ratio,
      y: first.y + (second.y - first.y) * ratio,
      values: first.values.map((value, index) => value + (second.values[index]! - value) * ratio),
    };
  };

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
      if (candidate === undefined) {
        // Out of budget: fall back to the sign-bracketed linear estimate.
        const root = interpolate(low, high, clauseIndex);
        edgeRootCache.set(key, root);
        return root;
      }
      if (candidate === null) {
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
    if (compiled.clauses[clauseIndex]!.rejectJumps && isJump(first, second, low, high, lowValue, highValue, clauseIndex)) {
      edgeRootCache.set(key, null);
      return null;
    }
    const root = Math.abs(lowValue) <= Math.abs(highValue) ? low : high;
    edgeRootCache.set(key, root);
    return root;
  };

  const segmentsByClause = compiled.clauses.map(() => [] as ContourSegment[]);
  const regionVertices: number[] = [];
  const regionIndices: number[] = [];
  let emittedVertices = 0;
  let geometryBudgetExhausted = false;
  const canEmit = (count: number) => {
    if (emittedVertices + count <= input.limits.maximumVertices) return true;
    if (!geometryBudgetExhausted) {
      geometryBudgetExhausted = true;
      stopReasons.push({ code: 'sampling-budget-exceeded', detailCode: 'implicit-geometry-budget' });
    }
    return false;
  };

  const topology = { certifiedCells: 0, uncertifiedCells: 0, singularPoints: 0 };
  const touching = compiled.clauses.map(() => [] as Array<{ x: number; y: number; bounds: CellBounds }>);
  for (const cell of leaves) {
    if (cancelled || geometryBudgetExhausted) break;
    for (let clauseIndex = 0; clauseIndex < compiled.clauses.length; clauseIndex += 1) {
      // The full verdict only where it can matter: cells the curve crosses (topology, crossings) and small cells the
      // cheap enclosure cannot clear (touching curves). Empty cells cost nothing more.
      const crossing = cellHasSignChange(cell, clauseIndex);
      const small = atTargetSize(cell);
      const verdict = tester && (crossing || (small && !tester.excludesZero(clauseIndex, cell))) ? verdictsOf(cell)?.[clauseIndex] : undefined;
      if (verdict && tester && verdict.zeroPossible) {
        if (crossing) { if (verdict.simpleArc) topology.certifiedCells += 1; else topology.uncertifiedCells += 1; }
        if (!crossing && small) {
          // A curve that only touches zero here: no sign change, but the enclosure cannot exclude 0.
          const point = tester.touchingPoint(clauseIndex, cell);
          if (point) touching[clauseIndex]!.push({ ...point, bounds: cell });
          continue;
        }
        if (crossing && small && !verdict.simpleArc && verdict.gradientMayVanish) {
          // A crossing or cusp: join every edge crossing of the cell through the singular point.
          const singular = tester.singularPoint(clauseIndex, cell);
          if (singular) {
            const centre = evaluatePoint(singular.x, singular.y);
            if (centre) {
              topology.singularPoints += 1;
              for (let edge = 0; edge < 4; edge += 1) {
                const [start, end] = edgeVertices(cell, edge);
                const root = rootOnEdge(start, end, clauseIndex);
                if (root) segmentsByClause[clauseIndex]!.push({ first: root, second: centre });
              }
              continue;
            }
          }
        }
      }
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
        if (!first || !second || cancelled) continue;
        const midpoint = evaluatePoint((first.x + second.x) / 2, (first.y + second.y) / 2);
        if (midpoint === null) continue;
        const midpointValues = midpoint
          ? midpoint.values
          : first.values.map((value, index) => (value + second.values[index]!) / 2);
        const otherClausesInside = midpointValues.every((value, index) => (
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
  }

  // Touching curves: join the touching points of neighbouring cells; a lone one (x² + y² = 0) is a dot.
  touching.forEach((found, clauseIndex) => {
    // Cells that share a corner find the same point (x² + y² = 0 at a grid vertex): keep one, with the union of their cells.
    const points: typeof found = [];
    for (const point of found) {
      const same = points.find((other) => Math.abs(other.x - point.x) <= 1e-9 * (point.bounds.x1 - point.bounds.x0)
        && Math.abs(other.y - point.y) <= 1e-9 * (point.bounds.y1 - point.bounds.y0));
      if (!same) { points.push({ ...point }); continue; }
      same.bounds = { x0: Math.min(same.bounds.x0, point.bounds.x0), x1: Math.max(same.bounds.x1, point.bounds.x1),
        y0: Math.min(same.bounds.y0, point.bounds.y0), y1: Math.max(same.bounds.y1, point.bounds.y1) };
    }
    const near = (a: CellBounds, b: CellBounds) => {
      const slackX = 0.01 * (a.x1 - a.x0); const slackY = 0.01 * (a.y1 - a.y0);
      return a.x0 <= b.x1 + slackX && b.x0 <= a.x1 + slackX && a.y0 <= b.y1 + slackY && b.y0 <= a.y1 + slackY;
    };
    points.forEach((point, index) => {
      const vertex = evaluatePoint(point.x, point.y);
      if (!vertex) return;
      let joined = false;
      for (let other = index + 1; other < points.length; other += 1) {
        if (!near(point.bounds, points[other]!.bounds)) continue;
        const next = evaluatePoint(points[other]!.x, points[other]!.y);
        if (next) { segmentsByClause[clauseIndex]!.push({ first: vertex, second: next }); joined = true; }
      }
      if (!joined && !points.some((candidate, j) => j < index && near(candidate.bounds, point.bounds))) {
        const tiny = 1e-3 * (point.bounds.x1 - point.bounds.x0);
        segmentsByClause[clauseIndex]!.push({ first: vertex, second: { ...vertex, x: vertex.x + tiny } });
      }
    });
  });

  if (cancelled) {
    return {
      itemId: input.itemId,
      status: 'cancelled',
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

  if (topologyInconclusive) {
    stopReasons.push({ code: 'region-topology-inconclusive', detailCode: 'non-finite-implicit-cell' });
  }
  return {
    itemId: input.itemId,
    status: budgetExhausted || geometryBudgetExhausted ? 'budget-exhausted' : 'complete',
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
    ...(tester ? { topology } : {}),
  };
}
