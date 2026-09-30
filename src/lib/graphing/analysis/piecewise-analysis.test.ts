import { describe, expect, it } from 'vitest';
import type { GraphAnalysisRequestV1 } from '../contracts';
import { classifyGraphSource } from '../parser/source';
import { runGraphAnalysisRequest } from './analyze';

function item(itemId: string, latex: string): GraphAnalysisRequestV1['items'][number] {
  const source = { sourceKind: 'mathlive-latex' as const, sourceLatex: latex, sourceRevision: 1 };
  const classified = classifyGraphSource(source);
  if (!classified.ok) throw new Error(latex);
  return classified.itemKind === 'piecewise'
    ? { version: 1, kind: 'piecewise', itemId, source, piecewise: classified.piecewise, visible: true }
    : { version: 1, kind: 'relation', itemId, source, relation: (classified as Extract<typeof classified, { itemKind: 'relation' }>).relation, visible: true } as GraphAnalysisRequestV1['items'][number];
}

async function analyze(items: GraphAnalysisRequestV1['items'], features: GraphAnalysisRequestV1['features']) {
  return runGraphAnalysisRequest({
    version: 1, requestId: 'a', workspaceInstanceId: 'w', documentId: 'd', revisions: { mathematics: 1, viewport: 1, parameter: 0 },
    items, parameterEnvironment: {}, features,
    numericWindow: { coordinateSystem: 'cartesian', xMin: -5, xMax: 5, yMin: -5, yMax: 5 }, maximumTimeMs: 2_000,
  });
}

const validators = (result: Awaited<ReturnType<typeof analyze>>, feature: string) => result.evidence
  .filter((entry) => entry.feature === feature).map((entry) => entry.basis.validator);

describe('Piecewise analysis', () => {
  it('classifies each boundary from its one-sided limits', async () => {
    const continuous = await analyze([item('a', String.raw`\begin{cases}x^2&x<1\\2x-1&x\ge1\end{cases}`)], ['piecewise-continuity']);
    expect(validators(continuous, 'piecewise-continuity')).toEqual(['one-sided limits: continuous at the boundary']);
    const jump = await analyze([item('b', String.raw`\begin{cases}x&x<0\\x+1&x\ge0\end{cases}`)], ['piecewise-continuity']);
    expect(validators(jump, 'piecewise-continuity')).toEqual(['one-sided limits: jump discontinuity: from the left 0, from the right 1']);
    const hole = await analyze([item('c', String.raw`x^2\{x\ne1\}`)], ['piecewise-continuity']);
    expect(validators(hole, 'piecewise-continuity')).toEqual(['one-sided limits: removable discontinuity: both sides approach 1']);
  });

  it('finds exact roots of the branch drawn there and no fake extrema at a step', async () => {
    const result = await analyze([item('p', String.raw`\begin{cases}x^2-4&x<0\\1&x\ge0\end{cases}`)], ['root', 'extremum']);
    expect(result.evidence.filter((entry) => entry.feature === 'root').map((entry) => [entry.level, entry.coordinates?.x]))
      .toEqual([['exact-proved', { kind: 'exact', value: { canonicalLatex: '-2', mathJson: -2 } }]]);
    // x² − 4 has its minimum at x = 0, which the step to 1 cuts off; the step itself is not an extremum.
    expect(result.evidence.filter((entry) => entry.feature === 'extremum')).toEqual([]);
  });

  it('intersects a piecewise curve with a line', async () => {
    const result = await analyze([
      item('p', String.raw`\begin{cases}x^2&x<1\\3-x&x\ge1\end{cases}`),
      item('l', 'y=2'),
    ], ['intersection']);
    const points = result.evidence.filter((entry) => entry.feature === 'intersection')
      .map((entry) => Number((entry.coordinates?.x as { value: number }).value.toFixed(9)));
    // x² = 2 at −√2 on the left branch, and 3 − x = 2 at x = 1, where the right branch (x ≥ 1) is drawn.
    expect(points).toEqual([-1.414213562, 1]);
  });
});
