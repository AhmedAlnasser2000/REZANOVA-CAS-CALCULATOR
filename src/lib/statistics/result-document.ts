import type { CurrentResultProducerDraft } from '../../types/calculator/canonical-result-runtime';
import type {
  ResultProducerDraft,
} from '../../types/calculator';
import {
  attachCurrentResultToDraft,
  buildCanonicalResultFromDraft,
  type CanonicalResultMathResolver,
} from '../result-contract/current/producer-draft';

type StatisticsSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type StatisticsErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

type StatisticsResultProducerInput =
  | Omit<StatisticsSuccessOutcome, 'canonicalResult'>
  | Omit<StatisticsErrorOutcome, 'canonicalResult'>;

const missingStatisticsMath: CanonicalResultMathResolver = (_canonicalLatex, path) => {
  throw new Error(`Statistics requires current canonical authority without producer MathJSON for ${path}.`);
};

export function createStatisticsResultOutcome(
  input: StatisticsResultProducerInput,
  mathValue: CanonicalResultMathResolver = missingStatisticsMath,
): CurrentResultProducerDraft {
  const canonicalResult = buildCanonicalResultFromDraft({
    draft: input,
    mathValue,
  });
  return attachCurrentResultToDraft(canonicalResult, input);
}
