import { describe, expect, it } from 'vitest';
import { validateCanonicalResultDocumentV2 } from '../../result-contract';
import type { GraphAnalysisRequestV1, GraphExpressionIR } from '../contracts';
import { runGraphAnalysisRequest } from './analyze';
import { validateGraphAnalysisRequest, validateGraphAnalysisResult } from './validation';

const expression = (mathJson: GraphExpressionIR['mathJson']): GraphExpressionIR => ({ mathJson, freeSymbols: ['x'] });
const item = (itemId: string, mathJson: GraphExpressionIR['mathJson']) => ({
  version: 1 as const, kind: 'relation' as const, itemId,
  source: { sourceKind: 'mathlive-latex' as const, sourceLatex: itemId, sourceRevision: 1 },
  relation: { kind: 'explicit-y' as const, rhs: expression(mathJson), origin: 'bare-expression' as const },
  visible: true,
});
const surface = (itemId: string, mathJson: GraphExpressionIR['mathJson']) => ({
  version: 1 as const, kind: 'relation' as const, itemId,
  source: { sourceKind: 'mathlive-latex' as const, sourceLatex: itemId, sourceRevision: 1 },
  relation: { kind: 'real-surface' as const, z: { mathJson, freeSymbols: ['x', 'y'] } },
  visible: true,
});
const complexMapping = (itemId: string, mathJson: GraphExpressionIR['mathJson']) => ({
  version: 1 as const, kind: 'relation' as const, itemId,
  source: { sourceKind: 'mathlive-latex' as const, sourceLatex: itemId, sourceRevision: 1 },
  relation: { kind: 'complex-mapping' as const, inputSymbol: 'z' as const, outputSymbol: 'f' as const,
    authoredForm: 'function' as const, expression: { mathJson, freeSymbols: ['z'] } },
  visible: true,
});
const request = (items: GraphAnalysisRequestV1['items'], features: GraphAnalysisRequestV1['features']): GraphAnalysisRequestV1 => ({
  version: 1, requestId: 'analysis.1', workspaceInstanceId: 'workspace.1', documentId: 'document.1',
  revisions: { mathematics: 2, viewport: 3, parameter: 1 }, items,
  parameterEnvironment: {}, features,
  numericWindow: { coordinateSystem: 'cartesian', xMin: -5, xMax: 5, yMin: -5, yMax: 5 }, maximumTimeMs: 500,
});

