import type {
  CoreDraftStyle,
  StatisticsParseOptions,
  StatisticsParseResult,
  StatisticsProbabilityEvent,
  StatisticsRequest,
  StatisticsScreen,
} from '../../types/calculator';
import {
  normalizeStatisticsKey,
  normalizeStatisticsSource,
  parseAssignments,
  parseDatasetValuesSource,
  parseFrequencyRowsSource,
  parsePointsSource,
  splitTopLevel,
} from './shared';

function kindFromFunctionName(name: string): StatisticsRequest['kind'] | null {
  switch (name.toLowerCase().replaceAll(' ', '')) {
    case 'dataset':
      return 'dataset';
    case 'descriptive':
      return 'descriptive';
    case 'frequency':
      return 'frequency';
    case 'meaninference':
      return 'meanInference';
    case 'binomial':
      return 'binomial';
    case 'normal':
      return 'normal';
    case 'poisson':
      return 'poisson';
    case 'regression':
      return 'regression';
    case 'correlation':
      return 'correlation';
    default:
      return null;
  }
}

function valueFor(map: Map<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = map.get(normalizeStatisticsKey(key));
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function parseDistributionMode<TMode extends string>(value: string | undefined, allowed: readonly TMode[]) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase() as TMode;
  return allowed.includes(normalized) ? normalized : null;
}

function parseMeanTestAlternative(value: string | undefined) {
  if (!value) return 'twoSided' as const;
  switch (value.trim().toLowerCase().replaceAll(/[_\s-]/g, '')) {
    case 'twosided':
      return 'twoSided' as const;
    case 'less':
      return 'less' as const;
    case 'greater':
      return 'greater' as const;
    default:
      return null;
  }
}

type ParsedProbabilityEventFields = {
  event: StatisticsProbabilityEvent;
  x?: string;
  lower?: string;
  upper?: string;
  lowerBound?: 'inclusive' | 'exclusive';
  upperBound?: 'inclusive' | 'exclusive';
};

function parseProbabilityEventName(value: string): StatisticsProbabilityEvent | null {
  switch (value.trim().toLowerCase().replaceAll(/[_\s-]/g, '')) {
    case 'exactly':
      return 'exactly';
    case 'density':
      return 'density';
    case 'lessthan':
      return 'lessThan';
    case 'atmost':
      return 'atMost';
    case 'morethan':
    case 'greaterthan':
      return 'moreThan';
    case 'atleast':
      return 'atLeast';
    case 'between':
      return 'between';
    default:
      return null;
  }
}

function parseProbabilityBound(value: string | undefined) {
  if (!value) return 'inclusive' as const;
  const normalized = value.trim().toLowerCase();
  return normalized === 'inclusive' || normalized === 'exclusive'
    ? normalized
    : null;
}

function probabilityEventFields(
  assignments: Map<string, string>,
  kind: 'binomial' | 'normal' | 'poisson',
): { ok: true; fields: ParsedProbabilityEventFields } | { ok: false; error: string } | null {
  const eventDraft = valueFor(assignments, 'event');
  if (!eventDraft) return null;
  if (valueFor(assignments, 'mode')) {
    return { ok: false, error: 'Use event=... or legacy mode=..., not both in one probability request.' };
  }
  const event = parseProbabilityEventName(eventDraft);
  if (!event) {
    return {
      ok: false,
      error: 'Probability event must be exactly, density, lessThan, atMost, moreThan, atLeast, or between.',
    };
  }
  if (event === 'density' && kind !== 'normal') {
    return { ok: false, error: 'event=density is available only for normal(...).' };
  }
  if (event === 'between') {
    const lower = valueFor(assignments, 'lower');
    const upper = valueFor(assignments, 'upper');
    const lowerBound = parseProbabilityBound(valueFor(assignments, 'lowerbound'));
    const upperBound = parseProbabilityBound(valueFor(assignments, 'upperbound'));
    if (!lower || !upper) {
      return { ok: false, error: 'event=between needs lower=... and upper=....' };
    }
    if (!lowerBound || !upperBound) {
      return { ok: false, error: 'Between bounds must be inclusive or exclusive.' };
    }
    return {
      ok: true,
      fields: { event, lower, upper, lowerBound, upperBound },
    };
  }
  const x = valueFor(assignments, 'x');
  return x
    ? { ok: true, fields: { event, x } }
    : { ok: false, error: `event=${event} needs x=....` };
}

