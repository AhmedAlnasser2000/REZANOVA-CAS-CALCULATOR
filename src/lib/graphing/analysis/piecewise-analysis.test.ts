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

async function analyze(items: GraphAnalysisRequestV1['items'], features: GraphAnalysisRequestV1['features'], focusItemIds?: string[]) {
  return runGraphAnalysisRequest({
    ...(focusItemIds ? { focusItemIds } : {}),
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
    expect(validators(jump, 'piecewise-continuity')).toEqual(['one-sided limits: jump of 1: from the left 0, from the right 1']);
    expect(jump.evidence.find((entry) => entry.feature === 'piecewise-continuity')?.detail?.boundary)
      .toMatchObject({ kind: 'jump', left: expect.closeTo(0, 9), right: expect.closeTo(1, 9), value: 1, jump: expect.closeTo(1, 9) });
    const hole = await analyze([item('c', String.raw`x^2\{x\ne1\}`)], ['piecewise-continuity']);
    expect(validators(hole, 'piecewise-continuity')).toEqual(['one-sided limits: removable discontinuity: both sides approach 1']);
    // A pole at a boundary is a vertical asymptote, not "defined on one side".
    const pole = await analyze([item('d', String.raw`\begin{cases}\frac{1}{x}&x>0\\0&x\le0\end{cases}`)], ['piecewise-continuity']);
    expect(pole.evidence.find((entry) => entry.feature === 'piecewise-continuity')?.detail?.boundary?.kind).toBe('vertical-asymptote');
  });

  it('reports a pole inside a branch, and proves a non-polynomial root (GRAPHING-PIECEWISE2)', async () => {
    const result = await analyze([item('q', String.raw`\begin{cases}\frac{1}{x}&x<3\\\cos(x)&x\ge3\end{cases}`)],
      ['vertical-asymptote', 'root']);
    expect(result.evidence.filter((entry) => entry.feature === 'vertical-asymptote').map((entry) => entry.coordinates?.x))
      .toEqual([{ kind: 'exact', value: expect.objectContaining({ mathJson: 0 }) }]);
    // cos x = 0 at 3π/2 ≈ 4.712 (inside x ≥ 3): proved by the interval test, not just bracketed.
    expect(result.evidence.filter((entry) => entry.feature === 'root').map((entry) => entry.level)).toEqual(['interval-proved']);
  });

  it('finds no root where a branch only approaches 0 at an end it excludes', async () => {
    const result = await analyze([item('j', String.raw`\begin{cases}x&x<0\\x+1&x\ge0\end{cases}`)], ['root']);
    expect(result.evidence.filter((entry) => entry.feature === 'root')).toEqual([]);
    const touching = await analyze([item('t', String.raw`\begin{cases}x&x\le0\\x+1&x>0\end{cases}`)], ['root']);
    expect(touching.evidence.filter((entry) => entry.feature === 'root').map((entry) => entry.level)).toEqual(['exact-proved']);
  });

  it('reports a branch lying on the axis as stretches, never a root per sample', async () => {
    const triangle = String.raw`y=\begin{cases}x+2&-2\le x<0\\2-x&0\le x\le2\\0&\text{otherwise}\end{cases}`;
    const result = await analyze([item('t', triangle)], ['root', 'x-intercept']);
    expect(result.evidence.filter((entry) => !entry.detail?.interval).map((entry) => entry.feature)).toEqual([]);
    expect(result.evidence.map((entry) => entry.detail?.interval)).toEqual([
      { minimum: -5, maximum: -2, minimumInclusive: true, maximumInclusive: true, minimumOpenEnded: true, maximumOpenEnded: false },
      { minimum: 2, maximum: 5, minimumInclusive: true, maximumInclusive: true, minimumOpenEnded: false, maximumOpenEnded: true },
    ]);
  });

  it('lists only strict extrema: the triangle\'s peak, not the corners where it goes flat', async () => {
    const triangle = String.raw`y=\begin{cases}x+2&-2\le x<0\\2-x&0\le x\le2\\0&\text{otherwise}\end{cases}`;
    const extrema = (await analyze([item('t', triangle)], ['extremum'])).evidence.filter((entry) => entry.feature === 'extremum');
    expect(extrema).toHaveLength(1);
    expect(extrema[0]!.coordinates?.y).toMatchObject({ value: expect.closeTo(2, 12) });
    // A peak exactly between two samples (equal values either side) is still found.
    const between = (await analyze([item('m', '-(x-0.0125)^2')], ['extremum'])).evidence.filter((entry) => entry.feature === 'extremum');
    expect(between.map((entry) => Number((entry.coordinates?.x as { value: number }).value.toFixed(6)))).toEqual([0.0125]);
  });

  it('reports zero stretches and coinciding curves of plain functions once each', async () => {
    const stretches = async (latexes: string[]) => (await analyze(latexes.map((latex, index) => item(`i${index}`, latex)), ['root', 'intersection']))
      .evidence.map((entry) => entry.detail?.interval ? `${entry.feature} ${entry.detail.interval.minimum}..${entry.detail.interval.maximum}` : entry.feature);
    expect(await stretches(['|x|-x'])).toEqual(['root 0..5']);
    expect(await stretches([String.raw`\lfloor x\rfloor`])).toEqual(['root 0..1']);
    expect(await stretches(['|x|', 'x'])).toEqual(['root', 'root', 'intersection 0..5']);
  });

  it('gives exact roots in closed form', async () => {
    const result = await analyze([item('s', String.raw`\begin{cases}x^2-2&x>0\\-1&x\le0\end{cases}`)], ['root']);
    expect(result.evidence.filter((entry) => entry.feature === 'root').map((entry) => entry.coordinates?.x))
      .toEqual([{ kind: 'exact', value: expect.objectContaining({ canonicalLatex: String.raw`\sqrt{2}` }) }]);
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

  it('works out only the focused items’ own points but still meets them with every other curve (GRAPHING-PERF1)', async () => {
    const result = await analyze([item('p', 'y=x^2-1'), item('l', 'y=x+1'), item('q', 'y=x-3')], ['root', 'intersection'], ['p']);
    const roots = result.evidence.filter((entry) => entry.feature === 'root');
    expect(roots.length).toBeGreaterThan(0);
    expect(roots.every((entry) => entry.itemIds.includes('p'))).toBe(true);
    // p meets l at x = −1 and x = 2; l and q (both unfocused, and parallel anyway) are not paired.
    const pairs = result.evidence.filter((entry) => entry.feature === 'intersection').map((entry) => [...entry.itemIds].sort().join('+'));
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.every((pair) => pair.includes('p'))).toBe(true);
  });
});
