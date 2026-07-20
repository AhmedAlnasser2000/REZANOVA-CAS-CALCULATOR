import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR, GraphRelationIR } from '../contracts';
import { sampleImplicitGraphRelation } from './implicit';

const viewport = {
  coordinateSystem: 'cartesian' as const,
  xMin: -4,
  xMax: 4,
  yMin: -4,
  yMax: 4,
};

function expression(mathJson: GraphExpressionIR['mathJson'], freeSymbols = ['x', 'y']) {
  return { mathJson, freeSymbols } satisfies GraphExpressionIR;
}

function sample(relation: Extract<GraphRelationIR, {
  kind: 'implicit-equality' | 'inequality' | 'chained-inequality';
}>, overrides: Partial<Parameters<typeof sampleImplicitGraphRelation>[0]> = {}) {
  return sampleImplicitGraphRelation({
    itemId: 'implicit.1',
    sourceRevision: 1,
    relation,
    viewport,
    cssSize: { width: 420, height: 420 },
    parameterEnvironment: {},
    quality: 'settled',
    limits: {
      maximumSamples: 20_000,
      maximumTimeMs: 500,
      maximumVertices: 20_000,
    },
    ...overrides,
  });
}

const circleLeft = expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]]);

describe('Graph implicit contour and region sampler', () => {
  it('samples viewport-bounded implicit equality as boundary geometry only', () => {
    const result = sample({
      kind: 'implicit-equality',
      left: circleLeft,
      right: expression(4, []),
    });
    expect(result.status).toBe('complete');
    expect(result.boundaries).toHaveLength(1);
    expect(result.region).toBeUndefined();
    expect(result.boundaries[0]?.strict).toBe(false);
    expect(result.boundaries[0]?.coordinates.length).toBeGreaterThan(20);
    expect([...result.boundaries[0]!.coordinates].every(Number.isFinite)).toBe(true);
  });

  it('keeps inequality fill triangles separate from solid and dashed boundaries', () => {
    const inclusive = sample({
      kind: 'inequality',
      left: circleLeft,
      operator: '<=',
      right: expression(4, []),
    });
    expect(inclusive.boundaries[0]?.strict).toBe(false);
    expect(inclusive.region?.vertices.length).toBeGreaterThan(20);
    expect(inclusive.region?.triangleIndices.length).toBeGreaterThan(9);

    const strict = sample({
      kind: 'inequality',
      left: circleLeft,
      operator: '<',
      right: expression(4, []),
    });
    expect(strict.boundaries[0]?.strict).toBe(true);
    expect(strict.region?.triangleIndices.length).toBeGreaterThan(9);
  });

  it('uses compact directed geometry for coordinate-isolated inequalities', () => {
    const result = sample({
      kind: 'inequality',
      left: expression('y', ['y']),
      operator: '<',
      right: expression('x', ['x']),
    });
    expect(result.status).toBe('complete');
    expect(result.stopReasons).toEqual([]);
    expect(result.boundaries).toHaveLength(1);
    expect(result.boundaries[0]?.strict).toBe(true);
    expect(result.region).toBeDefined();
    expect(result.region!.vertices.length).toBeLessThan(1_000);
    expect(result.region!.triangleIndices.length).toBeLessThan(1_000);
  });

  it('clips supported chained intersections instead of filling either clause alone', () => {
    const result = sample({
      kind: 'chained-inequality',
      operands: [expression(-1, []), expression('x', ['x']), expression(1, [])],
      operators: ['<', '<'],
    });
    expect(result.status).toBe('complete');
    expect(result.boundaries).toHaveLength(2);
    expect(result.boundaries.every((boundary) => boundary.strict)).toBe(true);
    expect(result.region).toBeDefined();
    const xs = Array.from(result.region!.vertices).filter((_, index) => index % 2 === 0);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1.000001);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1.000001);
  });

  it('surfaces non-finite topology and hard budget stops without complete-looking fill', () => {
    const nonFinite = sample({
      kind: 'implicit-equality',
      left: expression(['Ln', 'x'], ['x']),
      right: expression('y', ['y']),
    });
    expect(nonFinite.stopReasons).toContainEqual(expect.objectContaining({
      code: 'region-topology-inconclusive',
    }));
    expect(nonFinite.boundaries.length).toBeGreaterThanOrEqual(1);

    const bounded = sample({
      kind: 'inequality',
      left: circleLeft,
      operator: '<=',
      right: expression(4, []),
    }, {
      limits: {
        maximumSamples: 60,
        maximumTimeMs: 500,
        maximumVertices: 24,
      },
    });
    expect(bounded.status).toBe('budget-exhausted');
    expect(bounded.stats.evaluatedSamples).toBeLessThanOrEqual(60);
    expect(bounded.stats.emittedVertices).toBeLessThanOrEqual(24);
    expect(bounded.stopReasons).toContainEqual(expect.objectContaining({
      code: 'sampling-budget-exceeded',
    }));
  });
});
