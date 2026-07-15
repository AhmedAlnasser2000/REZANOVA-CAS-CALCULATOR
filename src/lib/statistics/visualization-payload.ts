import type {
  StatisticsDistributionBarsVisualizationV1,
  StatisticsNormalCurveVisualizationV1,
  StatisticsPairedPointsVisualizationV1,
  StatisticsRequest,
  StatisticsResidualVisualizationV1,
  StatisticsTestDistributionVisualizationV1,
  StatisticsVisualizationPayloadV1,
  StatisticsWeightedDataVisualizationV1,
} from '../../types/calculator';
import {
  compactFrequencyRowsFromValues,
  descriptiveStatisticsFromFrequencyRows,
  type CompactFrequencyRow,
} from './descriptive';
import {
  statisticsDistributionCdf,
  statisticsDistributionMassOrDensity,
  statisticsDistributionQuantile,
  type StatisticsDistributionInput,
} from './distributions';
import {
  prepareStatisticsProbabilityCalculation,
  probabilityEventLatex,
  type ParsedProbabilityEvent,
  type ProbabilityRequest,
} from './probability';
import { parseIntegerDraft, parseNumericDraft } from './shared';
import { isStatisticsVisualizationPayloadV1 } from './visualization-contract';
import { prepareStatisticsRelationshipCalculation } from './relationship-calculation';
import {
  computeMeanConfidenceInterval,
  computeMeanHypothesisTest,
  inverseStudentTCdf,
  parseInferenceLevel,
  studentTDensity,
  type MeanInferenceSummary,
} from './inference';

const DISCRETE_BAR_LIMIT = 96;
const NORMAL_CURVE_POINT_COUNT = 181;

function numericValues(values: readonly string[]) {
  const parsed = values.map(parseNumericDraft);
  return parsed.every((value): value is number => value !== null) ? parsed : null;
}

function compactRowsFromRequest(
  request: Extract<StatisticsRequest, { kind: 'dataset' | 'descriptive' | 'frequency' }>,
) {
  if (request.kind === 'dataset' || request.source === 'dataset') {
    const values = numericValues(request.values);
    return values && values.length > 0 ? compactFrequencyRowsFromValues(values) : null;
  }

  const counts = new Map<number, number>();
  for (const row of request.rows) {
    const value = parseNumericDraft(row.value);
    const frequency = parseIntegerDraft(row.frequency);
    if (value === null || frequency === null || frequency <= 0) return null;
    counts.set(value, (counts.get(value) ?? 0) + frequency);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, frequency]) => ({ value, frequency }));
}

function compactRowsFromInferenceRequest(
  request: Extract<StatisticsRequest, { kind: 'meanInference' }>,
) {
  if (request.source === 'dataset') {
    const values = numericValues(request.values);
    return values && values.length > 0 ? compactFrequencyRowsFromValues(values) : null;
  }
  const counts = new Map<number, number>();
  for (const row of request.rows) {
    const value = parseNumericDraft(row.value);
    const frequency = parseIntegerDraft(row.frequency);
    if (value === null || frequency === null || frequency <= 0) return null;
    counts.set(value, (counts.get(value) ?? 0) + frequency);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, frequency]) => ({ value, frequency }));
}

function weightedTable(rows: readonly CompactFrequencyRow[]) {
  return {
    columns: ['Value', 'Frequency'],
    rows: rows.slice(0, 500).map((row) => [row.value, row.frequency]),
    totalRows: rows.length,
  };
}

function weightedView(
  kind: StatisticsWeightedDataVisualizationV1['kind'],
  rows: readonly CompactFrequencyRow[],
  boxSummary?: StatisticsWeightedDataVisualizationV1['boxSummary'],
): StatisticsWeightedDataVisualizationV1 {
  const total = rows.reduce((sum, row) => sum + row.frequency, 0);
  const labels = {
    histogram: ['Histogram', 'Value', 'Frequency'],
    boxPlot: ['Box plot', 'Value', ''],
    frequencyBars: ['Frequency counts', 'Value', 'Frequency'],
  } as const;
  const [title, xLabel, yLabel] = labels[kind];
  return {
    kind,
    title,
    xLabel,
    yLabel,
    ariaDescription: `${title} for ${total} observation${total === 1 ? '' : 's'}.`,
    weightedValues: rows.map((row) => ({ value: row.value, weight: row.frequency })),
    ...(boxSummary ? { boxSummary } : {}),
    table: weightedTable(rows),
  };
}

