import { describe, expect, it } from 'vitest';
import {
  checkCandidateAgainstConstraints,
  createPreparedConstraintCheckerAtTarget,
  createPreparedResidualValidatorAtTarget,
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
    expect(
      checkCandidateAgainstConstraints(2, [{
        kind: 'expression-interval',
        expressionLatex: 'x',
        min: -1,
        minInclusive: true,
        max: 1,
        maxInclusive: true,
      }]),
    ).toContain('outside the permitted expression range');

    const residual = validateResidual('x-2', 1);
    expect(residual.kind).toBe('rejected');
  });

  it('evaluates trig residuals with the selected angle unit', () => {
    expect(validateResidual('\\sin\\left(x\\right)-1', 90, [], 'deg').kind).toBe('accepted');
    expect(validateResidual('\\sin\\left(x\\right)-1', 90, [], 'rad').kind).toBe('rejected');
    expect(validateResidual('\\sin\\left(x\\right)-1', 100, [], 'grad').kind).toBe('accepted');
  });

  it('reuses prepared non-x constraint and residual evaluators across candidate values', () => {
    const checkConstraints = createPreparedConstraintCheckerAtTarget('y', [
      { kind: 'positive', expressionLatex: 'y-1' },
      { kind: 'nonzero', expressionLatex: 'y-1' },
    ]);
    expect(checkConstraints(1)).toContain('non-positive');
    expect(checkConstraints(2)).toBeNull();

    const validate = createPreparedResidualValidatorAtTarget('y^2-4', 'y');
    expect(validate(-2)).toEqual({ kind: 'accepted', value: -2, residual: 0 });
    expect(validate(0)).toEqual({
      kind: 'rejected',
      value: 0,
      reason: 'does not satisfy the original equation after substitution',
    });
  });
});