function parseDistributionAssignments(
  kind: 'binomial' | 'normal' | 'poisson',
  assignments: Map<string, string>,
  style: CoreDraftStyle,
): StatisticsParseResult {
  const eventFields = probabilityEventFields(assignments, kind);
  if (eventFields && !eventFields.ok) return eventFields;

  if (kind === 'binomial') {
    const n = valueFor(assignments, 'n');
    const p = valueFor(assignments, 'p');
    if (eventFields) {
      return n && p
        ? { ok: true, request: { kind, n, p, ...eventFields.fields }, style }
        : { ok: false, error: 'binomial(...) needs n=..., p=..., and an event.' };
    }
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pmf', 'cdf'] as const);
    const x = valueFor(assignments, 'x');
    return n && p && x && mode
      ? { ok: true, request: { kind, n, p, x, mode }, style }
      : { ok: false, error: 'binomial(...) needs n, p, and event=...; legacy x with mode=pmf|cdf remains accepted.' };
  }

  if (kind === 'normal') {
    const mean = valueFor(assignments, 'mean', 'mu');
    const standardDeviation = valueFor(assignments, 'sd', 'sigma', 'standarddeviation');
    if (eventFields) {
      return mean && standardDeviation
        ? { ok: true, request: { kind, mean, standardDeviation, ...eventFields.fields }, style }
        : { ok: false, error: 'normal(...) needs mean=..., sd=..., and an event.' };
    }
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pdf', 'cdf'] as const);
    const x = valueFor(assignments, 'x');
    return mean && standardDeviation && x && mode
      ? { ok: true, request: { kind, mean, standardDeviation, x, mode }, style }
      : { ok: false, error: 'normal(...) needs mean, sd, and event=...; legacy x with mode=pdf|cdf remains accepted.' };
  }

  const lambda = valueFor(assignments, 'lambda');
  if (eventFields) {
    return lambda
      ? { ok: true, request: { kind, lambda, ...eventFields.fields }, style }
      : { ok: false, error: 'poisson(...) needs lambda=... and an event.' };
  }
  const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['pmf', 'cdf'] as const);
  const x = valueFor(assignments, 'x');
  return lambda && x && mode
    ? { ok: true, request: { kind, lambda, x, mode }, style }
    : { ok: false, error: 'poisson(...) needs lambda and event=...; legacy x with mode=pmf|cdf remains accepted.' };
}

