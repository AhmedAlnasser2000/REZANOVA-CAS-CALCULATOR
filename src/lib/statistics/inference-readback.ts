import type { MeanTestAlternative } from '../../types/calculator';
import { textDetailSection } from '../display/result/result-detail-lines';
import type {
  MeanConfidenceIntervalResult,
  MeanHypothesisTestResult,
  MeanInferenceSummary,
} from './inference';
import { formatStatisticsNumber } from './shared';

export function meanAlternativeSymbol(alternative: MeanTestAlternative) {
  return alternative === 'twoSided' ? '\\ne' : alternative === 'less' ? '<' : '>';
}

export function meanAlternativeLabel(alternative: MeanTestAlternative) {
  return alternative === 'twoSided'
    ? 'different from'
    : alternative === 'less'
      ? 'less than'
      : 'greater than';
}

export function meanInferenceAssumptionsSection(summary: MeanInferenceSummary) {
  const variability = summary.sampleStandardDeviation === 0
    ? 'The entered sample has zero observed variability.'
    : 'The entered sample has nonzero observed variability.';
  const shape = summary.count < 30
    ? 'For this small sample, judge whether the population is approximately normal and the data have no strong outliers.'
    : 'The larger sample reduces sensitivity to population shape, but does not verify the sampling design.';

  return textDetailSection('Assumptions and checks', [
    `Verified from the entered data: ${summary.count} finite numeric observations. ${variability}`,
    shape,
    'Not verifiable by Calcwiz: the observations came from a random sample or assignment and are mutually independent.',
  ]);
}

export function meanConfidenceInterpretationSection(input: {
  level: number;
  result: MeanConfidenceIntervalResult;
}) {
  return textDetailSection('Interpretation', [
    `${formatStatisticsNumber(input.level * 100)}% confidence interval for the population mean: ${formatStatisticsNumber(input.result.lowerBound)} to ${formatStatisticsNumber(input.result.upperBound)}.`,
    'Repeated-sampling meaning: intervals built this way capture the true population mean at the stated long-run rate.',
  ]);
}

export function meanTestInterpretationSection(input: {
  alternative: MeanTestAlternative;
  mu0: number;
  result: MeanHypothesisTestResult;
}) {
  const decision = input.result.rejectNull ? 'Reject the null hypothesis.' : 'Fail to reject the null hypothesis.';
  const evidence = input.result.rejectNull ? 'sufficient' : 'insufficient';
  return textDetailSection('Decision and interpretation', [
    `At alpha = ${formatStatisticsNumber(input.result.alpha)}, ${decision}`,
    `The sample provides ${evidence} evidence that the population mean is ${meanAlternativeLabel(input.alternative)} ${formatStatisticsNumber(input.mu0)}.`,
    'Failing to reject the null hypothesis does not prove that the null value is true.',
  ]);
}
