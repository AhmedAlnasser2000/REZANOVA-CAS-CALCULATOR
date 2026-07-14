import type {
  ResultProducerDraft,
  ResultProducerDraftV2,
} from '../../types/calculator';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  type CanonicalResultV2MathResolver,
} from '../result-contract';

type StatisticsSuccessOutcome = Extract<ResultProducerDraft, { kind: 'success' }>;
type StatisticsErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

type StatisticsResultProducerInput =
  | Omit<StatisticsSuccessOutcome, 'canonicalResult'>
  | Omit<StatisticsErrorOutcome, 'canonicalResult'>;

const missingStatisticsMath: CanonicalResultV2MathResolver = (_canonicalLatex, path) => {
  throw new Error(`Statistics selected Canonical Result V2 without producer MathJSON for ${path}.`);
};

export function createStatisticsResultOutcome(
  input: StatisticsResultProducerInput,
  mathValue: CanonicalResultV2MathResolver = missingStatisticsMath,
): ResultProducerDraftV2 {
  const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input,
    mathValue,
  });
  return attachCanonicalResultV2ToProducerDraft(canonicalResult, input);
}
