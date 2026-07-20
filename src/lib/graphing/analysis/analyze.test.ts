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

  it('fails closed on malformed requests and cooperatively cancels', async () => {
    const valid = request([item('line', 'x')], ['root']);
    expect(validateGraphAnalysisRequest(valid).ok).toBe(true);
    expect(validateGraphAnalysisRequest({ ...valid, maximumTimeMs: Infinity }).ok).toBe(false);
    const cancelled = await runGraphAnalysisRequest(valid, undefined, { isCancelled: () => true });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.stopReasons).toContainEqual(expect.objectContaining({ detailCode: 'cancelled' }));
  });
});
