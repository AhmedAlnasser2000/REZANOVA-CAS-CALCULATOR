import studentT from '@stdlib/stats-base-dists-t';
import type { MeanTestAlternative } from '../../types/calculator';

export type MeanInferenceSummary = {
  count: number;
  mean: number;
  sampleVariance: number | null;
  sampleStandardDeviation: number | null;
};

export type MeanConfidenceIntervalResult = {
  criticalValue: number;
  standardError: number;
  marginOfError: number;
  lowerBound: number;
  upperBound: number;
};

export type MeanHypothesisTestResult = {
  alternative: MeanTestAlternative;
  alpha: number;
  criticalValue: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  rejectNull: boolean;
};

export function parseInferenceLevel(levelDraft: string) {
  const normalized = levelDraft.trim();
  const level = normalized.endsWith('%')
    ? Number(normalized.slice(0, -1).trim()) / 100
    : Number(normalized);
  if (!Number.isFinite(level) || level <= 0 || level >= 1) {
    return null;
  }
  return level;
}

export function studentTCdf(value: number, degreesOfFreedom: number) {
  return studentT.cdf(value, degreesOfFreedom);
}

export function inverseStudentTCdf(probability: number, degreesOfFreedom: number): number {
  return studentT.quantile(probability, degreesOfFreedom);
}

export function computeMeanConfidenceInterval(
  summary: MeanInferenceSummary,
  level: number,
): MeanConfidenceIntervalResult | null {
  if (summary.count < 2 || summary.sampleStandardDeviation === null) {
    return null;
  }

  const alpha = 1 - level;
  const criticalValue = inverseStudentTCdf(1 - (alpha / 2), summary.count - 1);
  const standardError = summary.sampleStandardDeviation / Math.sqrt(summary.count);
  const marginOfError = criticalValue * standardError;

  return {
    criticalValue,
    standardError,
    marginOfError,
    lowerBound: summary.mean - marginOfError,
    upperBound: summary.mean + marginOfError,
  };
}

export function computeMeanHypothesisTest(
  summary: MeanInferenceSummary,
  level: number,
  mu0: number,
  alternative: MeanTestAlternative = 'twoSided',
): MeanHypothesisTestResult | null {
  if (summary.count < 2 || summary.sampleStandardDeviation === null) {
    return null;
  }

  const alpha = 1 - level;
  const criticalValue = alternative === 'twoSided'
    ? inverseStudentTCdf(1 - (alpha / 2), summary.count - 1)
    : inverseStudentTCdf(alternative === 'less' ? alpha : 1 - alpha, summary.count - 1);
  const standardError = summary.sampleStandardDeviation / Math.sqrt(summary.count);

  if (standardError === 0) {
    const difference = summary.mean - mu0;
    return {
      alternative,
      alpha,
      criticalValue,
      standardError,
      tStatistic: difference === 0
        ? 0
        : difference < 0
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY,
      pValue: difference === 0
        ? 1
        : alternative === 'twoSided'
          ? 0
          : alternative === 'less'
            ? difference < 0 ? 0 : 1
            : difference > 0 ? 0 : 1,
      rejectNull: difference !== 0 && (
        alternative === 'twoSided'
        || (alternative === 'less' && difference < 0)
        || (alternative === 'greater' && difference > 0)
      ),
    };
  }

  const tStatistic = (summary.mean - mu0) / standardError;
  const cdf = studentTCdf(tStatistic, summary.count - 1);
  const pValue = Math.max(0, Math.min(1,
    alternative === 'twoSided'
      ? 2 * Math.min(cdf, 1 - cdf)
      : alternative === 'less'
        ? cdf
        : 1 - cdf,
  ));

  return {
    alternative,
    alpha,
    criticalValue,
    standardError,
    tStatistic,
    pValue,
    rejectNull: pValue < alpha,
  };
}
