import { describe, expect, it } from 'vitest';
import type {
  CandidateValidationResult,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  buildCompositeCandidateRejectionMessage,
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';

function rejected(reason: string): CandidateValidationResult {
  return {
    kind: 'rejected',
    value: 1,
    reason,
  };
}

describe('candidate rejection classification', () => {
  it('classifies denominator exclusions', () => {
    const kind = classifyCandidateRejections([rejected('denominator zero after substitution')]);
    expect(kind).toBe('denominator-exclusion');
    expect(buildEquationCandidateRejectionMessage(kind)).toContain('denominator exclusions');
  });

  it('classifies undefined original substitutions', () => {
    const kind = classifyCandidateRejections([rejected('produces an undefined or non-real substitution')]);
    expect(kind).toBe('undefined-original');
    expect(buildCompositeCandidateRejectionMessage(kind)).toContain('undefined');
  });

  it('classifies preserved domain-condition failures', () => {
    const constraints: SolveDomainConstraint[] = [{ kind: 'nonnegative', expressionLatex: 'x' }];
    const kind = classifyCandidateRejections([rejected('even root negative')], constraints);
    expect(kind).toBe('domain-condition');
  });

  it('falls back to residual mismatch when no stronger rejection applies', () => {
    const kind = classifyCandidateRejections([rejected('does not satisfy the original equation after substitution')]);
    expect(kind).toBe('residual-mismatch');
    expect(buildEquationCandidateRejectionMessage(kind)).toContain('candidate checking');
  });
});
