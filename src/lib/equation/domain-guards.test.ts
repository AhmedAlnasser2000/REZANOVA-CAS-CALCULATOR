import { describe, expect, it } from 'vitest';
import {
  checkCandidateAgainstConstraints,
  equationToZeroFormLatex,
  exponentialDomainError,
  trigCarrierDomainError,
  trigSquareDomainError,
  validateResidual,
} from './domain-guards';

describe('equation domain guards', () => {
  it('normalizes equations into zero form', () => {
    expect(equationToZeroFormLatex('x=2')).toContain('-2');
  });

  it('reports bounded trig carrier domain errors', () => {
    expect(trigCarrierDomainError('sin', '2')).toContain('between -1 and 1');
    expect(trigSquareDomainError('-1')).toContain('between 0 and 1');
    expect(exponentialDomainError('-1')).toContain('always positive');
  });

  it('rejects candidates that violate explicit constraints or residual checks', () => {
    expect(
      checkCandidateAgainstConstraints(1, [{ kind: 'positive', expressionLatex: 'x-1' }]),
    ).toContain('non-positive');

    const residual = validateResidual('x-2', 1);
    expect(residual.kind).toBe('rejected');
  });
});
