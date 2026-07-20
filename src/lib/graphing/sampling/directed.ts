import type {
  GraphExpressionIR,
  GraphInequalityComparator,
  GraphRelationIR,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import { compileExplicitGraphRelation } from './compile';
import { sampleExplicitGraphRelation } from './explicit';
import type { GraphImplicitSamplingInput, GraphSampledImplicitRelation } from './implicit';

type Direction = 'below' | 'above' | 'left' | 'right';

type DirectedRoute = {
  coordinate: 'x' | 'y';
  expression: GraphExpressionIR;
  direction: Direction;
  strict: boolean;
};

function coordinateExpression(expression: GraphExpressionIR, coordinate: 'x' | 'y') {
  return expression.mathJson === coordinate && expression.freeSymbols.length === 1;
}

function excludesCoordinate(expression: GraphExpressionIR, coordinate: 'x' | 'y') {
  return !expression.freeSymbols.includes(coordinate);
}

function reverse(operator: GraphInequalityComparator): GraphInequalityComparator {
  if (operator === '<') return '>';
  if (operator === '<=') return '>=';
  if (operator === '>') return '<';
  return '<=';
}

function routeDirection(coordinate: 'x' | 'y', operator: GraphInequalityComparator): Direction {
  if (coordinate === 'y') return operator === '<' || operator === '<=' ? 'below' : 'above';
  return operator === '<' || operator === '<=' ? 'left' : 'right';
}

function classifyDirected(relation: GraphRelationIR): DirectedRoute | null {
  if (relation.kind !== 'inequality') return null;
  for (const coordinate of ['y', 'x'] as const) {
    if (coordinateExpression(relation.left, coordinate) && excludesCoordinate(relation.right, coordinate)) {
      return {
        coordinate,
        expression: relation.right,
        direction: routeDirection(coordinate, relation.operator),
        strict: relation.operator === '<' || relation.operator === '>',
      };
    }
    if (coordinateExpression(relation.right, coordinate) && excludesCoordinate(relation.left, coordinate)) {
      const operator = reverse(relation.operator);
      return {
        coordinate,
        expression: relation.left,
        direction: routeDirection(coordinate, operator),
        strict: operator === '<' || operator === '>',
      };
    }
  }
  return null;
}

function regionEdge(input: GraphImplicitSamplingInput, direction: Direction) {
  if (direction === 'below') return input.viewport.yMin;
  if (direction === 'above') return input.viewport.yMax;
  if (direction === 'left') return input.viewport.xMin;
  return input.viewport.xMax;
}

function buildStrip(
  input: GraphImplicitSamplingInput,
  coordinates: Float64Array,
  segmentOffsets: Uint32Array,
  direction: Direction,
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const edge = regionEdge(input, direction);
  for (let segment = 0; segment < segmentOffsets.length; segment += 1) {
    const start = segmentOffsets[segment]!;
    const end = segment + 1 < segmentOffsets.length
      ? segmentOffsets[segment + 1]!
      : coordinates.length / 2;
    for (let vertex = start; vertex + 1 < end; vertex += 1) {
      const x1 = coordinates[vertex * 2]!;
      const y1 = coordinates[vertex * 2 + 1]!;
      const x2 = coordinates[(vertex + 1) * 2]!;
      const y2 = coordinates[(vertex + 1) * 2 + 1]!;
      const base = vertices.length / 2;
      if (direction === 'below' || direction === 'above') {
        vertices.push(x1, y1, x2, y2, x2, edge, x1, edge);
      } else {
        vertices.push(x1, y1, x2, y2, edge, y2, edge, y1);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return { vertices: new Float64Array(vertices), triangleIndices: new Uint32Array(indices) };
}

export function sampleDirectedInequality(
  input: GraphImplicitSamplingInput,
): GraphSampledImplicitRelation | null {
  const route = classifyDirected(input.relation);
  if (!route) return null;
  const cache = input.cache ?? new GraphExpressionPlanCache(16);
  const relation: GraphRelationIR = route.coordinate === 'y'
    ? { kind: 'explicit-y', rhs: route.expression, origin: 'authored-relation' }
    : { kind: 'explicit-x', rhs: route.expression };
  const compiled = compileExplicitGraphRelation({
    itemId: `${input.itemId}:directed-boundary`,
    sourceRevision: input.sourceRevision,
    relation,
    cache,
  });
  if (!compiled.ok) {
    return {
      itemId: input.itemId,
      status: 'complete',
      boundaries: [],
      stopReasons: [compiled.stopReason],
      stats: { evaluatedSamples: 0, emittedVertices: 0, elapsedMs: 0 },
    };
  }
  const sampled = sampleExplicitGraphRelation({
    plan: compiled.plan,
    viewport: input.viewport,
    cssSize: input.cssSize,
    parameterEnvironment: input.parameterEnvironment,
    quality: input.quality,
    budgets: input.budgets,
    control: input.control,
  });
  const boundary = sampled.coordinates.length >= 4
    ? [{
        pathIdSuffix: 'boundary:0',
        strict: route.strict,
        coordinates: sampled.coordinates,
        segmentOffsets: sampled.segmentOffsets,
      }]
    : [];
  const region = boundary.length > 0
    ? buildStrip(input, sampled.coordinates, sampled.segmentOffsets, route.direction)
    : undefined;
  return {
    itemId: input.itemId,
    status: sampled.status,
    boundaries: boundary,
    ...(region ? { region } : {}),
    stopReasons: sampled.stopReason ? [sampled.stopReason] : [],
    stats: sampled.stats,
  };
}