function dataVisualizationPayload(
  request: Extract<StatisticsRequest, { kind: 'dataset' | 'descriptive' | 'frequency' }>,
) {
  const rows = compactRowsFromRequest(request);
  if (!rows?.length || rows.length > 10_000) return undefined;
  if (request.kind === 'frequency') {
    return {
      version: 1 as const,
      defaultKind: 'frequencyBars' as const,
      views: [weightedView('frequencyBars', rows)],
    };
  }

  const summary = descriptiveStatisticsFromFrequencyRows(
    rows,
    request.kind === 'descriptive' ? request.quartiles ?? 'halves' : 'halves',
  );
  const nonOutlierRows = rows.filter((row) => (
    row.value >= summary.lowerFence && row.value <= summary.upperFence
  ));
  const boxSummary = {
    min: summary.min,
    lowerWhisker: nonOutlierRows[0]?.value ?? summary.min,
    q1: summary.q1,
    median: summary.median,
    q3: summary.q3,
    upperWhisker: nonOutlierRows[nonOutlierRows.length - 1]?.value ?? summary.max,
    max: summary.max,
    lowerFence: summary.lowerFence,
    upperFence: summary.upperFence,
    outliers: summary.potentialOutliers,
  };
  return {
    version: 1 as const,
    defaultKind: 'histogram' as const,
    views: [
      weightedView('histogram', rows),
      weightedView('boxPlot', rows, boxSummary),
    ],
  };
}

function selectedByEvent(event: ParsedProbabilityEvent, value: number) {
  switch (event.event) {
    case 'exactly':
      return value === event.x;
    case 'density':
      return false;
    case 'lessThan':
      return value < (event.x ?? 0);
    case 'atMost':
      return value <= (event.x ?? 0);
    case 'moreThan':
      return value > (event.x ?? 0);
    case 'atLeast':
      return value >= (event.x ?? 0);
    case 'between':
      return (event.lowerBound === 'exclusive'
        ? value > (event.lower ?? 0)
        : value >= (event.lower ?? 0))
        && (event.upperBound === 'exclusive'
          ? value < (event.upper ?? 0)
          : value <= (event.upper ?? 0));
  }
}

function selectedIntegerRange(event: ParsedProbabilityEvent) {
  switch (event.event) {
    case 'exactly':
      return { start: event.x ?? 0, end: event.x ?? 0 };
    case 'lessThan':
      return { start: Number.NEGATIVE_INFINITY, end: (event.x ?? 0) - 1 };
    case 'atMost':
      return { start: Number.NEGATIVE_INFINITY, end: event.x ?? 0 };
    case 'moreThan':
      return { start: (event.x ?? 0) + 1, end: Number.POSITIVE_INFINITY };
    case 'atLeast':
      return { start: event.x ?? 0, end: Number.POSITIVE_INFINITY };
    case 'between':
      return {
        start: (event.lower ?? 0) + (event.lowerBound === 'exclusive' ? 1 : 0),
        end: (event.upper ?? 0) - (event.upperBound === 'exclusive' ? 1 : 0),
      };
    case 'density':
      return { start: 1, end: 0 };
  }
}

function discreteSegments(
  supportEnd: number,
  event: ParsedProbabilityEvent,
) {
  const selected = selectedIntegerRange(event);
  const selectedStart = Math.max(0, selected.start);
  const selectedEnd = Math.min(supportEnd, selected.end);
  const segments: Array<{ start: number; end: number; selected: boolean }> = [];
  if (selectedStart > 0) segments.push({ start: 0, end: Math.min(supportEnd, selectedStart - 1), selected: false });
  if (selectedStart <= selectedEnd) segments.push({ start: selectedStart, end: selectedEnd, selected: true });
  if (selectedEnd < supportEnd) segments.push({ start: Math.max(0, selectedEnd + 1), end: supportEnd, selected: false });
  return segments.filter((segment) => segment.start <= segment.end);
}