function parseStructured(source: string): StatisticsParseResult | null {
  const match = /^([A-Za-z][A-Za-z0-9]*)\((.*)\)$/.exec(source);
  if (!match) {
    return null;
  }

  const [, functionName, argumentSource] = match;
  const kind = kindFromFunctionName(functionName);
  if (kind === null) {
    return {
      ok: false,
      error: 'Use a supported Statistics request such as dataset(...), descriptive(...), frequency(...), meanInference(...), binomial(...), normal(...), poisson(...), regression(...), or correlation(...).',
    };
  }

  const assignments = parseAssignments(argumentSource);
  if (!assignments) {
    return {
      ok: false,
      error: 'Structured Statistics requests need key=value arguments.',
    };
  }

  if (kind === 'dataset') {
    const values = valueFor(assignments, 'values');
    return values
      ? { ok: true, request: { kind, values: parseDatasetValuesSource(values) }, style: 'structured' }
      : { ok: false, error: 'dataset(...) needs values={...}.' };
  }

  if (kind === 'descriptive' || kind === 'frequency') {
    const values = valueFor(assignments, 'values');
    const freq = valueFor(assignments, 'freq', 'frequencytable');
    const quartilesDraft = valueFor(assignments, 'quartiles', 'quartilemethod');
    const contextDraft = valueFor(assignments, 'context', 'spreadcontext');
    const normalizedQuartiles = quartilesDraft?.trim().toLowerCase() ?? 'halves';
    const normalizedContext = contextDraft?.trim().toLowerCase() ?? 'compare';
    if (
      kind === 'descriptive'
      && normalizedQuartiles !== 'halves'
      && normalizedQuartiles !== 'linear'
    ) {
      return { ok: false, error: 'descriptive(...) quartiles must be halves or linear.' };
    }
    if (
      kind === 'descriptive'
      && normalizedContext !== 'compare'
      && normalizedContext !== 'sample'
      && normalizedContext !== 'population'
    ) {
      return { ok: false, error: 'descriptive(...) context must be compare, sample, or population.' };
    }
    const quartiles = normalizedQuartiles === 'linear' ? 'linear' : 'halves';
    const context = normalizedContext === 'sample'
      ? 'sample'
      : normalizedContext === 'population'
        ? 'population'
        : 'compare';
    if (values) {
      return {
        ok: true,
        request: kind === 'descriptive'
          ? {
              kind,
              source: 'dataset',
              values: parseDatasetValuesSource(values),
              quartiles,
              context,
            }
          : { kind, source: 'dataset', values: parseDatasetValuesSource(values) },
        style: 'structured',
      };
    }

    if (freq) {
      const rows = parseFrequencyRowsSource(freq);
      if (rows === null) {
        return {
          ok: false,
          error: `${kind}(freq={...}) needs value:frequency rows such as {1:2, 2:3}.`,
        };
      }

      return {
        ok: true,
        request: kind === 'descriptive'
          ? { kind, source: 'frequencyTable', rows, quartiles, context }
          : { kind, source: 'frequencyTable', rows },
        style: 'structured',
      };
    }

    return {
      ok: false,
      error: `${kind}(...) needs values={...} or freq={value:frequency,...}.`,
    };
  }

  if (kind === 'meanInference') {
    const mode = parseDistributionMode(valueFor(assignments, 'mode'), ['ci', 'test'] as const);
    const level = valueFor(assignments, 'level', 'confidence', 'confidencelevel', 'significancelevel');
    const mu0 = valueFor(assignments, 'mu0', 'nullmean', 'nullmu');
    const alternative = parseMeanTestAlternative(valueFor(assignments, 'alternative', 'ha'));
    const values = valueFor(assignments, 'values');
    const freq = valueFor(assignments, 'freq', 'frequencytable');

    if (!mode || !level) {
      return {
        ok: false,
        error: 'meanInference(...) needs mode=ci|test and level=0.95 style input.',
      };
    }

    if (mode === 'test' && !mu0) {
      return {
        ok: false,
        error: 'meanInference(..., mode=test, ...) also needs mu0=....',
      };
    }

    if (mode === 'test' && !alternative) {
      return {
        ok: false,
        error: 'meanInference(..., mode=test, ...) alternative must be twoSided, less, or greater.',
      };
    }

    if (values) {
      return {
        ok: true,
        request: {
          kind,
          source: 'dataset',
          values: parseDatasetValuesSource(values),
          mode,
          level,
          mu0,
          alternative: mode === 'test' ? alternative ?? 'twoSided' : undefined,
        },
        style: 'structured',
      };
    }

    if (freq) {
      const rows = parseFrequencyRowsSource(freq);
      if (rows === null) {
        return {
          ok: false,
          error: 'meanInference(freq={...}) needs value:frequency rows such as {1:2, 2:3}.',
        };
      }

      return {
        ok: true,
        request: {
          kind,
          source: 'frequencyTable',
          rows,
          mode,
          level,
          mu0,
          alternative: mode === 'test' ? alternative ?? 'twoSided' : undefined,
        },
        style: 'structured',
      };
    }

    return {
      ok: false,
      error: 'meanInference(...) needs values={...} or freq={value:frequency,...}.',
    };
  }

  if (kind === 'binomial') {
    return parseDistributionAssignments(kind, assignments, 'structured');
  }

  if (kind === 'normal') {
    return parseDistributionAssignments(kind, assignments, 'structured');
  }

  if (kind === 'poisson') {
    return parseDistributionAssignments(kind, assignments, 'structured');
  }

  if (kind === 'regression' || kind === 'correlation') {
    const pointsSource = valueFor(assignments, 'points');
    if (!pointsSource) {
      return {
        ok: false,
        error: `${kind}(...) needs points={(x1,y1),(x2,y2),...}.`,
      };
    }

    const points = parsePointsSource(pointsSource);
    if (points === null) {
      return {
        ok: false,
        error: `${kind}(points={...}) needs coordinate pairs such as {(1,2),(2,4)}.`,
      };
    }

    return {
      ok: true,
      request: { kind, points },
      style: 'structured',
    };
  }

  return null;
}

function parseDatasetShorthand(source: string): StatisticsParseResult {
  return {
    ok: true,
    request: {
      kind: 'dataset',
      values: parseDatasetValuesSource(source),
    },
    style: 'shorthand',
  };
}

