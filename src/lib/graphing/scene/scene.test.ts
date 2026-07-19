import { describe, expect, it } from 'vitest';
import type {
  GraphExpressionIR,
  GraphItemPresentationV1,
  GraphRelationIR,
} from '../contracts';
import {
  compileExplicitGraphRelation,
  minimumSamplingBudgets,
  sampleExplicitGraphRelation,
} from '../sampling';
import { assembleSampledScene } from './assemble';

const viewport = {
  coordinateSystem: 'cartesian' as const,
  xMin: -5,
  xMax: 5,
  yMin: -5,
  yMax: 5,
};

const style = (colorToken: string): GraphItemPresentationV1 => ({
  version: 1,
  colorToken,
  stroke: 'solid',
  strokeWidth: 'normal',
  fillOpacity: 0.18,
  label: 'auto',
});

function expression(mathJson: GraphExpressionIR['mathJson']): GraphExpressionIR {
  return { mathJson, freeSymbols: ['x'] };
}

function sampled(itemId: string, mathJson: GraphExpressionIR['mathJson']) {
  const relation: GraphRelationIR = {
    kind: 'explicit-y',
    origin: 'bare-expression',
    rhs: expression(mathJson),
  };
  const compiled = compileExplicitGraphRelation({ itemId, sourceRevision: 1, relation });
  if (!compiled.ok) throw new Error('Expected compiled explicit relation.');
  return sampleExplicitGraphRelation({
    plan: compiled.plan,
    viewport,
    cssSize: { width: 800, height: 600 },
    parameterEnvironment: {},
    quality: 'settled',
    budgets: minimumSamplingBudgets(),
  });
}

const revisions = { scene: 4, document: 1, viewport: 2, parameter: 3 };

describe('Graph sampled-scene assembly', () => {
  it('adopts sampled arrays without copies and emits stable scene identity order', () => {
    const sine = sampled('item.sine', ['Sin', 'x']);
    const parabola = sampled('item.parabola', ['Power', 'x', 2]);
    const result = assembleSampledScene({
      revisions,
      viewport,
      paths: [
        { pathId: 'path.sine', sample: sine, style: style('green') },
        { pathId: 'path.parabola', sample: parabola, style: style('blue') },
      ],
      labels: [
        { labelId: 'label.z', itemId: 'item.sine', role: 'relation', anchor: { x: 0, y: 0 }, priority: 1, plainText: 'sin(x)' },
        { labelId: 'label.a', itemId: 'item.parabola', role: 'relation', anchor: { x: 1, y: 1 }, priority: 2, mathJson: ['Power', 'x', 2] },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.scene.paths.map((path) => path.pathId)).toEqual([
      'path.parabola',
      'path.sine',
    ]);
    expect(result.bundle.scene.labels.map((label) => label.labelId)).toEqual([
      'label.a',
      'label.z',
    ]);
    const sinePath = result.bundle.scene.paths[1];
    expect(sinePath.coordinates).toBe(sine.coordinates);
    expect(sinePath.segmentOffsets).toBe(sine.segmentOffsets);
    expect(sinePath.parameterValues).toBe(sine.independentValues);
    expect(result.bundle.transferList).toHaveLength(6);
    expect(result.bundle.evidence.vertexCount).toBe(
      sine.stats.emittedVertices + parabola.stats.emittedVertices,
    );
    expect(result.bundle).not.toHaveProperty('snapshot');
    expect(result.bundle).not.toHaveProperty('snapshotHash');
  });

  it('retains truthful bounded geometry and its stop reason', () => {
    const oscillatory = sampled('item.oscillatory', ['Sin', ['Multiply', 80, 'x']]);
    const bounded = {
      ...oscillatory,
      status: 'budget-exhausted' as const,
      stopReason: {
        code: 'sampling-budget-exceeded' as const,
        detailCode: 'semantic-fixture-budget',
      },
    };
    const result = assembleSampledScene({
      revisions,
      viewport,
      paths: [{ pathId: 'path.oscillatory', sample: bounded, style: style('violet') }],
    });
    expect(result).toMatchObject({
      ok: true,
      bundle: {
        stopReasons: [{ code: 'sampling-budget-exceeded' }],
      },
    });
  });

  it('rejects duplicate IDs, malformed alignment, and incomplete status without evidence', () => {
    const sine = sampled('item.sine', ['Sin', 'x']);
    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [
        { pathId: 'same', sample: sine, style: style('blue') },
        { pathId: 'same', sample: sine, style: style('green') },
      ],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [{
        pathId: 'misaligned',
        sample: { ...sine, independentValues: new Float64Array(1) },
        style: style('blue'),
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });

    expect(assembleSampledScene({
      revisions,
      viewport,
      paths: [{
        pathId: 'missing-stop',
        sample: { ...sine, status: 'cancelled', stopReason: undefined },
        style: style('blue'),
      }],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-scene' } });
  });
});
