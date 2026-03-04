import type {
  CandidateOrigin,
  CandidateValidationResult,
  SolveDomainConstraint,
} from '../../types/calculator';
import { equationToZeroFormLatex, validateResidual } from './domain-guards';

const ROOT_DEDUPE_TOLERANCE = 1e-6;

export type NumericCandidateValidationSummary = {
  accepted: number[];
  rejected: CandidateValidationResult[];
};

export function dedupeNumericRoots(values: number[]) {
  return values.filter((value, index, list) =>
    list.findIndex((candidate) => Math.abs(candidate - value) <= ROOT_DEDUPE_TOLERANCE) === index);
}

export function validateCandidateRoots(
  equationLatex: string,
  candidates: number[],
  constraints: SolveDomainConstraint[] = [],
  origin: CandidateOrigin = 'numeric-interval',
): NumericCandidateValidationSummary {
  void origin;
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];

  for (const candidate of dedupeNumericRoots(candidates)) {
    const validation = validateResidual(zeroFormLatex, candidate, constraints);
    if (validation.kind === 'accepted') {
      accepted.push(validation.value);
    } else {
      rejected.push(validation);
    }
  }

  return {
    accepted: dedupeNumericRoots(accepted),
    rejected,
  };
}