function parseDataSourceShorthand(
  kind: 'descriptive' | 'frequency',
  source: string,
): StatisticsParseResult {
  const hasTableSyntax = source.includes(':');
  if (hasTableSyntax) {
    const rows = parseFrequencyRowsSource(source);
    if (rows === null) {
      return {
        ok: false,
        error: 'Use value:frequency rows such as 1:2, 2:3 for the frequency-table source.',
      };
    }

    return {
      ok: true,
      request: { kind, source: 'frequencyTable', rows },
      style: 'shorthand',
    };
  }

  const values = parseDatasetValuesSource(source);
  return {
    ok: true,
    request: { kind, source: 'dataset', values },
    style: 'shorthand',
  };
}

function parseDistributionShorthand(
  kind: 'binomial' | 'normal' | 'poisson',
  source: string,
): StatisticsParseResult {
  const assignments = parseAssignments(source);
  if (!assignments) {
    return {
      ok: false,
      error: `Use key=value shorthand or a structured ${kind} request for this tool.`,
    };
  }

  return parseDistributionAssignments(kind, assignments, 'shorthand');
}

function parsePointsShorthand(
  kind: 'regression' | 'correlation',
  source: string,
): StatisticsParseResult {
  const points = parsePointsSource(source);
  if (points === null) {
    return {
      ok: false,
      error: 'Use point shorthand such as (1,2), (2,4), (3,6), or enter a structured request.',
    };
  }

  return {
    ok: true,
    request: { kind, points },
    style: 'shorthand',
  };
}

function parseByScreenHint(source: string, options: StatisticsParseOptions): StatisticsParseResult | null {
  switch (options.screenHint) {
    case 'dataEntry':
      return parseDatasetShorthand(source);
    case 'descriptive':
      return parseDataSourceShorthand('descriptive', source);
    case 'frequency':
      return parseDataSourceShorthand('frequency', source);
    case 'binomial':
      return parseDistributionShorthand('binomial', source);
    case 'normal':
      return parseDistributionShorthand('normal', source);
    case 'poisson':
      return parseDistributionShorthand('poisson', source);
    case 'meanInference':
      return {
        ok: false,
        error: 'Mean inference uses structured requests such as meanInference(values={12,15,18}, mode=ci, level=0.95).',
      };
    case 'regression':
      return parsePointsShorthand('regression', source);
    case 'correlation':
      return parsePointsShorthand('correlation', source);
    default:
      return null;
  }
}

export function statisticsRequestToScreen(
  request: StatisticsRequest,
  fallbackScreen: StatisticsScreen = 'dataEntry',
): StatisticsScreen {
  switch (request.kind) {
    case 'dataset':
      return 'dataEntry';
    case 'descriptive':
      return 'descriptive';
    case 'frequency':
      return 'frequency';
    case 'binomial':
      return 'binomial';
    case 'normal':
      return 'normal';
    case 'poisson':
      return 'poisson';
    case 'meanInference':
      return 'meanInference';
    case 'regression':
      return 'regression';
    case 'correlation':
      return 'correlation';
    default:
      return fallbackScreen;
  }
}

export function statisticsDraftStyle(source: string): CoreDraftStyle {
  const normalized = normalizeStatisticsSource(source);
  return /^[A-Za-z][A-Za-z0-9]*\s*\(/.test(normalized) ? 'structured' : 'shorthand';
}

export function parseStatisticsDraft(
  source: string,
  options: StatisticsParseOptions = {},
): StatisticsParseResult {
  const normalized = normalizeStatisticsSource(source);
  if (!normalized) {
    return {
      ok: false,
      error: 'Enter a Statistics request or use a guided Statistics tool before evaluating.',
    };
  }

  const structured = parseStructured(normalized);
  if (structured) {
    return structured;
  }

  const contextual = parseByScreenHint(normalized, options);
  if (contextual) {
    return contextual;
  }

  if (splitTopLevel(normalized).every((segment) => /^\([^,]+,[^,]+\)$/.test(segment))) {
    return {
      ok: false,
      error: 'Point-list shorthand is only accepted on Regression or Correlation screens unless you use regression(...) or correlation(...).',
    };
  }

  return {
    ok: false,
    error: 'This draft is not recognized in the current Statistics context. Use dataset values, value:frequency rows, distribution key=value input, point lists, or a structured Statistics request.',
  };
}
