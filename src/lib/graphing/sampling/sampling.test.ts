import { describe, expect, it } from 'vitest';
import type {
  GraphExpressionIR,
  GraphRelationIR,
  GraphViewportV1,
} from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import { compileExplicitGraphRelation } from './compile';
import { minimumSamplingBudgets, sampleExplicitGraphRelation } from './explicit';

const VIEWPORT: GraphViewportV1 = {
  coordinateSystem: 'cartesian',
  xMin: -10,
  xMax: 10,
  yMin: -5,
  yMax: 5,
};

function expression(
  mathJson: GraphExpressionIR['mathJson'],
  freeSymbols: string[],
): GraphExpressionIR {
  return { mathJson, freeSymbols };
}

function compile(
  relation: GraphRelationIR,
  sourceRevision = 1,
  cache = new GraphExpressionPlanCache(8),
) {
  const result = compileExplicitGraphRelation({
    itemId: 'item.1',
    sourceRevision,
    relation,
    cache,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected an explicit Graph sampling plan.');
  return result.plan;
}

function sample(
  relation: GraphRelationIR,
  overrides: Partial<Parameters<typeof sampleExplicitGraphRelation>[0]> = {},
) {
  return sampleExplicitGraphRelation({
    plan: compile(relation),
    viewport: VIEWPORT,
    cssSize: { width: 1_000, height: 500 },
    parameterEnvironment: {},
    quality: 'settled',
    budgets: minimumSamplingBudgets(),
    ...overrides,
  });
}

function explicitY(mathJson: GraphExpressionIR['mathJson'], freeSymbols = ['x']): GraphRelationIR {
  return {
    kind: 'explicit-y',
    origin: 'bare-expression',
    rhs: expression(mathJson, freeSymbols),
  };
}

function expectBoundedPath(result: ReturnType<typeof sampleExplicitGraphRelation>) {
  expect(result.coordinates).toBeInstanceOf(Float64Array);
  expect(result.independentValues).toBeInstanceOf(Float64Array);
  expect(result.segmentOffsets).toBeInstanceOf(Uint32Array);
  expect(result.coordinates.length).toBe(result.independentValues.length * 2);
  expect([...result.coordinates].every(Number.isFinite)).toBe(true);
  expect(result.stats.emittedVertices).toBe(result.independentValues.length);
  expect(result.stats.evaluatedSamples).toBeLessThanOrEqual(8_192);
  for (let index = 0; index < result.segmentOffsets.length; index += 1) {
    const start = result.segmentOffsets[index];
    const end = result.segmentOffsets[index + 1] ?? result.independentValues.length;
    expect(end - start).toBeGreaterThanOrEqual(2);
    if (index === 0) expect(start).toBe(0);
    else expect(start).toBeGreaterThan(result.segmentOffsets[index - 1]);
  }
}

describe('Graph explicit screen-space sampler', () => {
  it('samples smooth functions into finite renderer-neutral typed arrays', () => {
    const result = sample(explicitY(['Sin', 'x']));
    expect(result.status).toBe('complete');
    expect(result.segmentOffsets).toEqual(new Uint32Array([0]));
    expect(result.independentValues[0]).toBeLessThan(-10);
    expect(result.independentValues.at(-1)).toBeGreaterThan(10);
    expectBoundedPath(result);
  });

  it('breaks at non-finite transitions instead of joining across an asymptote', () => {
    const result = sample(explicitY(['Divide', 1, 'x']));
    expect(result.status).toBe('complete');
    expect(result.segmentOffsets.length).toBeGreaterThanOrEqual(2);
    expect([...result.independentValues]).not.toContain(0);
    const zeroCrossingSegment = [...result.segmentOffsets].some((start, index) => {
      const end = result.segmentOffsets[index + 1] ?? result.independentValues.length;
      return result.independentValues[start] < 0 && result.independentValues[end - 1] > 0;
    });
    expect(zeroCrossingSegment).toBe(false);
    expectBoundedPath(result);
  });

  it('keeps domain boundaries and viewport re-entry truthful', () => {
    const squareRoot = sample(explicitY(['Sqrt', 'x']));
    expect(Math.min(...squareRoot.independentValues)).toBeGreaterThanOrEqual(0);
    expectBoundedPath(squareRoot);

    const reentry = sample(explicitY(['Add', ['Power', 'x', 2], -4]), {
      viewport: { ...VIEWPORT, xMin: -3, xMax: 3, yMin: -1, yMax: 1 },
      cssSize: { width: 900, height: 450 },
    });
    expect(reentry.independentValues.some((value) => Math.abs(value) < 2.3)).toBe(true);
    expect(reentry.independentValues.some((value) => Math.abs(value) > 2.1)).toBe(true);
    expectBoundedPath(reentry);
  });

  it('refines settled curvature more than preview and does not split steep lines', () => {
    const relation = explicitY(['Sin', ['Multiply', 12, 'x']]);
    const preview = sample(relation, { quality: 'preview' });
    const settled = sample(relation, { quality: 'settled' });
    expect(settled.stats.evaluatedSamples).toBeGreaterThan(preview.stats.evaluatedSamples);
    expectBoundedPath(preview);
    expectBoundedPath(settled);

    const steep = sample(explicitY(['Multiply', 100, 'x']));
    expect(steep.segmentOffsets).toEqual(new Uint32Array([0]));
    expectBoundedPath(steep);
  });

  it('maps explicit-x relations with y as their independent coordinate', () => {
    const relation: GraphRelationIR = {
      kind: 'explicit-x',
      rhs: expression(['Power', 'y', 2], ['y']),
    };
    const result = sample(relation, {
      plan: compile(relation),
      viewport: { ...VIEWPORT, xMin: -1, xMax: 10, yMin: -3, yMax: 3 },
    });
    const vertex = Math.floor(result.independentValues.length / 2);
    expect(result.coordinates[vertex * 2]).toBeCloseTo(result.independentValues[vertex] ** 2);
    expect(result.coordinates[vertex * 2 + 1]).toBe(result.independentValues[vertex]);
    expectBoundedPath(result);
  });

  it('does not exhaust refinement on high-degree offscreen polynomial spans', () => {
    const fifthPower = sample(explicitY(['Power', 'x', 5]));
    expect(fifthPower.status).toBe('complete');
    expect(fifthPower.coordinates.length).toBeGreaterThan(4);
    expect(fifthPower.stats.evaluatedSamples).toBeLessThan(1_000);

    const explicitX: GraphRelationIR = {
      kind: 'explicit-x',
      rhs: expression(['Power', 'y', 6], ['y']),
    };
    const sixthPower = sample(explicitX, { plan: compile(explicitX) });
    expect(sixthPower.status).toBe('complete');
    expect(sixthPower.coordinates.length).toBeGreaterThan(4);
    expect(sixthPower.stats.evaluatedSamples).toBeLessThan(1_000);
  });

  it('cancels cooperatively and never exceeds sample or vertex budgets', () => {
    let cancellationChecks = 0;
    const cancelled = sample(explicitY(['Sin', ['Multiply', 50, 'x']]), {
      control: { isCancelled: () => cancellationChecks++ >= 14 },
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.stopReason).toMatchObject({
      code: 'sampling-cancelled',
      detailCode: 'cooperative-cancellation',
    });
    expectBoundedPath(cancelled);

    const bounded = sample(explicitY(['Sin', ['Multiply', 80, 'x']]), {
      budgets: minimumSamplingBudgets({ maximumSamples: 40, maximumVertices: 12 }),
    });
    expect(bounded.status).toBe('budget-exhausted');
    expect(bounded.stats.evaluatedSamples).toBeLessThanOrEqual(40);
    expect(bounded.stats.emittedVertices).toBeLessThanOrEqual(12);
    expectBoundedPath(bounded);
  });

  it('stops on a deterministic time budget and rejects unsupported relation routes', () => {
    let time = 0;
    const result = sample(explicitY(['Sin', 'x']), {
      budgets: minimumSamplingBudgets({ maximumTimeMs: 4 }),
      control: { now: () => time++ },
    });
    expect(result.status).toBe('budget-exhausted');
    expect(result.stopReason).toMatchObject({
      code: 'sampling-budget-exceeded',
      detailCode: 'maximum-time',
    });
    expectBoundedPath(result);

    expect(compileExplicitGraphRelation({
      itemId: 'implicit',
      sourceRevision: 1,
      relation: {
        kind: 'implicit-equality',
        left: expression(['Add', 'x', 'y'], ['x', 'y']),
        right: expression(0, []),
      },
    })).toMatchObject({
      ok: false,
      stopReason: { code: 'unsupported-relation', detailCode: 'sampler-implicit-equality' },
    });
  });
});
