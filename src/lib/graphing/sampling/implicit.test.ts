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

function points(result: ReturnType<typeof sample>) {
  return Array.from(result.boundaries[0]?.coordinates ?? []).reduce<Array<{ x: number; y: number }>>(
    (entries, coordinate, index, coordinates) => {
      if (index % 2 === 0) entries.push({ x: coordinate, y: coordinates[index + 1]! });
      return entries;
    },
    [],
  );
}

function maximumSegmentError(
  result: ReturnType<typeof sample>,
  residual: (x: number, y: number) => number,
) {
  const boundary = result.boundaries[0]!;
  const coordinates = Array.from(boundary.coordinates);
  const offsets = [...boundary.segmentOffsets, coordinates.length / 2];
  let maximum = 0;
  for (let pathIndex = 0; pathIndex + 1 < offsets.length; pathIndex += 1) {
    for (let vertex = offsets[pathIndex]!; vertex + 1 < offsets[pathIndex + 1]!; vertex += 1) {
      const x = (coordinates[vertex * 2]! + coordinates[(vertex + 1) * 2]!) / 2;
      const y = (coordinates[vertex * 2 + 1]! + coordinates[(vertex + 1) * 2 + 1]!) / 2;
      maximum = Math.max(maximum, Math.abs(residual(x, y)));
    }
  }
  return maximum;
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
    expect(result.boundaries[0]!.segmentOffsets.length).toBe(1);
    expect(maximumSegmentError(result, (x, y) => Math.hypot(x, y) - 2)).toBeLessThan(0.01);
  });

  it('keeps translated circles and ellipses smooth in screen space', () => {
    const translated = sample({
      kind: 'implicit-equality',
      left: expression([
        'Add',
        ['Power', ['Add', 'x', ['Negate', 1.25]], 2],
        ['Power', ['Add', 'y', 0.75], 2],
      ]),
      right: expression(1.44, []),
    });
    expect(translated.status).toBe('complete');
    expect(translated.boundaries[0]!.segmentOffsets.length).toBe(1);
    expect(maximumSegmentError(
      translated,
      (x, y) => Math.hypot(x - 1.25, y + 0.75) - 1.2,
    )).toBeLessThan(0.012);

    const ellipse = sample({
      kind: 'implicit-equality',
      left: expression([
        'Add',
        ['Divide', ['Power', 'x', 2], 4],
        ['Power', 'y', 2],
      ]),
      right: expression(1, []),
    });
    expect(ellipse.status).toBe('complete');
    expect(ellipse.boundaries[0]!.segmentOffsets.length).toBe(1);
    expect(maximumSegmentError(
      ellipse,
      (x, y) => x * x / 4 + y * y - 1,
    )).toBeLessThan(0.02);
  });

  it('stitches open hyperbolas and nonlinear implicit contours without cell fragments', () => {
    const hyperbola = sample({
      kind: 'implicit-equality',
      left: expression(['Add', ['Power', 'x', 2], ['Negate', ['Power', 'y', 2]]]),
      right: expression(1, []),
    });
    expect(hyperbola.status).toBe('complete');
    expect(hyperbola.boundaries[0]!.segmentOffsets.length).toBe(2);
    expect(points(hyperbola).length).toBeGreaterThan(100);

    const nonlinear = sample({
      kind: 'implicit-equality',
      left: expression(['Add', ['Power', 'x', 2], ['Power', 'y', 3]]),
      right: expression(9, []),
    });
    expect(nonlinear.status).toBe('complete');
    expect(nonlinear.boundaries[0]!.segmentOffsets.length).toBeLessThanOrEqual(2);
    expect(points(nonlinear).length).toBeGreaterThan(50);
  });

  it('detects cusps, lemniscate lobes, and small off-grid loops', () => {
    const cusp = sample({
      kind: 'implicit-equality',
      left: expression(['Power', 'y', 2], ['y']),
      right: expression(['Power', 'x', 3], ['x']),
    });
    expect(cusp.status).toBe('complete');
    expect(points(cusp).some(({ x, y }) => Math.hypot(x, y) < 0.08)).toBe(true);

    const lemniscate = sample({
      kind: 'implicit-equality',
      left: expression(['Power', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]], 2]),
      right: expression(['Add', ['Power', 'x', 2], ['Negate', ['Power', 'y', 2]]]),
    });
    expect(lemniscate.status).toBe('complete');
    expect(points(lemniscate).some(({ x, y }) => Math.hypot(x, y) < 0.04)).toBe(true);

    const smallLoop = sample({
      kind: 'implicit-equality',
      left: expression([
        'Add',
        ['Power', ['Add', 'x', ['Negate', 0.37]], 2],
        ['Power', ['Add', 'y', 0.41], 2],
      ]),
      right: expression(0.0225, []),
    });
    expect(smallLoop.status).toBe('complete');
    expect(smallLoop.boundaries[0]!.segmentOffsets.length).toBe(1);
    expect(points(smallLoop).length).toBeGreaterThan(10);
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

  it('keeps breadth-first partial geometry across the whole view when the budget runs out', () => {
    const mixedPower = {
      kind: 'implicit-equality' as const,
      left: expression(['Multiply', 'x', ['Power', 'y', ['Add', ['Sin', 'x'], ['Negate', ['Cos', 'x']]]]]),
      right: expression(['Power', 'y', ['Multiply', 3, 'x']]),
    };
    const wide = sample(mixedPower, {
      viewport: { coordinateSystem: 'cartesian', xMin: -20, xMax: 20, yMin: -12, yMax: 12 },
      cssSize: { width: 1000, height: 600 },
      limits: { maximumSamples: 47_232, maximumTimeMs: 5_000, maximumVertices: 100_000 },
    });
    // This wide view previously returned no geometry at all once the sample
    // budget ran out; partial output must survive and be reported as such.
    expect(wide.status).toBe('budget-exhausted');
    expect(wide.stats.evaluatedSamples).toBeLessThanOrEqual(47_232);
    const xs = Array.from(wide.boundaries[0]?.coordinates ?? []).filter((_, index) => index % 2 === 0);
    expect(xs.length).toBeGreaterThan(40);
    expect(Math.min(...xs)).toBeLessThan(1);
    expect(Math.max(...xs)).toBeGreaterThan(15);

    const circle = sample({ kind: 'implicit-equality', left: circleLeft, right: expression(4, []) }, {
      limits: { maximumSamples: 2_000, maximumTimeMs: 5_000, maximumVertices: 20_000 },
    });
    expect(circle.status).toBe('budget-exhausted');
    const quadrants = new Set(points(circle).map((point) => `${point.x >= 0}:${point.y >= 0}`));
    expect(quadrants.size).toBe(4);
  });

  it('resolves contours beside real-domain edges instead of dropping mixed cells', () => {
    const nestedLog = sample({
      kind: 'implicit-equality',
      left: expression(['Sin', ['Ln', ['Add', ['Cos', 'y'], 'x']]]),
      right: expression(0, []),
    }, {
      cssSize: { width: 800, height: 800 },
      limits: { maximumSamples: 47_232, maximumTimeMs: 5_000, maximumVertices: 100_000 },
    });
    expect(nestedLog.status).toBe('complete');
    // Rows (1 CSS px) covered by each branch x + cos(y) = e^(k*pi).
    const covered = new Map<number, Set<number>>();
    const boundary = nestedLog.boundaries[0]!;
    const offsets = [...boundary.segmentOffsets, boundary.coordinates.length / 2];
    for (let path = 0; path + 1 < offsets.length; path += 1) {
      for (let vertex = offsets[path]!; vertex + 1 < offsets[path + 1]!; vertex += 1) {
        const [x0, y0, x1, y1] = [0, 1, 2, 3].map((offset) => boundary.coordinates[vertex * 2 + offset]!);
        const branch = Math.round(Math.log((x0! + x1!) / 2 + Math.cos((y0! + y1!) / 2)) / Math.PI);
        const rows = covered.get(branch) ?? new Set<number>();
        covered.set(branch, rows);
        for (let row = Math.floor((Math.min(y0!, y1!) + 4) * 100); row <= Math.floor((Math.max(y0!, y1!) + 4) * 100); row += 1) rows.add(row);
      }
    }
    expect((covered.get(0)?.size ?? 0) / 800).toBeGreaterThan(0.99);
    // x + cos(y) = e^(-pi) runs ~4 px from the undefined region; it was
    // almost entirely missing before domain-edge cells were subdivided.
    expect((covered.get(-1)?.size ?? 0) / 800).toBeGreaterThan(0.95);
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