function distributionBucketProbability(
  distribution: StatisticsDistributionInput,
  start: number,
  end: number,
) {
  return Math.max(0, statisticsDistributionCdf(distribution, end)
    - statisticsDistributionCdf(distribution, start - 1));
}

function discreteProbabilityView(
  distribution: Extract<StatisticsDistributionInput, { kind: 'binomial' | 'poisson' }>,
  event: ParsedProbabilityEvent,
): StatisticsDistributionBarsVisualizationV1 {
  const requestedMax = Math.max(event.x ?? 0, event.lower ?? 0, event.upper ?? 0, 0);
  const supportEnd = distribution.kind === 'binomial'
    ? distribution.n
    : Math.max(requestedMax, Math.ceil(statisticsDistributionQuantile(distribution, 0.999999)));
  const bucketWidth = Math.max(1, Math.ceil((supportEnd + 1) / DISCRETE_BAR_LIMIT));
  const points: StatisticsDistributionBarsVisualizationV1['points'][number][] = [];
  for (const segment of discreteSegments(supportEnd, event)) {
    for (let start = segment.start; start <= segment.end; start += bucketWidth) {
      const end = Math.min(segment.end, start + bucketWidth - 1);
      points.push({
        x: start === end ? start : (start + end) / 2,
        probability: distributionBucketProbability(distribution, start, end),
        selected: segment.selected,
        ...(start === end ? {} : { label: `${start}-${end}`, aggregated: true }),
      });
    }
  }

  if (distribution.kind === 'poisson') {
    const tailProbability = Math.max(0, 1 - statisticsDistributionCdf(distribution, supportEnd));
    if (tailProbability > Number.EPSILON) {
      points.push({
        x: supportEnd + 1,
        probability: tailProbability,
        selected: selectedByEvent(event, supportEnd + 1),
        label: `>${supportEnd}`,
        aggregated: true,
      });
    }
  }

  const distributionLabel = distribution.kind === 'binomial' ? 'Binomial' : 'Poisson';
  return {
    kind: 'probabilityBars',
    title: `${distributionLabel} probability`,
    xLabel: 'Value',
    yLabel: 'Probability',
    ariaDescription: `${distributionLabel} probability bars for ${probabilityEventLatex(event)}.`,
    distribution: distribution.kind,
    eventNotation: probabilityEventLatex(event),
    points,
    omittedMass: 0,
    table: {
      columns: ['Value or range', 'Probability', 'In event'],
      rows: points.slice(0, 500).map((point) => [
        point.label ?? point.x,
        point.probability,
        point.selected ? 'Yes' : 'No',
      ]),
      totalRows: points.length,
    },
  };
}

function normalCurveView(
  distribution: Extract<StatisticsDistributionInput, { kind: 'normal' }>,
  event: ParsedProbabilityEvent,
): StatisticsNormalCurveVisualizationV1 {
  const requested = [event.x, event.lower, event.upper]
    .filter((value): value is number => value !== undefined);
  const padding = distribution.standardDeviation * 0.25;
  const minimum = Math.min(
    statisticsDistributionQuantile(distribution, 0.0005),
    ...requested.map((value) => value - padding),
  );
  const maximum = Math.max(
    statisticsDistributionQuantile(distribution, 0.9995),
    ...requested.map((value) => value + padding),
  );
  const step = (maximum - minimum) / (NORMAL_CURVE_POINT_COUNT - 1);
  const points = Array.from({ length: NORMAL_CURVE_POINT_COUNT }, (_, index) => {
    const x = minimum + (index * step);
    return {
      x,
      density: statisticsDistributionMassOrDensity(distribution, x),
      selected: event.event !== 'exactly'
        && event.event !== 'density'
        && selectedByEvent(event, x),
    };
  });
  const markerX = event.x;
  const marker = markerX === undefined || (event.event !== 'exactly' && event.event !== 'density')
    ? undefined
    : {
        x: markerX,
        density: statisticsDistributionMassOrDensity(distribution, markerX),
        label: event.event === 'density' ? 'Density at x' : 'Exact probability is 0',
      };
  return {
    kind: 'normalCurve',
    title: 'Normal distribution',
    xLabel: 'Value',
    yLabel: 'Density',
    ariaDescription: `Normal density curve for ${probabilityEventLatex(event)}.`,
    eventNotation: probabilityEventLatex(event),
    points,
    ...(marker ? { marker } : {}),
    table: {
      columns: ['Value', 'Density', 'In event'],
      rows: points.map((point) => [point.x, point.density, point.selected ? 'Yes' : 'No']),
      totalRows: points.length,
    },
  };
}

