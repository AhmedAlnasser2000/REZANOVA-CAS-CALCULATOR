import {
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
} from '../../lib/statistics/examples';
import type {
  BinomialState,
  NormalState,
  PoissonState,
  StatisticsProbabilityEvent,
  StatisticsProbabilityEventState,
  StatisticsRequest,
} from '../../types/calculator';

type ProbabilityRequest = Extract<StatisticsRequest, {
  kind: 'binomial' | 'normal' | 'poisson';
}>;

function probabilityEventState(
  request: ProbabilityRequest,
  fallback: StatisticsProbabilityEventState,
  legacyEvent: StatisticsProbabilityEvent,
): StatisticsProbabilityEventState {
  return {
    event: request.event ?? legacyEvent,
    x: request.x ?? fallback.x,
    lower: request.lower ?? fallback.lower,
    upper: request.upper ?? fallback.upper,
    lowerBound: request.lowerBound ?? fallback.lowerBound,
    upperBound: request.upperBound ?? fallback.upperBound,
  };
}

export function binomialStateFromRequest(
  request: Extract<StatisticsRequest, { kind: 'binomial' }>,
): BinomialState {
  const legacyEvent = request.mode === 'cdf' ? 'atMost' : 'exactly';
  const eventState = probabilityEventState(request, DEFAULT_BINOMIAL_STATE, legacyEvent);
  return {
    ...DEFAULT_BINOMIAL_STATE,
    ...eventState,
    n: request.n,
    p: request.p,
    mode: request.mode ?? (eventState.event === 'exactly' ? 'pmf' : 'cdf'),
  };
}

export function normalStateFromRequest(
  request: Extract<StatisticsRequest, { kind: 'normal' }>,
): NormalState {
  const legacyEvent = request.mode === 'pdf' ? 'density' : 'atMost';
  const eventState = probabilityEventState(request, DEFAULT_NORMAL_STATE, legacyEvent);
  return {
    ...DEFAULT_NORMAL_STATE,
    ...eventState,
    mean: request.mean,
    standardDeviation: request.standardDeviation,
    mode: request.mode ?? (eventState.event === 'density' ? 'pdf' : 'cdf'),
  };
}

export function poissonStateFromRequest(
  request: Extract<StatisticsRequest, { kind: 'poisson' }>,
): PoissonState {
  const legacyEvent = request.mode === 'cdf' ? 'atMost' : 'exactly';
  const eventState = probabilityEventState(request, DEFAULT_POISSON_STATE, legacyEvent);
  return {
    ...DEFAULT_POISSON_STATE,
    ...eventState,
    lambda: request.lambda,
    mode: request.mode ?? (eventState.event === 'exactly' ? 'pmf' : 'cdf'),
  };
}
