import { describe, expect, it } from 'vitest';
import type { GraphAnalysisRequestV1 } from '../contracts';
import { classifyGraphSource } from '../parser/source';
import { runGraphAnalysisRequest } from './analyze';

// GRAPHING-PIECEWISE2: two curves that lie on top of each other meet at every
// point of the shared part. That is one finding (with points along it for the
// overlay), never a crossing per sample.

function item(itemId: string, latex: string): GraphAnalysisRequestV1['items'][number] {
  const source = { sourceKind: 'mathlive-latex' as const, sourceLatex: latex, sourceRevision: 1 };
  const classified = classifyGraphSource(source);
  if (!classified.ok || classified.itemKind !== 'relation') throw new Error(latex);
  return { version: 1, kind: 'relation', itemId, source, relation: classified.relation, visible: true };
}

async function meet(first: string, second: string) {
  const result = await runGraphAnalysisRequest({
    version: 1, requestId: 'c', workspaceInstanceId: 'w', documentId: 'd', revisions: { mathematics: 1, viewport: 1, parameter: 0 },
    items: [item('a', first), item('b', second)], parameterEnvironment: {}, features: ['intersection'],
    numericWindow: { coordinateSystem: 'cartesian', xMin: -5, xMax: 5, yMin: -3, yMax: 3 }, maximumTimeMs: 4_000,
  });
  const meetings = result.evidence.filter((entry) => entry.feature === 'intersection');
  return {
    crossings: meetings.filter((entry) => entry.coordinates?.x),
    shared: meetings.filter((entry) => entry.detail?.shared).map((entry) => entry.detail!.shared!),
  };
}

describe('Coinciding curves', () => {
  for (const [first, second] of [
    ['x^2+y^2=4', 'x^2+y^2=4'],
    ['x^2+y^2=4', String.raw`(2\cos t,2\sin t)`],
    ['r=2', 'x^2+y^2=4'],
    ['x^2+y^2=4', String.raw`y=\sqrt{4-x^2}`],
    ['y=x^2', 'y-x^2=0'],
    ['(x^2+y^2-4)(y-1)=0', 'x^2+y^2=4'],
    [String.raw`(2\cos t,2\sin t)`, String.raw`(2\cos t,-2\sin t)`],
  ] as const) {
    it(`${first} and ${second}: one shared part, no crossings inside it`, async () => {
      const { crossings, shared } = await meet(first, second);
      expect(crossings).toEqual([]);
      expect(shared).toHaveLength(1);
      // Every shared point is on the circle (or parabola) both curves describe.
      const onCurve = first.startsWith('y=x^2') ? (p: { x: number; y: number }) => Math.abs(p.y - p.x ** 2)
        : (p: { x: number; y: number }) => Math.abs(Math.hypot(p.x, p.y) - 2);
      expect(Math.max(...shared[0]!.map(onCurve))).toBeLessThan(1e-6);
    });
  }

  it('keeps genuine crossings exact: the circle meets y = 1 at ±√3', async () => {
    const { crossings, shared } = await meet('x^2+y^2=4', 'y=1');
    expect(shared).toEqual([]);
    expect(crossings.map((entry) => (entry.coordinates!.x as { value: number }).value).sort((a, b) => a - b))
      .toEqual([expect.closeTo(-Math.sqrt(3), 13), expect.closeTo(Math.sqrt(3), 13)]);
  });
});