function probabilityVisualizationPayload(request: ProbabilityRequest) {
  const calculation = prepareStatisticsProbabilityCalculation(request);
  if (!calculation.ok) return undefined;
  const view = calculation.distribution.kind === 'normal'
    ? normalCurveView(calculation.distribution, calculation.event)
    : discreteProbabilityView(calculation.distribution, calculation.event);
  return {
    version: 1 as const,
    defaultKind: view.kind,
    views: [view],
  };
}

function relationshipTable(points: readonly { x: number; y: number }[]) {
  return {
    columns: ['x', 'y'],
    rows: points.slice(0, 500).map((point) => [point.x, point.y]),
    totalRows: points.length,
  };
}

function relationshipVisualizationPayload(
  request: Extract<StatisticsRequest, { kind: 'regression' | 'correlation' }>,
) {
  const calculation = prepareStatisticsRelationshipCalculation(request.points);
  if (!calculation.ok || calculation.points.length > 2_000) return undefined;
  const points = calculation.points.map((point) => ({ x: point.x, y: point.y }));
  if (request.kind === 'correlation') {
    const view: StatisticsPairedPointsVisualizationV1 = {
      kind: 'correlationScatter',
      title: 'Correlation scatter',
      xLabel: 'x',
      yLabel: 'y',
      ariaDescription: `Scatter plot of ${points.length} paired observations without a fitted line.`,
      points,
      table: relationshipTable(points),
    };
    return { version: 1 as const, defaultKind: view.kind, views: [view] };
  }

  const xValues = points.map((point) => point.x);
  const xStart = Math.min(...xValues);
  const xEnd = Math.max(...xValues);
  const fitted = (x: number) => (
    (calculation.summary.slope * x) + calculation.summary.intercept
  );
  const fitView: StatisticsPairedPointsVisualizationV1 = {
    kind: 'scatterFit',
    title: 'Scatter and fitted line',
    xLabel: 'x',
    yLabel: 'y',
    ariaDescription: `Scatter plot of ${points.length} observations with the fitted least-squares line.`,
    points,
    fittedLine: {
      start: { x: xStart, y: fitted(xStart) },
      end: { x: xEnd, y: fitted(xEnd) },
    },
    table: relationshipTable(points),
  };
  const residualPoints = points.map((point) => ({
    x: point.x,
    residual: point.y - fitted(point.x),
  }));
  const residualView: StatisticsResidualVisualizationV1 = {
    kind: 'residuals',
    title: 'Residuals',
    xLabel: 'x',
    yLabel: 'Residual',
    ariaDescription: `Residual plot for ${points.length} fitted observations.`,
    points: residualPoints,
    table: {
      columns: ['x', 'Residual'],
      rows: residualPoints.slice(0, 500).map((point) => [point.x, point.residual]),
      totalRows: residualPoints.length,
    },
  };
  return {
    version: 1 as const,
    defaultKind: fitView.kind,
    views: [fitView, residualView],
  };
}

function meanInferenceSummary(
  request: Extract<StatisticsRequest, { kind: 'meanInference' }>,
) {
  const rows = compactRowsFromInferenceRequest(request);
  if (!rows?.length || rows.length > 10_000) return undefined;
  const descriptive = descriptiveStatisticsFromFrequencyRows(rows, 'halves');
  const summary: MeanInferenceSummary = {
    count: descriptive.count,
    mean: descriptive.mean,
    sampleVariance: descriptive.sampleVariance,
    sampleStandardDeviation: descriptive.sampleStandardDeviation,
  };
  return summary;
}

