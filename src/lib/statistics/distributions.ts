import binomial from '@stdlib/stats-base-dists-binomial';
import normal from '@stdlib/stats-base-dists-normal';
import poisson from '@stdlib/stats-base-dists-poisson';
import type { StatisticsProbabilityEvent } from '../../types/calculator';

export type StatisticsProbabilityBound = 'inclusive' | 'exclusive';

export type StatisticsProbabilityEventInput = {
  event: StatisticsProbabilityEvent;
  x?: number;
  lower?: number;
  upper?: number;
  lowerBound?: StatisticsProbabilityBound;
  upperBound?: StatisticsProbabilityBound;
};

export type StatisticsDistributionInput =
  | { kind: 'binomial'; n: number; p: number }
  | { kind: 'normal'; mean: number; standardDeviation: number }
  | { kind: 'poisson'; lambda: number };

export type StatisticsDistributionEvaluation = {
  value: number;
  valueKind: 'probability' | 'density';
  expectedValue: number;
  standardDeviation: number;
  explanation?: string;
};

export function statisticsDistributionCdf(
  distribution: StatisticsDistributionInput,
  x: number,
) {
  if (distribution.kind === 'binomial') return binomial.cdf(x, distribution.n, distribution.p);
  if (distribution.kind === 'poisson') return poisson.cdf(x, distribution.lambda);
  return normal.cdf(x, distribution.mean, distribution.standardDeviation);
}

export function statisticsDistributionMassOrDensity(
  distribution: StatisticsDistributionInput,
  x: number,
) {
  if (distribution.kind === 'binomial') return binomial.pmf(x, distribution.n, distribution.p);
  if (distribution.kind === 'poisson') return poisson.pmf(x, distribution.lambda);
  return normal.pdf(x, distribution.mean, distribution.standardDeviation);
}

export function statisticsDistributionQuantile(
  distribution: StatisticsDistributionInput,
  probability: number,
) {
  if (distribution.kind === 'binomial') {
    return binomial.quantile(probability, distribution.n, distribution.p);
  }
  if (distribution.kind === 'poisson') return poisson.quantile(probability, distribution.lambda);
  return normal.quantile(probability, distribution.mean, distribution.standardDeviation);
}

function clampProbability(value: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function discreteProbability(
  event: StatisticsProbabilityEventInput,
  pmf: (x: number) => number,
  cdf: (x: number) => number,
) {
  const x = event.x ?? 0;
  switch (event.event) {
    case 'exactly':
      return pmf(x);
    case 'lessThan':
      return cdf(x - 1);
    case 'atMost':
      return cdf(x);
    case 'moreThan':
      return 1 - cdf(x);
    case 'atLeast':
      return 1 - cdf(x - 1);
    case 'between': {
      const minimum = (event.lower ?? 0) + (event.lowerBound === 'exclusive' ? 1 : 0);
      const maximum = (event.upper ?? 0) - (event.upperBound === 'exclusive' ? 1 : 0);
      return minimum > maximum ? 0 : cdf(maximum) - cdf(minimum - 1);
    }
    case 'density':
      return Number.NaN;
  }
}

function continuousProbability(
  event: StatisticsProbabilityEventInput,
  pdf: (x: number) => number,
  cdf: (x: number) => number,
): Pick<StatisticsDistributionEvaluation, 'value' | 'valueKind' | 'explanation'> {
  const x = event.x ?? 0;
  switch (event.event) {
    case 'density':
      return {
        value: pdf(x),
        valueKind: 'density',
        explanation: 'Density is the curve height at x, not the probability of a single value.',
      };
    case 'exactly':
      return {
        value: 0,
        valueKind: 'probability',
        explanation: 'A continuous Normal variable has probability zero at any single exact value.',
      };
    case 'lessThan':
    case 'atMost':
      return {
        value: cdf(x),
        valueKind: 'probability',
        explanation: 'For a continuous Normal variable, strict and inclusive endpoints have the same probability.',
      };
    case 'moreThan':
    case 'atLeast':
      return {
        value: 1 - cdf(x),
        valueKind: 'probability',
        explanation: 'For a continuous Normal variable, strict and inclusive endpoints have the same probability.',
      };
    case 'between':
      return {
        value: cdf(event.upper ?? 0) - cdf(event.lower ?? 0),
        valueKind: 'probability',
        explanation: 'For a continuous Normal variable, including or excluding either endpoint does not change the probability.',
      };
  }
}

export function evaluateStatisticsDistribution(
  distribution: StatisticsDistributionInput,
  event: StatisticsProbabilityEventInput,
): StatisticsDistributionEvaluation {
  if (distribution.kind === 'binomial') {
    const value = discreteProbability(
      event,
      (x) => statisticsDistributionMassOrDensity(distribution, x),
      (x) => statisticsDistributionCdf(distribution, x),
    );
    return {
      value: clampProbability(value),
      valueKind: 'probability',
      expectedValue: binomial.mean(distribution.n, distribution.p),
      standardDeviation: binomial.stdev(distribution.n, distribution.p),
      explanation: 'Discrete endpoint choices include or exclude the probability mass at the boundary integer.',
    };
  }

  if (distribution.kind === 'poisson') {
    const value = discreteProbability(
      event,
      (x) => statisticsDistributionMassOrDensity(distribution, x),
      (x) => statisticsDistributionCdf(distribution, x),
    );
    return {
      value: clampProbability(value),
      valueKind: 'probability',
      expectedValue: poisson.mean(distribution.lambda),
      standardDeviation: poisson.stdev(distribution.lambda),
      explanation: 'Discrete endpoint choices include or exclude the probability mass at the boundary integer.',
    };
  }

  const evaluated = continuousProbability(
    event,
    (x) => statisticsDistributionMassOrDensity(distribution, x),
    (x) => statisticsDistributionCdf(distribution, x),
  );
  return {
    ...evaluated,
    value: evaluated.valueKind === 'probability'
      ? clampProbability(evaluated.value)
      : evaluated.value,
    expectedValue: normal.mean(distribution.mean, distribution.standardDeviation),
    standardDeviation: normal.stdev(distribution.mean, distribution.standardDeviation),
  };
}
