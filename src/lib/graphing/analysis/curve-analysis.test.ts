import { describe, expect, it } from 'vitest';
import type { GraphAnalysisRequestV1, GraphExpressionIR, GraphRelationIR } from '../contracts';
import { runGraphAnalysisRequest } from './analyze';
import { validateGraphAnalysisResult } from './validation';

const e = (mathJson: unknown, freeSymbols: string[]): GraphExpressionIR => ({ mathJson, freeSymbols } as GraphExpressionIR);
const relation = (itemId: string, value: GraphRelationIR) => ({
  version: 1 as const, kind: 'relation' as const, itemId, visible: true,
  source: { sourceKind: 'mathlive-latex' as const, sourceLatex: itemId, sourceRevision: 1 }, relation: value,
});
const request = (items: GraphAnalysisRequestV1['items']): GraphAnalysisRequestV1 => ({
  version: 1, requestId: 'a', workspaceInstanceId: 'w', documentId: 'd', revisions: { mathematics: 1, viewport: 1, parameter: 1 },
  items, parameterEnvironment: {},
  features: ['root', 'x-intercept', 'y-intercept', 'extremum', 'intersection', 'turning-point', 'curve-endpoint', 'origin-crossing', 'region-corner'],
  numericWindow: { coordinateSystem: 'cartesian', xMin: -5, xMax: 5, yMin: -5, yMax: 5 }, maximumTimeMs: 2000,
});
const at = (entry: { coordinates?: { x?: unknown; y?: unknown } }) => {
  const value = (v: unknown) => Number((v as { value: number }).value.toFixed(5)) + 0;
  return `${value(entry.coordinates?.x)},${value(entry.coordinates?.y)}`;
};

describe('PTX3 analysis of every curve kind', () => {
  it('gives a parametric circle intercepts and turning points, and intersects it with a line', async () => {
    const result = await runGraphAnalysisRequest(request([
      relation('circle', { kind: 'parametric-curve', parameterSymbol: 't', x: e(['Cos', 't'], ['t']), y: e(['Sin', 't'], ['t']) } as GraphRelationIR),
      relation('line', { kind: 'explicit-y', rhs: e('x', ['x']), origin: 'bare-expression' } as GraphRelationIR),
    ]));
    const of = (feature: string, itemId = 'circle') => result.evidence.filter((entry) => entry.feature === feature && entry.itemIds.includes(itemId));
    expect(of('x-intercept').map(at).sort()).toEqual(['-1,0', '1,0']);
    expect(of('y-intercept').map(at).sort()).toEqual(['0,-1', '0,1']);
    expect(of('turning-point').map((entry) => `${entry.detail?.kind} ${at(entry)}`).sort()).toEqual(['highest 0,1', 'leftmost -1,0', 'lowest 0,-1', 'rightmost 1,0']);
    expect(of('intersection').map(at).sort()).toEqual(['-0.70711,-0.70711', '0.70711,0.70711']);
    expect(validateGraphAnalysisResult(structuredClone(result)).ok).toBe(true);
  });

  it('gives an implicit curve, a polar curve and a region their points', async () => {
    const result = await runGraphAnalysisRequest(request([
      relation('circle', { kind: 'implicit-equality', left: e(['Add', ['Power', 'x', 2], ['Power', 'y', 2]], ['x', 'y']), right: e(9, []) } as GraphRelationIR),
      relation('rose', { kind: 'polar-radius', angleSymbol: 'theta', radius: e(['Multiply', 2, ['Cos', ['Multiply', 2, 'theta']]], ['theta']) } as GraphRelationIR),
      relation('band', { kind: 'chained-inequality', operands: [e('x', ['x']), e('y', ['y']), e(2, [])], operators: ['<', '<='] } as GraphRelationIR),
    ]));
    const of = (feature: string, itemId: string) => result.evidence.filter((entry) => entry.feature === feature && entry.itemIds.length === 1 && entry.itemIds[0] === itemId);
    expect(of('turning-point', 'circle').map((entry) => entry.detail?.kind).sort()).toEqual(['highest', 'leftmost', 'lowest', 'rightmost']);
    expect(of('origin-crossing', 'rose').map(at)).toEqual(['0,0']);
    expect(of('region-corner', 'band').map((entry) => [at(entry), entry.detail?.included])).toEqual([['2,2', false]]);
    // The circle meets the region's edge y = 2 at x = ±√5.
    const crossings = result.evidence.filter((entry) => entry.feature === 'intersection' && entry.itemIds.includes('circle') && entry.itemIds.includes('band')).map(at);
    expect(crossings).toEqual(expect.arrayContaining(['-2.23607,2', '2.23607,2']));
    expect(result.evidence.some((entry) => entry.level === 'unsupported')).toBe(false);
  });

  it('gives an x = f(y) piecewise curve its points', async () => {
    const result = await runGraphAnalysisRequest(request([{
      version: 1, kind: 'piecewise', itemId: 'pw', visible: true,
      source: { sourceKind: 'mathlive-latex', sourceLatex: 'pw', sourceRevision: 1 },
      piecewise: { version: 1, branches: [
        { branchId: 'a', relation: { kind: 'explicit-x', rhs: e(['Add', ['Power', 'y', 2], -1], ['y']) }, condition: { kind: 'comparison', left: e('y', ['y']), operator: '<', right: e(0, []) } },
        { branchId: 'b', relation: { kind: 'explicit-x', rhs: e(['Add', 'y', -1], ['y']) }, condition: { kind: 'comparison', left: e('y', ['y']), operator: '>=', right: e(0, []) } },
      ] },
    } as unknown as GraphAnalysisRequestV1['items'][number]]));
    const features = result.evidence.filter((entry) => entry.itemIds[0] === 'pw').map((entry) => `${entry.feature} ${at(entry)}`).sort();
    expect(features).toEqual(expect.arrayContaining(['x-intercept -1,0', 'y-intercept 0,-1', 'y-intercept 0,1']));
  });
});
