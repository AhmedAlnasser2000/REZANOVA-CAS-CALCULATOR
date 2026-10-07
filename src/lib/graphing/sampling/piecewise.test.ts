import { describe, expect, it } from 'vitest';
import type { GraphPiecewiseSpecV1 } from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import { classifyGraphSource } from '../parser/source';
import { sampleGraphPiecewise } from './piecewise';

function piecewiseOf(latex: string): GraphPiecewiseSpecV1 {
  const classified = classifyGraphSource({ sourceKind: 'mathlive-latex', sourceLatex: latex, sourceRevision: 1 });
  if (!classified.ok || classified.itemKind !== 'piecewise') throw new Error(`${latex} is not piecewise`);
  return classified.piecewise;
}

function sample(latex: string, viewport = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }) {
  return sampleGraphPiecewise({
    itemId: 'p', sourceRevision: 1, piecewise: piecewiseOf(latex),
    viewport: { coordinateSystem: 'cartesian', ...viewport }, cssSize: { width: 800, height: 800 }, parameterEnvironment: {},
    quality: 'settled', limits: { maximumSamples: 40_000, maximumTimeMs: 5_000, maximumVertices: 100_000 },
    cache: new GraphExpressionPlanCache(50), control: {},
  });
}

const markers = (result: ReturnType<typeof sample>, marker: 'open' | 'filled') => result.endpointBatches
  .filter((batch) => batch.marker === marker).flatMap((batch) => [...batch.coordinates]).map((value) => Number(value.toFixed(12)) + 0);

describe('Piecewise sampling', () => {
  it('puts endpoint circles exactly on the branches and ends each path exactly there', () => {
    const result = sample(String.raw`\begin{cases}x^2&x<1.3\\ \sqrt{x}&x\ge1.3\end{cases}`);
    expect(markers(result, 'open')).toEqual([1.3, Number((1.3 ** 2).toFixed(12))]);
    expect(markers(result, 'filled')).toEqual([1.3, Number(Math.sqrt(1.3).toFixed(12))]);
    const first = result.paths.find((path) => path.pathId === 'p:branch:branch.1')!.sample;
    const lastX = first.coordinates[first.coordinates.length - 2]!; const lastY = first.coordinates[first.coordinates.length - 1]!;
    expect(lastX).toBe(1.3);
    expect(lastY).toBe(1.3 ** 2);
    const second = result.paths.find((path) => path.pathId === 'p:branch:branch.2')!.sample;
    expect([second.coordinates[0], second.coordinates[1]]).toEqual([1.3, Math.sqrt(1.3)]);
  });

  it('draws the first matching branch only, and notes the shadowed one', () => {
    const result = sample(String.raw`\begin{cases}1&x<2\\ 2&x<3\end{cases}`);
    const second = result.paths.find((path) => path.pathId === 'p:branch:branch.2')!.sample;
    expect(Math.min(...[...second.coordinates].filter((_, index) => index % 2 === 0))).toBe(2);
    expect(result.stopReasons.map((reason) => reason.detailCode)).toContain('piecewise-shadowed:global:branch.1,branch.2');
  });

  it('keeps a branch narrower than a sample step', () => {
    const result = sample(String.raw`\begin{cases}5&0<x<0.001\end{cases}`, { xMin: -1000, xMax: 1000, yMin: -10, yMax: 10 });
    const coordinates = [...result.paths[0]!.sample.coordinates];
    expect(coordinates.slice(0, 2)).toEqual([0, 5]);
    expect(coordinates.slice(-2)).toEqual([0.001, 5]);
    expect(coordinates.filter((_, index) => index % 2 === 1).every((y) => y === 5)).toBe(true);
  });

  it('draws restriction braces, and a hole where x ≠ 1', () => {
    const restricted = sample(String.raw`x^2\{x>0\}`);
    expect(Math.min(...[...restricted.paths[0]!.sample.coordinates].filter((_, index) => index % 2 === 0))).toBe(0);
    expect(markers(restricted, 'open')).toEqual([0, 0]);
    const hole = sample(String.raw`\frac{x^2-1}{x-1}\{x\ne1\}`);
    expect(markers(hole, 'open')).toEqual([1, 2]);
    expect(markers(hole, 'filled')).toEqual([]);
  });

  it('draws polar branches over their θ intervals', () => {
    const result = sample(String.raw`r=\begin{cases}1&\theta<\pi\\ 2&\theta\ge\pi\end{cases}`);
    expect(result.paths.map((path) => path.pathId)).toEqual(['p:branch:branch.1', 'p:branch:branch.2']);
    const radii = (index: number) => {
      const coordinates = result.paths[index]!.sample.coordinates;
      return [...new Set(Array.from({ length: coordinates.length / 2 }, (_, vertex) => Number(Math.hypot(coordinates[vertex * 2]!, coordinates[vertex * 2 + 1]!).toFixed(9))))];
    };
    expect(radii(0)).toEqual([1]);
    expect(radii(1)).toEqual([2]);
  });
});
