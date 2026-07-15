import type {
  BinomialState,
  CorrelationState,
  FrequencyRow,
  MeanInferenceState,
  FrequencyTable,
  NormalState,
  PoissonState,
  RegressionState,
  StatisticsRequest,
  StatisticsDataSummaryState,
  StatisticsProbabilityEventState,
  StatisticsScreen,
  StatisticsSerializerOptions,
  StatisticsWorkingSource,
  StatsDataset,
} from '../../types/calculator';

function filledValue(value?: string) {
  return value?.trim() || '?';
}

function serializeValues(values: string[]) {
  return `{${values.map((value) => filledValue(value)).join(',')}}`;
}

function serializeFrequencyRows(rows: FrequencyRow[]) {
  return `{${rows.map((row) => `${filledValue(row.value)}:${filledValue(row.frequency)}`).join(',')}}`;
}

function serializePoints(points: Array<{ x: string; y: string }>) {
  return `{${points.map((point) => `(${filledValue(point.x)},${filledValue(point.y)})`).join(',')}}`;
}

function serializeProbabilityEvent(request: Extract<StatisticsRequest, {
  kind: 'binomial' | 'normal' | 'poisson';
}>) {
  if (!request.event) {
    return `x=${filledValue(request.x)}, mode=${request.mode ?? '?'}`;
  }
  if (request.event === 'between') {
    return [
      'event=between',
      `lower=${filledValue(request.lower)}`,
      `upper=${filledValue(request.upper)}`,
      `lowerBound=${request.lowerBound ?? 'inclusive'}`,
      `upperBound=${request.upperBound ?? 'inclusive'}`,
    ].join(', ');
  }
  return `event=${request.event}, x=${filledValue(request.x)}`;
}

function probabilityEventRequestFields(state: StatisticsProbabilityEventState) {
  return state.event === 'between'
    ? {
        event: state.event,
        lower: state.lower,
        upper: state.upper,
        lowerBound: state.lowerBound,
        upperBound: state.upperBound,
      }
    : { event: state.event, x: state.x };
}

export function serializeStatisticsRequest(
  request: StatisticsRequest,
  options: StatisticsSerializerOptions = { style: 'structured' },
) {
  if (options.style !== 'structured') {
    return '';
  }

  switch (request.kind) {
    case 'dataset':
      return `dataset(values=${serializeValues(request.values)})`;
    case 'descriptive':
      return request.source === 'dataset'
        ? `descriptive(values=${serializeValues(request.values)}, quartiles=${request.quartiles ?? 'halves'}, context=${request.context ?? 'compare'})`
        : `descriptive(freq=${serializeFrequencyRows(request.rows)}, quartiles=${request.quartiles ?? 'halves'}, context=${request.context ?? 'compare'})`;
    case 'frequency':
      return request.source === 'dataset'
        ? `frequency(values=${serializeValues(request.values)})`
        : `frequency(freq=${serializeFrequencyRows(request.rows)})`;
    case 'meanInference':
      return request.source === 'dataset'
        ? `meanInference(values=${serializeValues(request.values)}, mode=${request.mode}, level=${filledValue(request.level)}${request.mode === 'test' && request.mu0 ? `, mu0=${filledValue(request.mu0)}, alternative=${request.alternative ?? 'twoSided'}` : ''})`
        : `meanInference(freq=${serializeFrequencyRows(request.rows)}, mode=${request.mode}, level=${filledValue(request.level)}${request.mode === 'test' && request.mu0 ? `, mu0=${filledValue(request.mu0)}, alternative=${request.alternative ?? 'twoSided'}` : ''})`;
    case 'binomial':
      return `binomial(n=${filledValue(request.n)}, p=${filledValue(request.p)}, ${serializeProbabilityEvent(request)})`;
    case 'normal':
      return `normal(mean=${filledValue(request.mean)}, sd=${filledValue(request.standardDeviation)}, ${serializeProbabilityEvent(request)})`;
    case 'poisson':
      return `poisson(lambda=${filledValue(request.lambda)}, ${serializeProbabilityEvent(request)})`;
    case 'regression':
      return `regression(points=${serializePoints(request.points)})`;
    case 'correlation':
      return `correlation(points=${serializePoints(request.points)})`;
  }
}

export function buildStatisticsStructuredDraft(
  screen: StatisticsScreen,
  state: {
    dataset: StatsDataset;
    frequencyTable: FrequencyTable;
    dataSummary?: StatisticsDataSummaryState;
    binomial: BinomialState;
    normal: NormalState;
    poisson: PoissonState;
    meanInference: MeanInferenceState;
    regression: RegressionState;
    correlation: CorrelationState;
  },
  workingSource: StatisticsWorkingSource,
) {
  const dataSummary = state.dataSummary ?? {
    analysis: 'descriptive',
    quartiles: 'halves',
    context: 'compare',
  };
  switch (screen) {
    case 'dataEntry':
      return serializeStatisticsRequest({
        kind: 'dataset',
        values: state.dataset.values,
      });
    case 'descriptive':
      return serializeStatisticsRequest(
        workingSource === 'frequencyTable'
          ? {
              kind: 'descriptive',
              source: 'frequencyTable',
              rows: state.frequencyTable.rows,
              quartiles: dataSummary.quartiles,
              context: dataSummary.context,
            }
          : {
              kind: 'descriptive',
              source: 'dataset',
              values: state.dataset.values,
              quartiles: dataSummary.quartiles,
              context: dataSummary.context,
            },
      );
    case 'frequency':
      return serializeStatisticsRequest(
        workingSource === 'frequencyTable'
          ? {
              kind: 'frequency',
              source: 'frequencyTable',
              rows: state.frequencyTable.rows,
            }
          : {
              kind: 'frequency',
              source: 'dataset',
              values: state.dataset.values,
            },
      );
    case 'meanInference':
      return serializeStatisticsRequest(
        workingSource === 'frequencyTable'
          ? {
              kind: 'meanInference',
              source: 'frequencyTable',
              rows: state.frequencyTable.rows,
              mode: state.meanInference.mode,
              level: state.meanInference.level,
              mu0: state.meanInference.mode === 'test' ? state.meanInference.mu0.trim() || undefined : undefined,
              alternative: state.meanInference.mode === 'test' ? state.meanInference.alternative : undefined,
            }
          : {
              kind: 'meanInference',
              source: 'dataset',
              values: state.dataset.values,
              mode: state.meanInference.mode,
              level: state.meanInference.level,
              mu0: state.meanInference.mode === 'test' ? state.meanInference.mu0.trim() || undefined : undefined,
              alternative: state.meanInference.mode === 'test' ? state.meanInference.alternative : undefined,
            },
      );
    case 'binomial':
      return serializeStatisticsRequest({
        kind: 'binomial',
        n: state.binomial.n,
        p: state.binomial.p,
        ...probabilityEventRequestFields(state.binomial),
      });
    case 'normal':
      return serializeStatisticsRequest({
        kind: 'normal',
        mean: state.normal.mean,
        standardDeviation: state.normal.standardDeviation,
        ...probabilityEventRequestFields(state.normal),
      });
    case 'poisson':
      return serializeStatisticsRequest({
        kind: 'poisson',
        lambda: state.poisson.lambda,
        ...probabilityEventRequestFields(state.poisson),
      });
    case 'regression':
      return serializeStatisticsRequest({
        kind: 'regression',
        points: state.regression.points,
      });
    case 'correlation':
      return serializeStatisticsRequest({
        kind: 'correlation',
        points: state.correlation.points,
      });
    default:
      return '';
  }
}
