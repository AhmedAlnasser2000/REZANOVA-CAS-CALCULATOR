import type {
  AngleUnit,
  CandidateOrigin,
  CandidateValidationResult,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  createPreparedResidualValidatorAtTarget,
  equationToZeroFormLatex,
} from '../domain-guards';

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
  target = 'x',
): NumericCandidateValidationSummary {
  void origin;
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];
  const validateCandidate = createPreparedResidualValidatorAtTarget(
    zeroFormLatex,
    target,
    constraints,
    angleUnit,
  );

  for (const candidate of dedupeNumericRoots(candidates)) {
    const validation = validateCandidate(candidate);
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