function testStatisticValue(value: number): StatisticsTestDistributionVisualizationV1['statistic'] {
  if (value === Number.NEGATIVE_INFINITY) return 'negativeInfinity';
  if (value === Number.POSITIVE_INFINITY) return 'positiveInfinity';
  return value;
}

function inferenceVisualizationPayload(
  request: Extract<StatisticsRequest, { kind: 'meanInference' }>,
) {
  const level = parseInferenceLevel(request.level);
  const summary = meanInferenceSummary(request);
  if (level === null || !summary) return undefined;
  if (request.mode === 'ci') {
    const result = computeMeanConfidenceInterval(summary, level);
    if (!result) return undefined;
    const view = {
      kind: 'confidenceInterval' as const,
      title: 'Confidence interval',
      xLabel: 'Population mean',
      yLabel: '',
      ariaDescription: `${level * 100}% confidence interval from ${result.lowerBound} to ${result.upperBound}, centered at ${summary.mean}.`,
      estimate: summary.mean,
      lower: result.lowerBound,
      upper: result.upperBound,
      confidenceLevel: level,
      table: {
        columns: ['Quantity', 'Value'],
        rows: [
          ['Lower endpoint', result.lowerBound],
          ['Sample mean', summary.mean],
          ['Upper endpoint', result.upperBound],
        ],
        totalRows: 3,
      },
    };
    return { version: 1 as const, defaultKind: view.kind, views: [view] };
  }

  const mu0 = parseNumericDraft(request.mu0 ?? '');
  if (mu0 === null) return undefined;
  const result = computeMeanHypothesisTest(
    summary,
    level,
    mu0,
    request.alternative ?? 'twoSided',
  );
  if (!result) return undefined;
  const degreesOfFreedom = summary.count - 1;
  const minimum = inverseStudentTCdf(0.0005, degreesOfFreedom);
  const maximum = inverseStudentTCdf(0.9995, degreesOfFreedom);
  const pointCount = 181;
  const step = (maximum - minimum) / (pointCount - 1);
  const points = Array.from({ length: pointCount }, (_, index) => {
    const t = minimum + (index * step);
    const pValueRegion = result.alternative === 'twoSided'
      ? Math.abs(t) >= Math.abs(result.tStatistic)
      : result.alternative === 'less'
        ? t <= result.tStatistic
        : t >= result.tStatistic;
    return { t, density: studentTDensity(t, degreesOfFreedom), pValueRegion };
  });
  const criticalValues = result.alternative === 'twoSided'
    ? [-Math.abs(result.criticalValue), Math.abs(result.criticalValue)]
    : [result.criticalValue];
  const view: StatisticsTestDistributionVisualizationV1 = {
    kind: 'testDistribution',
    title: 'Student-t test distribution',
    xLabel: 't',
    yLabel: 'Density',
    ariaDescription: `Student-t distribution with ${degreesOfFreedom} degrees of freedom and ${result.alternative} p-value region.`,
    points,
    statistic: testStatisticValue(result.tStatistic),
    criticalValues,
    alternative: result.alternative,
    pValue: result.pValue,
    table: {
      columns: ['t', 'Density', 'In p-value region'],
      rows: points.map((point) => [point.t, point.density, point.pValueRegion ? 'Yes' : 'No']),
      totalRows: points.length,
    },
  };
  return { version: 1 as const, defaultKind: view.kind, views: [view] };
}

export function buildStatisticsVisualizationPayloadV1(
  request: StatisticsRequest,
): StatisticsVisualizationPayloadV1 | undefined {
  const payload = request.kind === 'dataset'
    || request.kind === 'descriptive'
    || request.kind === 'frequency'
    ? dataVisualizationPayload(request)
    : request.kind === 'binomial' || request.kind === 'normal' || request.kind === 'poisson'
      ? probabilityVisualizationPayload(request)
      : request.kind === 'regression' || request.kind === 'correlation'
        ? relationshipVisualizationPayload(request)
        : request.kind === 'meanInference'
          ? inferenceVisualizationPayload(request)
          : undefined;
  return payload && isStatisticsVisualizationPayloadV1(payload) ? payload : undefined;
}
