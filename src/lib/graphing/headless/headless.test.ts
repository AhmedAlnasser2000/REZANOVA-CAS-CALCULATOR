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
import { assembleSampledScene } from '../scene';
import { inspectHeadlessGraphScene } from './inspect';

const viewport = {
  coordinateSystem: 'cartesian' as const,
  xMin: -4,
  xMax: 4,
  yMin: -4,
  yMax: 4,
};
const style: GraphItemPresentationV1 = {
  version: 1,
  colorToken: 'graph-blue',
  stroke: 'solid',
  strokeWidth: 'normal',
  fillOpacity: 0.18,
  label: 'auto',
};

function sampled(itemId: string, mathJson: GraphExpressionIR['mathJson']) {
  const rhs: GraphExpressionIR = { mathJson, freeSymbols: ['x'] };
  const relation: GraphRelationIR = { kind: 'explicit-y', origin: 'bare-expression', rhs };
  const compiled = compileExplicitGraphRelation({ itemId, sourceRevision: 1, relation });
  if (!compiled.ok) throw new Error('Expected compiled explicit relation.');
  return sampleExplicitGraphRelation({
    plan: compiled.plan,
    viewport,
    cssSize: { width: 640, height: 480 },
    parameterEnvironment: {},
    quality: 'settled',
    budgets: minimumSamplingBudgets(),
    control: { now: () => 0 },
  });
}

function bundle(order: 'forward' | 'reverse' = 'forward') {
  const entries = [
    { pathId: 'path.sin', sample: sampled('item.sin', ['Sin', 'x']), style },
    { pathId: 'path.sqrt', sample: sampled('item.sqrt', ['Sqrt', 'x']), style },
  ];
  const assembled = assembleSampledScene({
    revisions: { scene: 9, document: 4, viewport: 7, parameter: 2 },
    viewport,
    paths: order === 'forward' ? entries : entries.reverse(),
  });
  if (!assembled.ok) throw new Error(assembled.failure.message);
  return assembled.bundle;
}

describe('Graph headless semantic validator', () => {
  it('produces deterministic bounded snapshot evidence independent of input order', () => {
    const forward = inspectHeadlessGraphScene(bundle('forward'));
    const reverse = inspectHeadlessGraphScene(bundle('reverse'));
    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    if (!forward.ok || !reverse.ok) return;
    expect(forward.evidence.snapshotHash).toBe(reverse.evidence.snapshotHash);
    expect(forward.evidence.snapshotHash).toBe('graph64:ab3feb3184dc773a');
    expect(forward.evidence).toMatchObject({
      pathCount: 2,
      regionCount: 0,
      triangleCount: 0,
      pointCount: 0,
      labelCount: 0,
    });
    expect(forward.evidence.segmentCount).toBeGreaterThanOrEqual(2);
    expect(forward.evidence.vertexCount).toBeGreaterThan(4);
    expect(JSON.stringify(forward.evidence.snapshot)).not.toContain('Float64Array');
  });

  it('proves exact transfer ownership and detaches only after explicit transfer', () => {
    const owned = bundle();
    const before = owned.transferList.map((buffer) => buffer.byteLength);
    expect(before.every((length) => length > 0)).toBe(true);
    expect(inspectHeadlessGraphScene(owned).ok).toBe(true);

    const cloned = structuredClone(owned.scene, { transfer: owned.transferList });
    expect(owned.transferList.every((buffer) => buffer.byteLength === 0)).toBe(true);
    expect(cloned.paths.every((path) => path.coordinates.length > 0)).toBe(true);
  });

  it('rejects incomplete, duplicate, or aliased transfer ownership', () => {
    const missing = bundle();
    missing.transferList.pop();
    expect(inspectHeadlessGraphScene(missing)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-scene' },
    });

    const duplicate = bundle();
    duplicate.transferList.push(duplicate.transferList[0]);
    expect(inspectHeadlessGraphScene(duplicate)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-scene' },
    });

    const aliased = bundle();
    const first = aliased.scene.paths[0];
    first.parameterValues = new Float64Array(
      first.coordinates.buffer,
      first.coordinates.byteOffset,
      first.coordinates.length / 2,
    );
    expect(inspectHeadlessGraphScene(aliased)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-scene' },
    });
  });
});
