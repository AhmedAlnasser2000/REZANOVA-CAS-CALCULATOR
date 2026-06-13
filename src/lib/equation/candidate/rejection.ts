import type {
  CandidateValidationResult,
  SolveDomainConstraint,
} from '../../../types/calculator';
import type { CandidateRejectionKind } from '../../../types/calculator/exact-supplement-types';

function collectRejectedReasons(rejected: CandidateValidationResult[]) {
  return rejected.flatMap((entry) =>
    entry.kind === 'rejected' ? [entry.reason.toLowerCase()] : []);
}

export function classifyCandidateRejections(
  rejected: CandidateValidationResult[] = [],
  constraints: SolveDomainConstraint[] = [],
): CandidateRejectionKind {
  const rejectedReasons = collectRejectedReasons(rejected);

  if (rejectedReasons.some((reason) => reason.includes('denominator zero'))) {
    return 'denominator-exclusion';
  }

  if (rejectedReasons.some((reason) => reason.includes('undefined or non-real substitution'))) {
    return 'undefined-original';
  }

  if (
    rejectedReasons.some((reason) =>
      reason.includes('non-positive')
      || reason.includes('even root negative')
      || reason.includes('outside the permitted interval')
      || reason.includes('must stay positive'))
  ) {
    return 'domain-condition';
  }

  if (constraints.some((constraint) => constraint.kind === 'nonzero')) {
    return 'denominator-exclusion';
  }

  if (constraints.length > 0) {
    return 'domain-condition';
  }

  return 'residual-mismatch';
}

export function buildEquationCandidateRejectionMessage(kind: CandidateRejectionKind) {
  switch (kind) {
    case 'denominator-exclusion':
      return 'No valid real symbolic solution remains after applying denominator exclusions.';
    case 'undefined-original':
      return 'No valid real symbolic solution remains because the accepted candidate makes the original equation undefined in the real domain.';
    case 'domain-condition':
      return 'No valid real symbolic solution remains after applying preserved domain conditions.';
    case 'residual-mismatch':
    default:
      return 'No valid real symbolic solution remains after candidate checking.';
  }
}

export function buildCompositeCandidateRejectionMessage(kind: CandidateRejectionKind) {
  switch (kind) {
    case 'denominator-exclusion':
      return 'Candidate roots were found but rejected after applying denominator exclusions to the original composite equation.';
    case 'undefined-original':
      return 'Candidate roots were found but rejected because the original composite expression becomes undefined in the real domain.';
    case 'domain-condition':
      return 'Candidate roots were found but rejected after applying preserved domain conditions to the original composite equation.';
    case 'residual-mismatch':
    default:
      return 'Candidate roots were found but rejected after substitution back into the original composite equation.';
  }
}