describe('Graph analysis authority', () => {
  it('proves polynomial roots, intercepts, and extrema with producer-owned MathJSON', async () => {
    const result = await runGraphAnalysisRequest(request([
      item('quadratic', ['Add', ['Power', 'x', 2], -4]),
    ], ['root', 'x-intercept', 'y-intercept', 'extremum']));
    expect(result.status).toBe('complete');
    expect(result.evidence.filter((entry) => entry.feature === 'root').map((entry) => entry.coordinates?.x)).toEqual([
      { kind: 'exact', value: { canonicalLatex: '-2', mathJson: -2 } },
      { kind: 'exact', value: { canonicalLatex: '2', mathJson: 2 } },
    ]);
    expect(result.evidence.find((entry) => entry.feature === 'extremum')).toMatchObject({
      level: 'exact-proved', coordinates: { x: { value: { canonicalLatex: '0' } }, y: { value: { canonicalLatex: '-4' } } },
    });
    expect(validateCanonicalResultDocumentV2(result.canonicalResult).ok).toBe(true);
    expect(validateGraphAnalysisResult(structuredClone(result)).ok).toBe(true);
  });

  it('keeps denominator exclusions distinct from validated poles and holes', async () => {
    const result = await runGraphAnalysisRequest(request([
      item('pole', ['Divide', 1, ['Add', 'x', -1]]),
      item('hole', ['Divide', ['Add', 'x', -2], ['Add', 'x', -2]]),
    ], ['hole', 'pole', 'vertical-asymptote', 'domain-boundary', 'horizontal-asymptote']));
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemIds: ['pole'], feature: 'domain-boundary', level: 'exact-proved' }),
      expect.objectContaining({ itemIds: ['pole'], feature: 'pole', level: 'numeric-validated' }),
      expect.objectContaining({ itemIds: ['hole'], feature: 'hole', level: 'exact-proved' }),
    ]));
    expect(result.evidence.some((entry) => entry.itemIds[0] === 'hole' && entry.feature === 'pole')).toBe(false);
  });

  it('finds bounded numeric roots and intersections without upgrading them to exact proof', async () => {
    const result = await runGraphAnalysisRequest(request([
      item('sine', ['Sin', 'x']), item('line', 'x'), item('constant', 1),
    ], ['root', 'intersection']));
    expect(result.evidence.some((entry) => entry.feature === 'root' && entry.level === 'numeric-validated')).toBe(true);
    expect(result.evidence.some((entry) => entry.feature === 'intersection' && entry.level === 'numeric-validated')).toBe(true);
  });

  it('reports exact real-domain boundaries for logarithms and radicals', async () => {
    const result = await runGraphAnalysisRequest(request([
      item('log', ['Ln', ['Add', 'x', 2]]), item('root', ['Sqrt', ['Add', 'x', -3]]),
    ], ['domain-boundary']));
    expect(result.evidence.map((entry) => entry.coordinates?.x)).toEqual([
      { kind: 'exact', value: { canonicalLatex: '-2', mathJson: -2 } },
      { kind: 'exact', value: { canonicalLatex: '3', mathJson: 3 } },
    ]);
  });

  it('validates surface stationary points, extrema, and z=0 contour cells in the bounded window', async () => {
    const result = await runGraphAnalysisRequest(request([
      surface('paraboloid', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]]),
      surface('saddle', ['Multiply', 'x', 'y']),
    ], ['stationary-point', 'local-extremum', 'level-contour']));
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemIds: ['paraboloid'], feature: 'stationary-point', level: 'numeric-validated' }),
      expect.objectContaining({ itemIds: ['paraboloid'], feature: 'local-extremum', level: 'numeric-validated' }),
      expect.objectContaining({ itemIds: ['saddle'], feature: 'level-contour', level: 'numeric-validated' }),
    ]));
    expect(result.evidence.find((entry) => entry.feature === 'local-extremum')?.coordinates?.z).toBeDefined();
  });

  it('separates exact complex facts from bounded validated candidates and completeness limits', async () => {
    const result = await runGraphAnalysisRequest({
      ...request([
        complexMapping('quadratic-complex', ['Add', ['Power', 'z', 2], 1]),
        complexMapping('reciprocal-complex', ['Divide', 1, 'z']),
        complexMapping('log-complex', ['Ln', 'z']),
      ], ['complex-zero', 'complex-pole', 'branch-point']),
      complexSearchRegion: { reMin: -2, reMax: 2, imMin: -2, imMax: 2 },
    }, undefined, { now: () => 0 });
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemIds: ['quadratic-complex'], feature: 'complex-zero', level: 'numeric-validated' }),
      expect.objectContaining({ itemIds: ['quadratic-complex'], feature: 'complex-zero', level: 'inconclusive',
        stopReason: expect.objectContaining({ detailCode: 'bounded-complex-search-does-not-prove-global-completeness' }) }),
      expect.objectContaining({ itemIds: ['reciprocal-complex'], feature: 'complex-pole', level: 'exact-proved' }),
      expect.objectContaining({ itemIds: ['log-complex'], feature: 'branch-point', level: 'exact-proved' }),
    ]));
    const exactPole = result.evidence.find((entry) => entry.itemIds[0] === 'reciprocal-complex'
      && entry.feature === 'complex-pole');
    expect(exactPole?.coordinates?.x).toMatchObject({ value: { mathJson: 0 } });
    expect(exactPole?.coordinates?.y).toMatchObject({ value: { mathJson: 0 } });
    expect(validateGraphAnalysisResult(structuredClone(result)).ok).toBe(true);
  });

  it('reports partial evidence when a controlled analysis clock exhausts the time budget', async () => {
    let tick = 0;
    const result = await runGraphAnalysisRequest(
      request([
        item('first', ['Add', 'x', -1]),
        item('second', ['Add', 'x', -2]),
      ], ['root']),
      undefined,
      { now: () => tick++ === 0 ? 0 : tick === 2 ? 0 : 501 },
    );

    expect(result.status).toBe('partial');
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemIds: ['first'], feature: 'root' }),
    ]));
    expect(result.evidence.some((entry) => entry.itemIds[0] === 'second')).toBe(false);
    expect(result.stopReasons).toContainEqual(expect.objectContaining({
      detailCode: 'time-budget-exceeded',
    }));
  });

  it('fails closed on malformed requests and cooperatively cancels', async () => {
    const valid = request([item('line', 'x')], ['root']);
    expect(validateGraphAnalysisRequest(valid).ok).toBe(true);
    expect(validateGraphAnalysisRequest({ ...valid, maximumTimeMs: Infinity }).ok).toBe(false);
    const cancelled = await runGraphAnalysisRequest(valid, undefined, { isCancelled: () => true });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.stopReasons).toContainEqual(expect.objectContaining({ detailCode: 'cancelled' }));
  });
});
