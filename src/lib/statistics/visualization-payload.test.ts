import { describe, expect, it } from 'vitest';
import type {
  StatisticsDistributionBarsVisualizationV1,
  StatisticsConfidenceIntervalVisualizationV1,
  StatisticsNormalCurveVisualizationV1,
  StatisticsPairedPointsVisualizationV1,
  StatisticsRequest,
  StatisticsResidualVisualizationV1,
  StatisticsTestDistributionVisualizationV1,
  StatisticsWeightedDataVisualizationV1,
} from '../../types/calculator';
import { buildStatisticsModeRunPayload } from './runtime-run';
import { buildStatisticsVisualizationPayloadV1 } from './visualization-payload';

function viewFor<TKind extends string>(request: StatisticsRequest, kind: TKind) {
  const payload = buildStatisticsVisualizationPayloadV1(request);
  const view = payload?.views.find((candidate) => candidate.kind === kind);
  if (!view) throw new Error(`Expected ${kind} visualization.`);
  return view;
}

describe('Statistics visualization payload producer', () => {
  it('keeps list and compact frequency data weighted and equivalent', () => {
    const list = viewFor({
      kind: 'descriptive',
      source: 'dataset',
      values: ['1', '1', '2', '4'],
      quartiles: 'linear',
    }, 'histogram') as StatisticsWeightedDataVisualizationV1;
    const compact = viewFor({
      kind: 'descriptive',
      source: 'frequencyTable',
      rows: [
        { value: '1', frequency: '2' },
        { value: '2', frequency: '1' },
        { value: '4', frequency: '1' },
      ],
      quartiles: 'linear',
    }, 'histogram') as StatisticsWeightedDataVisualizationV1;

    expect(compact.weightedValues).toEqual(list.weightedValues);
    expect(compact.weightedValues).toHaveLength(3);
    expect(() => structuredClone(compact)).not.toThrow();
  });

  it('uses Calcwiz quartiles, fences, whiskers, and outliers for box plots', () => {
    const view = viewFor({
      kind: 'descriptive',
      source: 'dataset',
      values: ['1', '2', '3', '4', '100'],
      quartiles: 'linear',
    }, 'boxPlot') as StatisticsWeightedDataVisualizationV1;

    expect(view.boxSummary).toMatchObject({
      min: 1,
      lowerWhisker: 1,
      q1: 2,
      median: 3,
      q3: 4,
      upperWhisker: 4,
      max: 100,
      outliers: [100],
    });
  });

  it('highlights discrete events and represents large-support tail mass explicitly', () => {
    const binomial = viewFor({
      kind: 'binomial',
      n: '10',
      p: '0.5',
      event: 'atLeast',
      x: '7',
    }, 'probabilityBars') as StatisticsDistributionBarsVisualizationV1;
    expect(binomial.points.filter((point) => point.selected).map((point) => point.x)).toEqual([
      7, 8, 9, 10,
    ]);

    const poisson = viewFor({
      kind: 'poisson',
      lambda: '400',
      event: 'atMost',
      x: '410',
    }, 'probabilityBars') as StatisticsDistributionBarsVisualizationV1;
    expect(poisson.points.length).toBeLessThanOrEqual(100);
    expect(poisson.points.at(-1)?.label).toMatch(/^>/);
    expect(poisson.points.some((point) => point.aggregated)).toBe(true);
    expect(poisson.points.reduce((sum, point) => sum + point.probability, 0)).toBeCloseTo(1, 10);
    expect(poisson.omittedMass).toBe(0);
  });

  it('distinguishes Normal exact markers, density markers, and shaded regions', () => {
    const exact = viewFor({
      kind: 'normal',
      mean: '0',
      standardDeviation: '1',
      event: 'exactly',
      x: '0',
    }, 'normalCurve') as StatisticsNormalCurveVisualizationV1;
    const density = viewFor({
      kind: 'normal',
      mean: '0',
      standardDeviation: '1',
      event: 'density',
      x: '0',
    }, 'normalCurve') as StatisticsNormalCurveVisualizationV1;
    const interval = viewFor({
      kind: 'normal',
      mean: '0',
      standardDeviation: '1',
      event: 'between',
      lower: '-1',
      upper: '1',
      lowerBound: 'inclusive',
      upperBound: 'inclusive',
    }, 'normalCurve') as StatisticsNormalCurveVisualizationV1;

    expect(exact.marker?.label).toContain('0');
    expect(exact.points.every((point) => !point.selected)).toBe(true);
    expect(density.marker?.label).toBe('Density at x');
    expect(interval.points.some((point) => point.selected)).toBe(true);
  });

  it('attaches the validated payload only to successful runtime evaluations', () => {
    const success = buildStatisticsModeRunPayload({
      inputLatex: 'dataset(values={12,15,15,18,20})',
      screenHint: 'dataEntry',
      workingSourceHint: 'dataset',
    });
    const failure = buildStatisticsModeRunPayload({
      inputLatex: 'dataset(values={hello})',
      screenHint: 'dataEntry',
      workingSourceHint: 'dataset',
    });

    expect(success.outcome.kind).toBe('success');
    expect(success.visualization?.defaultKind).toBe('histogram');
    expect(failure.outcome.kind).toBe('error');
    expect(failure.visualization).toBeUndefined();
  });

  it('builds regression fit and residual views from one paired calculation', () => {
    const request: StatisticsRequest = {
      kind: 'regression',
      points: [{ x: '1', y: '2' }, { x: '2', y: '5' }, { x: '3', y: '7' }],
    };
    const fit = viewFor(request, 'scatterFit') as StatisticsPairedPointsVisualizationV1;
    const residuals = viewFor(request, 'residuals') as StatisticsResidualVisualizationV1;

    expect(fit.fittedLine?.start).toEqual({ x: 1, y: expect.closeTo(13 / 6) });
    expect(fit.fittedLine?.end).toEqual({ x: 3, y: expect.closeTo(43 / 6) });
    expect(residuals.points.map((point) => point.residual)).toEqual([
      expect.closeTo(-1 / 6),
      expect.closeTo(1 / 3),
      expect.closeTo(-1 / 6),
    ]);
  });

  it('keeps correlation as scatter-only evidence', () => {
    const payload = buildStatisticsVisualizationPayloadV1({
      kind: 'correlation',
      points: [{ x: '1', y: '2' }, { x: '2', y: '5' }, { x: '3', y: '7' }],
    });
    expect(payload?.defaultKind).toBe('correlationScatter');
    expect(payload?.views.map((view) => view.kind)).toEqual(['correlationScatter']);
    const scatter = payload?.views[0] as StatisticsPairedPointsVisualizationV1;
    expect(scatter.fittedLine).toBeUndefined();
  });

  it('keeps confidence intervals equivalent for list and frequency sources', () => {
    const list = viewFor({
      kind: 'meanInference',
      source: 'dataset',
      values: ['1', '1', '2', '2', '2'],
      mode: 'ci',
      level: '95%',
    }, 'confidenceInterval') as StatisticsConfidenceIntervalVisualizationV1;
    const frequency = viewFor({
      kind: 'meanInference',
      source: 'frequencyTable',
      rows: [{ value: '1', frequency: '2' }, { value: '2', frequency: '3' }],
      mode: 'ci',
      level: '0.95',
    }, 'confidenceInterval') as StatisticsConfidenceIntervalVisualizationV1;

    expect(frequency.estimate).toBe(list.estimate);
    expect(frequency.lower).toBeCloseTo(list.lower, 12);
    expect(frequency.upper).toBeCloseTo(list.upper, 12);
  });

  it.each([
    ['twoSided', 2],
    ['less', 1],
    ['greater', 1],
  ] as const)('builds the %s Student-t region and critical boundaries', (alternative, criticalCount) => {
    const view = viewFor({
      kind: 'meanInference',
      source: 'dataset',
      values: ['10', '11', '12', '13', '14'],
      mode: 'test',
      level: '0.95',
      mu0: '15',
      alternative,
    }, 'testDistribution') as StatisticsTestDistributionVisualizationV1;

    expect(view.alternative).toBe(alternative);
    expect(view.criticalValues).toHaveLength(criticalCount);
    expect(view.points.some((point) => point.pValueRegion)).toBe(true);
  });

  it('preserves infinite zero-variance test statistics explicitly', () => {
    const view = viewFor({
      kind: 'meanInference',
      source: 'dataset',
      values: ['5', '5', '5'],
      mode: 'test',
      level: '0.95',
      mu0: '6',
      alternative: 'less',
    }, 'testDistribution') as StatisticsTestDistributionVisualizationV1;

    expect(view.statistic).toBe('negativeInfinity');
    expect(view.pValue).toBe(0);
    expect(view.points.every((point) => !point.pValueRegion)).toBe(true);
  });
});
