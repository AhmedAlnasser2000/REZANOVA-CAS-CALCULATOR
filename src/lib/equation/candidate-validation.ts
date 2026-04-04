import type {
  AngleUnit,
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

export function dedupeNumericRoots(values: number[], tolerance = ROOT_DEDUPE_TOLERANCE) {
  return values
    .slice()
    .sort((left, right) => left - right)
    .filter((value, index, list) =>
      index === 0 || Math.abs(value - list[index - 1]) > tolerance);
}

export function validateCandidateRoots(
  equationLatex: string,
  candidates: number[],
  constraints: SolveDomainConstraint[] = [],
  origin: CandidateOrigin = 'numeric-interval',
  angleUnit: AngleUnit = 'rad',
): NumericCandidateValidationSummary {
  void origin;
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];

  for (const candidate of dedupeNumericRoots(candidates)) {
    const validation = validateResidual(zeroFormLatex, candidate, constraints, angleUnit);
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
